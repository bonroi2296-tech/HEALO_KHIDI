"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STATUS_LABELS = {
  draft: { ko: "작성 중", color: "bg-gray-100 text-gray-700" },
  documents_pending: { ko: "서류 준비", color: "bg-amber-100 text-amber-800" },
  under_review: { ko: "검수 중", color: "bg-blue-100 text-blue-800" },
  changes_requested: { ko: "수정 요청", color: "bg-orange-100 text-orange-800" },
  invitation_ready: { ko: "초청장 준비", color: "bg-indigo-100 text-indigo-800" },
  invitation_issued: { ko: "초청장 발급", color: "bg-emerald-100 text-emerald-800" },
  submitted_embassy: { ko: "대사관 접수", color: "bg-teal-100 text-teal-800" },
  approved: { ko: "비자 승인", color: "bg-green-100 text-green-800" },
  rejected: { ko: "거절", color: "bg-red-100 text-red-800" },
  cancelled: { ko: "취소", color: "bg-gray-100 text-gray-500" },
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
      setError("목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 통계 집계
  const stats = STATUS_ORDER.map((s) => ({
    status: s,
    label: STATUS_LABELS[s].ko,
    count: applications.filter((a) => a.status === s).length,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">비자 트래킹 대시보드</h1>
        <p className="text-gray-500 mt-1 text-sm">
          환자 비자 발급 신청을 단계별로 관리하고 초청장을 발급합니다.
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
          <div className="text-xs text-gray-500">전체</div>
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

      {loading && <p className="text-gray-500 text-sm">불러오는 중...</p>}
      {error && <p className="text-red-600 text-sm">오류: {error}</p>}

      {!loading && applications.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">
            {statusFilter
              ? `${STATUS_LABELS[statusFilter]?.ko || statusFilter} 상태의 신청이 없습니다.`
              : "진행 중인 비자 신청이 없습니다."}
          </p>
        </div>
      )}

      {applications.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">비자 종류</th>
                <th className="px-4 py-3 text-left">국적</th>
                <th className="px-4 py-3 text-left">목적</th>
                <th className="px-4 py-3 text-left">체류</th>
                <th className="px-4 py-3 text-left">상태</th>
                <th className="px-4 py-3 text-left">생성</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {applications.map((app) => {
                const label = STATUS_LABELS[app.status] || STATUS_LABELS.draft;
                return (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{app.visa_type}</td>
                    <td className="px-4 py-3">{app.nationality}</td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-xs">
                      {app.purpose || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {app.duration_days ? `${app.duration_days}일` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${label.color}`}>
                        {label.ko}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(app.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/coordinator/visa/${app.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        상세 →
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
