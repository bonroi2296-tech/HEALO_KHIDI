"use client";

/**
 * CostEstimateCard — 환자에게 Tier 1 즉시 예상 범위를 카드로 표시.
 *
 * Props:
 *   - cancerType: 'stomach' | 'liver' | 'lung' | 'breast' | 'thyroid' | 'other'
 *   - stage: '1'|'2'|'3'|'4'|'unknown'
 *   - intakeId (optional): 있으면 Tier 2 AI 보정까지 시도
 *   - consultationId (optional): 정식 견적 요청 시 연결
 *
 * 본 컴포넌트는 KHIDI 정부 요건 #3, #6 — "예상진료비 산출내역 온라인 안내·제공" 대응.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";

// 환자용 카드 문구 — 중앙 i18n 사전 costCard.* 키(6개 활성언어 ko·en·ru·kz·zh·ja)

function fmtKRW(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("ko-KR") + " KRW";
}
function fmtUSD(n) {
  if (n == null) return "—";
  return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function CostEstimateCard({
  cancerType,
  stage = "unknown",
  intakeId = null,
  consultationId = null,
}) {
  const lang = useLang();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    loadTier1();
  }, [cancerType, stage]);

  async function loadTier1() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        cancer_type: cancerType,
        stage,
        include_all_phases: "1",
      });
      const res = await fetch(`/api/khidi/cost-estimate?${params}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "failed");
      }
      setData(json.data);
    } catch (err) {
      console.error("[CostEstimateCard]", err);
      setError(t("costCard.loadFailed", lang));
    } finally {
      setLoading(false);
    }
  }

  async function loadTier2() {
    if (!intakeId) return;
    setAiLoading(true);
    try {
      const res = await fetch(`/api/khidi/cost-estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cancer_type: cancerType,
          stage,
          intake_id: intakeId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      setData((prev) => ({ ...(prev || {}), ...json.data }));
    } catch (err) {
      // AI 실패는 무해 — Tier 1 유지
      console.warn("[CostEstimateCard] Tier 2 failed:", err.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function requestFormalQuote() {
    setRequesting(true);
    try {
      const res = await fetch("/api/khidi/cost-estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cancer_type: cancerType,
          stage,
          intake_id: intakeId || undefined,
          consultation_id: consultationId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (res.status === 401) {
          alert(t("costCard.loginRequired", lang));
          return;
        }
        throw new Error(json.error || "failed");
      }
      alert(t("costCard.requestSuccess", lang));
      window.location.href = `/patient/cost-estimates/${json.data.id}`;
    } catch (_err) {
      alert(t("costCard.requestFailed", lang));
    } finally {
      setRequesting(false);
    }
  }

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg p-5 bg-white">
        <p className="text-sm text-gray-500">{t("costCard.loadingText", lang)}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border border-amber-200 rounded-lg p-5 bg-amber-50">
        <p className="text-sm text-amber-900">
          {t("costCard.loadFailedDesc", lang)}
        </p>
        <button
          onClick={requestFormalQuote}
          disabled={requesting}
          className="mt-3 text-sm underline"
        >
          {t("costCard.requestQuote", lang)}
        </button>
      </div>
    );
  }

  const total = data.total_if_full_course;
  const refined = data.tier2_refined_krw;
  const band = data.tier2_band;
  const bandLabel = { lower: t("costCard.bandLower", lang), middle: t("costCard.bandMiddle", lang), upper: t("costCard.bandUpper", lang) };

  return (
    <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            {t("costCard.tierLabel", lang)} (Tier {data.tier || 1})
          </p>
          <h3 className="text-xl font-semibold mt-1">
            {cancerType} · Stage {stage}
          </h3>
        </div>
        {intakeId && !aiLoading && !band && (
          <button
            onClick={loadTier2}
            className="text-xs text-blue-600 hover:underline"
          >
            {t("costCard.aiPersonalize", lang)} ✨
          </button>
        )}
        {aiLoading && (
          <span className="text-xs text-gray-500">{t("costCard.aiAnalyzing", lang)}</span>
        )}
      </div>

      {total && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-1">{t("costCard.totalCourseLabel", lang)}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold">
              {fmtUSD(total.min_usd)} ~ {fmtUSD(total.max_usd)}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {fmtKRW(total.min_krw)} ~ {fmtKRW(total.max_krw)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {t("costCard.median", lang)}: {fmtUSD(total.median_usd)} ({fmtKRW(total.median_krw)})
          </p>
        </div>
      )}

      {refined && band && (
        <div className="mt-4 border-t border-dashed border-gray-200 pt-4">
          <p className="text-xs text-blue-700 mb-1">
            ✨ {t("costCard.aiEstimatePrefix", lang)} · {bandLabel[band]} {t("costCard.likelihood", lang)}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold text-blue-900">
              {fmtUSD(refined.min_usd)} ~ {fmtUSD(refined.max_usd)}
            </span>
          </div>
          <p className="text-sm text-blue-800 mt-1">
            {fmtKRW(refined.min)} ~ {fmtKRW(refined.max)}
          </p>
          {data.tier2_personalization && (
            <p className="text-xs text-gray-600 mt-2 italic">
              &ldquo;{data.tier2_personalization}&rdquo;
            </p>
          )}
        </div>
      )}

      {data.breakdown && data.breakdown.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-900">
            {t("costCard.breakdownSummary", lang)} ({data.breakdown.length}{t("costCard.stepsUnit", lang)})
          </summary>
          <ul className="mt-2 space-y-2">
            {data.breakdown.map((b, i) => (
              <li key={i} className="text-xs text-gray-700 border-l-2 border-gray-200 pl-3 py-1">
                <span className="font-medium">
                  {b.phase === "pre_treatment"
                    ? t("costCard.phasePre", lang)
                    : b.phase === "during_treatment"
                    ? t("costCard.phaseDuring", lang)
                    : t("costCard.phasePost", lang)}
                </span>{" "}
                · {fmtUSD(b.range_usd.min)}~{fmtUSD(b.range_usd.max)}
                {b.confidence && (
                  <span className="text-gray-500 ml-2">[{b.confidence}]</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs text-gray-500 mt-4 italic leading-relaxed">
        ⚠️ {data.disclaimer}
      </p>

      <div className="mt-5 flex gap-2">
        <button
          onClick={requestFormalQuote}
          disabled={requesting}
          className="flex-1 bg-black text-white px-4 py-2.5 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {requesting ? t("costCard.requesting", lang) : t("costCard.requestQuote", lang)}
        </button>
        <Link
          href="/patient/cost-estimates"
          className="px-4 py-2.5 text-sm border border-gray-300 rounded-md hover:border-black"
        >
          {t("costCard.myEstimates", lang)}
        </Link>
      </div>
    </div>
  );
}
