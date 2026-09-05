"use client";

import { useState, useEffect, useCallback } from "react";

// ── 유틸 ────────────────────────────────────────────────────────
const PCT_COLOR = (pct) => {
  if (pct >= 90) return "text-green-700";
  if (pct >= 70) return "text-amber-700";
  return "text-red-600";
};

const SCORE_COLOR = (score) => {
  if (score >= 0.7) return "text-green-700";
  if (score >= 0.5) return "text-amber-700";
  return "text-red-600";
};

const BAR_COLOR = (pct) => {
  if (pct >= 90) return "bg-green-500";
  if (pct >= 70) return "bg-amber-400";
  return "bg-red-400";
};

// 응답시간 색: 챗봇 체감 기준(초). P95 가 8초 미만 초록 / 12초 미만 주황 / 이상 빨강.
const LATENCY_COLOR = (ms) => {
  if (ms < 8000) return "text-green-700";
  if (ms < 12000) return "text-amber-700";
  return "text-red-600";
};

// 첫 글자까지의 기준선은 NFR-02 = 5초. 완료시간(LATENCY_COLOR)과 자가 다르므로 따로 둔다.
const FIRST_TOKEN_COLOR = (ms) => {
  if (ms === 0) return "text-gray-500";
  if (ms <= 5000) return "text-green-700";
  if (ms <= 8000) return "text-amber-700";
  return "text-red-600";
};

// 분위수(오름차순 정렬 후 nearest-rank). P95 = "느린 쪽 95번째 사용자가 겪은 값".
function percentile(values, p) {
  const arr = values.filter((n) => n > 0).sort((a, b) => a - b);
  if (arr.length === 0) return 0;
  const idx = Math.ceil((p / 100) * arr.length) - 1;
  return arr[Math.min(arr.length - 1, Math.max(0, idx))];
}

// judge flag → 한국어 라벨. flag 카탈로그는 src/lib/chat/qualityStandards.ts·regressionRunner JUDGE_SYSTEM 과 정합.
const FLAG_LABELS = {
  hallucination: "환각(사실 조작)",
  off_topic_answer: "질문 이탈",
  no_clarification: "확인 질문 누락",
  medical_diagnosis: "진단 시도",
  no_safety_defer: "안전 위임 누락",
  wrong_language: "언어 오류",
  smalltalk_rag: "잡담에 RAG 남용",
  missing_redirect: "연결 유도 누락",
  cure_claim: "완치 주장",
  no_empathy: "공감 문장 누락",
  marketplace_tone: "가격비교 톤",
  diagnosis_attempt: "진단 시도",
  overclaim_stat: "근거 없는 수치 과장",
  unsafe_advice: "위험한 조언",
  treatment_recommendation: "치료 권유",
  drug_advice: "약물 안내",
  prognosis_claim: "예후 단정",
  scan_interpretation: "검사 판독",
  anecdotal_guarantee: "사례로 보장",
};
const flagLabel = (f) => FLAG_LABELS[f] ?? f;

// "환각" = 사실성 위반 / "안전 위반" = 의료 레드라인. (qualityStandards MEDICAL_REDLINE_FLAGS 와 정합)
const HALLUCINATION_FLAGS = new Set(["hallucination"]);
const SAFETY_FLAGS = new Set([
  "medical_diagnosis", "no_safety_defer", "cure_claim", "diagnosis_attempt", "unsafe_advice",
  "treatment_recommendation", "drug_advice", "prognosis_claim", "scan_interpretation", "anecdotal_guarantee",
]);
// 심판 인프라 상태 flag — 품질 결함이 아니므로 분포·환각률 집계에서 제외.
const INFRA_FLAGS = new Set(["judge_unavailable", "judge_error"]);

// ── 서브 컴포넌트 ────────────────────────────────────────────────
function StatCard({ label, value, sub, colorClass = "text-gray-900" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
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
      <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
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
        <span className="text-xs text-gray-500">{data[0]?.date?.slice(5) ?? ""}</span>
        <span className="text-xs text-gray-500">{data[data.length - 1]?.date?.slice(5) ?? ""}</span>
      </div>
    </div>
  );
}

/**
 * 품질 분포 — 평균이 아니라 분포를 본다.
 * 통과율/평균점수 한 숫자에 묻히는 것들을 드러낸다:
 *  - 환각률·안전 위반율(사실성/의료 레드라인 위반 응답 비율)
 *  - 응답시간 P50/P95(평균만 보면 느린 5%를 놓침)
 *  - flag 분포(어디서 실패하는지 = 다음에 고칠 것)
 */
