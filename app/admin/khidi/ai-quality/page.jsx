"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminGuideModal } from "../../_components/AdminGuideModal";

// ─────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────
const fmt2 = (n) =>
  typeof n === "number" ? (n * 100).toFixed(1) + "%" : "—";

const scoreColor = (score) => {
  if (score === null || score === undefined) return "text-gray-500";
  if (score >= 0.8) return "text-green-600 font-semibold";
  if (score >= 0.6) return "text-yellow-600 font-semibold";
  return "text-red-600 font-semibold";
};

const flagBadge = (flag) => {
  const colors = {
    hallucination: "bg-red-100 text-red-700",
    medical_diagnosis: "bg-orange-100 text-orange-700",
    fabricated_hospital: "bg-red-100 text-red-700",
    off_topic: "bg-gray-100 text-gray-700",
    unsafe_advice: "bg-orange-100 text-orange-700",
    fabricated_price: "bg-yellow-100 text-yellow-700",
  };
  return colors[flag] ?? "bg-gray-100 text-gray-700";
};

// ─────────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────────
function KpiCard({ label, value, sub, colorClass }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClass ?? "text-gray-900"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function DailyTable({ rows }) {
  if (!rows?.length)
    return <p className="text-sm text-gray-500">데이터 없음</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="px-3 py-2 border-b">날짜</th>
            <th className="px-3 py-2 border-b text-right">건수</th>
            <th className="px-3 py-2 border-b text-right">Overall</th>
            <th className="px-3 py-2 border-b text-right">환각 방지</th>
            <th className="px-3 py-2 border-b text-right">안전성</th>
            <th className="px-3 py-2 border-b text-right">관련성</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date} className="hover:bg-gray-50">
              <td className="px-3 py-2 border-b">{r.date}</td>
              <td className="px-3 py-2 border-b text-right">{r.count}</td>
              <td className={`px-3 py-2 border-b text-right ${scoreColor(r.overall_avg)}`}>
                {fmt2(r.overall_avg)}
              </td>
              <td className={`px-3 py-2 border-b text-right ${scoreColor(r.hallucination_avg)}`}>
                {fmt2(r.hallucination_avg)}
              </td>
              <td className={`px-3 py-2 border-b text-right ${scoreColor(r.safety_avg)}`}>
                {fmt2(r.safety_avg)}
              </td>
              <td className={`px-3 py-2 border-b text-right ${scoreColor(r.relevance_avg)}`}>
                {fmt2(r.relevance_avg)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LowScoreItem({ item, onOpenThread }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`text-sm font-bold ${scoreColor(item.overall_score)}`}
            >
              {fmt2(item.overall_score)}
            </span>
            {item.flags?.map((f) => (
              <span
                key={f}
                className={`text-xs px-2 py-0.5 rounded-full ${flagBadge(f)}`}
              >
                {f}
              </span>
            ))}
            <span className="text-xs text-gray-500">
              {item.created_at?.slice(0, 16).replace("T", " ")}
            </span>
          </div>
          <p className="text-sm text-gray-800 truncate">{item.query_text}</p>
          {item.judge_reasoning && (
            <p className="text-xs text-gray-500 mt-0.5 italic">
              {item.judge_reasoning}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {item.thread_id && (
            <button
              onClick={() => onOpenThread(item.thread_id)}
              className="text-xs px-2 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded hover:bg-teal-100 transition"
            >
              스레드 열기
            </button>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs px-2 py-1 bg-gray-50 text-gray-700 border rounded hover:bg-gray-100 transition"
          >
            {expanded ? "접기" : "응답 보기"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-50 rounded p-2">
              <span className="text-gray-500">환각 방지: </span>
              <span className={scoreColor(item.hallucination_score)}>
                {fmt2(item.hallucination_score)}
              </span>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <span className="text-gray-500">안전성: </span>
              <span className={scoreColor(item.safety_score)}>
                {fmt2(item.safety_score)}
              </span>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <span className="text-gray-500">관련성: </span>
              <span className={scoreColor(item.relevance_score)}>
                {fmt2(item.relevance_score)}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">AI 응답:</p>
            <p className="text-xs bg-gray-50 rounded p-2 whitespace-pre-wrap text-gray-700 max-h-48 overflow-y-auto">
              {item.response_text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────────
export default function AiQualityPage() {
  const [showGuide, setShowGuide] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const now = new Date();
  const [filters, setFilters] = useState(() => ({
    from: new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
    score_max: "0.6",
  }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: filters.from,
        to: filters.to,
        score_max: filters.score_max,
        limit: "100",
      });
      const res = await fetch(`/api/admin/khidi/ai-quality?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (json.ok) setData(json);
      else console.error("[ai-quality] API 오류:", json.error);
    } catch (e) {
      console.error("[ai-quality] fetch 실패:", e);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenThread = (threadId) => {
    // /admin/chat 이 실제 대화 뷰어 (?thread= 딥링크 지원). 옛 /admin/agent 는 파라미터 무시.
    window.open(`/admin/chat?thread=${threadId}`, "_blank");
  };

  const s = data?.summary;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {showGuide && (
        <AdminGuideModal
          title="AI 응답 품질 모니터링 가이드"
          onClose={() => setShowGuide(false)}
        >
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              이 페이지는 무엇인가요?
            </h3>
            <p>
              AI 챗봇이 생성한 응답을 별도 Judge AI 가 자동으로 채점합니다.
              점수가 낮은 응답(60점 미만)은 여기서 검토하고, 필요 시 해당
              대화 스레드를 열어 직접 확인할 수 있습니다.
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              점수 기준
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>
                <strong>환각 방지</strong>: DB에 없는 병원·가격·사실을
                지어냈는지 (100% = 지어낸 것 없음)
              </li>
              <li>
                <strong>안전성</strong>: 의료 진단·처방·예후를 단정했는지
                (100% = 안전)
              </li>
              <li>
                <strong>관련성</strong>: 환자 질문과 응답이 맞는지 (100% =
                완전 일치)
              </li>
              <li>
                <strong>Overall</strong>: 위 세 점수의 가중 평균
              </li>
            </ul>
          </section>
        </AdminGuideModal>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">AI 응답 품질 모니터링</h1>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          사용 가이드
        </button>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 items-end bg-white border rounded-lg p-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            낮은 점수 기준
          </label>
          <select
            value={filters.score_max}
            onChange={(e) =>
              setFilters((f) => ({ ...f, score_max: e.target.value }))
            }
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="0.4">40% 미만 (위험)</option>
            <option value="0.6">60% 미만 (주의)</option>
            <option value="0.8">80% 미만 (검토)</option>
          </select>
        </div>
      </div>

      {/* KPI 요약 */}
      {s && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="분석된 응답 수"
            value={s.total_count?.toLocaleString() ?? "—"}
          />
          <KpiCard
            label="평균 Overall 점수"
            value={fmt2(s.avg_overall)}
            colorClass={scoreColor(s.avg_overall)}
          />
          <KpiCard
            label="낮은 점수 건수"
            value={s.low_score_count?.toLocaleString() ?? "—"}
            sub={`기준: ${(parseFloat(filters.score_max) * 100).toFixed(0)}% 미만`}
            colorClass={s.low_score_count > 0 ? "text-red-600 font-bold" : "text-gray-900"}
          />
          <KpiCard
            label="낮은 점수 비율"
            value={`${s.low_score_rate?.toFixed(1) ?? "—"}%`}
            colorClass={
              s.low_score_rate > 20
                ? "text-red-600 font-bold"
                : s.low_score_rate > 10
                ? "text-yellow-600 font-semibold"
                : "text-green-600 font-semibold"
            }
          />
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : (
        <>
          {/* 일별 추이 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">일별 점수 추이</h2>
            <div className="bg-white border rounded-lg p-4">
              <DailyTable rows={data?.daily_avg} />
            </div>
          </section>

          {/* 낮은 점수 응답 목록 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">
              낮은 점수 응답 목록
              {data?.low_score_items?.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  ({data.low_score_items.length}건)
                </span>
              )}
            </h2>
            {!data?.low_score_items?.length ? (
              <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
                해당 기간에 낮은 점수 응답이 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {data.low_score_items.map((item) => (
                  <LowScoreItem
                    key={item.id}
                    item={item}
                    onOpenThread={handleOpenThread}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
