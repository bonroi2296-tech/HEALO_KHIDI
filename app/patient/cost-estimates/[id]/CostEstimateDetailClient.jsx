"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";

function fmtKRW(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("ko-KR") + " KRW";
}
function fmtUSD(n) {
  if (n == null) return "—";
  return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// 상태 코드(DB값) — 표시 라벨은 중앙 사전 costDetail.status.* 키.
// 목록에 없는 코드는 원문 코드 그대로 노출(기존 동작 유지).
const STATUS_KEYS = [
  "auto_range",
  "formal_requested",
  "hospital_pending",
  "draft",
  "issued",
  "accepted",
  "rejected",
  "expired",
];

export default function CostEstimateDetailClient({ estimateId }) {
  const lang = useLang();
  // 원시 err.message 노출 금지 — 일반 실패 안내(보안+UX)
  const failMsg = t("costDetail.failMsg", lang);
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
    if (!confirm(t("costDetail.confirmAccept", lang))) return;
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
    } catch (_err) {
      alert(failMsg);
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (!confirm(t("costDetail.confirmReject", lang))) return;
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
    } catch (_err) {
      alert(failMsg);
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-sm text-gray-500">{t("costDetail.loading", lang)}</p>
      </div>
    );
  }
  if (error || !estimate) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-sm text-red-600">{failMsg}</p>
        <Link href="/patient/cost-estimates" className="text-sm underline mt-4 inline-block">{t("costDetail.backToList", lang)}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link
        href="/patient/cost-estimates"
        className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
      >
        {t("costDetail.backToEstimates", lang)}
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {estimate.quotation_no || t("costDetail.formalRequestTitle", lang)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("costDetail.statusLabel", lang)}: {STATUS_KEYS.includes(estimate.status) ? t(`costDetail.status.${estimate.status}`, lang) : estimate.status} ·{" "}
            {new Date(estimate.created_at).toLocaleString("ko-KR")} {t("costDetail.createdSuffix", lang)}
          </p>
        </div>
      </div>

      {/* 자동 범위 */}
      {estimate.auto_min_krw && (
        <section className="mt-6 border border-gray-200 rounded-lg p-5 bg-white">
          <h2 className="text-sm font-medium text-gray-700">{t("costDetail.autoRangeTitle", lang)}</h2>
          <p className="mt-2 text-lg">
            {fmtKRW(estimate.auto_min_krw)} ~ {fmtKRW(estimate.auto_max_krw)}
          </p>
          {estimate.auto_median_krw && (
            <p className="text-xs text-gray-500 mt-1">
              {t("costDetail.medianLabel", lang)}: {fmtKRW(estimate.auto_median_krw)}
            </p>
          )}
          {estimate.ai_personalization && (
            <p className="text-xs text-blue-700 mt-2 italic">
              {t("costDetail.aiAnalysisLabel", lang)}: {estimate.ai_personalization}
            </p>
          )}
        </section>
      )}

      {/* 코디 메모 */}
      {estimate.coordinator_notes && (
        <section className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">{t("costDetail.coordinatorNotes", lang)}</p>
          <p className="text-sm text-blue-800 mt-1 whitespace-pre-wrap">
            {estimate.coordinator_notes}
          </p>
        </section>
      )}

      {/* 정식 견적서 */}
      {estimate.status === "issued" && (
        <section className="mt-6 border border-emerald-200 bg-emerald-50 rounded-lg p-5">
          <h2 className="font-medium text-emerald-900">{t("costDetail.issuedTitle", lang)}</h2>
          <p className="text-sm text-emerald-800 mt-1">
            {t("costDetail.totalPrefix", lang)} {fmtKRW(estimate.total_krw)}{" "}
            {estimate.total_usd ? `(${t("costDetail.approxPrefix", lang)} ${fmtUSD(estimate.total_usd)})` : ""}
          </p>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block bg-emerald-700 text-white px-4 py-2 rounded text-sm hover:bg-emerald-700"
            >
              {t("costDetail.downloadPdf", lang)}
            </a>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAccept}
              disabled={acting}
              className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {t("costDetail.acceptBtn", lang)}
            </button>
            <button
              onClick={handleReject}
              disabled={acting}
              className="border border-gray-300 px-4 py-2 rounded text-sm hover:border-black"
            >
              {t("costDetail.rejectBtn", lang)}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            {t("costDetail.auditNotice", lang)}
          </p>
        </section>
      )}

      {estimate.status === "accepted" && (
        <section className="mt-6 border border-green-200 bg-green-50 rounded-lg p-5">
          <p className="text-sm text-green-900">
            ✓ {new Date(estimate.patient_accepted_at).toLocaleString("ko-KR")} {t("costDetail.acceptedSuffix", lang)}
          </p>
        </section>
      )}

      {/* 견적 항목 */}
      {estimate.quotation_items && estimate.quotation_items.length > 0 && (
        <section className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
          <h2 className="px-4 py-3 font-medium text-sm bg-gray-50 border-b border-gray-200">
            {t("costDetail.itemDetailTitle", lang)}
          </h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">{t("costDetail.thItem", lang)}</th>
                <th className="px-4 py-2 text-left">{t("costDetail.thNote", lang)}</th>
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
        {t("costDetail.disclaimer", lang)}
      </p>
    </div>
  );
}
