"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";

// 원시 err.message 노출 금지 — 6개어 일반 실패 안내(보안+UX)
const FAIL_MSG = {
  ko: "요청 처리에 실패했습니다. 다시 시도해 주세요.",
  en: "The request failed. Please try again.",
  ru: "Не удалось выполнить запрос. Попробуйте ещё раз.",
  kz: "Сұрауды орындау мүмкін болмады. Қайталап көріңіз.",
  zh: "请求失败，请重试。",
  ja: "リクエストに失敗しました。もう一度お試しください。",
};

function fmtKRW(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("ko-KR") + " KRW";
}
function fmtUSD(n) {
  if (n == null) return "—";
  return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const STATUS_LABELS = {
  auto_range: "자동 범위",
  formal_requested: "정식 요청",
  hospital_pending: "병원 응답 대기",
  draft: "코디 작성 중",
  issued: "견적서 발급",
  accepted: "동의 완료",
  rejected: "거절",
  expired: "만료",
};

export default function CostEstimateDetailClient({ estimateId }) {
  const langCode = useLang();
  const failMsg = FAIL_MSG[langCode] || FAIL_MSG.en;
  const [estimate, setEstimate] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    load();
  }, [estimateId]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/khidi/cost-estimates/${estimateId}`,
        { credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      setEstimate(json.data);

      if (json.data.quotation_pdf_url) {
        const qr = await fetch(
          `/api/khidi/cost-estimates/${estimateId}/quotation`,
          { credentials: "include" }
        );
        const qj = await qr.json();
        if (qj.ok) setPdfUrl(qj.quotation_pdf_url);
      }
    } catch (err) {
      // 원시 err.message 노출 금지
      console.error("[patient/cost-estimate]", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!confirm("이 견적서에 동의하시겠습니까? 의료해외진출법 §15 에 따라 동의 시각과 IP 가 기록됩니다.")) return;
    setActing(true);
    try {
      const res = await fetch(
        `/api/khidi/cost-estimates/${estimateId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ accept: true }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      await load();
    } catch (err) {
      alert(failMsg);
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (!confirm("이 견적서를 거절하시겠습니까?")) return;
    setActing(true);
    try {
      const res = await fetch(
        `/api/khidi/cost-estimates/${estimateId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ reject: true }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      await load();
    } catch (err) {
      alert(failMsg);
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-sm text-gray-500">불러오는 중...</p>
      </div>
    );
  }
  if (error || !estimate) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-sm text-red-600">{failMsg}</p>
        <Link href="/patient/cost-estimates" className="text-sm underline mt-4 inline-block">← 목록</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link
        href="/patient/cost-estimates"
        className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
      >
        ← 견적 목록
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {estimate.quotation_no || "정식 견적 요청"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            상태: {STATUS_LABELS[estimate.status] || estimate.status} ·{" "}
            {new Date(estimate.created_at).toLocaleString("ko-KR")} 생성
          </p>
        </div>
      </div>

      {/* 자동 범위 */}
      {estimate.auto_min_krw && (
        <section className="mt-6 border border-gray-200 rounded-lg p-5 bg-white">
          <h2 className="text-sm font-medium text-gray-700">자동 예상 범위 (참고용)</h2>
          <p className="mt-2 text-lg">
            {fmtKRW(estimate.auto_min_krw)} ~ {fmtKRW(estimate.auto_max_krw)}
          </p>
          {estimate.auto_median_krw && (
            <p className="text-xs text-gray-500 mt-1">
              중앙값: {fmtKRW(estimate.auto_median_krw)}
            </p>
          )}
          {estimate.ai_personalization && (
            <p className="text-xs text-blue-700 mt-2 italic">
              AI 분석: {estimate.ai_personalization}
            </p>
          )}
        </section>
      )}

      {/* 코디 메모 */}
      {estimate.coordinator_notes && (
        <section className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">코디네이터 메모</p>
          <p className="text-sm text-blue-800 mt-1 whitespace-pre-wrap">
            {estimate.coordinator_notes}
          </p>
        </section>
      )}

      {/* 정식 견적서 */}
      {estimate.status === "issued" && (
        <section className="mt-6 border border-emerald-200 bg-emerald-50 rounded-lg p-5">
          <h2 className="font-medium text-emerald-900">✅ 정식 견적서 발급됨</h2>
          <p className="text-sm text-emerald-800 mt-1">
            총 {fmtKRW(estimate.total_krw)}{" "}
            {estimate.total_usd ? `(약 ${fmtUSD(estimate.total_usd)})` : ""}
          </p>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block bg-emerald-700 text-white px-4 py-2 rounded text-sm hover:bg-emerald-700"
            >
              견적서 PDF 다운로드
            </a>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAccept}
              disabled={acting}
              className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              동의하기
            </button>
            <button
              onClick={handleReject}
              disabled={acting}
              className="border border-gray-300 px-4 py-2 rounded text-sm hover:border-black"
            >
              거절
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            ※ 동의 시각과 IP 가 감사 목적으로 기록됩니다 (의료해외진출법 §15)
          </p>
        </section>
      )}

      {estimate.status === "accepted" && (
        <section className="mt-6 border border-green-200 bg-green-50 rounded-lg p-5">
          <p className="text-sm text-green-900">
            ✓ {new Date(estimate.patient_accepted_at).toLocaleString("ko-KR")} 동의 완료
          </p>
        </section>
      )}

      {/* 견적 항목 */}
      {estimate.quotation_items && estimate.quotation_items.length > 0 && (
        <section className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
          <h2 className="px-4 py-3 font-medium text-sm bg-gray-50 border-b border-gray-200">
            항목별 상세
          </h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">항목</th>
                <th className="px-4 py-2 text-left">비고</th>
                <th className="px-4 py-2 text-right">KRW</th>
                <th className="px-4 py-2 text-right">USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {estimate.quotation_items.map((it, i) => (
                <tr key={i}>
                  <td className="px-4 py-2">{it.label}</td>
                  <td className="px-4 py-2 text-gray-600">{it.note || ""}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {it.krw != null ? Number(it.krw).toLocaleString("ko-KR") : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {it.usd != null ? `$${Number(it.usd).toLocaleString("en-US")}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="text-xs text-gray-500 mt-6 italic leading-relaxed">
        ⚠️ 자동 범위는 통계 기반 참고치이며, 실제 비용은 발급된 정식 견적서를 기준으로 합니다.
        의료해외진출법 §15 에 따라 진료 계약 전 견적서 수령과 확인이 법적으로 요구됩니다.
      </p>
    </div>
  );
}
