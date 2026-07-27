/**
 * 상담 세션 유형 — **단일 SoR**.
 *
 * 왜 한 곳으로 모았나 (2026-07-27):
 *   `app/api/khidi/consultation/route.ts` 는 자기 목록에 "diagnostic" 을 갖고 있었는데
 *   DB CHECK(`consultation_sessions_session_type_check`)에는 그 값이 없었다. 폼에서 고르면
 *   API 검증은 통과하고 **insert 에서 깨진다**(실사용 0건이라 안 드러났을 뿐).
 *   게다가 `app/api/khidi/rebooking/create/route.ts` 는 **검증 자체가 없어** 아무 문자열이나
 *   DB 로 보냈다. 목록이 세 군데(DB·API·재예약)로 갈라져 있었던 게 원인.
 *   → 코드 쪽 목록은 여기 하나만 둔다. **DB CHECK 를 바꾸면 여기도 같이 바꿔라.**
 */

export const SESSION_TYPES = [
  "pre_consultation", // 외국인환자 사전상담 — KHIDI K-02 집계 대상
  "follow_up", // 사후관리 — KHIDI K-04 집계 대상
  "emergency", // 응급
  "partner_meeting", // 에이전시·병원 등 파트너 미팅 — ⚠️ KHIDI 지표 집계 제외
] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

/** KHIDI 성과지표(사전상담·사후관리)에 집계되는 유형. 파트너 미팅을 여기 넣으면 허위실적이 된다. */
export const KHIDI_COUNTED_TYPES: readonly SessionType[] = ["pre_consultation", "follow_up"];

export function isValidSessionType(v: unknown): v is SessionType {
  return typeof v === "string" && (SESSION_TYPES as readonly string[]).includes(v);
}
