/**
 * 안드로이드 «앱 안»에서의 「Google로 계속하기」 — 웹 화면 이동을 거치지 않고 안드로이드가 주는 창을 직접 쓴다.
 *
 * 왜 갈라놨나 (2026-08-29 PO 갤럭시 실기기 + 서버 기록 대조로 확정):
 *   구글은 «앱에 박힌 브라우저(웹뷰) 안에서의 로그인»을 정책으로 막는다. 그래서 캡시터가
 *   `accounts.google.com` 을 앱 밖 크롬으로 내보내는데, 돌아오는 `/auth/callback` 도 크롬에서 열린다.
 *   그런데 PKCE 검증값(code_verifier)은 «앱 웹뷰의 쿠키»에 있다 → 크롬에는 없다 → 교환이 실패한다.
 *     실측: Supabase `auth_logs` 는 login 성공(provider=google), 그런데 Vercel 은
 *           "PKCE code verifier not found in storage". 같은 24시간 안에 끝까지 간 건 0건.
 *   → 구글이 앱에 권장하는 정식 방법(네이티브 창에서 받은 id_token 을 바로 교환)으로 바꾼다.
 *   경위·임시조치는 `src/components/auth/GoogleInAppNotice.jsx` 주석과 KNOWN_ISSUES 15번에 있다.
 *
 * 🛑 **2026-08-31 정정 — 여기 적혀 있던 「구글은 양쪽 다 원본」이 «틀렸다».**
 *   원래 이 자리엔 이렇게 있었다:
 *     「부품이 `setNonce(nonce)` 로 가공 없이 넘기고 구글도 그대로 클레임에 넣으니 **양쪽 다 원본**」
 *   부품·구글 쪽 설명은 맞다. 그런데 **Supabase 쪽 절반을 안 봤다** — Supabase 는 우리가 준
 *   원본을 «SHA-256 해시해서» 클레임과 맞춰 본다(공식 문서 `social-login/auth-google`).
 *   그래서 양쪽에 같은 원본을 주면 **반드시** 어긋난다.
 *     실측: PO 갤럭시에서 `AuthApiError / Nonces mismatch`. 구글 창은 떴고 토큰도 받았는데
 *           마지막 교환에서 거절당했다.
 *   ⚠️ 교훈: **한쪽 끝만 읽고 «그러니 이렇다»로 단정하지 마라.** 규약은 양쪽이 맞춰야 성립한다.
 *
 * 🔴 **nonce 규약 — 애플과 구글이 «같다»**(예전엔 반대라고 적혀 있었으나 아니다):
 *   · 애플: 애플에 **SHA-256 해시**, Supabase 에 **원본**
 *   · 구글: 구글에 **SHA-256 해시**, Supabase 에 **원본**   ← 여기서 틀려서 로그인이 막혔다
 *   배선은 `googleNativeSignIn.test.ts` 가 잠근다(같은 값을 주면 빨간불).
 *
 * ⚠️ 이것만으로는 안 되고 **구글·Supabase 쪽 등록이 같이 되어 있어야 한다**(2026-08-29 완료):
 *   ① 구글 클라우드 `healwith-500902` 에 **Android OAuth 클라이언트** — 패키지 `kr.co.healwith.app` +
 *      SHA-1 **3개**(Play 앱 서명 키 · 이전 Play 앱 서명 키 · 업로드 키). 앱 서명 키를 2026-07-28 에
 *      업그레이드해서 「이전 키」가 따로 있고, 구형 안드로이드는 그 키로 서명된 앱을 받는다.
 *      ⚠️ Firebase 가 쓰는 `healo-e3e58` 은 **다른 프로젝트**다 — 거기 만들면 웹 클라이언트와 갈린다.
 *   ② Supabase 구글 공급자의 「Client IDs」에 웹·안드로이드 ID 를 **쉼표로** 다 넣기.
 *   자세한 값과 경위 = 기억 `google-oauth-android-clients`.
 *
 * 🔑 **코드에 넘기는 것은 «웹» 클라이언트 ID 다**(안드로이드 ID 가 아니다).
 *    안드로이드 클라이언트는 구글이 «패키지+서명»을 검증하는 데만 쓰고, 우리가 받는 id_token 의
 *    수신자(aud)는 `webClientId` 가 된다. 그래서 Supabase 에도 웹 ID 가 들어 있어야 통과한다.
 *
 * 아이폰은 이 길을 타지 않는다 — iOS 구글 로그인은 아직 안 붙였다(클라이언트 미발급).
 * 애플 로그인이 아이폰의 «동등한 대안»이라 지금은 그것으로 충분하다.
 */

