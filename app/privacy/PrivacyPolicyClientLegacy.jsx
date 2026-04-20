"use client";

import { useState } from "react";
import {
  getPrivacyPolicy,
  getPrivacySectionsList,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_VERSION,
} from "../../src/lib/legal/privacyPolicy";
import { useLang } from "../../src/lib/i18n/LangContext";

export default function PrivacyPolicyClientLegacy() {
  const langCode = useLang();
  const policy = getPrivacyPolicy(langCode);
  const sections = getPrivacySectionsList(langCode);
  const [activeId, setActiveId] = useState(null);

  // 번역 대기 언어인 경우 배너 표시
  const translationPending = policy._translationPending;
  const pageLabels = policy._labels || policy;

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        {/* Header */}
        <header className="mb-10 border-b border-gray-200 pb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">
            HEALO · Legal
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {pageLabels.pageTitle}
          </h1>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
            <span>
              {pageLabels.lastUpdated}: <strong>{PRIVACY_EFFECTIVE_DATE}</strong>
            </span>
            <span>
              {pageLabels.version}: <strong>{PRIVACY_VERSION}</strong>
            </span>
          </div>
          {translationPending && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              ⚠️ Translation for this language is pending professional legal review.
              The English version is shown below. For legal interpretation, please refer to
              the Korean or English version.
            </div>
          )}
        </header>

        <div className="grid md:grid-cols-4 gap-8">
          {/* Table of Contents (sticky sidebar on md+) */}
          <aside className="md:col-span-1 md:sticky md:top-20 md:self-start">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">
              {pageLabels.tableOfContents || "Contents"}
            </p>
            <nav className="space-y-1 max-h-[60vh] md:max-h-[calc(100vh-10rem)] overflow-y-auto pr-2">
              {sections.map((s, idx) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={() => setActiveId(s.id)}
                  className={`block text-xs py-1.5 px-2 rounded transition ${
                    activeId === s.id
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-gray-400 mr-2">{String(idx + 1).padStart(2, "0")}</span>
                  {s.title}
                </a>
              ))}
            </nav>
          </aside>

          {/* Body */}
          <article className="md:col-span-3 space-y-10 text-gray-800 leading-relaxed">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-20">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
                  {section.title}
                </h2>
                <div className="space-y-3 text-sm md:text-[15px] text-gray-700">
                  {section.body.map((paragraph, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </article>
        </div>

        {/* Footer notice */}
        <footer className="mt-16 pt-8 border-t border-gray-200 text-xs text-gray-500">
          <p>
            이 문서는 대한민국 개인정보보호법, 의료법, 의료해외진출법, 카자흐스탄
            94-V ЗРК, EU GDPR을 기반으로 작성되었습니다. 최종 법적 효력은 관할
            법령 및 변호사의 검토에 따릅니다.
          </p>
          <p className="mt-2">
            This document is drafted based on Korean PIPA, Medical Service Act,
            Medical Tourism Act, Kazakhstan Law 94-V, and EU GDPR. Final legal effect
            is subject to applicable laws and professional review.
          </p>
        </footer>
      </div>
    </div>
  );
}
