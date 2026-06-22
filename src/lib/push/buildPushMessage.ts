/**
 * healwith: FCM HTTP v1 message 빌더 (순수 함수 — 클라/서버 무관, 단위테스트 대상)
 * server-only 의존 없음 → 테스트에서 그대로 import.
 */
export type PushPayload = {
  title: string;
  body: string;
  /** 앱이 받는 커스텀 데이터(예: { route: "/consultation/123" }). FCM 규약상 값은 문자열만. */
  data?: Record<string, string | number>;
};

export function buildPushMessage(token: string, payload: PushPayload) {
  const data: Record<string, string> | undefined = payload.data
    ? Object.fromEntries(
        Object.entries(payload.data).map(([k, v]) => [k, String(v)])
      )
    : undefined;
  return {
    message: {
      token,
      notification: { title: payload.title, body: payload.body },
      ...(data ? { data } : {}),
    },
  };
}
