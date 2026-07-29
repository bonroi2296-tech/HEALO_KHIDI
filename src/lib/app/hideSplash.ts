/**
 * healwith: 시작화면(스플래시) 걷기 — 스토어 앱 전용, 웹에선 아무 일도 안 함.
 *
 * 왜: 이 앱은 라이브 로드라 첫 화면이 «네트워크가 끝나야» 뜬다. 시작화면이 정해진 시간에
 *     기계적으로 걷히면 저속 회선(카자흐·러시아)에서 흰 화면을 보게 된다.
 *     → 웹이 실제로 준비된 순간 우리가 걷는다.
 *
 * ⚠️ 그렇다고 `launchAutoHide: false` 로 두면 안 된다 — 웹 JS 가 한 번이라도 안 돌면
 *    시작화면에서 영영 안 넘어가 앱이 못 쓰게 된다(2026-07-28 에뮬레이터에서 실제로 밟음).
 *    설정은 `launchAutoHide: true` + 3초 안전망으로 두고, 이 함수는 «더 빨리» 걷는 역할만 한다.
 */
"use client";

let done = false;

export async function hideSplashWhenReady(): Promise<void> {
  if (done) return;
  if (typeof window === "undefined") return;
  done = true;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return; // 웹이면 종료
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch {
    // 플러그인이 없거나 이미 걷혔으면 무시 — 3초 안전망이 어차피 걷는다.
  }
}
