/**
 * healwith: AI 비용·남용 가드 (감지 우선 + 분류 + 선택적 차단)
 *
 * 배경 (docs/KNOWN_ISSUES.md P1, PO 승인 2026-06-12 / 정책개정 2026-06-30):
 * - 인메모리 회수제한은 Vercel 다중 인스턴스에서 분산 우회됨 → DB 기반 카운터.
 * - 옛 동작: IP당 50회/일 하드 차단. 정상 헤비 유저·내부 평가까지 막아 PO 가 "감지 우선"으로 개정.
 *
 * 정책 (2026-06-30):
 * 1) 분당 회수제한 — DB 기반(각 라우트에서). 봇 버스트 차단.
 * 2) IP당 일일 — 3단계 "감지 우선":
 *    · soft(기본 50) 초과: 차단하지 않고 관측·알림(elevated). ← "일시적으로 풀고 감지만"
 *    · soft*3(기본 150) 초과: 외부 침입 가능성 높음 → 알림 강화(likely_intrusion). 아직 허용.
 *    · hard(기본 400) 도달: 사람이 못 하는 양 → 자동 차단(intrusion). 비용 백스톱.
 *    env: AI_IP_SOFT_LIMIT / AI_IP_HARD_LIMIT. AI_IP_ENFORCE=enforce 면 옛 방식(soft 에서 차단)으로 복귀.
 * 3) 수동 차단: AI_IP_BLOCKLIST (콤마구분 IP) — 감지된 침입을 즉시·영구 차단(자동차단은 일일창 리셋되므로).
 * 4) 전역 일일 총량(기본 2000) — 초과 시 공개 AI 만 중단. 총비용 보호.
 *
 * 감지 알림은 Sentry(PO 메일) + operationalLog 로 나간다 → PO 가 침입 판단 후 AI_IP_BLOCKLIST 에 추가 가능.
 */

import "server-only";
import { checkRateLimitPersistent, type RateLimitConfig } from "../rateLimit";
import { logOperational } from "../operationalLog";
import { intrusionFactor } from "./aiGuardClassify";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// soft: 관측 임계(차단 X). 옛 AI_DAILY_PER_IP_LIMIT 와 호환.
const SOFT_IP = Number(process.env.AI_IP_SOFT_LIMIT || process.env.AI_DAILY_PER_IP_LIMIT || 50);
// hard: 자동 차단 상한(사람이 못 하는 양 = 침입). 비용 백스톱.
const HARD_IP = Number(process.env.AI_IP_HARD_LIMIT || 400);
// enforce: true 면 옛 방식(soft 에서 바로 차단). 기본은 observe(감지 우선).
const ENFORCE_PER_IP = process.env.AI_IP_ENFORCE === "enforce";
// 수동 영구 차단 IP 목록.
const IP_BLOCKLIST = new Set(
  (process.env.AI_IP_BLOCKLIST || "").split(",").map((s) => s.trim()).filter(Boolean)
);

/** IP당 일일 — maxRequests 는 차단이 일어나는 지점(enforce=soft, observe=hard). */
const PER_IP_DAILY: RateLimitConfig = {
  windowMs: DAY_MS,
  maxRequests: ENFORCE_PER_IP ? SOFT_IP : HARD_IP,
  apiName: "ai_ip_daily",
};

/** 전역 일일 총량(모든 IP 합산) — Gemini 한도 보호 */
const GLOBAL_DAILY: RateLimitConfig = {
  windowMs: DAY_MS,
  maxRequests: Number(process.env.AI_DAILY_GLOBAL_LIMIT || 2000),
  apiName: "ai_global_daily",
};

// 알림 중복 방지(인스턴스당).
let globalBlockNotifiedAt = 0;
const ipBlockNotifiedAt = new Map<string, number>(); // ip → ts

function notifyOncePerHour(map: Map<string, number>, key: string): boolean {
  const last = map.get(key) || 0;
  if (Date.now() - last < HOUR_MS) return false;
  map.set(key, Date.now());
  return true;
}

function sentry(message: string, level: "warning" | "error") {
  import("@sentry/nextjs").then((S) => S.captureMessage(message, level)).catch(() => {});
}

export type AiGuardResult =
  | { allowed: true }
  | { allowed: false; code: string; status: number; retryAfterSec: number };

