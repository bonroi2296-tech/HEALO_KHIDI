"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";

// 6개 활성언어(ko·en·ru·kz·zh·ja) — 카피는 중앙 i18n 사전(cookieConsent.*). 모든 공개/환자 페이지 하단에 뜨는 동의창.
export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const lang = useLang();
  const tr = (k) => t(`cookieConsent.${k}`, lang);

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
