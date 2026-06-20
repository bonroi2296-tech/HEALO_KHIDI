"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase 클라이언트 (공개 읽기용) ──────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── 유틸 ────────────────────────────────────────────────────────
const PCT_COLOR = (pct) => {
  if (pct >= 90) return "text-green-600";
  if (pct >= 70) return "text-amber-500";
  return "text-red-500";
};

const SCORE_COLOR = (score) => {
  if (score >= 0.7) return "text-green-600";
  if (score >= 0.5) return "text-amber-500";
  return "text-red-500";
};

const BAR_COLOR = (pct) => {
  if (pct >= 90) return "bg-green-500";
  if (pct >= 70) return "bg-amber-400";
  return "bg-red-400";
};

// ── 서브 컴포넌트 ────────────────────────────────────────────────
function StatCard({ label, value, sub, colorClass = "text-gray-900" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function MiniBar({ value, max, colorClass = "bg-teal-700" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
      <div className={`${colorClass} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** 30일 시계열 선 차트 — CSS 기반 */
function TrendChart({ data, label, colorClass: _colorClass = "bg-teal-700", yMax = 100 }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
        데이터 없음
      </div>
    );
  }


  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="relative h-32 flex items-end gap-0.5">
        {data.map((d, i) => {
          const pct = yMax > 0 ? Math.min(100, Math.round((d.value / yMax) * 100)) : 0;
          const barColor = label.includes("점수")
            ? (d.value >= 0.7 ? "bg-teal-700" : d.value >= 0.5 ? "bg-amber-400" : "bg-red-400")
            : BAR_COLOR(d.value);
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end gap-0"
              title={`${d.date}: ${d.value}${label.includes("점수") ? "" : "%"}`}
            >
              <div
                className={`w-full rounded-t ${barColor} transition-all`}
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">{data[0]?.date?.slice(5) ?? ""}</span>
        <span className="text-xs text-gray-400">{data[data.length - 1]?.date?.slice(5) ?? ""}</span>
      </div>
    </div>
  );
}

/** 카테고리별 통과율 바 */
function CategoryBreakdown({ rows }) {
  if (!rows || rows.length === 0) return null;

  // 카테고리별 집계
  const byCategory = {};
  for (const row of rows) {
    const cat = row.ai_regression_tests?.scenario_category ?? "unknown";
    if (!byCategory[cat]) byCategory[cat] = { passed: 0, total: 0 };
    byCategory[cat].total++;
    if (row.passed) byCategory[cat].passed++;
  }

  return (
    <div className="space-y-3">
      {Object.entries(byCategory)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([cat, stat]) => {
          const pct = stat.total > 0 ? Math.round((stat.passed / stat.total) * 100) : 0;
          return (
            <div key={cat}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-700 capitalize">{cat}</span>
                <span className={`text-xs font-bold ${PCT_COLOR(pct)}`}>
                  {stat.passed}/{stat.total} ({pct}%)
                </span>
              </div>
              <MiniBar value={stat.passed} max={stat.total} colorClass={BAR_COLOR(pct)} />
            </div>
          );
        })}
    </div>
  );
}

/** 최근 실패 시나리오 테이블 */
function FailedTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="text-center text-gray-400 text-sm py-8">
        최근 실패 시나리오 없음
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left text-xs font-semibold text-gray-500 py-2 pr-4">시나리오</th>
            <th className="text-left text-xs font-semibold text-gray-500 py-2 pr-4">카테고리</th>
            <th className="text-left text-xs font-semibold text-gray-500 py-2 pr-4">날짜</th>
            <th className="text-right text-xs font-semibold text-gray-500 py-2 pr-4">점수</th>
            <th className="text-left text-xs font-semibold text-gray-500 py-2">flags</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 pr-4 font-mono text-xs text-gray-700 max-w-[180px] truncate">
                {row.ai_regression_tests?.scenario_id ?? "-"}
              </td>
              <td className="py-2 pr-4">
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                  {row.ai_regression_tests?.scenario_category ?? "-"}
                </span>
              </td>
              <td className="py-2 pr-4 text-xs text-gray-500">{row.run_date}</td>
              <td className={`py-2 pr-4 text-right font-bold text-xs ${SCORE_COLOR(row.overall_score)}`}>
                {row.overall_score?.toFixed(2) ?? "-"}
              </td>
              <td className="py-2 text-xs text-gray-500 max-w-[200px] truncate">
                {Array.isArray(row.flags) && row.flags.length > 0
                  ? row.flags.join(", ")
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 메인 페이지 ─────────────────────────────────────────────────
export default function AiRegressionPage() {
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);
  const [error, setError] = useState(null);

  const [trendPassRate, setTrendPassRate] = useState([]);
  const [trendAvgScore, setTrendAvgScore] = useState([]);
  const [latestSummary, setLatestSummary] = useState(null);
  const [failedRows, setFailedRows] = useState([]);
  const [allLatestRows, setAllLatestRows] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // 최근 30일 일별 집계 (run_date별)
      const { data: runData, error: runErr } = await supabase
        .from("ai_regression_runs")
        .select("run_date, overall_score, passed, flags, test_id, id, ai_regression_tests(scenario_id, scenario_category)")
        .gte("run_date", thirtyDaysAgo)
        .order("run_date", { ascending: true });

      if (runErr) throw runErr;

      // 일별 통과율·평균점수 집계
      const byDate = {};
      for (const row of (runData ?? [])) {
        const d = row.run_date;
        if (!byDate[d]) byDate[d] = { passed: 0, total: 0, scoreSum: 0 };
        byDate[d].total++;
        if (row.passed) byDate[d].passed++;
        byDate[d].scoreSum += Number(row.overall_score ?? 0);
      }

      const passRateTrend = Object.entries(byDate).map(([date, s]) => ({
        date,
        value: s.total > 0 ? Math.round((s.passed / s.total) * 100) : 0,
      }));
      const avgScoreTrend = Object.entries(byDate).map(([date, s]) => ({
        date,
        value: s.total > 0 ? Math.round((s.scoreSum / s.total) * 100) / 100 : 0,
      }));

      setTrendPassRate(passRateTrend);
      setTrendAvgScore(avgScoreTrend);

      // 최신 날짜 요약
      const latestDate = Object.keys(byDate).sort().pop();
      if (latestDate) {
        const s = byDate[latestDate];
        setLatestSummary({
          date: latestDate,
          passRate: s.total > 0 ? Math.round((s.passed / s.total) * 100) : 0,
          avgScore: s.total > 0 ? Math.round((s.scoreSum / s.total) * 100) / 100 : 0,
          total: s.total,
          passed: s.passed,
        });
      }

      // 오늘(또는 최신) 실행 전체 행
      const latestRows = (runData ?? []).filter((r) => r.run_date === latestDate);
      setAllLatestRows(latestRows);

      // 최근 실패 목록 (최대 30개)
      const failed = (runData ?? [])
        .filter((r) => !r.passed)
        .sort((a, b) => (b.run_date > a.run_date ? 1 : -1))
        .slice(0, 30);
      setFailedRows(failed);
    } catch (e) {
      setError(e.message ?? "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 수동 트리거
  const handleTrigger = async () => {
    setTriggering(true);
    setTriggerResult(null);
    try {
      // 관리자 세션(쿠키)으로 트리거 — cron 비밀키를 클라이언트에 노출하지 않는다.
      const res = await fetch("/api/admin/khidi/run-regression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const json = await res.json();
      setTriggerResult(json);
      if (json.ok) {
        // 결과 반영을 위해 2초 후 새로고침
        setTimeout(() => loadData(), 2000);
      }
    } catch (e) {
      setTriggerResult({ ok: false, error: e.message });
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        AI 회귀 테스트 데이터 불러오는 중...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 회귀 테스트</h1>
          <p className="text-sm text-gray-500 mt-1">
            매일 자동 실행 — 응답 품질 자동 검증 시스템
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            새로고침
          </button>
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="text-sm px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {triggering ? "실행 중..." : "지금 실행"}
          </button>
        </div>
      </div>

      {/* 트리거 결과 */}
      {triggerResult && (
        <div className={`rounded-lg p-4 text-sm ${triggerResult.ok ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
          {triggerResult.ok
            ? `완료 — 통과율: ${triggerResult.pass_rate}%, 평균점수: ${triggerResult.avg_score}, 전체: ${triggerResult.total}개`
            : `실행 실패: ${triggerResult.error}`}
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 최신 요약 카드 */}
      {latestSummary ? (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            최근 실행 결과 — {latestSummary.date}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="통과율"
              value={`${latestSummary.passRate}%`}
              sub={`${latestSummary.passed}/${latestSummary.total}개 통과`}
              colorClass={PCT_COLOR(latestSummary.passRate)}
            />
            <StatCard
              label="평균 점수"
              value={latestSummary.avgScore.toFixed(2)}
              sub="기준: 0.70 이상"
              colorClass={SCORE_COLOR(latestSummary.avgScore)}
            />
            <StatCard
              label="전체 시나리오"
              value={latestSummary.total}
              sub="활성 시나리오 수"
            />
            <StatCard
              label="실패"
              value={latestSummary.total - latestSummary.passed}
              sub="점수 0.6 미만"
              colorClass={latestSummary.total - latestSummary.passed > 0 ? "text-red-600" : "text-gray-900"}
            />
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
          실행 기록 없음 — "지금 실행" 버튼으로 첫 번째 테스트를 시작하세요
        </div>
      )}

      {/* 30일 추이 차트 */}
      {(trendPassRate.length > 0 || trendAvgScore.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">통과율 추이 (최근 30일)</h3>
            <TrendChart
              data={trendPassRate}
              label="통과율 (%)"
              yMax={100}
            />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">평균 점수 추이 (최근 30일)</h3>
            <TrendChart
              data={trendAvgScore}
              label="평균 점수"
              yMax={1}
            />
          </div>
        </div>
      )}

      {/* 카테고리별 통과율 */}
      {allLatestRows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">카테고리별 통과율 (최근 실행)</h3>
          <CategoryBreakdown rows={allLatestRows} />
        </div>
      )}

      {/* 최근 실패 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">최근 실패 시나리오</h3>
          <span className="text-xs text-gray-400">{failedRows.length}개 (최근 30일)</span>
        </div>
        <FailedTable rows={failedRows} />
      </div>

      {/* 알림 기준 안내 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
        <span className="font-semibold">알림 발송 기준:</span> 통과율 90% 미만 또는 평균 점수 0.70 미만 시 어드민/코디네이터에게 urgent 알림 발송
      </div>
    </div>
  );
}
