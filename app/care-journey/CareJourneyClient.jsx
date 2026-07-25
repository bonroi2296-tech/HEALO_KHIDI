"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";
import SocialProofSection from "@/components/SocialProofSection";

/* ───────── 제휴 병원 네트워크 (실제 제휴/협진 병원만) ─────────
   ⚠️ 서울아산·삼성서울 등은 실제 제휴기관이 아니므로 넣지 않음(가짜 금지).
   실제: 면력한방병원 4개 지점(제휴) + 협진 대학병원 4곳.
   문구는 중앙 i18n 사전(careJourney.*) — 여기엔 키만 둔다. */
const PARTNER_GROUPS = {
  immune: {
    labelKey: "careJourney.partnerImmuneGroupTitle",
    itemKeys: [
      "careJourney.partnerImmune1",
      "careJourney.partnerImmune2",
      "careJourney.partnerImmune3",
      "careJourney.partnerImmune4",
    ],
  },
  university: {
    labelKey: "careJourney.partnerUniversityLabel",
    itemKeys: [
      "careJourney.partnerUniversity1",
      "careJourney.partnerUniversity2",
      "careJourney.partnerUniversity3",
      "careJourney.partnerUniversity4",
    ],
  },
};

export default function CareJourneyClient() {
  const lang = useLang() || "ko";
  const tr = (k) => t(`careJourney.${k}`, lang);

  const stats = [
    { value: tr("stat1Value"), label: tr("stat1Label") },
    { value: tr("stat2Value"), label: tr("stat2Label") },
  ];
  const whyCare = [1, 2, 3].map((n) => ({
    title: tr(`whyCare${n}Title`),
    body: tr(`whyCare${n}Body`),
  }));
  const steps = [1, 2, 3, 4, 5].map((n) => ({
    title: tr(`step${n}Title`),
    body: tr(`step${n}Body`),
  }));

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-8 pb-10 md:pt-20 md:pb-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-5">
          {tr("eyebrow")}
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight whitespace-pre-line">
          {tr("heroTitle")}
        </h1>
        <p className="mt-5 text-base md:text-lg text-gray-500 leading-relaxed max-w-2xl">
          {tr("heroLede")}
        </p>
        <Link
          href="/inquiry"
          className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-colors"
        >
          {tr("heroCta")} <ArrowRight size={18} />
        </Link>
        {/* 회복톤 실사진 — 공원 산책(회복·동행) / PO 1차 교체 2026-06-20 */}
        <div className="relative mt-10 md:mt-12 h-56 md:h-80 overflow-hidden rounded-2xl border border-gray-100">
          <Image
            src="https://images.unsplash.com/photo-1671530725345-cc4a2cf5db04?w=1600&auto=format&fit=crop&q=85"
            alt={tr("eyebrow")}
            fill
            priority
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover"
          />
        </div>
      </section>

      {/* Model explanation */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{tr("modelTitle")}</h2>
          <p className="text-base text-gray-600 leading-relaxed max-w-3xl">{tr("modelBody")}</p>
        </div>
      </section>

      {/* Partner hospital network */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{tr("partnerTitle")}</h2>
        <p className="text-base text-gray-600 leading-relaxed max-w-3xl mb-8 md:mb-10">{tr("partnerLede")}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {["university", "immune"].map((key) => {
            const g = PARTNER_GROUPS[key];
            return (
              <div key={key} className="border border-gray-200 rounded-2xl p-6 md:p-7">
                <h3 className="text-sm font-bold text-teal-700 mb-4">{t(g.labelKey, lang)}</h3>
                <ul className="space-y-2.5">
                  {g.itemKeys.map((k, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm md:text-base text-gray-800">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-teal-600" aria-hidden="true" />
                      {t(k, lang)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Why Korea — credibility stats */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">{tr("statsTitle")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
          {stats.map((s, i) => (
            <div key={i} className="border border-gray-200 rounded-2xl p-6 md:p-7">
              <div className="text-3xl md:text-4xl font-extrabold text-teal-700 mb-2 tabular-nums">{s.value}</div>
              <p className="text-sm text-gray-500 leading-relaxed">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 mt-4 leading-relaxed">{tr("statsSource")}</p>
      </section>

      {/* Why immune/rehab care matters */}
      <section className="max-w-4xl mx-auto px-4 pt-0 pb-12 md:pb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{tr("whyCareTitle")}</h2>
        <p className="text-base text-gray-600 leading-relaxed max-w-3xl mb-8 md:mb-10">{tr("whyCareLede")}</p>
        {/* 회복톤 실사진 — 푸드테라피(맞춤 영양·입원식) / PO 1차 교체 2026-06-20 */}
        <div className="relative mb-8 md:mb-10 h-48 md:h-64 overflow-hidden rounded-2xl border border-gray-100">
          <Image
            src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1600&auto=format&fit=crop&q=85"
            alt={tr("whyCareTitle")}
            fill
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {whyCare.map((w, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-xl p-5 md:p-6 hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">{w.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5 steps — connected vertical timeline */}
      <section className="max-w-4xl mx-auto px-4 pt-0 pb-12 md:pb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-10">{tr("stepsTitle")}</h2>
        <ol className="relative">
          {/* 세로 연결선 (타임라인) */}
          <span
            className="absolute left-[18px] top-3 bottom-3 w-px bg-teal-200"
            aria-hidden="true"
          />
          {steps.map((s, i) => (
            <li key={i} className="relative flex gap-4 md:gap-6 pb-7 last:pb-0">
              <span className="relative z-10 shrink-0 w-9 h-9 rounded-full bg-teal-700 text-white font-bold flex items-center justify-center text-sm ring-4 ring-white">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 border border-gray-200 rounded-xl p-5 md:p-6 hover:border-teal-300 hover:shadow-sm transition-all">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm md:text-base text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Social proof — 실제·검증 가능한 평가 (가짜 후기 금지) */}
      <div className="border-t border-gray-100">
        <SocialProofSection />
      </div>


      {/* Closing CTA */}
      <section className="bg-teal-700">
        <div className="max-w-4xl mx-auto px-4 py-14 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{tr("closingTitle")}</h2>
          <p className="text-teal-50 text-sm md:text-base mb-8 max-w-xl mx-auto leading-relaxed">{tr("closingBody")}</p>
          <Link
            href="/inquiry"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-colors"
          >
            {tr("closingCta")} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
