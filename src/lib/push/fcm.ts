/**
 * healwith: FCM(Firebase Cloud Messaging) 푸시 발송 (서버 전용)
 *
 * FCM HTTP v1 API 한 곳으로 iOS(APNs 경유)·Android 모두 발송된다.
 * 인증: 서비스 계정 JSON으로 OAuth2 액세스 토큰을 직접 발급(google-auth-library 의존성 없이
 *       Node 내장 crypto 로 RS256 JWT 서명 → 토큰 교환). 새 의존성 0 (CI 의존성 게이트 안전).
 *
 * 환경변수(둘 다 있어야 실제 발송, 없으면 무음 no-op):
 *   - FCM_PROJECT_ID                 (Firebase 프로젝트 ID — 생략 시 서비스계정 project_id 사용)
 *   - GOOGLE_SERVICE_ACCOUNT_JSON    (서비스 계정 키 JSON 전체 문자열)
 *
 * ⚠️ 실기기 검증은 Firebase env 설정 후 `/api/push/test`(admin)로. buildPushMessage 는 단위테스트.
 */
import "server-only";
import { createSign } from "crypto";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { buildPushMessage, type PushPayload } from "./buildPushMessage";

export { buildPushMessage };
export type { PushPayload };

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

function getServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw);
    if (sa.client_email && sa.private_key) return sa;
  } catch {
    /* 파싱 실패 → 미설정 취급 */
  }
  return null;
}

let warnedProjectMismatch = false;

function getProjectId(sa: ServiceAccount): string | null {
  const override = process.env.FCM_PROJECT_ID;
  // FCM_PROJECT_ID 가 서비스계정의 프로젝트와 다르면 발송이 **조용히 404 로 실패**한다
  // (토큰은 정상 발급되고 요청만 남의 프로젝트로 가므로 «되는 것처럼» 보인다).
  // 값 자체는 비밀이 아니라 로그로 남겨도 되지만, 한 번만 알린다(발송마다 도배 방지).
  if (override && sa.project_id && override !== sa.project_id && !warnedProjectMismatch) {
    warnedProjectMismatch = true;
    console.error(
      `[push/fcm] ⚠️ FCM_PROJECT_ID(${override}) 가 서비스계정 프로젝트(${sa.project_id})와 다릅니다 — ` +
        `푸시가 조용히 실패할 수 있습니다. 앱의 google-services.json 과 같은 프로젝트인지 확인하세요.`
    );
  }
  return override || sa.project_id || null;
}

// ── OAuth 액세스 토큰 (서비스계정 JWT → 토큰 교환, 만료 전까지 캐시) ──────────
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
let cachedToken: { value: string; expEpochMs: number } | null = null;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(sa: ServiceAccount): Promise<string | null> {
  // 60초 여유를 두고 캐시 재사용
  if (cachedToken && cachedToken.expEpochMs - 60_000 > Date.now()) return cachedToken.value;

  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: FCM_SCOPE,
      aud: TOKEN_URL,
      iat: nowSec,
      exp: nowSec + 3600,
    })
  );
  const signingInput = `${header}.${claims}`;
  const signature = base64url(
    createSign("RSA-SHA256").update(signingInput).sign(sa.private_key)
  );
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    console.error("[push/fcm] OAuth 토큰 발급 실패:", res.status);
    return null;
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;
  cachedToken = {
    value: json.access_token,
    expEpochMs: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return json.access_token;
}

type SendResult = { ok: boolean; skipped: boolean; dead?: boolean };

/**
 * 단일 토큰에 푸시 발송. env 미설정이면 무음 no-op(skipped).
 * `dead: true` = 토큰이 폐기됨(앱 삭제·만료) → 호출처에서 device_tokens 정리 대상.
 */
export async function sendPush(token: string, payload: PushPayload): Promise<SendResult> {
  const sa = getServiceAccount();
  const projectId = sa ? getProjectId(sa) : null;
  if (!sa || !projectId) {
    return { ok: false, skipped: true };
  }

  const accessToken = await getAccessToken(sa);
  if (!accessToken) return { ok: false, skipped: false };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPushMessage(token, payload)),
    }
  );

  if (res.ok) return { ok: true, skipped: false };

  // 404 NOT_FOUND / UNREGISTERED / 400 INVALID_ARGUMENT(잘못된 토큰) = 폐기 토큰
  let dead = res.status === 404;
  try {
    const err = (await res.json()) as { error?: { status?: string } };
    const status = err?.error?.status;
    if (status === "NOT_FOUND" || status === "UNREGISTERED" || status === "INVALID_ARGUMENT") {
      dead = true;
    }
    console.error("[push/fcm] 발송 실패:", res.status, status || "");
  } catch {
    console.error("[push/fcm] 발송 실패:", res.status);
  }
  return { ok: false, skipped: false, dead };
}

/**
 * device_tokens 의 여러 토큰에 발송 + 폐기 토큰 자동 정리.
 * 트리거(상담 알림 등)에서 한 줄로 쓰기 위한 헬퍼.
 */
export async function sendPushToTokens(
  tokens: string[],
  payload: PushPayload
): Promise<{ sent: number; skipped: boolean; pruned: number }> {
  if (tokens.length === 0) return { sent: 0, skipped: false, pruned: 0 };

  let sent = 0;
  let skipped = false;
  const dead: string[] = [];
  for (const t of tokens) {
    const r = await sendPush(t, payload);
    if (r.skipped) skipped = true;
    if (r.ok) sent += 1;
    if (r.dead) dead.push(t);
  }

  if (dead.length > 0) {
    await (supabaseAdmin as any).from("device_tokens").delete().in("token", dead);
  }
  return { sent, skipped, pruned: dead.length };
}

/**
 * 특정 로그인 사용자의 모든 기기에 발송. (user_id 로 연결된 토큰)
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; skipped: boolean; pruned: number }> {
  const { data } = await (supabaseAdmin as any)
    .from("device_tokens")
    .select("token")
    .eq("user_id", userId);
  const tokens: string[] = (data || []).map((r: { token: string }) => r.token);
  return sendPushToTokens(tokens, payload);
}
