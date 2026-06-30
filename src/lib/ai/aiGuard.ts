/**
 * healwith: AI 비용 가드 (토큰 남용 방어)
 *
 * 배경 (docs/KNOWN_ISSUES.md P1, PO 승인 2026-06-12):
 * - 인메모리 회수제한은 Vercel 다중 인스턴스에서 분산 우회됨
 * - 하루 총량 차단기가 없어 봇이 밤새 돌면 아침에야 인지
 *
 * 3겹 방어 (Gemini 호출이 발생하는 공개 엔드포인트에 적용):
 * 1) 분당 회수제한 — DB 기반(checkRateLimitPersistent)으로 인스턴스 간 공유 (각 라우트에서)
 * 2) IP당 일일 상한 — 실사용자는 안 걸리는 수준 (기본 50회/일)
 * 3) 전역 일일 총량 차단기 — 초과 시 공개 AI 만 중단(상담방 자막은 참가자 전용이라 별도),
 *    Sentry 경보 + 운영 로그. 한도는 env AI_DAILY_GLOBAL_LIMIT (기본 2000회/일)
 */

import "server-only";
import { checkRateLimitPersistent, type RateLimitConfig } from "../rateLimit";
import { logOperational } from "../operationalLog";

const DAY_MS = 24 * 60 * 60 * 1000;

/** IP당 일일 AI 호출 상한 (실환자 하루 50회면 충분 — 넘으면 봇/남용) */
const PER_IP_DAILY: RateLimitConfig = {
  windowMs: DAY_MS,
  maxRequests: Number(process.env.AI_DAILY_PER_IP_LIMIT || 50),
  apiName: "ai_ip_daily",
};

/** 전역 일일 총량 (모든 IP 합산) — Gemini 무료/유료 한도 보호 */
const GLOBAL_DAILY: RateLimitConfig = {
  windowMs: DAY_MS,
  maxRequests: Number(process.env.AI_DAILY_GLOBAL_LIMIT || 2000),
  apiName: "ai_global_daily",
};

// 전역 차단 경보는 인스턴스당 1시간 1회만 (중복 알림 방지)
let globalBlockNotifiedAt = 0;

export type AiGuardResult =
  | { allowed: true }
  | { allowed: false; code: string; status: number; retryAfterSec: number };

export async function checkAiGuards(
  clientIp: string | null | undefined,
  api: string
): Promise<AiGuardResult> {
  // 1+2) IP당 일일 상한 + 전역 일일 총량 — 서로 독립이라 DB 왕복을 병렬로(지연 단축).
  //       오류 우선순위는 아래에서 순서대로 평가(IP 일일 → 전역)하여 기존 동작 유지.
  const [ipDaily, global] = await Promise.all([
    checkRateLimitPersistent(clientIp, PER_IP_DAILY),
    checkRateLimitPersistent("global", GLOBAL_DAILY),
  ]);
  if (!ipDaily.allowed) {
    logOperational("warn", {
      event: "ai_guard_ip_daily_block",
      api,
      clientIp: clientIp || "unknown",
      reason: `ip_daily_limit ${PER_IP_DAILY.maxRequests}/day`,
      statusCode: 429,
    });
    return {
      allowed: false,
      code: "ai_daily_limit",
      status: 429,
      retryAfterSec: Math.max(1, Math.ceil((ipDaily.resetAt - Date.now()) / 1000)),
    };
  }

  // 2) 전역 일일 총량 — key 고정("global")으로 전 트래픽 합산 (위에서 병렬 조회됨)
  if (!global.allowed) {
    if (Date.now() - globalBlockNotifiedAt > 60 * 60 * 1000) {
      globalBlockNotifiedAt = Date.now();
      logOperational("error", {
        event: "ai_guard_global_block",
        api,
        reason: `GLOBAL daily AI budget exhausted (${GLOBAL_DAILY.maxRequests}/day) — 공개 AI 일시 중단`,
        statusCode: 503,
      });
      // Sentry 경보 — PO 가 메일로 즉시 인지 (실패해도 메인 흐름 영향 없음)
      import("@sentry/nextjs")
        .then((S) =>
          S.captureMessage(
            `AI 일일 총량 차단기 작동 — 공개 AI 일시 중단 (한도 ${GLOBAL_DAILY.maxRequests}/일)`,
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
