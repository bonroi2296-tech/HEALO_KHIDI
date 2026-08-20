"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCoordinatorL, useDateLocale } from "@/lib/i18n/coordinator";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";

// 상태 enum 키 순서만 모듈 상수(언어 무관). 라벨은 컴포넌트에서 L로 해석.
const STATUSES = [
  "auto_range",
  "formal_requested",
  "hospital_pending",
  "draft",
  "issued",
  "accepted",
  "rejected",
  "expired",
];

/**
 * 유치수수료 상한 초과 안내문을 6개 언어로 조립한다.
 * ⚠️ 서버가 「완성된 한국어 문장」을 내려주게 하면 안 된다 — 백오피스도 6개 언어이기 때문에
 *    서버는 «숫자»만 주고 문장은 여기서 만든다(2026-07-09 PO 결정: 예외 없이 전체 다국어).
 */
function feeCapMessage(detail, L) {
  if (!detail) return L.coSaveFail;
  const won = (n) => `${Math.round(Number(n) || 0).toLocaleString("ko-KR")} KRW`;
  const pct = (n) => `${((Number(n) || 0) * 100).toFixed(1)}%`;
  if (detail.reason === "negative_amount") {
    return `${L.coFeeCapTitle}\n\n${L.coFeeCapNegative}`;
  }
  if (detail.reason === "no_patient_total") {
    return `${L.coFeeCapTitle}\n\n${L.coFeeCapNoBase}\n\n${L.coFeeCapLaw}`;
  }
  // 어느 통화에서 걸렸는지에 따라 그 통화의 숫자를 보여준다 — 원화 칸이 비어 있고
  // 달러로만 적은 견적에서 원화 0원만 보여주면 코디가 무엇을 고쳐야 할지 모른다.
  const usd = detail.currency === "USD";
  const money = (n) => (usd ? `$${Math.round(Number(n) || 0).toLocaleString("en-US")}` : won(n));
  const lines = [
    L.coFeeCapTitle,
    "",
    `· ${L.coFeeCapBase}: ${money(usd ? detail.patient_total_usd : detail.patient_total_krw)}`,
    `· ${L.coFeeCapLimit}: ${pct(detail.cap)}`,
    `· ${L.coFeeCapMax}: ${money(usd ? detail.max_allowed_usd : detail.max_allowed_krw)}`,
    `· ${L.coFeeCapCurrent}: ${money(usd ? detail.facilitation_fee_usd : detail.facilitation_fee_krw)}`,
  ];
  if (detail.grade_known === false) lines.push("", `⚠️ ${L.coFeeCapGradeUnknown}`);
  lines.push("", L.coFeeCapLaw);
  return lines.join("\n");
}

