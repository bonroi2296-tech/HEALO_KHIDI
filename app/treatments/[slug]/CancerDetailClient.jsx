"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowLeft, Plus, HeartPulse, Activity, Droplet, Wind, Stethoscope, Microscope, Calculator, FileText } from "lucide-react";

const CANCER_ICONS = {
  female: HeartPulse,
  digest: Activity,
  liver: Droplet,
  lung: Wind,
  thyroid: Stethoscope,
  etc: Microscope,
};
import { useLang } from "@/lib/i18n/LangContext";
import { localeHref } from "@/lib/i18n/config";
import { t } from "@/lib/i18n";
import {
  CANCER_DETAILS,
  ITCRN_FRAMEWORK,
  CANCER_IMAGES,
  POST_SURGICAL_CARE,
  CANCER_FAQ,
} from "@/lib/data/immuneCancerDetails";
import { IMMUNE_THERAPIES } from "@/lib/data/immuneTherapies";

// ── 다국어 표시 문구 ────────────────────────────────────────────
// CTA(cancerDetail.cta.*)·비용·비자 밴드(cancerDetail.costVisa.*) 카피는 중앙 i18n 사전으로 이동.
// ⚠️ 비용·비자 카피 톤은 PO 검토 대상(초안). 가격 숫자는 하드코딩 금지 → /cost-calculator로 연결.

// 암종별 관련 치료법 매핑
const SLUG_THERAPIES = {
  female: ["thymosin", "nkCell", "highVitaminC", "lymphDrainage", "selenium"],
  digest: ["thymosin", "lowResidueDiet", "gastrectomyDiet", "hyperthermia", "glutathione"],
  liver: ["thymosin", "hyperthermia", "placentaExtract", "glutathione", "selenium"],
  lung: ["thymosin", "infraredHeat", "highVitaminC", "mistletoe", "immunoPlus"],
  thyroid: ["lowIodideDiet", "thymosin", "lymphDrainage", "selenium", "placentaExtract"],
  etc: ["nkCell", "hyperthermia", "immunoPlus", "thymosin", "highVitaminC"],
};

// 합병증 → 이미지 매핑 (slug 기준)
const COMPLICATION_IMAGES = {
  female: [
    CANCER_IMAGES.complications.fever,
    CANCER_IMAGES.complications.lymphEdema,
    CANCER_IMAGES.complications.urinaryBowel,
    CANCER_IMAGES.complications.surgicalSiteFemale,
    CANCER_IMAGES.complications.adhesionFemale,
    CANCER_IMAGES.complications.residual,
    CANCER_IMAGES.complications.nutrition,
    CANCER_IMAGES.complications.emotional,
  ],
  digest: [
    CANCER_IMAGES.complications.fever,
    CANCER_IMAGES.complications.anastomotic,
    CANCER_IMAGES.complications.bowelFunction,
    CANCER_IMAGES.complications.adhesion,
    CANCER_IMAGES.complications.residual,
    CANCER_IMAGES.complications.surgicalSite,
    CANCER_IMAGES.complications.nutrition,
    CANCER_IMAGES.complications.emotional,
    CANCER_IMAGES.complications.residual,
  ],
  liver: [
    CANCER_IMAGES.complications.liverFailure,
    CANCER_IMAGES.complications.surgicalSiteFemale,
    CANCER_IMAGES.complications.bileLeak,
    CANCER_IMAGES.complications.digestive,
    CANCER_IMAGES.complications.diabetes,
    CANCER_IMAGES.complications.residual,
  ],
  lung: [
    CANCER_IMAGES.complications.breathingDifficulty,
    CANCER_IMAGES.complications.coughChestPain,
    CANCER_IMAGES.complications.fatigue,
    CANCER_IMAGES.complications.residual,
    CANCER_IMAGES.complications.nutrition,
    CANCER_IMAGES.complications.emotional,
  ],
  thyroid: [
    CANCER_IMAGES.complications.voiceChange,
    CANCER_IMAGES.complications.hypocalcemia,
    CANCER_IMAGES.complications.hormoneDeficiency,
    CANCER_IMAGES.complications.neckScar,
    CANCER_IMAGES.complications.swallowingDifficulty,
  ],
  etc: [
    CANCER_IMAGES.complications.fever,
    CANCER_IMAGES.complications.lymphEdema,
    CANCER_IMAGES.complications.urinaryBowel,
    CANCER_IMAGES.complications.surgicalSiteFemale,
    CANCER_IMAGES.complications.adhesionFemale,
    CANCER_IMAGES.complications.residual,
    CANCER_IMAGES.complications.nutrition,
    CANCER_IMAGES.complications.emotional,
  ],
};