/** 부품이 캡시터에 등록하는 이름(`SocialLoginPlugin.java` 의 `@CapacitorPlugin(name=...)`). */
export const GOOGLE_NATIVE_PLUGIN = "SocialLogin";

/**
 * 웹 클라이언트 ID. 공개값이라 코드에 두어도 되지만, 바뀔 때를 대비해 env 로 덮을 수 있게 둔다.
 * ⚠️ env 를 «필수»로 만들면 배포에서 빠뜨렸을 때 조용히 로그인만 죽는다 → 기본값을 코드에 둔다.
 */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  "466786534560-dfm8odtthjc1p7e43rk2mrfvlmc7rlfl.apps.googleusercontent.com";

/**
 * 재생 공격 방지용 임의값(원본).
 *
 * 🔴 **구글과 Supabase 는 «서로 다른 것»을 받아야 한다** (2026-08-31 실기기에서 이것 때문에
 *    `AuthApiError / Nonces mismatch` 로 막혔다). 원래 여기 주석에는 「둘 다 이 원본 그대로」라고
 *    적혀 있었는데 **틀렸다.** Supabase 공식 문서(social-login/auth-google)가 못 박고 있다:
 *
 *      · 구글(부품)   → **SHA-256 으로 해시한 값**   `sha256Hex(rawNonce)`
 *      · Supabase     → **원본 그대로**              `rawNonce`
 *
 *    까닭: 구글은 받은 값을 그대로 idToken 의 `nonce` 클레임에 넣고(부품도 그대로 넘긴다 —
 *    `GoogleProvider.java` 의 `setNonce(nonce)`, 해시 안 함), Supabase 는 우리가 준 원본을
 *    «해시해서» 그 클레임과 맞춰 본다. 그래서 양쪽에 같은 값을 주면 반드시 어긋난다.
 */
export function makeRawNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 원본 nonce 를 SHA-256 16진수 문자열로. **구글에 줄 때만** 쓴다.
 *
 * ⚠️ `crypto.subtle` 은 보안 컨텍스트(HTTPS)에서만 있다. 앱 안 웹뷰는 https 로 뜨므로 문제없고,
 *    혹시 없는 환경이면 «nonce 없이» 가는 편이 로그인을 통째로 막는 것보다 낫다(호출부에서 처리).
 */
