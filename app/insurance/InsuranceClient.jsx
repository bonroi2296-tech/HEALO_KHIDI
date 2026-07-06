"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useLang } from "@/lib/i18n/LangContext";
import { COPY } from "./copy";

export default function InsuranceClient() {
  const lang = useLang() || "ko";
  const c = COPY[lang] || COPY.ko;

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-8 pb-10 md:pt-20 md:pb-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-5">
          {c.eyebrow}
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight whitespace-pre-line">
          {c.heroTitle}
        </h1>
        <p className="mt-5 text-base md:text-lg text-gray-500 leading-relaxed max-w-2xl">
          {c.heroLede}
        </p>
        <Link
          href="/inquiry"
          className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-colors duration-200"
        >
          {c.heroCta} <ArrowRight size={18} />
        </Link>
      </section>

      {/* Insurance products */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{c.productsTitle}</h2>
          <p className="text-base text-gray-600 leading-relaxed max-w-3xl mb-8 md:mb-10">{c.productsLede}</p>
          <div className="space-y-4 md:space-y-5">
            {c.products.map((p, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 md:p-8 shadow-sm">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-3">{p.title}</h3>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed whitespace-pre-line">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What insurance covers */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{c.coverageTitle}</h2>
        <p className="text-base text-gray-600 leading-relaxed max-w-3xl mb-8 md:mb-10">{c.coverageLede}</p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {c.coverage.map((item, i) => (
            <li key={i} className="flex gap-3 border border-gray-200 rounded-xl p-5 md:p-6">
              <CheckCircle size={20} className="text-teal-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 5-step process — care-journey와 동일한 타임라인 문법 */}
      <section className="max-w-4xl mx-auto px-4 pt-0 pb-12 md:pb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-10">{c.stepsTitle}</h2>
        <ol className="relative">
          <span className="absolute left-[18px] top-3 bottom-3 w-px bg-teal-200" aria-hidden="true" />
          {c.steps.map((s, i) => (
            <li key={i} className="relative flex gap-4 md:gap-6 pb-7 last:pb-0">
              <span className="relative z-10 shrink-0 w-9 h-9 rounded-full bg-teal-700 text-white font-bold flex items-center justify-center text-sm ring-4 ring-white">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 border border-gray-200 rounded-xl p-5 md:p-6 hover:border-teal-300 hover:shadow-sm transition-all duration-200">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm md:text-base text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Why Korea */}
      <section className="max-w-4xl mx-auto px-4 pt-0 pb-12 md:pb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{c.whyKoreaTitle}</h2>
        <p className="text-base text-gray-600 leading-relaxed max-w-3xl mb-8 md:mb-10">{c.whyKoreaLede}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {c.wk.map((w, i) => (
            <div key={i} className={`border rounded-xl p-5 md:p-6 ${i === 0 ? "border-teal-200 bg-teal-50/50" : "border-gray-200"}`}>
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 tabular-nums">{w.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* B2B — 보험사·어시스턴스 제휴 안내 */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{c.partnerTitle}</h2>
          <p className="text-base text-gray-600 leading-relaxed max-w-3xl">{c.partnerBody}</p>
          {/* 언급된 어시스턴스사 로고 — 로컬 자산(핫링크 아님). 서면 사용허가 전 실서비스 반영 금지(RESEARCH.md §6) */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 mt-8">
            <Image src="/images/insurance/managedcare-ru-logo.png" alt="ManagedCare Russia (МСР)" width={130} height={41} className="h-9 w-auto" />
            <Image src="/images/insurance/madanes-global-logo.png" alt="Madanes Global" width={200} height={25} className="h-6 w-auto" />
          </div>
        </div>
      </section>

      {/* FAQ — 네이티브 details (JS 상태 불필요) */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">{c.faqTitle}</h2>
        <div className="space-y-3">
          {c.faq.map((f, i) => (
            <details key={i} className="group border border-gray-200 rounded-xl px-5 py-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-base font-bold text-gray-900">
                {f.q}
                <span className="text-gray-400 transition-transform duration-200 group-open:rotate-90" aria-hidden="true">
                  <ArrowRight size={16} />
                </span>
              </summary>
              <p className="mt-3 text-sm md:text-base text-gray-500 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
        {/* Disclaimer */}
        <div className="mt-10 border-t border-gray-200 pt-6">
          <h3 className="text-sm font-bold text-gray-700 mb-2">{c.disclaimerTitle}</h3>
          <p className="text-xs text-gray-500 leading-relaxed max-w-3xl">{c.disclaimerBody}</p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-teal-700">
        <div className="max-w-4xl mx-auto px-4 py-14 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{c.closingTitle}</h2>
          <p className="text-teal-50 text-sm md:text-base mb-8 max-w-xl mx-auto leading-relaxed">{c.closingBody}</p>
          <Link
            href="/inquiry"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-colors duration-200"
          >
            {c.closingCta} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
