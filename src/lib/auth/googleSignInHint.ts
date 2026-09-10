/**
 * 비밀번호 찾기에서 「구글로 로그인하세요」 안내를 보낼 것인가.
 *
 * 🔴 2026-09-09 실측 사고 ①: 예전에는 목록이 «비어 있어도» 소셜 전용으로 읽었다.
 *   `admin.auth.admin.listUsers()` 는 **identities 를 빈 배열로 준다**(getUserById 만 채워 준다).
 *   그래서 판정이 **모든 사용자에게 true** 를 돌려줬고, 비밀번호 찾기를 누른 사람은
 *   누구나 「당신은 비밀번호가 없습니다 — 구글로 로그인하세요」 안내를 받았다.
 *   = **비밀번호 재설정이 아무에게도 안 됐다.** (실측: bonroi2296@gmail.com 은
 *     identities 가 email·apple·google 셋인데 listUsers 로는 0개로 보였다.)
 *   → 목록이 비면 «판정 불가»다. 단정하지 말고 false 를 돌려 일반 재설정 흐름으로 보낸다.
 *
 * 🔴 2026-09-09 독립 리뷰가 잡은 사고 ②: 위를 고치자 **애플 전용 계정**이 처음으로 이 분기에
 *   «정확히» 걸리기 시작했는데, 보내는 메일은 **구글 문구 하나뿐**이다
 *   (`[healwith] 비밀번호 없이 로그인하세요 / Sign in with Google`).
 *   애플로 가입한 사람에게 구글을 누르라고 하는 셈이고, 애플 **비공개 릴레이 주소**
 *   (`@privaterelay.appleid.com`)로 가입했다면 구글 로그인은 **다른 계정을 새로 만들 뿐**이라
 *   실제로 막힌다. 고치기 전에는 «모두»가 잘못 걸려 이 결함이 묻혀 있었다.
 *   → 그래서 판정을 «소셜인가»가 아니라 **«구글 안내가 맞는 사람인가»**로 좁힌다.
 *     애플만 있는 계정은 일반 재설정 흐름으로 보낸다 — 재설정 링크로 비밀번호를 새로 만들 수 있고,
 *     없는 길을 가리키는 것보다 낫다.
 *
 * 🛑 이 함수 이름을 다시 「isSocialOnly」로 되돌리지 마라. 이름이 «소셜 전부»를 뜻하면
 *    다음 사람이 애플·카카오 같은 다른 수단을 여기에 얹고, 그 사람들은 또 구글 안내를 받는다.
 *    안내 문구가 여러 수단을 갖추면 그때 이름을 넓혀라.
 */
export function shouldSendGoogleSignInHint(
  identities: Array<{ provider?: string }> | null | undefined,
) {
  const list = identities || [];
  if (list.length === 0) return false; // 판정 불가 → 일반 재설정 흐름
  if (list.some((i) => i?.provider === "email")) return false; // 비밀번호가 있는 계정
  return list.some((i) => i?.provider === "google"); // 구글 문구가 맞는 사람에게만
}