function QualityDistribution({ rows }) {
  if (!rows || rows.length === 0) return null;
  const total = rows.length;

  const hasFlag = (r, set) =>
    Array.isArray(r.flags) && r.flags.some((f) => set.has(f));
  const hallucinated = rows.filter((r) => hasFlag(r, HALLUCINATION_FLAGS)).length;
  const unsafe = rows.filter((r) => hasFlag(r, SAFETY_FLAGS)).length;
  const hallRate = Math.round((hallucinated / total) * 1000) / 10;
  const unsafeRate = Math.round((unsafe / total) * 1000) / 10;

  const latencies = rows.map((r) => Number(r.latency_ms ?? 0));
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  // 첫 토큰까지 = NFR-02(≤5초)와 같은 자. 2026-08-21 이전 실행분엔 이 값이 없다(null) →
  // percentile 이 0 을 걸러내므로 옛 행만 있으면 "—" 가 뜬다(완료 시간으로 오해시키지 않는다).
  const firstTokens = rows.map((r) => Number(r.first_token_ms ?? 0));
  const ftP50 = percentile(firstTokens, 50);
  const ftP95 = percentile(firstTokens, 95);
  const secs = (ms) => (ms > 0 ? `${(ms / 1000).toFixed(1)}초` : "—");

  // flag 분포 (인프라 flag 제외)
  const flagCounts = {};
  for (const r of rows) {
    for (const f of Array.isArray(r.flags) ? r.flags : []) {
      if (INFRA_FLAGS.has(f)) continue;
      flagCounts[f] = (flagCounts[f] ?? 0) + 1;
    }
  }
  const flagRows = Object.entries(flagCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="환각률"
          value={`${hallRate}%`}
          sub={`사실 조작 응답 ${hallucinated}/${total}건`}
          colorClass={hallucinated === 0 ? "text-green-700" : "text-red-600"}
        />
        <StatCard
          label="안전 위반율"
          value={`${unsafeRate}%`}
          sub={`의료 레드라인 위반 ${unsafe}/${total}건`}
          colorClass={unsafe === 0 ? "text-green-700" : "text-red-600"}
        />
        <StatCard
          label="첫 글자까지 P50 (중앙값)"
          value={secs(ftP50)}
          sub={`절반은 이보다 빠름 · 답변 완료까지 ${secs(p50)}`}
          colorClass={FIRST_TOKEN_COLOR(ftP50)}
        />
        <StatCard
          label="첫 글자까지 P95"
          value={secs(ftP95)}
          sub={`느린 5%가 겪는 시간 · 답변 완료까지 ${secs(p95)}`}
          colorClass={FIRST_TOKEN_COLOR(ftP95)}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            문제 유형 분포 (최근 실행)
          </p>
          <span className="text-xs text-gray-500">감지 건수 기준</span>
        </div>
        {flagRows.length === 0 ? (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            감지된 문제 없음 — 모든 응답이 사실성·안전·관련성 기준을 통과했습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {flagRows.map(([flag, count]) => {
              const pct = Math.round((count / total) * 100);
              const isCritical =
                HALLUCINATION_FLAGS.has(flag) || SAFETY_FLAGS.has(flag);
              return (
                <div key={flag}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-700">
                      {flagLabel(flag)}
                      {isCritical && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full align-middle">
                          치명
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-bold text-gray-600">
                      {count}건 ({pct}%)
                    </span>
                  </div>
                  <MiniBar
                    value={count}
                    max={total}
                    colorClass={isCritical ? "bg-red-400" : "bg-amber-400"}
                  />
                </div>
              );
            })}
          </div>
        )}
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
      <div className="text-center text-gray-500 text-sm py-8">
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
              <td className="py-2 pr-4 text-xs text-gray-600">{row.run_date}</td>
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
      // ⚠️ 서버 API 경유 필수 — ai_regression_runs 는 RLS deny-all(service_role 전용)이라
      // anon 직쿼리는 에러 없이 항상 0행 = 화면이 영원히 '데이터 없음'이었음(2026-07-02 소생).
      const res = await fetch("/api/admin/khidi/ai-regression?days=30", { credentials: "include" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "query_failed");
      const runData = json.runs;

      // 일별 통과율·평균점수 집계
      const byDate = {};
      for (const row of (runData ?? [])) {
        const d = row.run_date;
        if (!byDate[d]) byDate[d] = { passed: 0, total: 0, scoreSum: 0 };
        byDate[d].total++;
        if (row.passed) byDate[d].passed++;
        byDate[d].scoreSum += Number(row.overall_score ?? 0);
      }

      // 서버가 최신순으로 주므로 추이 그래프는 날짜 오름차순으로 되돌린다(왼쪽이 과거).
      const dates = Object.keys(byDate).sort();
      const passRateTrend = dates.map((date) => ({
        date,
        value: byDate[date].total > 0 ? Math.round((byDate[date].passed / byDate[date].total) * 100) : 0,
      }));
      const avgScoreTrend = dates.map((date) => ({
        date,
        value: byDate[date].total > 0 ? Math.round((byDate[date].scoreSum / byDate[date].total) * 100) / 100 : 0,
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
      console.error("[admin/khidi/ai-regression]", e);
      setError("데이터 로드 실패");
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
    } catch (_e) {
      setTriggerResult({ ok: false, error: "서버 오류" });
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

      {/* 품질 분포 — 평균에 묻히는 환각률·응답시간·문제 유형 */}
      {allLatestRows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">품질 분포 (최근 실행)</h3>
            <span className="text-xs text-gray-500">
              통과율 한 숫자에 묻히는 것들 — 환각률·응답시간·문제 유형
            </span>
          </div>
          <QualityDistribution rows={allLatestRows} />
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
          <span className="text-xs text-gray-500">{failedRows.length}개 (최근 30일)</span>
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
