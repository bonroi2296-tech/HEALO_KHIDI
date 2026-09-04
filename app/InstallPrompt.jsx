"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { splitLocale } from "@/lib/i18n/config";
import { isNativeApp } from "@/lib/isNativeApp";

// 스태프 포털·상담방에선 PWA 설치 배너 숨김(하단 fixed라 입력창·UI를 덮음 + 마케팅용이라 무관).
// /inquiry: AI챗이 풀하이트라 하단 fixed 배너가 입력칸을 덮음 → 전역 배너 대신 챗 안 인라인 힌트(ChatInstallHint) 사용.
// `/app` 은 설치 «전용» 안내 페이지라 같은 말이 두 번 뜬다(본문 + 이 하단 배너) → 거기선 숨긴다.
const HIDE_ON = ["/admin", "/coordinator", "/hospital", "/agency", "/clinic", "/consultation", "/inquiry", "/app"];

// PWA 설치 안내.
// - 안드로이드/데스크톱 크롬: beforeinstallprompt 이벤트를 잡아 "설치" 버튼 노출
//   (크롬 자동 배너는 한 번 설치/닫은 사람에겐 쿨다운으로 안 뜨지만, 이 이벤트는 페이지가
//    직접 쓸 수 있어 재방문자도 언제든 설치 가능).
// - iOS 사파리: 애플 정책상 자동/프로그램 설치가 없음 → "공유 → 홈 화면에 추가" 수동 안내만.
// 챗 인라인 힌트(ChatInstallHint)와 카피 공유 — 6개 언어 중복 방지.
export const INSTALL_COPY = {
  ko: { ios: "홈 화면에 추가하면 앱처럼 쓸 수 있어요", iosBody: "공유 버튼", iosBody2: "을 누른 뒤 ‘홈 화면에 추가’를 선택하세요", install: "healwith 앱을 설치하세요", cta: "설치", close: "닫기" },
  en: { ios: "Add healwith to your home screen", iosBody: "Tap the Share button", iosBody2: ", then ‘Add to Home Screen’", install: "Install the healwith app", cta: "Install", close: "Close" },
  ru: { ios: "Добавьте healwith на главный экран", iosBody: "Нажмите кнопку «Поделиться»", iosBody2: ", затем «На экран „Домой“»", install: "Установите приложение healwith", cta: "Установить", close: "Закрыть" },
  kz: { ios: "healwith қолданбасын негізгі экранға қосыңыз", iosBody: "«Бөлісу» түймесін басыңыз", iosBody2: ", содан соң «Негізгі экранға қосу»", install: "healwith қолданбасын орнатыңыз", cta: "Орнату", close: "Жабу" },
  zh: { ios: "将 healwith 添加到主屏幕", iosBody: "点按分享按钮", iosBody2: "，然后选择“添加到主屏幕”", install: "安装 healwith 应用", cta: "安装", close: "关闭" },
  ja: { ios: "healwith をホーム画面に追加", iosBody: "共有ボタンをタップ", iosBody2: "して「ホーム画面に追加」を選択", install: "healwith アプリをインストール", cta: "インストール", close: "閉じる" },
};

const DISMISS_KEY = "a2hs-dismissed";

