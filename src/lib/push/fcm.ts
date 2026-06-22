/**
 * healwith: FCM(Firebase Cloud Messaging) 푸시 발송 (서버 전용)
 *
 * FCM HTTP v1 API 한 곳으로 iOS(APNs 경유)·Android 모두 발송된다.
 * 인증: 서비스 계정 JSON(Firebase 콘솔 → 프로젝트 설정 → 서비스 계정)으로 OAuth2 액세스 토큰 획득.
 *
 * 환경변수(둘 다 있어야 실제 발송, 없으면 무음 no-op):
 *   - FCM_PROJECT_ID
 *   - GOOGLE_SERVICE_ACCOUNT_JSON  (서비스 계정 키 JSON 전체 문자열)
 *
 * ⚠️ 미검증: Firebase 프로젝트·실기기 없이는 실제 송수신 검증 불가. buildPushMessage 만 단위테스트.
 */
import "server-only";
import { buildPushMessage, type PushPayload } from "./buildPushMessage";

export { buildPushMessage };
export type { PushPayload };

function getServiceAccount(): { project_id: string; client_email: string; private_key: string } | null {
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

/**
 * 단일 토큰에 푸시 발송.
 *
 * ⚠️ 미구현 stub. 실제 발송은 "푸시 트리거"(예: 상담 예약 알림) 단계에서 Firebase 프로젝트가
 *    생긴 뒤 구현·검증한다. 지금은 호출처도 없고 Firebase 키도 없어 의도적으로 no-op.
 *
 * 구현 방법(트리거 단계):
 *   1. `npm i google-auth-library`
 *   2. GoogleAuth(서비스계정 sa)로 scope `firebase.messaging` 액세스 토큰 발급
 *   3. POST https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send
 *      body = buildPushMessage(token, payload)
 *   4. 실기기로 송수신 검증
 */
export async function sendPush(
  _token: string,
  _payload: PushPayload
): Promise<{ ok: boolean; skipped: boolean }> {
  const configured = !!process.env.FCM_PROJECT_ID && !!getServiceAccount();
  console.warn(
    `[push/fcm] sendPush 미구현 stub (FCM ${configured ? "설정됨" : "미설정"}) — 트리거 단계에서 구현 예정`
  );
  return { ok: false, skipped: true };
}
