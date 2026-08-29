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
 * 🔴 **애플과 nonce 규약이 «반대»다 — 여기서 틀리면 조용히 로그인만 실패한다.**
 *   · 애플: 애플에는 **SHA-256 해시**를, Supabase 에는 **원본**을 준다(애플이 클레임에 해시를 넣는다).
 *   · 구글: 부품이 우리 값을 `googleIdOptionBuilder.setNonce(nonce)` 로 **가공 없이 그대로** 넘기고
 *     (`GoogleProvider.java:512`), 구글도 그 값을 id_token 의 `nonce` 클레임에 **그대로** 넣는다.
 *     → **양쪽 다 원본**을 준다. 여기서 해시를 넣으면 Supabase 가 클레임과 안 맞다고 거절한다.
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

/** 재생 공격 방지용 임의값. 구글에도 Supabase 에도 «이 원본 그대로» 준다(위 주석 참고). */
export function makeRawNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
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
  const res = await SocialLogin.login({
    provider: "google",
    options: { scopes: ["profile", "email"], nonce: rawNonce },
  });

  // 응답은 `{ provider, result }` 형태이고 토큰은 result 안에 있다(definitions.d.ts:724).
  const token = (res as { result?: { idToken?: string | null } } | null)?.result?.idToken;
  if (!token) throw new Error("google_no_id_token");

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token,
    nonce: rawNonce,
  });
  if (error) throw error;
}
