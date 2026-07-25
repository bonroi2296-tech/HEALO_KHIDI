"use client";

import Link from "next/link";
import {
  ArrowRight,
  Video,
  Languages,
  FileText,
  Stethoscope,
  Lock,
  Mail,
  Users,
  CreditCard,
  Mic,
  PhoneOff,
  ChevronLeft,
} from "lucide-react";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";

/* features 카드용 lucide 아이콘 (이모지 대체, 순서 고정) */
const FEATURE_ICONS = [Video, Languages, FileText, Stethoscope, Lock, Mail, Users, CreditCard];

/* 문구는 전부 중앙 i18n 사전 telemedicine.* 으로 이동 (2026-07-24).
   여기 남은 건 언어 무관한 구조값(스텝 번호·목록 개수)뿐. */
const STEP_NUMS = ["01", "02", "03", "04"];
const FEATURE_COUNT = 8;
const DOC_ITEM_COUNT = 5;
const USE_CASE_COUNT = 4;
const FAQ_COUNT = 6;
const idx = (n) => Array.from({ length: n }, (_, i) => i);

export default function TelemedicineClient() {
  const lang = useLang();
  const tr = (key) => t(`telemedicine.${key}`, lang);

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="max-w-4xl mx-auto px-4 pt-8 pb-10 md:pt-20 md:pb-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-5">
          {tr("eyebrow")}
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          {tr("heroTitle")}
        </h1>
        <p className="mt-5 text-base md:text-lg text-gray-500 leading-relaxed max-w-2xl">
          {tr("heroLede")}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/inquiry"
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-colors"
          >
            {tr("ctaPrimary")} <ArrowRight size={18} />
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-700 hover:text-teal-700 transition-colors"
          >
            {tr("ctaSecondary")} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* CONSULTATION SCREEN MOCKUP — 실제 /consultation 화면 구조와 동일하게 (헤더+영상+자막오버레이+컨트롤바) */}
      <section className="max-w-4xl mx-auto px-4 pb-12 md:pb-16">
        <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-700 bg-gray-900">
          {/* 헤더 바 (실제와 동일: 제목 + Room + 연결됨 / 번역토글 + 종료) */}
          <div className="bg-gray-800 border-b border-gray-700 px-3 py-2 md:px-4 md:py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ChevronLeft size={18} className="text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{tr("mockup.title")}</p>
                <p className="text-[10px] text-gray-400 truncate">
                  Room: khidi-xxxx <span className="text-green-400 ml-1">● {tr("mockup.connected")}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-white bg-teal-700 rounded-lg px-2.5 py-1.5">
                <Languages size={13} /> {tr("mockup.live")}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white bg-red-600 rounded-lg px-2.5 py-1.5">
                <PhoneOff size={13} /> {tr("mockup.endCall")}
              </span>
            </div>
          </div>

          {/* 영상 영역 (자막 오버레이가 영상 위에 떠있음) */}
          <div className="relative bg-gray-950 p-3 md:p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="aspect-[4/3] rounded-lg bg-gray-800 flex items-center justify-center relative overflow-hidden">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-teal-700/20 border border-teal-400/30 flex items-center justify-center">
                  <Stethoscope size={24} className="text-teal-300" />
                </div>
                <span className="absolute bottom-2 left-2 text-[11px] font-semibold text-white bg-black/50 rounded px-1.5 py-0.5">{tr("mockup.doctor")}</span>
              </div>
              <div className="aspect-[4/3] rounded-lg bg-gray-800 flex items-center justify-center relative overflow-hidden">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gray-500/20 border border-gray-400/30 flex items-center justify-center">
                  <Users size={24} className="text-gray-300" />
                </div>
                <span className="absolute bottom-2 left-2 text-[11px] font-semibold text-white bg-black/50 rounded px-1.5 py-0.5">{tr("mockup.patient")}</span>
              </div>
            </div>

            {/* 자막 오버레이 (실제와 동일: 영상 하단에 중앙정렬 검은 박스, 원문 → 번역) */}
            <div className="absolute bottom-5 left-5 right-5 md:bottom-6 md:left-7 md:right-7">
              <div className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-3 text-center">
                <p className="text-[11px] md:text-xs text-gray-400 mb-1">{tr("mockup.srcTag")}</p>
                <p className="text-sm md:text-base text-white mb-2">{tr("mockup.srcLine")}</p>
                <div className="border-t border-gray-600 pt-2">
                  <p className="text-[11px] md:text-xs text-teal-400 mb-1 inline-flex items-center gap-1">
                    <Languages size={12} /> {tr("mockup.transTag")}
                  </p>
                  <p className="text-sm md:text-base font-bold text-teal-300 leading-snug">{tr("mockup.transLine")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 컨트롤 바 (실제 LiveKit ControlBar 자리: 마이크·카메라·종료) */}
          <div className="bg-gray-800 border-t border-gray-700 py-2.5 flex items-center justify-center gap-3">
            <span className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center"><Mic size={16} className="text-white" /></span>
            <span className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center"><Video size={16} className="text-white" /></span>
            <span className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center"><PhoneOff size={16} className="text-white" /></span>
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-3">{tr("mockup.caption")}</p>
      </section>

      {/* STEPS */}
      <section id="how-it-works" className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {tr("stepsEyebrow")}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-snug max-w-2xl">
            {tr("stepsTitle")}
          </h2>
          <div className="w-12 h-px bg-teal-700 mb-8 md:mb-10" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {STEP_NUMS.map((num, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
                <span className="inline-flex w-9 h-9 rounded-lg bg-teal-700 text-white font-bold items-center justify-center text-sm mb-3">
                  {num}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mb-1.5 leading-snug">{tr(`steps.${i + 1}.title`)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{tr(`steps.${i + 1}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-8">
          {tr("featuresEyebrow")}
        </span>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {idx(FEATURE_COUNT).map((i) => {
            const Icon = FEATURE_ICONS[i] || Video;
            return (
              <div key={i} className="border border-gray-200 rounded-xl p-5 hover:border-teal-300 hover:shadow-sm transition-all">
                <span className="inline-flex w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 items-center justify-center mb-3">
                  <Icon size={18} className="text-teal-700" />
                </span>
                <h3 className="text-base font-bold text-gray-900 mb-1.5 leading-snug">{tr(`features.${i + 1}.title`)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{tr(`features.${i + 1}.body`)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* USE CASES */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-8">
            {tr("useCasesEyebrow")}
          </span>
          <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
            {idx(USE_CASE_COUNT).map((i) => (
              <article key={i} className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
                <div className="text-xs font-bold tracking-wide text-teal-700 mb-2">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug">{tr(`useCases.${i + 1}.title`)}</h3>
                <p className="text-sm md:text-base text-gray-500 leading-relaxed">{tr(`useCases.${i + 1}.body`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 준비하면 좋은 서류 (안내 톤 — 필수 아님) */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
          {tr("docsEyebrow")}
        </span>
        <p className="text-sm md:text-base text-gray-500 leading-relaxed max-w-2xl mb-6 md:mb-8">
          {tr("docsNote")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {idx(DOC_ITEM_COUNT).map((i) => (
            <div key={i} className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3">
              <span className="inline-flex w-7 h-7 shrink-0 rounded-lg bg-teal-50 border border-teal-100 items-center justify-center">
                <FileText size={15} className="text-teal-700" />
              </span>
              <span className="text-sm md:text-base text-gray-700">{tr(`docsItems.${i + 1}`)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-6">
          {tr("faqEyebrow")}
        </span>
        <div className="divide-y divide-gray-200 border-t border-gray-200">
          {idx(FAQ_COUNT).map((i) => (
            <details key={i} className="group py-4">
              <summary className="cursor-pointer list-none flex items-start justify-between gap-4 text-base md:text-lg font-bold text-gray-900">
                <span>{tr(`faqs.${i + 1}.q`)}</span>
                <ArrowRight
                  size={18}
                  className="shrink-0 mt-1 text-teal-700 transition-transform group-open:rotate-90"
                />
              </summary>
              <p className="mt-3 text-sm md:text-base text-gray-500 leading-relaxed">{tr(`faqs.${i + 1}.a`)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-teal-700">
        <div className="max-w-4xl mx-auto px-4 py-14 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-snug">
            {tr("ctaSection.title")}
          </h2>
          <p className="text-teal-50 text-sm md:text-base mb-8 max-w-2xl mx-auto leading-relaxed">
            {tr("ctaSection.body")}
          </p>
          <Link
            href="/inquiry"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-colors"
          >
            {tr("ctaSection.btn")} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
