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
 *    아예 없었다 — 그래서 8/5 에 고쳤는데도 폰에서는 그대로 꺼졌다
 *    (실측: 그 시점 `capacitor.build.gradle` 부품 4개 ↔ 지금 5개).
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

import { t, getLangCodeFromCookie } from "@/lib/i18n";

/** 「한 번 더 누르면 종료」가 유효한 시간. 안드로이드 관행이 2초다. */
const EXIT_WINDOW_MS = 2000;
const HINT_ID = "healo-back-exit-hint";

let registered = false;
/** 「지금 붙이는 중」 — 붙는 동안 또 부르면 받는 자리가 두 개가 된다(registerAndroidBackButton 주석 참고). */
let registering = false;
/** 「첫 화면에서 뒤로」를 누른 시각. null = 대기 없음(0 도 유효한 시각이라 falsy 검사 금지). */
let exitArmedAt: number | null = null;
let hintTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 이 화면이 실제로 «보이고 있는» 언어.
 * ⚠️ `__I18N__.__primary` 는 «주소의 언어»다. 쿠키로 다른 언어를 골라 둔 사람은 화면이 쿠키
 *    언어로 그려지므로(`LangContext` 가 쿠키를 본다) 안내만 딴 언어로 뜬다 → 쿠키를 먼저 본다.
 */
function pageLang(): string {
  if (typeof window === "undefined") return "en";
  if (typeof document !== "undefined" && document.cookie.includes("healo_lang=")) {
    return getLangCodeFromCookie();
  }
  const reg = (window as unknown as { __I18N__?: { __primary?: string } }).__I18N__;
  return reg?.__primary || "en";
}

/** 떠 있는 안내를 지운다(대기가 풀리거나 화면이 바뀌면 남아 있으면 안 된다). */
function dismissExitHint(): void {
  if (hintTimer) {
    clearTimeout(hintTimer);
    hintTimer = null;
  }
  if (typeof document === "undefined") return;
  document.getElementById(HINT_ID)?.remove();
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
    // 아래 위치는 하단 고정 요소의 사이트 공통 규칙 그대로 — 하단 내비 + «쿠키 동의 띠» + 안전영역.
    // (띠를 빼먹어 첫 방문자 화면이 덮인 사고가 2026-08-19 에 있었다 — ClientShell 주석 참고.)
    el.className =
      "fixed left-1/2 z-[9999] -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg " +
      "bottom-[calc(5rem+var(--cookie-banner-h,0px)+var(--healo-safe-bottom))]";
    el.style.pointerEvents = "none";
    document.body.appendChild(el);
  }
  el.textContent = text;
  if (hintTimer) clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    hintTimer = null;
    document.getElementById(HINT_ID)?.remove();
  }, EXIT_WINDOW_MS);
}

export type BackPressActions = {
  goBack: () => void;
  exitApp: () => void;
  /** 안내 띄우기·지우기. 기본값은 화면에 알약을 그린다(시험에서는 갈아끼운다). */
  showHint?: () => void;
  hideHint?: () => void;
  now?: () => number;
};

/**
 * 뒤로가기 한 번을 처리한다. 시험에서 직접 부를 수 있게 떼어 놨다
 * (캡시터 없이도 「두 번 눌러야 꺼진다」를 기계가 잰다).
 */
export function handleBackPress(canGoBack: boolean, actions: BackPressActions): void {
  const now = actions.now ? actions.now() : Date.now();
  const show = actions.showHint || showExitHint;
  const hide = actions.hideHint || dismissExitHint;

  if (canGoBack) {
    // 화면이 바뀌므로 대기·안내를 모두 거둔다(안 거두면 다음 화면에 «한 번 더 누르면 종료»가 남는다).
    exitArmedAt = null;
    hide();
    actions.goBack();
    return;
  }
  // 안내가 «떠 있는 동안»만 유효하다. 경계에서 «안내는 사라졌는데 꺼지는» 일이 없게 < 로 잰다.
  if (exitArmedAt !== null && now - exitArmedAt < EXIT_WINDOW_MS) {
    exitArmedAt = null;
    hide();
    actions.exitApp();
    return;
  }
  exitArmedAt = now;
  show();
}

/** 시험용 — 모듈에 남은 「종료 대기」 상태와 안내를 지운다. (`registered` 는 건드리지 않는다:
 *  되돌리면 뒤로가기 받는 자리가 두 개가 되어 한 번 눌러도 두 번 처리된다.) */
export function __resetBackButtonState(): void {
  exitArmedAt = null;
  dismissExitHint();
}

export async function registerAndroidBackButton(): Promise<void> {
  if (typeof window === "undefined") return;
  if (registered || registering) return;
  // ⚠️ 「붙이는 중」에도 잠가야 한다. 아래 `registered = true` 는 addListener 가 «끝난 뒤»에야
  //    세워지는데(그 이유는 아래 주석), 그 사이에 이 함수가 한 번 더 불리면 위의 `registered` 검사를
  //    둘 다 통과해 **받는 자리가 두 개** 붙는다. 그러면 한 번 누른 뒤로가기가 두 번 처리되어
  //    첫 번째가 안내를 띄우고 두 번째가 그 자리에서 앱을 꺼버린다 — 겉보기 증상이
  //    「고치기 전」과 똑같아서 고쳐졌는지 알 수가 없다.
  //    2026-08-20 흉내기 실측(로그): 한 번 눌렀는데
  //      SWEEP-HANDLE armed=null → SWEEP-HANDLE armed=1787188958382 → exitApp
  //    두 번 불리는 경로는 실제로 있다 — 리액트가 화면을 다시 그리며 이 등록을 다시 부른다.
  registering = true;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return; // 브라우저면 종료
    if (Capacitor.getPlatform() !== "android") return; // 아이폰엔 이 버튼이 없다

    const { App } = await import("@capacitor/app");

    await App.addListener("backButton", ({ canGoBack }) => {
      handleBackPress(canGoBack, {
        goBack: () => window.history.back(),
        exitApp: () => {
          void App.exitApp();
        },
      });
    });
    // ⚠️ 붙는 데 «성공한 뒤»에 표시한다. 먼저 세워 두면 addListener 가 실패했을 때
    //    다시 시도할 길이 막혀, 뒤로가기가 조용히 안 먹는 상태로 굳는다.
    registered = true;
  } catch {
    /* 플러그인이 없거나 네이티브가 아님 → 무시(웹에서 정상) */
  } finally {
    registering = false; // 실패했으면 다음에 다시 시도할 수 있게 풀어 준다
  }
}
