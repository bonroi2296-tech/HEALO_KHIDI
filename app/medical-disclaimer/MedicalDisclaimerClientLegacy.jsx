"use client";

import { getMedicalDisclaimer } from "@/lib/legal/medicalDisclaimer";
import { useLang } from "@/lib/i18n/LangContext";

export default function MedicalDisclaimerClientLegacy() {
  const langCode = useLang();
  const disclaimer = getMedicalDisclaimer(langCode);

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <header className="mb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-amber-700 mb-2">
            HEALO · Medical Notice
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {disclaimer.title}
          </h1>
        </header>

        {/* Short summary — bold, prominent */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-5 mb-10 rounded-r-lg">
          <p className="text-amber-900 font-semibold text-base md:text-lg leading-relaxed">
            {disclaimer.short}
          </p>
        </div>

        {/* Full disclaimer */}
        <div className="space-y-4 text-gray-700 leading-relaxed text-sm md:text-[15px]">
          {disclaimer.full.map((paragraph, i) => (
            <p key={i} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>

        {/* AI-specific note */}
        <div className="mt-10 bg-gray-50 border border-gray-200 rounded-lg p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">AI Notice</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            {disclaimer.aiNote}
          </p>
        </div>

        <footer className="mt-12 pt-8 border-t border-gray-200 text-xs text-gray-500">
          <p>
            관련 법적 근거: 의료법 §27 (무면허 의료행위 금지), 의료기기법.
            응급상황에서는 본 페이지의 응급 연락처 또는 각국의 응급 서비스에
            즉시 연락하시기 바랍니다.
          </p>
        </footer>
      </div>
    </div>
  );
}
