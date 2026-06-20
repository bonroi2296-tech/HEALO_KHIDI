"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

const STATUSES = Object.keys(STATUS_LABELS);

function fmtNum(n) {
  if (n == null || n === "") return "";
  return Number(n).toLocaleString("ko-KR");
}

export default function CoordinatorCostDetailClient({ estimateId }) {
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
      setError(err.message);
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

  const totalKrw = items.reduce((s, it) => s + (Number(it.krw) || 0), 0);
  const totalUsd = items.reduce((s, it) => s + (Number(it.usd) || 0), 0);

  async function handleSave() {
    setSaving(true);
    try {
      const normalized = items.map((it) => ({
        label: it.label || "",
        note: it.note || "",
        krw: it.krw ? Number(it.krw) : null,
        usd: it.usd ? Number(it.usd) : null,
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
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      await load();
      alert("저장 완료");
    } catch (err) {
      alert("저장 실패: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus) {
    const note = prompt(`"${STATUS_LABELS[newStatus]}" 로 변경. 메모(선택):`);
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
    } catch (err) {
      alert("실패: " + err.message);
    }
  }

  async function handleIssue() {
    if (items.length === 0) {
      alert("견적 항목을 먼저 추가하세요");
      return;
    }
    if (!confirm("견적서 PDF 를 발급하시겠습니까? 상태가 'issued' 로 변경되고 환자에게 노출됩니다.")) return;
    setIssuing(true);
    try {
      await handleSave(); // 먼저 저장
      const res = await fetch(
        `/api/khidi/cost-estimates/${estimateId}/quotation`,
        { method: "POST", credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || json.detail || "failed");
      await load();
      alert("견적서 발급 완료!");
    } catch (err) {
      alert("발급 실패: " + err.message);
    } finally {
      setIssuing(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-sm text-gray-500">불러오는 중...</p>
      </div>
    );
  }
  if (error || !estimate) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-sm text-red-600">오류: {error}</p>
        <Link href="/coordinator/cost-estimates" className="text-sm underline mt-4 inline-block">← 목록</Link>
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
        ← 견적 목록
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {estimate.quotation_no || `견적 ${estimate.id.slice(0, 8)}`}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            환자 <span className="font-mono">{estimate.patient_user_id.slice(0, 8)}…</span> ·{" "}
            {new Date(estimate.created_at).toLocaleString("ko-KR")}
          </p>
        </div>
        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
          현재: {STATUS_LABELS[estimate.status]}
        </span>
      </div>

      {/* 상태 전이 */}
      <section className="mt-6 border border-gray-200 rounded-lg p-4 bg-white">
        <h2 className="font-medium text-sm mb-3">상태 변경</h2>
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

      {/* 자동 범위 */}
      {estimate.auto_min_krw && (
        <section className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h2 className="font-medium text-sm">자동 범위 (Tier 1)</h2>
          <p className="text-sm text-gray-700 mt-1">
            {Number(estimate.auto_min_krw).toLocaleString("ko-KR")} ~{" "}
            {Number(estimate.auto_max_krw).toLocaleString("ko-KR")} KRW
          </p>
        </section>
      )}

      {/* 견적 항목 */}
      <section className="mt-6 border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-medium text-sm">견적 항목</h2>
          {canEdit && (
            <button
              onClick={addItem}
              className="text-xs bg-gray-900 text-white px-3 py-1 rounded hover:bg-gray-700"
            >
              + 항목 추가
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
            <tr>
              <th className="px-3 py-2 text-left">항목</th>
              <th className="px-3 py-2 text-left">비고</th>
              <th className="px-3 py-2 text-right">KRW</th>
              <th className="px-3 py-2 text-right">USD</th>
              {canEdit && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="px-4 py-8 text-center text-sm text-gray-500">
                  항목 없음 {canEdit ? "— 위 버튼으로 추가" : ""}
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
                      placeholder="예: 위절제술"
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
                      placeholder="병원 요금"
                    />
                  ) : (
                    <span className="text-gray-600">{it.note}</span>
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
                      제거
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {items.length > 0 && (
            <tfoot className="bg-gray-50 font-medium">
              <tr>
                <td colSpan={2} className="px-3 py-2 text-right">합계</td>
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
        <h2 className="font-medium text-sm mb-2">코디 메모 (환자에게 표시됨)</h2>
        <textarea
          value={coordinatorNotes}
          onChange={(e) => setCoordinatorNotes(e.target.value)}
          rows={3}
          disabled={!canEdit}
          placeholder="환자에게 전달할 메모 (비용 구성, 결제 일정 등)"
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
              {saving ? "저장 중..." : "항목/메모 저장"}
            </button>
            <button
              onClick={handleIssue}
              disabled={issuing || items.length === 0}
              className="bg-emerald-700 text-white px-5 py-2 rounded text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {issuing ? "발급 중..." : "견적서 PDF 발급"}
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
            발급된 PDF 보기
          </a>
        )}
      </section>

      {estimate.patient_accepted_at && (
        <section className="mt-6 border border-green-200 bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-900">
            ✓ 환자 동의 완료: {new Date(estimate.patient_accepted_at).toLocaleString("ko-KR")}
            {estimate.patient_accepted_ip && ` · IP ${estimate.patient_accepted_ip}`}
          </p>
        </section>
      )}
    </div>
  );
}