export default function CoordinatorCostDetailClient({ estimateId }) {
  const L = useCoordinatorL();
  const lang = useLang();
  const dateLoc = useDateLocale();
  const STATUS_LABELS = {
    auto_range: L.coStatusAutoRange,
    formal_requested: L.coStatusFormalRequested,
    hospital_pending: L.coStatusHospitalPending,
    draft: L.coStatusDraft,
    issued: L.coStatusIssued,
    accepted: L.coStatusAccepted,
    rejected: L.coStatusRejected,
    expired: L.coStatusExpired,
  };
  const fmtNum = (n) => {
    if (n == null || n === "") return "";
    return Number(n).toLocaleString(dateLoc);
  };
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [coordinatorNotes, setCoordinatorNotes] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);

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
      setItems(json.data.quotation_items || []);
      setCoordinatorNotes(json.data.coordinator_notes || "");

      if (json.data.quotation_pdf_url) {
        const qr = await fetch(
          `/api/khidi/cost-estimates/${estimateId}/quotation`,
          { credentials: "include" }
        );
        const qj = await qr.json();
        if (qj.ok) setPdfUrl(qj.quotation_pdf_url);
      }
    } catch (err) {
      console.error("[coordinator/cost-estimate]", err);
      setError(L.coDetailLoadFail);
    } finally {
      setLoading(false);
    }
  }

  function addItem() {
    setItems([...items, { label: "", note: "", krw: "", usd: "" }]);
  }
  function removeItem(i) {
    setItems(items.filter((_, idx) => idx !== i));
  }
  function updateItem(i, field, value) {
    const next = [...items];
    next[i] = { ...next[i], [field]: value };
    setItems(next);
  }

  // 합계는 «환자 부담분만». 유치수수료는 통합고시 제2조1호상 병원이 우리에게 주는 돈이라
  // 환자 청구액이 아니다(2026-08-04 견적서 실측에서 300만원이 환자 합계로 잡히던 것).
  const patientItems = items.filter((it) => it.payer !== "hospital");
  const totalKrw = patientItems.reduce((s, it) => s + (Number(it.krw) || 0), 0);
  const totalUsd = patientItems.reduce((s, it) => s + (Number(it.usd) || 0), 0);

  async function handleSave() {
    setSaving(true);
    try {
      const normalized = items.map((it) => ({
        label: it.label || "",
        note: it.note || "",
        krw: it.krw ? Number(it.krw) : null,
        usd: it.usd ? Number(it.usd) : null,
        payer: it.payer === "hospital" ? "hospital" : "patient",
      }));
      const res = await fetch(
        `/api/khidi/cost-estimates/${estimateId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            quotation_items: normalized,
            coordinator_notes: coordinatorNotes,
          }),
        }
      );
      const json = await res.json();
      // 유치수수료 법정 상한 초과는 «왜 막혔는지»를 숫자로 보여준다.
      // 「저장 실패」 한 줄만 뜨면 코디가 무엇을 고쳐야 할지 몰라서 가드가 있으나 마나가 된다.
      if (!res.ok && json?.error === "facilitation_fee_over_cap") {
        alert(feeCapMessage(json.detail, L));
        return false; // ⚠️ «막혔다»를 부르는 쪽에 알려야 한다 — 아래 handleIssue 참고
      }
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      await load();
      alert(L.coSaveDone);
      return true;
    } catch (_err) {
      alert(L.coSaveFail);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus) {
    const note = prompt(L.coStatusChangePrompt.replace("{status}", STATUS_LABELS[newStatus]));
    if (note === null) return;
    try {
      const res = await fetch(
        `/api/khidi/cost-estimates/${estimateId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: newStatus, status_note: note || null }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || json.detail || "failed");
      await load();
    } catch (_err) {
      alert(L.coFail);
    }
  }

  async function handleIssue() {
    if (items.length === 0) {
      alert(L.coAddItemFirst);
      return;
    }
    if (!confirm(L.coIssueConfirm)) return;
    setIssuing(true);
    try {
      // ⚠️ 저장이 «막혔으면» 발급으로 넘어가면 안 된다.
      //    예전 판은 handleSave 가 조용히 return 만 해서, 수수료 상한 초과로 저장이 거부돼도
      //    그대로 발급이 진행됐다 — 이전에 저장돼 있던 항목으로 견적서 PDF 가 나가고
      //    status 가 issued 로 «되돌리기 어렵게» 넘어갔다(2026-08-04 독립 리뷰).
      const saved = await handleSave();
      if (saved === false) return;
      const res = await fetch(
        `/api/khidi/cost-estimates/${estimateId}/quotation`,
        { method: "POST", credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok && json?.error === "facilitation_fee_over_cap") {
        alert(feeCapMessage(json.detail, L));
        return;
      }
      if (!res.ok || !json.ok) throw new Error(json.error || json.detail || "failed");
      await load();
      alert(L.coIssueDone);
    } catch (_err) {
      alert(L.coIssueFail);
    } finally {
      setIssuing(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-sm text-gray-500">{L.coLoading}</p>
      </div>
    );
  }
  if (error || !estimate) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-sm text-red-600">{L.coError}: {error}</p>
        <Link href="/coordinator/cost-estimates" className="text-sm underline mt-4 inline-block">← {L.coBackList}</Link>
      </div>
    );
  }

  const canEdit = !["issued", "accepted", "rejected", "expired"].includes(
    estimate.status
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link
        href="/coordinator/cost-estimates"
        className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
      >
        ← {L.coQuoteList}
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {estimate.quotation_no || `${L.coQuotePrefix} ${estimate.id.slice(0, 8)}`}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {L.fieldPatient} <span className="font-mono">{estimate.patient_user_id.slice(0, 8)}…</span> ·{" "}
            {new Date(estimate.created_at).toLocaleString(dateLoc)}
          </p>
        </div>
        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
          {L.coCurrent}: {STATUS_LABELS[estimate.status]}
        </span>
      </div>

      {/* 상태 전이 */}
      <section className="mt-6 border border-gray-200 rounded-lg p-4 bg-white">
        <h2 className="font-medium text-sm mb-3">{L.coStatusChange}</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={s === estimate.status}
              className={`text-xs px-3 py-1.5 rounded border ${
                s === estimate.status
                  ? "bg-black text-white border-black cursor-default"
                  : "border-gray-300 hover:border-black"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </section>

      {/* 환자가 무엇에 대해 견적을 요청했는지. 병원에 물어야 할 대상이다. */}
      {estimate.cancer_type && (
        <section className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h2 className="font-medium text-sm">{L.coColSubject}</h2>
          <p className="text-sm text-gray-700 mt-1">
            {t(`costCalc.cancers.${estimate.cancer_type}`, lang)}
            {estimate.stage && estimate.stage !== "unknown" ? ` · ${estimate.stage}` : ""}
          </p>
        </section>
      )}

      {/* 견적 항목 */}
      <section className="mt-6 border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-medium text-sm">{L.coItems}</h2>
          {canEdit && (
            <button
              onClick={addItem}
              className="text-xs bg-gray-900 text-white px-3 py-1 rounded hover:bg-gray-700"
            >
              + {L.coAddItem}
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
            <tr>
              <th className="px-3 py-2 text-left">{L.coColItem}</th>
              <th className="px-3 py-2 text-left">{L.coColNote}</th>
              <th className="px-3 py-2 text-left">{L.coColPayer}</th>
              <th className="px-3 py-2 text-right">KRW</th>
              <th className="px-3 py-2 text-right">USD</th>
              {canEdit && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-sm text-gray-500">
                  {L.coNoItems} {canEdit ? L.coNoItemsHint : ""}
                </td>
              </tr>
            )}
            {items.map((it, i) => (
              <tr key={i}>
                <td className="px-3 py-2">
                  {canEdit ? (
                    <input
                      type="text"
                      value={it.label || ""}
                      onChange={(e) => updateItem(i, "label", e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      placeholder={L.coItemPlaceholder}
                    />
                  ) : (
                    it.label
                  )}
                </td>
                <td className="px-3 py-2">
                  {canEdit ? (
                    <input
                      type="text"
                      value={it.note || ""}
                      onChange={(e) => updateItem(i, "note", e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      placeholder={L.coNotePlaceholder}
                    />
                  ) : (
                    <span className="text-gray-600">{it.note}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {canEdit ? (
                    <select
                      value={it.payer === "hospital" ? "hospital" : "patient"}
                      onChange={(e) => updateItem(i, "payer", e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="patient">{L.coPayerPatient}</option>
                      <option value="hospital">{L.coPayerHospital}</option>
                    </select>
                  ) : (
                    <span className="text-gray-600">
                      {it.payer === "hospital" ? L.coPayerHospital : L.coPayerPatient}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {canEdit ? (
                    <input
                      type="number"
                      value={it.krw || ""}
                      onChange={(e) => updateItem(i, "krw", e.target.value)}
                      className="w-32 border border-gray-300 rounded px-2 py-1 text-sm text-right font-mono"
                    />
                  ) : (
                    <span className="font-mono">{fmtNum(it.krw)}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {canEdit ? (
                    <input
                      type="number"
                      value={it.usd || ""}
                      onChange={(e) => updateItem(i, "usd", e.target.value)}
                      className="w-28 border border-gray-300 rounded px-2 py-1 text-sm text-right font-mono"
                    />
                  ) : (
                    <span className="font-mono">{fmtNum(it.usd)}</span>
                  )}
                </td>
                {canEdit && (
                  <td className="px-3 py-2">
                    <button
                      onClick={() => removeItem(i)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      {L.coRemove}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {items.length > 0 && (
            <tfoot className="bg-gray-50 font-medium">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-right">{L.coTotalPatient}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(totalKrw)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(totalUsd)}</td>
                {canEdit && <td></td>}
              </tr>
            </tfoot>
          )}
        </table>
      </section>

      {/* 코디 메모 */}
      <section className="mt-6 border border-gray-200 rounded-lg p-4 bg-white">
        <h2 className="font-medium text-sm mb-2">{L.coNotesTitle}</h2>
        <textarea
          value={coordinatorNotes}
          onChange={(e) => setCoordinatorNotes(e.target.value)}
          rows={3}
          disabled={!canEdit}
          placeholder={L.coNotesPlaceholder}
          className="w-full border border-gray-300 rounded p-2 text-sm disabled:bg-gray-50"
        />
      </section>

      {/* PDF 발급 + 저장 */}
      <section className="mt-6 flex flex-wrap gap-3">
        {canEdit && (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gray-900 text-white px-5 py-2 rounded text-sm hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? L.coSaving : L.coSaveItemsNotes}
            </button>
            <button
              onClick={handleIssue}
              disabled={issuing || items.length === 0}
              className="bg-emerald-700 text-white px-5 py-2 rounded text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {issuing ? L.coIssuing : L.coIssuePdf}
            </button>
          </>
        )}
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-gray-300 px-5 py-2 rounded text-sm hover:border-black"
          >
            {L.coViewPdf}
          </a>
        )}
      </section>

      {estimate.patient_accepted_at && (
        <section className="mt-6 border border-green-200 bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-900">
            ✓ {L.coPatientAccepted}: {new Date(estimate.patient_accepted_at).toLocaleString(dateLoc)}
            {estimate.patient_accepted_ip && ` · IP ${estimate.patient_accepted_ip}`}
          </p>
        </section>
      )}
    </div>
  );
}
