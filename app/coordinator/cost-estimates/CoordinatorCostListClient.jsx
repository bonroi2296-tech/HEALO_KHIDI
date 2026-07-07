"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCoordinatorL, useDateLocale } from "@/lib/i18n/coordinator";

// 색상만 모듈 상수(언어 무관). 라벨은 컴포넌트에서 L로 해석.
const STATUS_COLOR = {
  auto_range: "bg-gray-100 text-gray-700",
  formal_requested: "bg-amber-100 text-amber-800",
  hospital_pending: "bg-blue-100 text-blue-800",
  draft: "bg-indigo-100 text-indigo-800",
  issued: "bg-emerald-100 text-emerald-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-500",
};

const STATUS_ORDER = Object.keys(STATUS_COLOR);

export default function CoordinatorCostListClient() {
  const L = useCoordinatorL();
  const dateLoc = useDateLocale();
  const STATUS_LABEL = {
    auto_range: L.coStatusAutoRange,
    formal_requested: L.coStatusFormalRequested,
    hospital_pending: L.coStatusHospitalPending,
    draft: L.coStatusDraft,
    issued: L.coStatusIssued,
    accepted: L.coStatusAccepted,
    rejected: L.coStatusRejected,
    expired: L.coStatusExpired,
  };
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/khidi/cost-estimates?${params}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      setEstimates(json.data || []);
    } catch (err) {
      console.error("[coordinator/cost-estimate]", err);
      setError(L.coListLoadFail);
    } finally {
      setLoading(false);
    }
  }

  const stats = STATUS_ORDER.map((s) => ({
    status: s,
    label: STATUS_LABEL[s],
    count: estimates.filter((e) => e.status === s).length,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        {L.coListTitle}
      </h1>
      <p className="text-gray-500 mt-1 text-sm">
        {L.coListSubtitle}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-8">
        <button
          onClick={() => setStatusFilter("")}
          className={`border rounded-lg p-3 text-left hover:shadow-sm transition ${
            !statusFilter ? "border-black bg-gray-50" : "border-gray-200 bg-white"
          }`}
        >
          <div className="text-xs text-gray-500">{L.all}</div>
          <div className="text-2xl font-semibold mt-1">{estimates.length}</div>
        </button>
        {stats
          .filter((s) => s.count > 0 || ["formal_requested", "draft"].includes(s.status))
          .slice(0, 9)
          .map((s) => (
            <button
              key={s.status}
              onClick={() => setStatusFilter(s.status)}
              className={`border rounded-lg p-3 text-left hover:shadow-sm transition ${
                statusFilter === s.status ? "border-black bg-gray-50" : "border-gray-200 bg-white"
              }`}
            >
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-2xl font-semibold mt-1">{s.count}</div>
            </button>
          ))}
      </div>

      {loading && <p className="mt-8 text-sm text-gray-500">{L.coLoading}</p>}
      {error && <p className="mt-8 text-sm text-red-600">{L.coError}: {error}</p>}

      {!loading && estimates.length === 0 && (
        <div className="mt-8 text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">
            {statusFilter
              ? L.coNoStatus.replace("{status}", STATUS_LABEL[statusFilter] || statusFilter)
              : L.coNoRequests}
          </p>
        </div>
      )}

      {estimates.length > 0 && (
        <div className="mt-8 border border-gray-200 rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">{L.coColNo}</th>
                <th className="px-4 py-3 text-left">{L.fieldPatient}</th>
                <th className="px-4 py-3 text-left">{L.coColAutoRange}</th>
                <th className="px-4 py-3 text-left">{L.coColTotal}</th>
                <th className="px-4 py-3 text-left">{L.status}</th>
                <th className="px-4 py-3 text-left">{L.coColCreated}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {estimates.map((est) => {
                const statusColor = STATUS_COLOR[est.status] || STATUS_COLOR.auto_range;
                const statusLabel = STATUS_LABEL[est.status] || STATUS_LABEL.auto_range;
                return (
                  <tr key={est.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">
                      {est.quotation_no || est.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {est.patient_user_id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {est.auto_min_krw
                        ? `${(est.auto_min_krw / 1000000).toFixed(0)}M~${(est.auto_max_krw / 1000000).toFixed(0)}M KRW`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {est.total_krw
                        ? `${Number(est.total_krw).toLocaleString(dateLoc)} KRW`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(est.created_at).toLocaleDateString(dateLoc)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/coordinator/cost-estimates/${est.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {L.viewDetail} →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
