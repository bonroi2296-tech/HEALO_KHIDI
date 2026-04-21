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

export default function CostEstimatesListClient() {
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/khidi/cost-estimates", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      setEstimates(json.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">내 예상 진료비 견적</h1>
      <p className="text-gray-500 mt-2 text-sm">
        코디네이터가 병원에 문의 후 정식 견적서를 발급합니다. 법적 효력은 발급된 견적서에만 있습니다.
      </p>

      {loading && <p className="mt-8 text-sm text-gray-500">불러오는 중...</p>}
      {error && <p className="mt-8 text-sm text-red-600">오류: {error}</p>}

      {!loading && estimates.length === 0 && (
        <div className="mt-8 text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">진행 중인 견적 요청이 없습니다.</p>
          <Link
            href="/patient/chat"
            className="mt-4 inline-block text-sm underline underline-offset-4"
          >
            챗봇으로 예상비용 먼저 확인하기
          </Link>
        </div>
      )}

      {estimates.length > 0 && (
        <div className="mt-8 space-y-3">
          {estimates.map((est) => {
            const label = STATUS_LABELS[est.status] || STATUS_LABELS.auto_range;
            return (
              <Link
                key={est.id}
                href={`/patient/cost-estimates/${est.id}`}
                className="block border border-gray-200 rounded-lg p-5 bg-white hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {est.quotation_no || "견적 요청"}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${label.color}`}
                      >
                        {label.ko}
                      </span>
                    </div>
                    {est.total_krw ? (
                      <p className="text-sm text-gray-600 mt-1">
                        총 {Number(est.total_krw).toLocaleString("ko-KR")} KRW
                        {est.total_usd
                          ? ` · $${Number(est.total_usd).toLocaleString("en-US")}`
                          : ""}
                      </p>
                    ) : est.auto_min_krw ? (
                      <p className="text-sm text-gray-600 mt-1">
                        자동 범위: {Number(est.auto_min_krw).toLocaleString("ko-KR")} ~{" "}
                        {Number(est.auto_max_krw).toLocaleString("ko-KR")} KRW
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 mt-1">범위 미산출</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      생성 {new Date(est.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <span className="text-gray-400 text-sm">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
