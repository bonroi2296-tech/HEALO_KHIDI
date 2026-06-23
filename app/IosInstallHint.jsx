"use client";

import { useEffect, useState } from "react";

// iOS 사파리는 자동 "앱 설치" 배너가 없음(애플 정책) → 공유 버튼으로 수동 추가해야 함.
// 그래서 iOS 사파리로 들어온 사람에게만 "공유 → 홈 화면에 추가" 안내를 띄운다.
const T = {
  ko: { title: "홈 화면에 추가하면 앱처럼 쓸 수 있어요", body: "공유 버튼", body2: "을 누른 뒤 ‘홈 화면에 추가’를 선택하세요", close: "닫기" },
  en: { title: "Add healwith to your home screen", body: "Tap the Share button", body2: ", then ‘Add to Home Screen’", close: "Close" },
  ru: { title: "Добавьте healwith на главный экран", body: "Нажмите кнопку «Поделиться»", body2: ", затем «На экран „Домой“»", close: "Закрыть" },
  kz: { title: "healwith қолданбасын негізгі экранға қосыңыз", body: "«Бөлісу» түймесін басыңыз", body2: ", содан соң «Негізгі экранға қосу»", close: "Жабу" },
  zh: { title: "将 healwith 添加到主屏幕", body: "点按分享按钮", body2: "，然后选择“添加到主屏幕”", close: "关闭" },
  ja: { title: "healwith をホーム画面に追加", body: "共有ボタンをタップ", body2: "して「ホーム画面に追加」を選択", close: "閉じる" },
};

const DISMISS_KEY = "ios-a2hs-dismissed";

export default function IosInstallHint({ lang = "en" }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const ua = navigator.userAgent || "";
      const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      // ponytail: iOS Safari만 대상 — Chrome/Firefox/Edge(iOS)는 공유→홈화면 흐름이 달라 잘못된 안내가 됨
      const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
      const isStandalone = window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
      if (isIOS && isSafari && !isStandalone && localStorage.getItem(DISMISS_KEY) !== "1") setShow(true);
    } catch { /* 비공개 모드 등 localStorage 막힘 — 무시 */ }
  }, []);

  if (!show) return null;
  const t = T[lang] || T.en;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
    setShow(false);
  };

  return (
    <div role="dialog" aria-label={t.title} style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 60, maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "14px 16px" }}>
        <img src="/icons/icon-96x96.png" alt="" width={40} height={40} style={{ borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", lineHeight: 1.35 }}>{t.title}</div>
          <div style={{ fontSize: 13, color: "#4b5563", marginTop: 4, lineHeight: 1.45 }}>
            {t.body}
            <span aria-hidden="true" style={{ display: "inline-flex", verticalAlign: "-3px", margin: "0 3px" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4" /><path d="M8 8l4-4 4 4" /><path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
              </svg>
            </span>
            {t.body2}
          </div>
        </div>
        <button onClick={dismiss} aria-label={t.close} style={{ flexShrink: 0, background: "none", border: "none", fontSize: 20, lineHeight: 1, color: "#9ca3af", cursor: "pointer", padding: 4 }}>×</button>
      </div>
    </div>
  );
}