export default function InstallPrompt({ lang = "en" }) {
  const pathname = usePathname() || "/";
  const [deferred, setDeferred] = useState(null); // beforeinstallprompt 이벤트(안드/데스크톱)
  const [iosHint, setIosHint] = useState(false);
  // 쿠키 동의 배너가 «아직 떠 있는 동안»에는 이 카드를 띄우지 않는다 — 한 번에 하나씩.
  //   2026-09-02 폰 실측(러시아어·iPhone 12): 첫 방문 화면에서 동의 배너·이 카드·하단 탭이
  //   동시에 떠 세로 **45%** 를 먹었고, 하필 홈의 핵심 문구와 「무료 상담」 단추가 잘렸다
  //   (한 번 동의하면 18% 로 줄지만, 현장 시연은 늘 «처음 여는 폰»이다).
  //   서로 비켜 앉게는 이미 돼 있다(--cookie-banner-h) — 문제는 겹침이 아니라 «쌓임»이었다.
  const [consentClosed, setConsentClosed] = useState(false);

  useEffect(() => {
    // 🍎 스토어 앱(Capacitor) 안이면 아예 뜨면 안 된다 — 2026-08-14 아이폰 화면 실측으로 발견.
    //    앱 안인데 «홈 화면에 추가하면 앱처럼 쓸 수 있어요» 가 떴다. 이유: 아래 standalone 검사가
    //    Capacitor WKWebView 에서는 false 이고(navigator.standalone 없음·display-mode 도 아님),
    //    이름표에는 iPhone·Safari 가 그대로 들어 있어 «아이폰 사파리 방문자»로 오인됐다.
    //    ⚠️ 사용자 혼란만이 아니라 애플 4.2(웹뷰 껍데기) 오해를 부를 수 있어 심사 위험이기도 하다.
    //    안드로이드 앱은 beforeinstallprompt 가 발화하지 않아 원래 안 떴다 → 아이폰 앱 전용 결함이었다.
    if (isNativeApp()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
      const isStandalone = window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
      if (isStandalone) return; // 이미 설치됨

      const ua = navigator.userAgent || "";
      const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      // ponytail: iOS Safari만 — Chrome/Firefox/Edge(iOS)는 공유→홈화면 흐름이 달라 잘못된 안내가 됨
      const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
      if (isIOS && isSafari) setIosHint(true);
    } catch { /* 비공개 모드 등 localStorage 막힘 — 무시 */ }

    // 동의 배너의 「순서 양보」 — 이미 동의했으면 곧바로, 아직이면 배너가 닫힐 때까지 기다린다.
    //   localStorage 가 막힌 브라우저(비공개 모드 등)에서는 배너 쪽도 못 뜨므로 기다리지 않는다.
    try {
      if (localStorage.getItem("healo_cookie_consent")) setConsentClosed(true);
    } catch { setConsentClosed(true); }

    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); }; // 크롬: 설치 가능해지면 발화
    const onInstalled = () => { setDeferred(null); try { localStorage.setItem(DISMISS_KEY, "1"); } catch {} };
    const onConsentClosed = () => setConsentClosed(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("cookie-consent-closed", onConsentClosed);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("cookie-consent-closed", onConsentClosed);
    };
  }, []);

  const t = INSTALL_COPY[lang] || INSTALL_COPY.en;
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
    setDeferred(null);
    setIosHint(false);
  };
  const doInstall = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* noop */ }
    setDeferred(null);
  };

  // 공개경로(/inquiry 등)는 proxy 가 /{locale}/ 프리픽스를 강제(브라우저 URL=/ru/inquiry) → usePathname 도 프리픽스 포함.
  // 프리픽스를 떼고 매칭해야 /ko/inquiry·/ru/inquiry 등 전 언어에서 숨김이 동작(startsWith 직접 매칭은 실패함).
  const [, barePath] = splitLocale(pathname);
  if (HIDE_ON.some((p) => barePath.startsWith(p))) return null;
  if (!deferred && !iosHint) return null;
  if (!consentClosed) return null; // 동의 배너가 먼저다 — 둘이 같이 뜨지 않는다

  // ⚠️ 아래 여백(bottom)은 인라인이 아니라 «클래스»로 준다 — 화면 폭에 따라 달라야 하고
  //    두 가지를 반드시 피해야 하기 때문이다(2026-08-03 실측으로 둘 다 실제로 겹쳤다):
  //      ① 쿠키 동의 배너(z-9999) — 이 카드(z-60)보다 위라서 그냥 «덮인다». 배너가 알려주는
  //         자기 높이(--cookie-banner-h)만큼 비켜 앉아야 한다(CookieConsent 주석의 그 규칙).
  //      ② 폰 하단 탭바(진료과목·문의·병원, 높이 5rem 자리) — 폰에서만 있으므로 md 이상은 작게.
  //    + 아래 안전영역(홈 인디케이터)도 더한다. 실측 전: 카드 699~808 vs 탭바 755~820 · 배너 590~820.
  const wrapCls =
    "fixed bottom-[calc(5rem+var(--cookie-banner-h,0px)+var(--healo-safe-bottom))] " +
    "md:bottom-[calc(1rem+var(--cookie-banner-h,0px)+var(--healo-safe-bottom))]";
  const wrap = { position: "fixed", left: 12, right: 12, zIndex: 60, maxWidth: 480, margin: "0 auto" };
  const card = { display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "12px 14px" };
  const icon = <img src="/icons/icon-96x96.png" alt="" width={40} height={40} style={{ borderRadius: 10, flexShrink: 0 }} />;
  const closeBtn = <button onClick={dismiss} aria-label={t.close} style={{ flexShrink: 0, background: "none", border: "none", fontSize: 20, lineHeight: 1, color: "#9ca3af", cursor: "pointer", padding: 4 }}>×</button>;

  // 안드로이드/데스크톱: 원클릭 설치 버튼
  if (deferred) {
    return (
      <div role="dialog" aria-label={t.install} className={wrapCls} style={wrap}>
        <div style={card}>
          {icon}
          <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "#111827", lineHeight: 1.35 }}>{t.install}</div>
          <button onClick={doInstall} style={{ flexShrink: 0, background: "#0f766e", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, padding: "8px 16px", cursor: "pointer" }}>{t.cta}</button>
          {closeBtn}
        </div>
      </div>
    );
  }

  // iOS 사파리: 수동 안내
  return (
    <div role="dialog" aria-label={t.ios} className={wrapCls} style={wrap}>
      <div style={{ ...card, alignItems: "flex-start", padding: "14px 16px" }}>
        {icon}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", lineHeight: 1.35 }}>{t.ios}</div>
          <div style={{ fontSize: 13, color: "#4b5563", marginTop: 4, lineHeight: 1.45 }}>
            {t.iosBody}
            <span aria-hidden="true" style={{ display: "inline-flex", verticalAlign: "-3px", margin: "0 3px" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4" /><path d="M8 8l4-4 4 4" /><path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
              </svg>
            </span>
            {t.iosBody2}
          </div>
        </div>
        {closeBtn}
      </div>
    </div>
  );
}
