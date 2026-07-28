/**
 * 리다이렉트할 때 «주소 뒤 꼬리표»(?utm_source=… 등)를 그대로 넘겨준다.
 *
 * 왜 필요한가 (2026-07-28 실측으로 발견):
 *   옛 주소를 새 주소로 보내는 화면들이 `permanentRedirect("/inquiry")` 처럼
 *   **주소를 통째로 새로 써서**, 들어올 때 붙어 있던 꼬리표가 **조용히 버려졌다.**
 *
 *     /intake?utm_source=yandex  →  /inquiry        ← 출처 증발 ❌
 *
 *   광고 클릭이 옛 주소(명함·QR·예전 광고 소재·검색결과에 남은 링크)로 들어오면
 *   **그 돈이 어느 광고에서 왔는지 영영 알 수 없다.** 화면은 멀쩡히 뜨고 사용자도
 *   불편이 없어서 «성과가 안 나오네»로만 보이는, 가장 비싼 종류의 조용한 실패다.
 *   (미들웨어의 언어 리다이렉트는 `nextUrl.clone()` 을 써서 원래부터 안전했다 —
 *    문제는 «경로를 문자열로 직접 적는» 이 부류뿐이다.)
 *
 * ⚠️ 새로 리다이렉트를 만들 땐 반드시 이걸 거쳐라. 자동 검사(check:content)가 감시한다.
 */
export function withQuery(
  path: string,
  searchParams?: Record<string, string | string[] | undefined> | null
): string {
  if (!searchParams) return path;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value == null) continue;
    // 같은 이름이 여러 번 온 경우(?a=1&a=2)도 그대로 보존한다.
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else params.append(key, value);
  }

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
