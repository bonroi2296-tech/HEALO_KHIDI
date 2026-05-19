"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ThumbsUp, ThumbsDown, ExternalLink, RefreshCw } from "lucide-react";

const REASON_LABELS = {
  inaccurate: "정보 부정확",
  irrelevant: "관련 없음",
  harmful: "위험한 내용",
  other: "기타",
};

const REASON_COLORS = {
  inaccurate: "bg-red-100 text-red-700",
  irrelevant: "bg-orange-100 text-orange-700",
  harmful: "bg-purple-100 text-purple-700",
  other: "bg-gray-100 text-gray-700",
};

function BarChart({ data }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.positive, d.negative]));
  return (
    <div className="flex items-end gap-1 w-full" style={{ height: 120 }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="flex items-end gap-0.5 w-full" style={{ height: 100 }}>
            <div
              className="flex-1 bg-teal-400 rounded-t transition-all duration-500"
              style={{ height: `${Math.max(2, (d.positive / max) * 100)}%` }}
              title={`👍 ${d.positive}`}
            />
            <div
              className="flex-1 bg-red-400 rounded-t transition-all duration-500"
              style={{ height: `${Math.max(2, (d.negative / max) * 100)}%` }}
              title={`👎 ${d.negative}`}
            />
          </div>
          <span className="text-[9px] text-gray-400 truncate w-full text-center">
            {d.date.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

function PieChart({ data }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>;

  const colors = ["#f87171", "#fb923c", "#a78bfa", "#9ca3af"];
  const keys = Object.keys(data);
  let cumAngle = 0;
  const slices = keys.map((key, i) => {
    const pct = data[key] / total;
    const angle = pct * 360;
    const slice = { key, count: data[key], pct, startAngle: cumAngle, endAngle: cumAngle + angle, color: colors[i % colors.length] };
    cumAngle += angle;
    return slice;
  });

  const r = 40;
  const cx = 60;
  const cy = 60;

  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, startAngle);
    const end = polarToCartesian(cx, cy, r, endAngle);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
  }

  return (
    <div className="flex items-center gap-6">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {slices.map((s) => (
          <path
            key={s.key}
            d={describeArc(cx, cy, r, s.startAngle, s.endAngle)}
            fill={s.color}
          />
        ))}
      </svg>
      <div className="space-y-1.5">
        {slices.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-gray-700">{REASON_LABELS[s.key] || s.key}</span>
            <span className="text-gray-500 font-medium">{s.count}건 ({Math.round(s.pct * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AiFeedbackPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/khidi/ai-feedback", { credentials: "include", cache: "no-store" });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "알 수 없는 오류");
        return;
      }
      setData(json);
    } catch (e) {
      setError("서버 연결 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = data?.stats ?? { total: 0, positive: 0, negative: 0 };
  const positiveRate = stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI 응답 피드백</h1>
          <p className="text-sm text-gray-500 mt-0.5">환자의 👍/👎 피드백 현황 및 신고 내역</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          새로고침
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          오류: {error}
        </div>
      )}

      {/* 통계 카드 3종 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center">
          <p className="text-xs font-semibold text-gray-500 mb-1">전체 피드백</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">건</p>
        </div>
        <div className="bg-white rounded-xl border border-teal-200 p-5 shadow-sm text-center">
          <p className="text-xs font-semibold text-teal-600 mb-1 flex items-center justify-center gap-1">
            <ThumbsUp size={12} /> 긍정
          </p>
          <p className="text-3xl font-bold text-teal-700">{stats.positive.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">{positiveRate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-5 shadow-sm text-center">
          <p className="text-xs font-semibold text-red-600 mb-1 flex items-center justify-center gap-1">
            <ThumbsDown size={12} /> 부정
          </p>
          <p className="text-3xl font-bold text-red-600">{stats.negative.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.total > 0 ? 100 - positiveRate : 0}%</p>
        </div>
      </div>

      {/* 최근 7일 추이 + 사유 분포 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">최근 7일 추이</h2>
          {data ? (
            <>
              <BarChart data={data.daily7 ?? []} />
              <div className="flex gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-teal-400" />
                  <span className="text-xs text-gray-500">👍 긍정</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-red-400" />
                  <span className="text-xs text-gray-500">👎 부정</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">{loading ? "로딩 중..." : "데이터 없음"}</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">부정 피드백 사유 분포</h2>
          {data && Object.keys(data.reasonCounts ?? {}).length > 0 ? (
            <PieChart data={data.reasonCounts} />
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">{loading ? "로딩 중..." : "데이터 없음"}</p>
          )}
        </div>
      </div>

      {/* 👎 신고 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">부정 피드백 목록 (최근 50건)</h2>
        </div>
        {loading && !data ? (
          <p className="text-sm text-gray-400 text-center py-10">로딩 중...</p>
        ) : (data?.negativeList ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">부정 피드백 없음</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {(data?.negativeList ?? []).map((item) => (
              <div key={item.id} className="px-5 py-4 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {item.reason_category && (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${REASON_COLORS[item.reason_category] || "bg-gray-100 text-gray-700"}`}>
                          {REASON_LABELS[item.reason_category] || item.reason_category}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400">
                        {item.created_at ? new Date(item.created_at).toLocaleString("ko-KR") : "—"}
                      </span>
                      {item.guest_email && (
                        <span className="text-[11px] text-gray-400 truncate">{item.guest_email}</span>
                      )}
                    </div>
                    {item.message_content && (
                      <p className="text-sm text-gray-700 line-clamp-2 mb-1">{item.message_content}</p>
                    )}
                    {item.comment && (
                      <p className="text-xs text-gray-500 italic">"{item.comment}"</p>
                    )}
                  </div>
                  <Link
                    href={`/admin/inquiries?thread=${item.thread_id}`}
                    className="shrink-0 flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                  >
                    스레드 보기
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
