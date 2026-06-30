"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STATUS_LABELS = {
  auto_range: { ko: "자동 범위", color: "bg-gray-100 text-gray-700" },
  formal_requested: { ko: "정식 요청", color: "bg-amber-100 text-amber-800" },
  hospital_pending: { ko: "병원 응답 대기", color: "bg-blue-100 text-blue-800" },
  draft: { ko: "코디 작성 중", color: "bg-indigo-100 text-indigo-800" },
  issued: { ko: "견적서 발급", color: "bg-emerald-100 text-emerald-800" },
  accepted: { ko: "동의 완료", color: "bg-green-100 text-green-800" },
  rejected: { ko: "거절", color: "bg-red-100 text-red-800" },
  expired: { ko: "만료", color: "bg-gray-100 text-gray-500" },
};

const STATUS_ORDER = Object.keys(STATUS_LABELS);

export default function CoordinatorCostListClient() {
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
      setError("목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const stats = STATUS_ORDER.map((s) => ({
    status: s,
    label: STATUS_LABELS[s].ko,
    count: estimates.filter((e) => e.status === s).length,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        예상 진료비 견적 대시보드
      </h1>
      <p className="text-gray-500 mt-1 text-sm">
        정식 견적 요청을 받아 병원 문의 후 견적서 PDF 를 발급합니다.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-8">
        <button
          onClick={() => setStatusFilter("")}
          className={`border rounded-lg p-3 text-left hover:shadow-sm transition ${
            !statusFilter ? "border-black bg-gray-50" : "border-gray-200 bg-white"
          }`}
        >
          <div className="text-xs text-gray-500">전체</div>
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

      {loading && <p className="mt-8 text-sm text-gray-500">불러오는 중...</p>}
      {error && <p className="mt-8 text-sm text-red-600">오류: {error}</p>}

      {!loading && estimates.length === 0 && (
        <div className="mt-8 text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">
            {statusFilter ? `${STATUS_LABELS[statusFilter]?.ko} 상태 없음` : "견적 요청 없음"}
          </p>
        </div>
      )}

      {estimates.length > 0 && (
        <div className="mt-8 border border-gray-200 rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">No.</th>
                <th className="px-4 py-3 text-left">환자</th>
                <th className="px-4 py-3 text-left">자동 범위</th>
                <th className="px-4 py-3 text-left">확정 총액</th>
                <th className="px-4 py-3 text-left">상태</th>
                <th className="px-4 py-3 text-left">생성</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {estimates.map((est) => {
                const label = STATUS_LABELS[est.status] || STATUS_LABELS.auto_range;
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
                        ? `${Number(est.total_krw).toLocaleString("ko-KR")} KRW`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${label.color}`}>
                        {label.ko}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(est.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/coordinator/cost-estimates/${est.id}`}
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
