"use client";
import { useState, useEffect, useRef } from "react";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";

// 6개 활성언어(ko·en·ru·kz·zh·ja) — 카피는 중앙 i18n 사전(cookieConsent.*). 모든 공개/환자 페이지 하단에 뜨는 동의창.
//
// ⚠️ 이 배너는 `fixed bottom-0 z-[9999]` 라 **화면 하단에 붙는 다른 UI를 전부 덮는다.**
//    2026-07-20 실통화 중 상담방 하단 조작바를 덮어 «채팅 버튼을 누르려다 배너 링크가 눌려
//    통화에서 이탈»한 실사고가 있었고(그때는 상담방만 예외 처리 = 점 수리), 2026-07-28 엔
//    코디 콘텐츠 편집기의 「저장」 버튼도 같은 이유로 클릭 자체가 막히는 게 실측됐다.
//    → 이제 배너가 «자기 높이»를 `--cookie-banner-h` 로 알려주고, 하단 고정/스티키 바들은
//      `bottom-[var(--cookie-banner-h,0px)]` 로 그만큼 비켜 앉는다(배너가 닫히면 0으로 복귀).
//    ✅ 새로 하단 고정 UI를 만들 땐 `bottom-0` 대신 이 변수를 써라.
const BANNER_H_VAR = "--cookie-banner-h";

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const boxRef = useRef(null);
  const lang = useLang();
  const tr = (k) => t(`cookieConsent.${k}`, lang);

  useEffect(() => {
    const consent = localStorage.getItem("healo_cookie_consent");
    if (!consent) setShow(true);
  }, []);

  // 높이를 상수로 못 박지 않는 이유: 6개 언어 글자 길이·화면 폭에 따라 2~3줄이 된다(실측 88~176px).
  useEffect(() => {
    const root = document.documentElement;
    const clear = () => root.style.removeProperty(BANNER_H_VAR);
    if (!show) { clear(); return; }
    const el = boxRef.current;
    if (!el) return;
    const apply = () => root.style.setProperty(BANNER_H_VAR, `${Math.round(el.getBoundingClientRect().height)}px`);
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    window.addEventListener("resize", apply);
    return () => { ro?.disconnect(); window.removeEventListener("resize", apply); clear(); };
  }, [show]);

  const accept = (level) => {
    localStorage.setItem("healo_cookie_consent", level);
    setShow(false);
    if (level === "all") window.dispatchEvent(new Event("cookie-consent-granted"));
  };

  if (!show) return null;

  return (
    <div ref={boxRef} className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-200 shadow-2xl p-4 md:p-6 animate-in slide-in-from-bottom">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1 text-sm text-gray-600">
          <p className="font-semibold text-gray-900 mb-1">{tr("title")}</p>
          <p>{tr("body")}{" "}
            <a href="/cookies" className="text-teal-700 underline">{tr("learnMore")}</a>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => accept("essential")} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            {tr("essentialOnly")}
          </button>
          <button onClick={() => accept("all")} className="px-4 py-2 text-sm font-bold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition">
            {tr("acceptAll")}
          </button>
        </div>
      </div>
    </div>
  );
}
