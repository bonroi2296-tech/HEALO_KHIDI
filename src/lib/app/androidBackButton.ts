/**
 * 안드로이드 하드웨어 「뒤로」 버튼 받기.
 *
 * 왜 필요한가 (2026-08-04 흉내기 실측):
 *   앱을 켜고 화면을 옮긴 뒤 뒤로가기를 «한 번» 누르자 앞 화면으로 가지 않고
 *   **앱이 그대로 꺼져 홈 화면으로 나갔다**(누르기 전 `kr.co.healwith.app/.MainActivity`
 *   → 누른 뒤 `com.google.android.apps.nexuslauncher`).
 *   캡시터 8 안드로이드 코어에는 뒤로가기를 받는 코드가 아예 없고(`onBackPressed`·
 *   `canGoBack` 0건), 우리 `MainActivity` 도 빈 껍데기라 안드로이드 기본 동작
 *   (=화면 닫기)이 그대로 나온 것이다.
 *
 * 하는 일:
 *   · 웹 화면에 「앞 화면」이 남아 있으면 → 그리로 되돌린다.
 *   · 더 갈 데가 없으면(첫 화면) → 그때만 앱을 닫는다. 안드로이드 사용자가 기대하는 동작.
 *
 * ⚠️ 브라우저에서는 아무 일도 하지 않는다(플러그인이 no-op). 웹은 브라우저 뒤로가기가 있다.
 * ⚠️ 아이폰에는 하드웨어 뒤로가기 자체가 없다 — 아이폰은 화면 쓸어넘기기를 켜야 하는데
 *    그건 앱 껍데기(네이티브) 설정이라 별건이다.
 */

let registered = false;

export async function registerAndroidBackButton(): Promise<void> {
  if (typeof window === "undefined") return;
  if (registered) return;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return; // 브라우저면 종료
    if (Capacitor.getPlatform() !== "android") return; // 아이폰엔 이 버튼이 없다

    const { App } = await import("@capacitor/app");
    registered = true;

    await App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch {
    /* 플러그인이 없거나 네이티브가 아님 → 무시(웹에서 정상) */
  }
}
