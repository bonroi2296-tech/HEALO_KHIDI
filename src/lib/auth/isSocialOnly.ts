// 소셜(구글 등)로만 가입 = email 로그인수단(identity)이 없음 = 비밀번호 없음.
//
// 🔴 2026-09-09 실측 사고: 예전에는 목록이 «비어 있어도» 소셜 전용으로 읽었다.
//   `admin.auth.admin.listUsers()` 는 **identities 를 빈 배열로 준다**(getUserById 만 채워 준다).
//   그래서 이 함수가 **모든 사용자에게 true** 를 돌려줬고, 비밀번호 찾기를 누른 사람은
//   누구나 「당신은 비밀번호가 없습니다 — 구글로 로그인하세요」 안내를 받았다.
//   = **비밀번호 재설정이 아무에게도 안 됐다.** (실측: bonroi2296@gmail.com 은
//     identities 가 email·apple·google 셋인데 listUsers 로는 0개로 보였다.)
//   → 목록이 비면 «판정 불가»다. 소셜 전용이라고 단정하지 말고 false 를 돌려
//     일반 재설정 흐름으로 보낸다(그게 안전한 쪽이다 — 아래 호출부 주석의 원래 의도).
export function isSocialOnly(identities: Array<{ provider?: string }> | null | undefined) {
  const list = identities || [];
  if (list.length === 0) return false; // 판정 불가 → 일반 재설정 흐름
  return !list.some((i) => i?.provider === "email");
}
