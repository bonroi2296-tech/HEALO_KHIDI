"use client";

/**
 * 한국 암치료 안내 + 무료 견적 (다국어 6개 언어).
 * ⚠️ 임시: 가격 수치 숨김(2=B). PO 실제 가격 확보 후 금액 복원 예정.
 * 설계: 환자는 질환 + 치료 단계만 고른다 → 그 단계에 무엇이 포함되는지 + "정확한 비용은 무료 상담".
 * 치료 단계 = 우리 실제 케어경로: 진단 → 수술·항암(상급종합) → 면역·재활(한방 보조).
 * 의료 레드라인: 한방 면역·재활은 '보조'(치료/완치 아님).
 * 문구는 전부 중앙 i18n 사전("costCalc.*")에 있다 — 이 파일에 문구를 다시 심지 말 것.
 */

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";

const PROGRAM_KEYS = ["diagnosis", "surgery", "immune"];

// 질환 드롭다운: 선택 상태는 인덱스(숫자) 그대로, 표시 문구만 사전 키로 이동.
const CANCER_KEYS = [
  "costCalc.cancers.stomach",
  "costCalc.cancers.lung",
  "costCalc.cancers.breast",
  "costCalc.cancers.liver",
  "costCalc.cancers.thyroid",
  "costCalc.cancers.colorectal",
  "costCalc.cancers.other",
];

// 신뢰 포인트 3장 — 각 항목은 costCalc.benefits.<슬러그>.t / .d
const BENEFIT_KEYS = ["visa", "language", "price"];

export default function CostCalculatorClient() {
  const lang = useLang();

  const [cancerIdx, setCancerIdx] = useState(0);
  const [programKey, setProgramKey] = useState("diagnosis");

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 text-gray-800">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-teal-700 mb-3">{t("costCalc.heroTitle", lang)}</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">{t("costCalc.heroLede", lang)}</p>
      </header>

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-8 space-y-6">
        {/* 질환 종류 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("costCalc.labelType", lang)}</label>
          <select
            value={cancerIdx}
            onChange={(e) => setCancerIdx(Number(e.target.value))}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            {CANCER_KEYS.map((cancerKey, i) => (
              <option key={i} value={i}>{t(cancerKey, lang)}</option>
            ))}
          </select>
        </div>

        {/* 치료 단계 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("costCalc.labelProgram", lang)}</label>
          <div className="grid sm:grid-cols-3 gap-2">
            {PROGRAM_KEYS.map((key, i) => (
              <button
                key={key}
                onClick={() => setProgramKey(key)}
                className={`text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                  programKey === key
                    ? "bg-teal-50 text-teal-800 border-teal-200 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span className="text-xs text-gray-400 tabular-nums">{i + 1}</span>
                <span className="font-medium block mt-0.5">{t(`costCalc.programs.${key}.name`, lang)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 선택 단계 포함 내용 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">{t("costCalc.includesLabel", lang)}</p>
          <p className="text-sm text-gray-700 leading-relaxed">{t(`costCalc.programs.${programKey}.desc`, lang)}</p>
        </div>
      </section>

      {/* 무료 견적 CTA (금액 대신) */}
      <section className="bg-teal-600 text-white rounded-xl p-6 md:p-8 mt-5 text-center">
        <h2 className="text-xl md:text-2xl font-bold mb-2">{t("costCalc.quoteTitle", lang)}</h2>
        <p className="text-sm text-teal-100 max-w-xl mx-auto">{t("costCalc.quoteText", lang)}</p>
        <p className="text-xs text-teal-100/80 mt-3">{t(CANCER_KEYS[cancerIdx], lang)} · {t(`costCalc.programs.${programKey}.name`, lang)}</p>
        <Link href="/inquiry" className="inline-block mt-5 bg-white text-teal-700 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition">
          {t("costCalc.cta", lang)}
        </Link>
      </section>

      <p className="text-xs text-gray-400 leading-relaxed mt-4">{t("costCalc.disclaimer", lang)}</p>

      {/* 신뢰 포인트 */}
      <section className="mt-10 grid sm:grid-cols-3 gap-4">
        {BENEFIT_KEYS.map((b) => (
          <div key={b} className="bg-gray-50 rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 text-sm mb-1">{t(`costCalc.benefits.${b}.t`, lang)}</h3>
            <p className="text-xs text-gray-600 leading-relaxed">{t(`costCalc.benefits.${b}.d`, lang)}</p>
          </div>
        ))}
      </section>

      <nav className="mt-10 pt-6 border-t text-sm text-gray-500 flex flex-wrap gap-4">
        <Link href="/care-journey" className="hover:text-teal-600">{t("costCalc.navCare", lang)}</Link>
        <Link href="/hospitals/immune" className="hover:text-teal-600">Immune Hospital</Link>
        <Link href="/inquiry" className="hover:text-teal-600">{t("costCalc.navConsult", lang)}</Link>
        <Link href="/visa" className="hover:text-teal-600">{t("costCalc.navVisa", lang)}</Link>
      </nav>
    </main>
  );
}
