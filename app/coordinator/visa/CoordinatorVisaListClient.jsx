"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCoordinatorL, useDateLocale } from "@/lib/i18n/coordinator";
import { useLang } from "@/lib/i18n/LangContext";
import { nationalityLabelL } from "@/lib/khidi/nationality";

// 상태 색상만 모듈 상수(언어 무관). 라벨은 컴포넌트에서 L로 해석.
const STATUS_COLOR = {
  draft: "bg-gray-100 text-gray-700",
  documents_pending: "bg-amber-100 text-amber-800",
  under_review: "bg-blue-100 text-blue-800",
  changes_requested: "bg-orange-100 text-orange-800",
  invitation_ready: "bg-indigo-100 text-indigo-800",
  invitation_issued: "bg-emerald-100 text-emerald-800",
  submitted_embassy: "bg-teal-100 text-teal-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
};

const STATUS_ORDER = [
  "draft",
  "documents_pending",
  "under_review",
  "changes_requested",
  "invitation_ready",
  "invitation_issued",
  "submitted_embassy",
  "approved",
  "rejected",
];

export default function CoordinatorVisaListClient() {
  const L = useCoordinatorL();
  const lang = useLang();
  const dateLoc = useDateLocale();
  // 비자 진행 상태 라벨(색상은 모듈 상수 STATUS_COLOR, 라벨만 L로 해석)
  const STATUS_LABEL = {
    draft: L.viStatusDraft,
    documents_pending: L.viStatusDocsPending,
    under_review: L.viStatusUnderReview,
    changes_requested: L.viStatusChangesRequested,
    invitation_ready: L.viStatusInvitationReady,
    invitation_issued: L.viStatusInvitationIssued,
    submitted_embassy: L.viStatusSubmittedEmbassy,
    approved: L.viStatusApproved,
    rejected: L.viStatusRejected,
    cancelled: L.viStatusCancelled,
  };
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadApplications();
  }, [statusFilter]);

  async function loadApplications() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/khidi/visa/applications?${params}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "failed");
      }
      setApplications(json.data || []);
    } catch (err) {
      console.error("[coordinator/visa]", err);
      setError(L.viLoadListError);
    } finally {
      setLoading(false);
    }
  }

  // 통계 집계
  const stats = STATUS_ORDER.map((s) => ({
    status: s,
    label: STATUS_LABEL[s],
    count: applications.filter((a) => a.status === s).length,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{L.viTitle}</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {L.viSubtitle}
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <button
          onClick={() => setStatusFilter("")}
          className={`border rounded-lg p-3 text-left hover:shadow-sm transition ${
            !statusFilter ? "border-black bg-gray-50" : "border-gray-200 bg-white"
          }`}
        >
          <div className="text-xs text-gray-500">{L.all}</div>
          <div className="text-2xl font-semibold mt-1">{applications.length}</div>
        </button>
        {stats
          .filter((s) => s.count > 0 || ["under_review", "invitation_ready"].includes(s.status))
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

      {loading && <p className="text-gray-500 text-sm">{L.processing}</p>}
      {error && <p className="text-red-600 text-sm">{L.viErrorPrefix}: {error}</p>}

      {!loading && applications.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">
            {statusFilter
              ? L.viEmptyFiltered.replace("{status}", STATUS_LABEL[statusFilter] || statusFilter)
              : L.viEmpty}
          </p>
        </div>
      )}

      {applications.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">{L.viColType}</th>
                <th className="px-4 py-3 text-left">{L.nationality}</th>
                <th className="px-4 py-3 text-left">{L.viColPurpose}</th>
                <th className="px-4 py-3 text-left">{L.viColStay}</th>
                <th className="px-4 py-3 text-left">{L.status}</th>
                <th className="px-4 py-3 text-left">{L.viColCreated}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {applications.map((app) => {
                const statusColor = STATUS_COLOR[app.status] || STATUS_COLOR.draft;
                const statusLabel = STATUS_LABEL[app.status] || STATUS_LABEL.draft;
                return (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{app.visa_type}</td>
                    <td className="px-4 py-3">{nationalityLabelL(app.nationality, lang)}</td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-xs">
                      {app.purpose || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {app.duration_days ? L.viDurationDays.replace("{n}", app.duration_days) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(app.created_at).toLocaleDateString(dateLoc)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/coordinator/visa/${app.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {L.viDetailArrow}
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
