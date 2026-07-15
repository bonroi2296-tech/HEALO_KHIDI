/**
 * U+FFFD(인코딩 깨짐 대체문자) 검출 — 공개 문의 입력 가드
 *
 * Windows 콘솔(CP949) 등에서 만든 한글 요청 본문이 UTF-8로 디코딩되면
 * "�"(U+FFFD)로 깨진 채 DB에 저장되고, 관리자 알림 메일·어드민 화면까지
 * 그대로 노출된다(POSTMORTEMS #92 — 테스트 문의 #27·#30·#35·#36).
 * U+FFFD가 있다는 것 자체가 "이미 전송 단계에서 원문이 파괴됐다"는 증거라
 * 저장하지 말고 400으로 거부한다(브라우저 폼은 항상 UTF-8이라 실환자 오탐 없음).
 */
export function hasMojibake(v: unknown): boolean {
  if (typeof v === "string") return v.includes("�");
  if (Array.isArray(v)) return v.some(hasMojibake);
  if (v !== null && typeof v === "object") return Object.values(v).some(hasMojibake);
  return false;
}
