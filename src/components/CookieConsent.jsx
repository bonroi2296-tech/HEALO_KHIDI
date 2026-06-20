"use client";
import { useState, useEffect } from "react";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

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
          <p className="font-semibold text-gray-900 mb-1">Cookie Settings</p>
          <p>We use essential cookies for site functionality and analytics cookies to improve our service.{" "}
            <a href="/cookies" className="text-teal-700 underline">Learn more</a>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => accept("essential")} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            Essential Only
          </button>
          <button onClick={() => accept("all")} className="px-4 py-2 text-sm font-bold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition">
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