export async function checkAiGuards(
  clientIp: string | null | undefined,
  api: string
): Promise<AiGuardResult> {
  const ip = clientIp || "unknown";

  // 0) 수동 블록리스트 — 감지된 침입을 즉시·영구 차단. 공격자에게 "차단됨"을 알리지 않게 generic 코드 사용.
  if (clientIp && IP_BLOCKLIST.has(clientIp)) {
    if (notifyOncePerHour(ipBlockNotifiedAt, `blocklist:${ip}`)) {
      logOperational("warn", { event: "ai_guard_ip_blocklist", api, clientIp: ip, reason: "manual blocklist", statusCode: 429 });
    }
    return { allowed: false, code: "ai_daily_limit", status: 429, retryAfterSec: 3600 };
  }

  // 1+2) IP당 일일 + 전역 일일 — 독립이라 DB 왕복 병렬.
  const [ipDaily, global] = await Promise.all([
    checkRateLimitPersistent(clientIp, PER_IP_DAILY),
    checkRateLimitPersistent("global", GLOBAL_DAILY),
  ]);

  // ── IP당 일일: 차단 지점 도달 ──
  if (!ipDaily.allowed) {
    // observe 모드면 이 지점 = hard(침입 확정 자동차단), enforce 면 soft(옛 방식).
    const intrusion = !ENFORCE_PER_IP;
    if (notifyOncePerHour(ipBlockNotifiedAt, ip)) {
      logOperational(intrusion ? "error" : "warn", {
        event: intrusion ? "ai_guard_ip_intrusion_block" : "ai_guard_ip_daily_block",
        api,
        clientIp: ip,
        reason: intrusion
          ? `INTRUSION auto-block: IP >= hard ${HARD_IP}/day — 외부 침입 의심 자동차단`
          : `ip_daily_limit ${SOFT_IP}/day (enforce)`,
        statusCode: 429,
      });
      if (intrusion) {
        sentry(`AI 가드: IP ${ip} 자동차단(>= ${HARD_IP}/일) — 외부 침입 의심. 영구 차단하려면 AI_IP_BLOCKLIST 에 추가.`, "warning");
      }
    }
    return {
      allowed: false,
      code: "ai_daily_limit",
      status: 429,
      retryAfterSec: Math.max(1, Math.ceil((ipDaily.resetAt - Date.now()) / 1000)),
    };
  }

  // ── IP당 일일: 차단은 안 하되 관측 구간 감지(observe 모드에서만) ──
  // 카운트 임계는 >= 로 보고 IP별 시간당 1회 알림(동시요청으로 정확값을 건너뛰어도 안 놓치게).
  if (!ENFORCE_PER_IP) {
    const count = HARD_IP - ipDaily.remaining; // checkRateLimitPersistent 가 이미 증가시킨 현재 카운트.
    const likelyAt = Math.min(SOFT_IP * 3, HARD_IP);
    if (count >= likelyAt) {
      if (notifyOncePerHour(ipBlockNotifiedAt, `likely:${ip}`)) {
        logOperational("warn", { event: "ai_guard_ip_likely_intrusion", api, clientIp: ip, reason: `likely_intrusion: IP ${count}/day (x${intrusionFactor(count, SOFT_IP)})`, statusCode: 200 });
        sentry(`AI 가드: IP ${ip} 의심 사용량 감지(${count}/일, soft ${SOFT_IP}의 약 ${intrusionFactor(count, SOFT_IP)}배) — 외부 침입 가능성. 계속 오르면 ${HARD_IP}에서 자동차단. 즉시 막으려면 AI_IP_BLOCKLIST.`, "warning");
      }
    } else if (count >= SOFT_IP) {
      if (notifyOncePerHour(ipBlockNotifiedAt, `elevated:${ip}`)) {
        logOperational("warn", { event: "ai_guard_ip_elevated", api, clientIp: ip, reason: `elevated: IP ${count}/day (soft ${SOFT_IP}) — 관측`, statusCode: 200 });
      }
    }
  }

  // 3) 전역 일일 총량
  if (!global.allowed) {
    if (Date.now() - globalBlockNotifiedAt > HOUR_MS) {
      globalBlockNotifiedAt = Date.now();
      logOperational("error", {
        event: "ai_guard_global_block",
        api,
        reason: `GLOBAL daily AI budget exhausted (${GLOBAL_DAILY.maxRequests}/day) — 공개 AI 일시 중단`,
        statusCode: 503,
      });
      sentry(`AI 일일 총량 차단기 작동 — 공개 AI 일시 중단 (한도 ${GLOBAL_DAILY.maxRequests}/일)`, "error");
    }
    return {
      allowed: false,
      code: "ai_service_busy",
      status: 503,
      retryAfterSec: Math.max(60, Math.ceil((global.resetAt - Date.now()) / 1000)),
    };
  }

  return { allowed: true };
}

