/**
 * U+FFFD(인코딩 깨짐 대체문자) 검출 — 공개 문의 입력 가드
 *
 * Windows 콘솔(CP949) 등에서 만든 한글 요청 본문이 UTF-8로 디코딩되면
 * "�"(U+FFFD)로 깨진 채 DB에 저장되고, 관리자 알림 메일·어드민 화면까지
 * 그대로 노출된다(POSTMORTEMS #92 — 테스트 문의 #27·#30·#35·#36).
 * U+FFFD가 있다는 것 자체가 "이미 전송 단계에서 원문이 파괴됐다"는 증거라
 * 저장하지 말고 400으로 거부한다. 브라우저 전송 자체는 항상 UTF-8이라
 * 오탐은 사실상 "이미 깨진 텍스트를 그대로 붙여넣은" 경우뿐(그때도 거부가
 * 조용히 쓰레기를 메일로 보내는 것보다 낫다 — 오탐 실사례 나오면 memo류만 완화).
 */
export function hasMojibake(v: unknown): boolean {
  // 재귀 대신 스택 순회 — JSON.parse는 수십만 중첩도 통과시키지만 재귀는
  // ~5천 깊이에서 RangeError로 500이 됨(독립 리뷰 지적, 적대 페이로드 대비).
  const stack: unknown[] = [v];
  while (stack.length) {
    const cur = stack.pop();
    if (typeof cur === "string") {
      if (cur.includes("�")) return true;
    } else if (Array.isArray(cur)) {
      stack.push(...cur);
    } else if (cur !== null && typeof cur === "object") {
      stack.push(...Object.values(cur));
    }
  }
  return false;
}
