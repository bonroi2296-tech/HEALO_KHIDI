/**
 * 안드로이드 하드웨어 「뒤로」 버튼 받기.
 *
 * 왜 필요한가 (2026-08-04 흉내기 실측):
 *   앱을 켜고 화면을 옮긴 뒤 뒤로가기를 «한 번» 누르자 앞 화면으로 가지 않고
 *   **앱이 그대로 꺼져 홈 화면으로 나갔다**(누르기 전 `kr.co.healwith.app/.MainActivity`
 *   → 누른 뒤 `com.google.android.apps.nexuslauncher`).
 *   캡시터 8 안드로이드 «코어»에는 뒤로가기를 받는 코드가 없고(`BridgeActivity` 0건),
 *   그걸 받는 것은 **`@capacitor/app` 플러그인**이다(`AppPlugin.load()` 가 안드로이드의
 *   뒤로가기 배차대(OnBackPressedDispatcher)에 손을 든다). 그 부품이 앱에 없으면
 *   안드로이드 기본 동작(=화면 닫기)이 그대로 나온다.
 *
 * 🛑 **이 파일만 고쳐서는 폰에 반영되지 않는다.** `@capacitor/app` 은 «네이티브 부품»이라
 *    앱 파일(AAB)을 새로 구워 스토어에 올려야 들어간다. 웹 배포로는 안 간다.
 *    실제로 2026-08-19 PO 제보 시점의 스토어 판(빌드 7 / 1.0.6, 8/4 소스)에는 이 부품이
 *    아예 없었다 — 그래서 8/5 에 고쳤는데도 폰에서는 그대로 꺼졌다.
 *    ⚠️ 「앱에 안 들어간 네이티브 고침」은 이제 `npm run sweep` 의 «앱» 칸이 매번 알린다.
 *
 * 하는 일:
 *   · 웹 화면에 「앞 화면」이 남아 있으면 → 그리로 되돌린다.
 *   · 더 갈 데가 없으면(첫 화면) → **바로 끄지 않는다.** 안내를 띄우고, 2초 안에 «한 번 더»
 *     눌렀을 때만 끈다. 안드로이드 앱들이 쓰는 「한 번 더 누르면 종료」 방식.
 *     왜: 한 번에 꺼지면 «뒤로 갔는데 앱이 죽었다»로 읽힌다(PO 제보 문장 그대로다).
 *     덮개(모달·서랍)가 열려 있어 뒤로 갈 데가 없는 경우에도 이 안내가 완충 역할을 한다.
 *
 * ⚠️ 브라우저에서는 아무 일도 하지 않는다(플러그인이 no-op). 웹은 브라우저 뒤로가기가 있다.
 * ⚠️ 아이폰에는 하드웨어 뒤로가기 자체가 없다 — 아이폰은 화면 쓸어넘기기를 켜야 하는데
 *    그건 앱 껍데기(네이티브) 설정이라 별건이다.
 */
"use client";

import { t } from "@/lib/i18n";

/** 「한 번 더 누르면 종료」가 유효한 시간. 안드로이드 관행이 2초다. */
const EXIT_WINDOW_MS = 2000;
const HINT_ID = "healo-back-exit-hint";

let registered = false;
/** 마지막으로 「첫 화면에서 뒤로」를 누른 시각. 0 = 대기 없음. */
let exitArmedAt = 0;
let hintTimer: ReturnType<typeof setTimeout> | null = null;

/** 이 페이지가 실제로 보고 있는 언어(우리 내부 코드). 사전을 심는 스크립트가 넣어 둔 값. */
function pageLang(): string {
  if (typeof window === "undefined") return "en";
  const reg = (window as unknown as { __I18N__?: { __primary?: string } }).__I18N__;
  return reg?.__primary || "en";
}

/** 화면 아래에 잠깐 뜨는 안내 알약. 앱 안에서만 뜨므로 웹 화면에는 영향이 없다. */
function showExitHint(): void {
  if (typeof document === "undefined") return; // 서버·시험(노드)에서는 그릴 화면이 없다
  const text = t("app.backAgainToExit", pageLang());
  let el = document.getElementById(HINT_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = HINT_ID;
    el.setAttribute("role", "status");
    // 색·모서리는 DESIGN.md 토큰 안에서 고른다(중립 회색 900 + 흰 글씨 = 대비 충분).
    el.className =
      "fixed left-1/2 z-[9999] -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg";
    // 하단 고정 내비 위로 띄운다(안전영역 포함).
    el.style.bottom = "calc(var(--healo-safe-bottom, 0px) + 5.5rem)";
    el.style.pointerEvents = "none";
    document.body.appendChild(el);
  }
  el.textContent = text;
  if (hintTimer) clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    document.getElementById(HINT_ID)?.remove();
    hintTimer = null;
  }, EXIT_WINDOW_MS);
}

/**
 * 뒤로가기 한 번을 처리한다. 시험에서 직접 부를 수 있게 떼어 놨다
 * (캡시터 없이도 「두 번 눌러야 꺼진다」를 기계가 잰다).
 */
export function handleBackPress(
  canGoBack: boolean,
  actions: { goBack: () => void; exitApp: () => void; now?: () => number },
): void {
  const now = actions.now ? actions.now() : Date.now();
  if (canGoBack) {
    exitArmedAt = 0;
    actions.goBack();
    return;
  }
  if (exitArmedAt && now - exitArmedAt <= EXIT_WINDOW_MS) {
    exitArmedAt = 0;
    actions.exitApp();
    return;
  }
  exitArmedAt = now;
  showExitHint();
}

/** 시험용 — 모듈에 남은 「종료 대기」 상태를 지운다. */
export function __resetBackButtonState(): void {
  exitArmedAt = 0;
  registered = false;
}

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
      handleBackPress(canGoBack, {
        goBack: () => window.history.back(),
        exitApp: () => {
          void App.exitApp();
        },
      });
    });
  } catch {
    /* 플러그인이 없거나 네이티브가 아님 → 무시(웹에서 정상) */
  }
}