// ITCRN 축 순서
const ITCRN_KEYS = ["immunity", "temperature", "circulation", "resistibility", "nutrition"];
const ITCRN_LETTERS = ["I", "T", "C", "R", "N"];

// 섹션 라벨 다국어 → 중앙 i18n 사전 cancerDetail.section.* 으로 이동

// 환자 여정 5단계 — 문구는 중앙 i18n 사전 cancerDetail.journey.step*.label/.sub
const JOURNEY_STEPS = [
  { num: "01", key: "step1" },
  { num: "02", key: "step2" },
  { num: "03", key: "step3" },
  { num: "04", key: "step4" },
  { num: "05", key: "step5" },
];

export default function CancerDetailClient({ slug }) {
  const lang = useLang();
  const [openAxis, setOpenAxis] = useState(null);

  const cancer = CANCER_DETAILS[slug];
  if (!cancer) return null;

  const l = (obj) => obj?.[lang] || obj?.en || obj?.ko || "";
  const tr = (key) => t(`cancerDetail.${key}`, lang);

  const therapyKeys = SLUG_THERAPIES[slug] || [];
  const complicationImgs = COMPLICATION_IMAGES[slug] || [];
  const faqs = CANCER_FAQ[slug] || CANCER_FAQ.etc;

  const showPostSurgical = slug === "digest" || slug === "liver";

  return (
    <div className="bg-white">
      {/* ── 1. HERO ─────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pt-8 pb-10 md:pt-20 md:pb-16">
        {/* 목록으로 — 스토어 앱에는 브라우저 뒤로가기가 없다(아이폰은 쓸어넘기기도 꺼져 있음).
            같은 링크가 화면 «맨 아래»에도 있지만 거기까지 내려야 보여서, 위에도 둔다. */}
        <Link
          href={localeHref("/treatments", lang)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft size={14} /> {tr("section.allTypes")}
        </Link>
        <span className="block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-5 w-fit">
          {tr("section.heroEyebrow")}
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          {l(cancer.title)}
        </h1>
        <p className="mt-5 text-base md:text-lg text-gray-500 leading-relaxed max-w-2xl">
          {l(cancer.intro)}
        </p>
        {/* 제휴 병원이 «자기 사이트에 적어 둔» 수치. 출처 줄은 장식이 아니라 이 칸의 조건이다 —
            암 생존율 수치를 근거 없이 띄우면 우리는 병원도 아니면서 의학적 주장을 한 게 된다.
            그래서 출처가 없으면 수치도 안 띄운다(아래 && 조건). 2026-09-01 감사. */}
        {cancer.stats?.survivalImprovement && cancer.stats?.survivalImprovementSource && (
          <div className="mt-6 border-l-2 border-teal-600 bg-teal-50 rounded-r-xl px-4 py-3 max-w-xl">
            <p className="text-sm md:text-base text-teal-800 font-semibold leading-relaxed m-0">
              {l(cancer.stats.survivalImprovement)}
            </p>
            <p className="mt-2 text-[11px] md:text-xs text-teal-800/70 leading-relaxed m-0">
              {l(cancer.stats.survivalImprovementSource)}
              {cancer.stats.survivalImprovementSourceUrl && (
                <>
                  {" "}
                  <a
                    href={cancer.stats.survivalImprovementSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-teal-800"
                  >
                    immunehospital.com
                  </a>
                </>
              )}
            </p>
          </div>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href={localeHref("/inquiry", lang)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-colors"
          >
            {tr("cta.consult")} <ArrowRight size={18} />
          </Link>
          <Link
            href={localeHref("/inquiry", lang)}
            className="inline-flex items-center gap-1.5 px-2 py-2 text-sm font-bold text-teal-700 hover:text-teal-700 transition-colors"
          >
            {tr("cta.intake")} <ArrowRight size={16} />
          </Link>
        </div>

        {/* 히어로 — 암종 아이콘 밴드 (사진 대신 깔끔한 플랫폼 톤) */}
        <div className="mt-10 w-full aspect-[16/7] rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
          {(() => {
            const Icon = CANCER_ICONS[slug] || Activity;
            return <Icon size={64} strokeWidth={1.25} className="text-teal-700/70" />;
          })()}
        </div>
      </section>

      {/* ── 1.5 비용·비자 안내 밴드 (전환 의도: 가격·비자·이동) ── */}
      <section className="max-w-4xl mx-auto px-4 pb-10 md:pb-14">
        <div className="rounded-xl border border-teal-100 bg-teal-50 p-5 md:p-8">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 mb-2">
            {tr("costVisa.eyebrow")}
          </span>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 leading-snug">
            {tr("costVisa.title")}
          </h2>
          <p className="mt-2 text-sm md:text-base text-gray-500 leading-relaxed max-w-2xl">
            {tr("costVisa.desc")}
          </p>
          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            <Link
              href={localeHref("/cost-calculator", lang)}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-all"
            >
              <span className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                <Calculator size={20} className="text-teal-700" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm md:text-base font-bold text-gray-900">{tr("costVisa.costTitle")}</span>
                <span className="block text-xs md:text-sm text-gray-500">{tr("costVisa.costSub")}</span>
              </span>
              <ArrowRight size={18} className="ml-auto text-teal-700 shrink-0" />
            </Link>
            <Link
              href={localeHref("/visa", lang)}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-all"
            >
              <span className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                <FileText size={20} className="text-teal-700" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm md:text-base font-bold text-gray-900">{tr("costVisa.visaTitle")}</span>
                <span className="block text-xs md:text-sm text-gray-500">{tr("costVisa.visaSub")}</span>
              </span>
              <ArrowRight size={18} className="ml-auto text-teal-700 shrink-0" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. 합병증·증상 그리드 ───────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {tr("section.compEyebrow")}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
            {tr("section.compTitle")}
          </h2>
          <div className="w-12 h-px bg-teal-700 mb-8 md:mb-10" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {cancer.complications.map((comp, idx) => (
              <article
                key={idx}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                {complicationImgs[idx] && (
                  <div className="w-full aspect-[16/9] overflow-hidden bg-gray-100">
                    <img
                      src={complicationImgs[idx]}
                      alt={l(comp.name)}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = CANCER_IMAGES.healSvg; }}
                    />
                  </div>
                )}
                <div className="p-4 md:p-5">
                  <div className="text-xs font-bold tracking-wide text-teal-700 mb-1.5">
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1.5 leading-snug">
                    {l(comp.name)}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {l(comp.desc)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. ITCRN 5축 치료 ───────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
          {tr("section.itcrnEyebrow")}
        </span>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
          {tr("section.itcrnTitle")}
        </h2>
        <div className="w-12 h-px bg-teal-700 mb-6" />

        {/* 암종 특화 포커스 배지 */}
        {l(cancer.focusPrograms)?.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <span className="text-xs font-bold tracking-wide text-gray-500 uppercase mr-1">
              {tr("section.itcrnFocus")}
            </span>
            {l(cancer.focusPrograms).map((prog, i) => (
              <span
                key={i}
                className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1"
              >
                {prog}
              </span>
            ))}
          </div>
        )}

        {/* 5축 아코디언 */}
        <div className="border-t border-gray-200">
          {ITCRN_KEYS.map((key, idx) => {
            const axis = ITCRN_FRAMEWORK[key];
            if (!axis) return null;
            const isOpen = openAxis === key;
            return (
              <div key={key} className="border-b border-gray-200">
                <button
                  onClick={() => setOpenAxis(isOpen ? null : key)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="shrink-0 w-9 h-9 rounded-lg bg-teal-700 text-white font-bold flex items-center justify-center text-sm">
                      {ITCRN_LETTERS[idx]}
                    </span>
                    <span className="text-base md:text-lg font-bold text-gray-900">
                      {l(axis.title)}
                    </span>
                  </div>
                  <Plus
                    size={20}
                    className={`shrink-0 text-teal-700 transition-transform ${isOpen ? "rotate-45" : ""}`}
                  />
                </button>
                {/* 접혀 있어도 DOM 에 남긴다 — 조건부 렌더({isOpen && ...}) 금지.
                    이 5축 설명이 이 페이지의 실질 본문인데, 조건부로 두면 검색봇·AI 답변엔진이 받는
                    HTML 에 **한 글자도 안 들어간다**(2026-07-28 프로덕션 실측: 축 설명 5개 전부 0건).
                    암종 6종 × 6개 언어 = 36개 페이지가 "제목만 있고 알맹이 없는 페이지"로 읽히고 있었다.
                    접기는 홈 FAQ 와 같은 max-height 방식. 축 설명+근거+태그 목록이라 높이가 제각각이어서
                    상한은 넉넉히(60rem) — 모자라면 잘려서 안 보인다.
                    aria-hidden: 화면에 안 보이는 동안 스크린리더가 읽지 않도록(크롤러는 무관). */}
                <div
                  aria-hidden={!isOpen}
                  className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? "max-h-[60rem] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="pb-6 pl-0 md:pl-13">
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed max-w-2xl mb-4">
                      {l(axis.desc)}
                    </p>
                    {/* 근거 문장·요법 태그 — 2026-09-05 부터 6개 언어(ITCRN_FRAMEWORK 잎이 전부 {ko,en,ru,kz,zh,ja}).
                        전엔 한국어 문자열뿐이라 lang==="ko" 일 때만 그렸다. 이제 l() 로 방문자 언어. */}
                    {axis.evidence && (
                      <div className="border-l-2 border-teal-600 bg-teal-50 rounded-r-xl px-4 py-3 mb-4 max-w-2xl">
                        <p className="text-sm text-teal-800 font-semibold m-0 leading-relaxed">
                          {l(axis.evidence)}
                        </p>
                      </div>
                    )}
                    {(axis.methods || axis.cellular || axis.programs) && (
                      <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
                        {[...(axis.methods || []), ...(axis.cellular || []), ...(axis.humoral || []), ...(axis.programs || [])].map(
                          (m, i) => (
                            <li
                              key={i}
                              className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-full px-3 py-1"
                            >
                              {l(m)}
                            </li>
                          )
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 4. 치료법 상세 카드 ─────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {tr("section.therapyEyebrow")}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
            {tr("section.therapyTitle")}
          </h2>
          <div className="w-12 h-px bg-teal-700 mb-8 md:mb-10" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {therapyKeys.map((key, idx) => {
              const therapy = IMMUNE_THERAPIES[key];
              if (!therapy) return null;
              return (
                <article
                  key={key}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                >
                  {therapy.image && (
                    <div className="w-full aspect-[16/9] overflow-hidden bg-gray-100">
                      <img
                        src={therapy.image}
                        alt={l(therapy.name)}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = CANCER_IMAGES.healSvg; }}
                      />
                    </div>
                  )}
                  <div className="p-4 md:p-5">
                    <div className="text-xs font-bold tracking-wide text-teal-700 uppercase mb-1.5">
                      {therapy.axis?.toUpperCase()} — {String(idx + 1).padStart(2, "0")}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-1.5 leading-snug">
                      {l(therapy.name)}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {l(therapy.description)}
                    </p>
                    {therapy.evidence && (
                      <p className="text-xs text-teal-700 font-semibold mt-3 mb-0 leading-relaxed">
                        {l(therapy.evidence)}
                      </p>
                    )}
                    {therapy.price && (
                      <div className="mt-4 inline-block bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                        <span className="text-xs font-semibold text-gray-600">
                          {/* 숫자 표기는 고정(en-US) — 인자 없는 toLocaleString() 은 서버(Node)와 브라우저(ru-RU 는 "250 000")가
                              다르게 찍어 러·카 방문자마다 hydration 불일치가 났다(2026-09-05 dev 실측, CancerDetailClient:416). */}
                          {typeof therapy.price.amount === "number"
                            ? `${therapy.price.amount.toLocaleString("en-US")} ${therapy.price.unit}`
                            : `${therapy.price.amount} ${therapy.price.unit || ""}`}
                        </span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. 수술 후 관리 (대장/간만) ─────────────── */}
      {showPostSurgical && (
        <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {tr("section.postEyebrow")}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
            {tr("section.postTitle")}
          </h2>
          <div className="w-12 h-px bg-teal-700 mb-8 md:mb-10" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {Object.entries(POST_SURGICAL_CARE).map(([key, care]) => (
              <div
                key={key}
                className="bg-gray-50 border border-gray-200 rounded-xl p-5 md:p-6 text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-teal-700 leading-none mb-3">
                  {care.items}
                </div>
                <div className="text-xs font-bold tracking-wide text-gray-500 uppercase mb-1.5">
                  {tr("section.postProtocols")}
                </div>
                <h3 className="text-base md:text-lg font-bold text-gray-900 leading-snug">
                  {l(care.title)}
                </h3>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 6. 환자 여정 5단계 ──────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {tr("section.journeyEyebrow")}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
            {tr("section.journeyTitle")}
          </h2>
          <div className="w-12 h-px bg-teal-700 mb-8 md:mb-10" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {JOURNEY_STEPS.map((step) => (
              <div key={step.num} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-teal-700 leading-none mb-2.5">{step.num}</div>
                <div className="text-sm font-bold text-gray-900 mb-1 leading-snug">
                  {tr(`journey.${step.key}.label`)}
                </div>
                <div className="text-xs text-gray-500 leading-snug">
                  {tr(`journey.${step.key}.sub`)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. FAQ ──────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
          FAQ
        </span>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8 leading-tight">
          {tr("section.faqTitle")}
        </h2>
        <div className="divide-y divide-gray-200 border-t border-gray-200">
          {faqs.map((faq, idx) => (
            <div key={idx} className="py-5">
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 leading-snug">
                {faq.q[lang] || faq.q.ko}
              </h3>
              <p className="text-sm md:text-base text-gray-500 leading-relaxed">
                {faq.a[lang] || faq.a.ko}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 8. CTA ──────────────────────────────────── */}
      <section className="bg-teal-700">
        <div className="max-w-4xl mx-auto px-4 py-14 md:py-20 text-center">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-50 bg-teal-700/40 border border-teal-400/40 rounded-full px-3 py-1 mb-5">
            {tr("section.ctaEyebrow")}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-snug">
            {tr("section.ctaTitle")}
          </h2>
          <p className="text-teal-50 text-sm md:text-base mb-8 max-w-2xl mx-auto leading-relaxed">
            {tr("section.ctaBody")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href={localeHref("/inquiry", lang)}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-colors"
            >
              {tr("cta.consult")} <ArrowRight size={18} />
            </Link>
            <Link
              href={localeHref("/inquiry", lang)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-teal-50 hover:text-white transition-colors"
            >
              {tr("cta.intake")} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-8">
            <Link
              href={localeHref("/treatments", lang)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-teal-100 hover:text-white transition-colors"
            >
              {tr("section.allTypes")} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* 의료 면책고지 — 매칭·코디네이션만 제공, 치료 결과 미보장 명시 */}
      <div className="border-t border-gray-100 bg-white">
        <p className="max-w-4xl mx-auto px-4 py-5 text-[11px] leading-relaxed text-gray-400 text-center">
          {t("sidebar.disclaimer", lang)}
        </p>
      </div>
    </div>
  );
}