export async function sha256Hex(raw: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 실패했을 때 «어디서» 막혔는지 한 눈에 알 수 있는 짧은 꼬리표를 만든다.
 *
 * 🔴 왜 필요했나 (2026-08-31): PO 갤럭시에서 「Google 로그인에 실패했습니다」만 뜨고
 *   원인을 알 길이 없었다. Supabase `auth_logs` 에는 시도 기록조차 없었고(=구글 창 단계에서
 *   끊긴 것), SHA-1·패키지·OAuth 클라이언트는 콘솔에서 전부 정상으로 확인됐다.
 *   **오류를 삼키고 있었기 때문에 그 다음을 못 좁혔다.**
 *
 * ⚠️ 이 꼬리표는 **앱 안에서만** 보인다 — 호출부가 `hasNativeGoogleSignIn()` 이 참일 때만
 *    이 길을 타기 때문이다. 웹 사용자에게는 안 나온다.
 *
 * 🔎 자주 나오는 값과 뜻:
 *   · `10` / `DEVELOPER_ERROR` → SHA-1·패키지 이름·클라이언트 ID 중 하나가 콘솔과 안 맞다
 *   · `NO_CREDENTIAL` / `NoCredentialException` → 기기에 쓸 구글 계정이 없거나 Credential
 *     Manager 가 못 찾았다(폰 설정에 계정이 있어도 난다)
 *   · `16` / `CANCELED` → 사용자가 닫음(위 isGoogleCancel 이 먼저 걸러낸다)
 *   · `google_no_id_token` → 창은 떴는데 토큰이 안 왔다
 */
export function describeGoogleError(err: unknown): string {
  const e = err as { code?: string | number; message?: string; name?: string } | null;
  const parts = [e?.code, e?.name, e?.message].filter(Boolean).map(String);
  if (!parts.length) return String(err ?? "unknown").slice(0, 80);
  // 같은 말이 code/name/message 에 겹쳐 오는 경우가 많아 중복을 지운다.
  return [...new Set(parts)].join(" / ").slice(0, 120);
}

/** 사용자가 계정 선택 창을 그냥 닫은 경우 — 오류 안내를 띄우면 안 된다(정상 동작이다). */
export function isGoogleCancel(err: unknown): boolean {
  const e = err as { code?: string | number; message?: string } | null;
  const text = `${e?.code ?? ""} ${e?.message ?? ""}`.toLowerCase();
  // 부품은 취소를 `USER_CANCELLED` 로 준다(`GoogleProvider.java:64,931`).
  return text.includes("user_cancelled") || text.includes("cancel");
}

// `initialize()` 는 앱이 살아 있는 동안 한 번이면 된다.
let initialized = false;

/**
 * 네이티브 창으로 로그인하고, 받은 토큰을 Supabase 세션으로 바꾼다.
 * 실패하면 던진다(호출 쪽에서 취소인지 오류인지 가른다).
 */
export async function signInWithGoogleNative(supabase: {
  auth: { signInWithIdToken: (args: Record<string, unknown>) => Promise<{ error: unknown }> };
}): Promise<void> {
  const { SocialLogin } = await import("@capgo/capacitor-social-login");

  if (!initialized) {
    await SocialLogin.initialize({ google: { webClientId: GOOGLE_WEB_CLIENT_ID } });
    initialized = true;
  }

  const rawNonce = makeRawNonce();
  // 🔴 `scopes` 를 넘기지 마라 (2026-08-31 실기기에서 이것 때문에 로그인이 통째로 막혔다).
  //    부품의 GoogleProvider.java:466~484 를 보면:
  //      ① email · profile · openid 는 **부품이 기본으로 넣는다** — 우리가 줄 필요가 없다.
  //      ② 그런데 `scopes` 배열이 «있기만 하면» 내용과 무관하게 이렇게 거절한다:
  //         「You CANNOT use scopes without modifying the main activity. Please follow the docs!」
  //         (MainActivity 를 `ModifiedMainActivityForSocialLoginPlugin` 으로 바꿔야 통과한다)
  //    우리는 기본 범위만 필요하므로 **안 넘기는 것이 정답**이다. 기능 손실 0.
  //    ⚠️ 나중에 캘린더·드라이브 같은 «추가» 범위가 정말 필요해지면, 그때는 scopes 를 되살리는 게
  //       아니라 **MainActivity 개조부터** 해야 한다(앱 재빌드 필요).
  //
  // 🔴 nonce 는 **구글에 «해시한 것», Supabase 에 «원본»** 을 준다 (2026-08-31 실기기 실측).
  //    양쪽에 원본을 똑같이 줬더니 `AuthApiError / Nonces mismatch` 로 막혔다 —
  //    구글은 받은 값을 그대로 토큰에 넣고, Supabase 는 우리가 준 원본을 «해시해서» 맞춰 보기
  //    때문이다. 자세한 근거는 `makeRawNonce`·`sha256Hex` 주석 참고.
  //
  //    ⚠️ 해시를 못 만드는 환경(보안 컨텍스트가 아니라 `crypto.subtle` 이 없는 경우)에서는
  //       **양쪽 다 nonce 를 빼고** 간다. Supabase 문서상 nonce 는 «권장이지 필수가 아니고»,
  //       토큰 자체는 서명·만료·클라이언트 ID 로 검증된다. 로그인을 통째로 막는 것보다 낫다.
  let hashedNonce: string | null = null;
  try {
    hashedNonce = await sha256Hex(rawNonce);
  } catch {
    hashedNonce = null;
  }

  const res = await SocialLogin.login({
    provider: "google",
    options: hashedNonce ? { nonce: hashedNonce } : {},
  });

  // 응답은 `{ provider, result }` 형태이고 토큰은 result 안에 있다(definitions.d.ts:724).
  const token = (res as { result?: { idToken?: string | null } } | null)?.result?.idToken;
  if (!token) throw new Error("google_no_id_token");

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token,
    // 해시를 못 만들어 구글에 nonce 를 안 줬으면 토큰에 그 클레임이 없다 → 여기도 빼야 한다.
    ...(hashedNonce ? { nonce: rawNonce } : {}),
  });
  if (error) throw error;
}
