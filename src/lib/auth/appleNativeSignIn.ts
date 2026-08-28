/**
 * 아이폰 «앱 안»에서의 「애플로 로그인」 — 웹 화면 이동을 거치지 않고 iOS 가 주는 창을 직접 쓴다.
 *
 * 왜 갈라놨나 (2026-08-28 실기기 촬영본 + 서버 기록 대조):
 *   앱 웹뷰에서 웹 방식(리다이렉트)으로 애플 로그인을 하면 «얼굴 인식까지는 성공»하는데
 *   그 결과가 우리 서버로 돌아오지 못한다. 아이폰이 애플 로그인을 「웹 화면 이동」이 아니라
 *   「시스템 창」으로 가로채기 때문이다.
 *     실측: 같은 3분 동안 Supabase 기록에 `/auth/v1/authorize` 3건, `/auth/v1/callback` **0건**.
 *           화면에는 오프라인 안내(capacitor errorPath)가 떴다 — 진짜 통신 장애가 아니다.
 *   → 애플이 앱에 권장하는 정식 방법(네이티브 창에서 받은 id_token 을 바로 교환)으로 바꾼다.
 *
 * ⚠️ 이것만으로는 안 되고 **Supabase 쪽 Client IDs 에 「번들 ID」가 같이 들어 있어야 한다.**
 *    네이티브 창이 주는 토큰의 수신자(aud)는 서비스 ID(`...app.web`)가 아니라 **번들 ID**
 *    (`kr.co.healwith.app`)다. 2026-08-28 에 `kr.co.healwith.app.web,kr.co.healwith.app` 로 고쳐 넣었다.
 *    ⚠️ 애플 개발자 계정의 App ID 에 「Sign In with Apple」 능력도 켜져 있어야 서명이 통과한다
 *       (App.entitlements 의 `com.apple.developer.applesignin` 과 짝).
 *
 * 안드로이드는 이 길을 타지 않는다 — 거기서는 기존 웹 방식이 그대로 동작하고,
 * 플러그인의 안드로이드 구현은 또 다른 흐름이라 바꿀 이유가 없다.
 *
 * 🔴 **부품 고를 때 함정 (2026-08-28 빌드 #10 이 여기서 죽었다)**:
 *    `@capacitor-community/apple-sign-in` 은 npm 쪽 조건이 `@capacitor/core >=7` 이라 통과하는데,
 *    **Swift 쪽 Package.swift 는 `capacitor-swift-pm` 을 `from: "7.0.0"`(= 8 미만)으로 못 박아** 둔다.
 *    우리 앱은 `exact: "8.3.0"` 이라 서로 안 맞고, 그러면 xcodebuild 가
 *    「Failed to show build settings」 한 줄만 남기고 죽는다(원인이 전혀 안 보인다).
 *    → **캐패시터 부품을 고를 땐 npm 조건 말고 그 부품의 `Package.swift` 를 열어서
 *      `capacitor-swift-pm` 요구 버전을 직접 확인해라.**
 */

/** 재생 공격 방지용 임의값. 애플에는 «해시»를, Supabase 에는 «원본»을 준다(짝이 맞아야 통과). */
export function makeRawNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toHex(new Uint8Array(digest));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** 사용자가 애플 창을 그냥 닫은 경우 — 오류 안내를 띄우면 안 된다(정상 동작이다). */
export function isAppleCancel(err: unknown): boolean {
  const e = err as { code?: string | number; message?: string } | null;
  const text = `${e?.code ?? ""} ${e?.message ?? ""}`.toLowerCase();
  // 플러그인은 취소를 `SIGN_IN_CANCELED` 로 준다. 1001 은 iOS 원본 오류값(ASAuthorizationError.canceled).
  return text.includes("sign_in_canceled") || text.includes("1001") || text.includes("cancel");
}

/**
 * 네이티브 창으로 로그인하고, 받은 토큰을 Supabase 세션으로 바꾼다.
 * 실패하면 던진다(호출 쪽에서 취소인지 오류인지 가른다).
 */
export async function signInWithAppleNative(supabase: {
  auth: { signInWithIdToken: (args: Record<string, unknown>) => Promise<{ error: unknown }> };
}): Promise<void> {
  const { AppleSignIn, SignInScope } = await import("@capawesome/capacitor-apple-sign-in");
  const rawNonce = makeRawNonce();
  // iOS 는 `initialize()` 가 필요 없다(안드로이드·웹 전용). 번들 ID 로 자동 결정된다.
  const result = await AppleSignIn.signIn({
    scopes: [SignInScope.Email, SignInScope.FullName],
    nonce: await sha256Hex(rawNonce),
  });

  const token = result?.idToken;
  if (!token) throw new Error("apple_no_identity_token");

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token,
    nonce: rawNonce,
  });
  if (error) throw error;
}
