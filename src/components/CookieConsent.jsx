"use client";
import { useState, useEffect, useRef } from "react";
import { useLang } from "@/lib/i18n/LangContext";
import { localeHref } from "@/lib/i18n/config";
import { t } from "@/lib/i18n";
import { isNativeApp } from "@/lib/isNativeApp";

// 6개 활성언어(ko·en·ru·kz·zh·ja) — 카피는 중앙 i18n 사전(cookieConsent.*). 모든 공개/환자 페이지 하단에 뜨는 동의창.
//
// ⚠️ 이 배너는 `fixed bottom-0 z-[9999]` 라 **화면 하단에 붙는 다른 UI를 전부 덮는다.**
//    2026-07-20 실통화 중 상담방 하단 조작바를 덮어 «채팅 버튼을 누르려다 배너 링크가 눌려
//    통화에서 이탈»한 실사고가 있었고(그때는 상담방만 예외 처리 = 점 수리), 2026-07-28 엔
//    코디 콘텐츠 편집기의 「저장」 버튼도 같은 이유로 클릭 자체가 막히는 게 실측됐다.
//    → 이제 배너가 «자기 높이»를 `--cookie-banner-h` 로 알려주고, 하단 고정 바들이 그만큼
//      비켜 앉는다(배너가 닫히면 변수가 지워져 0으로 복귀).
//
//    ✅ 새로 화면 하단에 붙는 UI를 만들 땐 **바닥 여백에 이 변수를 더해라**:
//        · 바닥에 딱 붙는 바      → `bottom-[var(--cookie-banner-h,0px)]`
//        · 여백을 두고 뜨는 버튼   → `bottom-[calc(1.25rem+var(--cookie-banner-h,0px))]`  ← 원래 여백 + 변수
//        · 본문 하단 예약 여백     → `pb-[calc(6rem+var(--cookie-banner-h,0px))]`
//      ⚠️ 오프셋이 있는 요소(`bottom-5`·`bottom-6` 등)를 그냥 `bottom-[var(...)]` 로 바꾸면
//         **원래 여백이 날아가** 배너에 딱 붙는다. 반드시 `calc(원래값 + 변수)` 로.
//         (2026-07-28 독립 리뷰가 이 함정을 잡았다 — 1차 수정이 `bottom-0` 인 바만 고쳐
//          데스크톱 문의 FAB·백오피스 「사용설명서」 버튼이 그대로 덮여 있었다.)
//
//    배너보다 위에 떠야 하는 모달은 z 를 `z-[10000]` 이상으로(동의 UI 를 가리는 게 아니라,
//    사용자가 «지금 연» 창이 배너에 막히지 않게).
const BANNER_H_VAR = "--cookie-banner-h";

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const boxRef = useRef(null);
  const lang = useLang();
  const tr = (k) => t(`cookieConsent.${k}`, lang);

  useEffect(() => {
    if (localStorage.getItem("healo_cookie_consent")) return;
    // 📱 스토어 앱 안에서는 이 배너를 띄우지 않는다(2026-07-28 PO 실기기 확인 — «앱에서 쿠키
    //    허용 배너 뜨는 건 본 적 없다»). 네이티브 앱의 관례가 아니고, 라이브로드라 웹 UI 가
    //    그대로 새어 나온 것 = «웹사이트를 앱으로 감쌌다»는 티가 난다(애플 4.2 심사에도 불리).
    //    대신 **필수 쿠키만 허용**으로 두고 조용히 넘어간다 — 묻지 않았으니 분석 쿠키는 안 쓴다
    //    (동의 없이 수집하지 않는 쪽이 항상 안전). 앱에서 분석을 켜려면 설정에 토글을 만들 것.
    if (isNativeApp()) {
      localStorage.setItem("healo_cookie_consent", "essential");
      return;
    }
    setShow(true);
  }, []);

  // 높이를 상수로 못 박지 않는 이유: 6개 언어 글자 길이·화면 폭에 따라 2~3줄이 된다(실측 88~199px).
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
    // 「배너가 닫혔다」는 «분석을 허용했다»와 다른 신호다 — 둘 중 무엇을 눌렀든 발화한다.
    //   PWA 설치 안내(InstallPrompt)가 이걸 기다렸다가 그제서야 뜬다.
    //   왜: 첫 방문자 화면에 동의 배너·설치 안내·하단 탭이 «동시에» 떠서 세로 45%를 먹었다
    //   (2026-09-02 폰 실측). 서로 비켜 앉기는 하지만 쌓이면 핵심 문구와 CTA 가 잘린다.
    window.dispatchEvent(new Event("cookie-consent-closed"));
  };

  if (!show) return null;

  return (
    <div ref={boxRef} className="fixed bottom-0 left-0 right-0 z-[9999] pb-safe-area bg-white border-t border-gray-200 shadow-2xl p-4 md:p-6 animate-in slide-in-from-bottom">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1 text-sm text-gray-600">
          <p className="font-semibold text-gray-900 mb-1">{tr("title")}</p>
          <p>{tr("body")}{" "}
            <a href={localeHref("/cookies", lang)} className="touch-inline text-teal-700 underline">{tr("learnMore")}</a>
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