// ── 상담방 실시간 통역·STT 전용 비용 가드 ──────────────────────
// 왜 별개: 공개챗 IP당 50회/일을 그대로 걸면 '발화마다' 호출되는 실시간 통역/STT 가
//   상담 중간에 끊긴다(그래서 기존엔 면제였음). 대신 상담을 끊지 않는 높은 천장으로
//   (a) 세션당 일일 상한 — 한 상담이 비정상적으로 많이 호출 = 클라 루프/남용 차단
//   (b) 전역 일일 상한 — 유료키 전환 시 봇·오작동발 청구 폭주 backstop
//   만 둔다. 정상 상담은 절대 안 걸리는 값(env 로 조절).
// ⚠️ 0순위 하드캡은 Google Cloud spend cap(PO 콘솔) — 이 코드 가드는 그 보조선이다.
const CONSULT_SESSION_DAILY: RateLimitConfig = {
  windowMs: DAY_MS,
  maxRequests: Number(process.env.AI_CONSULT_SESSION_DAILY || 5000),
  apiName: "ai_consult_session",
};
const CONSULT_GLOBAL_DAILY: RateLimitConfig = {
  windowMs: DAY_MS,
  maxRequests: Number(process.env.AI_CONSULT_GLOBAL_DAILY || 30000),
  apiName: "ai_consult_global",
};
let consultGlobalNotifiedAt = 0;

/**
 * 상담 AI(실시간 통역/STT) 비용 가드. consultationId 있으면 세션 상한도 적용.
 * 정상 상담은 안 걸리는 높은 천장 — 진짜 폭주(루프·봇·오작동)만 잡는 backstop.
 */
export async function checkConsultationAiGuard(
  consultationId: string | null | undefined,
  api: string
): Promise<AiGuardResult> {
  const checks = [checkRateLimitPersistent("consult:global", CONSULT_GLOBAL_DAILY)];
  if (consultationId) checks.push(checkRateLimitPersistent("consult:" + consultationId, CONSULT_SESSION_DAILY));
  const [global, session] = await Promise.all(checks);

  // 세션 상한(한 상담의 비정상 호출) 먼저
  if (session && !session.allowed) {
    logOperational("warn", {
      event: "ai_consult_session_block",
      api,
      reason: `consult_session_limit ${CONSULT_SESSION_DAILY.maxRequests}/day`,
      statusCode: 429,
    });
    return {
      allowed: false,
      code: "ai_session_busy",
      status: 429,
      retryAfterSec: Math.max(1, Math.ceil((session.resetAt - Date.now()) / 1000)),
    };
  }
  // 전역 상한(유료키 폭주 backstop) — 소진 시 1시간 1회 Sentry 경보
  if (!global.allowed) {
    if (Date.now() - consultGlobalNotifiedAt > 60 * 60 * 1000) {
      consultGlobalNotifiedAt = Date.now();
      logOperational("error", {
        event: "ai_consult_global_block",
        api,
        reason: `상담 AI 전역 일일 상한 소진 (${CONSULT_GLOBAL_DAILY.maxRequests}/일) — 실시간 통역/STT 일시 중단`,
        statusCode: 503,
      });
      import("@sentry/nextjs")
        .then((S) =>
          S.captureMessage(
            `상담 실시간통역/STT 일일 총량 차단기 작동 (한도 ${CONSULT_GLOBAL_DAILY.maxRequests}/일)`,
            "error"
          )
        )
        .catch(() => {});
    }
    return {
      allowed: false,
      code: "ai_service_busy",
      status: 503,
      retryAfterSec: Math.max(60, Math.ceil((global.resetAt - Date.now()) / 1000)),
    };
  }
  return { allowed: true };
}
