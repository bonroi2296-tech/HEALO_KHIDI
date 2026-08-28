/**
 * 지금 화면이 «스토어 앱(Capacitor 셸) 안»에서 열렸는지.
 *
 * 이 앱은 라이브로드(server.url=https://healwith.co.kr)라 웹과 앱이 **같은 화면**을 쓴다.
 * 그래서 «웹에선 필요하지만 앱에선 어색한 UI»(쿠키 동의 배너 등)를 가릴 판정이 필요하다.
 *
 * 판정 근거 2개(둘 중 하나면 앱):
 *  1. `capacitor.config.ts` 의 `appendUserAgent: 'healwith-app'` 표식 — 가장 확실.
 *  2. Capacitor 네이티브 브리지 전역 — 표식이 안 붙는 옛 빌드 대비 예비.
 *
 * ⚠️ 브라우저에서만 의미 있다. 서버 렌더 중엔 항상 false 를 돌려주므로,
 *    이 값으로 첫 화면 마크업을 가르지 마라(수화 불일치). useEffect 안에서 써라.
 */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (ua.includes("healwith-app")) return true;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

/**
 * 지금 «아이폰·아이패드 앱 안»인가. 애플 로그인이 여기서만 다른 길을 탄다
 * (아이폰은 웹 방식이 끝까지 못 간다 → `src/lib/auth/appleNativeSignIn.ts`).
 *
 * ⚠️ 위와 같은 이유로 **화면을 그리는 도중에 부르지 마라**(서버엔 navigator 가 없다).
 *    버튼을 눌렀을 때처럼 «사용자 동작 뒤»에만 부른다.
 */
export function isIOSApp(): boolean {
  if (!isNativeApp()) return false;
  const platform = (window as unknown as { Capacitor?: { getPlatform?: () => string } })
    .Capacitor?.getPlatform?.();
  if (platform) return platform === "ios";
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}
