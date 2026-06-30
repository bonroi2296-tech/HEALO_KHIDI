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
      setError("예상 진료비를 불러오지 못했습니다.");
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
          alert("정식 견적 요청은 로그인이 필요합니다.");
          return;
        }
        throw new Error(json.error || "failed");
      }
      alert("정식 견적 요청 완료. 코디네이터가 병원에 문의 후 안내드립니다.");
      window.location.href = `/patient/cost-estimates/${json.data.id}`;
    } catch (_err) {
      alert("요청 실패");
    } finally {
      setRequesting(false);
    }
  }

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg p-5 bg-white">
        <p className="text-sm text-gray-500">예상 진료비 불러오는 중...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border border-amber-200 rounded-lg p-5 bg-amber-50">
        <p className="text-sm text-amber-900">
          예상 진료비 범위를 불러오지 못했습니다. 정식 견적을 요청하세요.
        </p>
        <button
          onClick={requestFormalQuote}
          disabled={requesting}
          className="mt-3 text-sm underline"
        >
          정식 견적 요청 →
        </button>
      </div>
    );
  }

  const total = data.total_if_full_course;
  const refined = data.tier2_refined_krw;
  const band = data.tier2_band;
  const bandLabel = { lower: "하위 구간", middle: "중위 구간", upper: "상위 구간" };

  return (
    <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            예상 치료비 범위 (Tier {data.tier || 1})
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
            AI 개인화 ✨
          </button>
        )}
        {aiLoading && (
          <span className="text-xs text-gray-500">AI 분석 중...</span>
        )}
      </div>

      {total && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-1">전체 치료 과정 합계</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold">
              {fmtUSD(total.min_usd)} ~ {fmtUSD(total.max_usd)}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {fmtKRW(total.min_krw)} ~ {fmtKRW(total.max_krw)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            중앙값: {fmtUSD(total.median_usd)} ({fmtKRW(total.median_krw)})
          </p>
        </div>
      )}

      {refined && band && (
        <div className="mt-4 border-t border-dashed border-gray-200 pt-4">
          <p className="text-xs text-blue-700 mb-1">
            ✨ AI 개인화 추정 · {bandLabel[band]} 가능성
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
            단계별 상세 ({data.breakdown.length}단계)
          </summary>
          <ul className="mt-2 space-y-2">
            {data.breakdown.map((b, i) => (
              <li key={i} className="text-xs text-gray-700 border-l-2 border-gray-200 pl-3 py-1">
                <span className="font-medium">
                  {b.phase === "pre_treatment"
                    ? "진단·검사"
                    : b.phase === "during_treatment"
                    ? "치료"
                    : "사후관리"}
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
          {requesting ? "요청 중..." : "정식 견적서 요청 →"}
        </button>
        <Link
          href="/patient/cost-estimates"
          className="px-4 py-2.5 text-sm border border-gray-300 rounded-md hover:border-black"
        >
          내 견적 목록
        </Link>
      </div>
    </div>
  );
}
