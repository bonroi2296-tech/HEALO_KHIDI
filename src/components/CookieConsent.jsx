"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n/LangContext";

// 6개 활성언어(ko·en·ru·kz·zh·ja) 인라인 카피 — 모든 공개/환자 페이지 하단에 뜨는 동의창.
const COPY = {
  en: {
    title: "Cookie Settings",
    body: "We use essential cookies for site functionality and analytics cookies to improve our service.",
    learnMore: "Learn more",
    essentialOnly: "Essential Only",
    acceptAll: "Accept All",
  },
  ko: {
    title: "쿠키 설정",
    body: "사이트 기능을 위한 필수 쿠키와 서비스 개선을 위한 분석 쿠키를 사용합니다.",
    learnMore: "자세히 보기",
    essentialOnly: "필수만 허용",
    acceptAll: "모두 허용",
  },
  ru: {
    title: "Настройки файлов cookie",
    body: "Мы используем необходимые файлы cookie для работы сайта и аналитические — для улучшения сервиса.",
    learnMore: "Подробнее",
    essentialOnly: "Только необходимые",
    acceptAll: "Принять все",
  },
  kz: {
    title: "Cookie параметрлері",
    body: "Біз сайт жұмысы үшін қажетті cookie файлдарын және қызметті жақсарту үшін аналитикалық cookie файлдарын қолданамыз.",
    learnMore: "Толығырақ",
    essentialOnly: "Тек қажеттілері",
    acceptAll: "Барлығын қабылдау",
  },
  zh: {
    title: "Cookie 设置",
    body: "我们使用必要 Cookie 来保障网站功能，并使用分析 Cookie 来改进服务。",
    learnMore: "了解更多",
    essentialOnly: "仅必要",
    acceptAll: "全部接受",
  },
  ja: {
    title: "Cookie 設定",
    body: "サイト機能のための必須 Cookie と、サービス向上のための分析 Cookie を使用します。",
    learnMore: "詳細",
    essentialOnly: "必須のみ",
    acceptAll: "すべて許可",
  },
};

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const lang = useLang();
  const c = COPY[lang] || COPY.en;

  useEffect(() => {
    const consent = localStorage.getItem("healo_cookie_consent");
    if (!consent) setShow(true);
  }, []);

  const accept = (level) => {
    localStorage.setItem("healo_cookie_consent", level);
    setShow(false);
    if (level === "all") window.dispatchEvent(new Event("cookie-consent-granted"));
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-200 shadow-2xl p-4 md:p-6 animate-in slide-in-from-bottom">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1 text-sm text-gray-600">
          <p className="font-semibold text-gray-900 mb-1">{c.title}</p>
          <p>{c.body}{" "}
            <a href="/cookies" className="text-teal-700 underline">{c.learnMore}</a>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => accept("essential")} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            {c.essentialOnly}
          </button>
          <button onClick={() => accept("all")} className="px-4 py-2 text-sm font-bold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition">
            {c.acceptAll}
          </button>
        </div>
      </div>
    </div>
  );
}
