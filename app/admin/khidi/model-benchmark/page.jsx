"use client";

import { useState } from "react";

// ── 색상 유틸 ───────────────────────────────────────────────────
const SCORE_COLOR = (s) => (s >= 0.7 ? "text-green-600" : s >= 0.5 ? "text-amber-500" : "text-red-500");
const PCT_COLOR = (p) => (p >= 90 ? "text-green-600" : p >= 70 ? "text-amber-500" : "text-red-500");
const fmt = (n, d = 2) => (Number.isFinite(n) ? Number(n).toFixed(d) : "—");

const ARM_DESC = {
  our: "우리 의료특화 (flash + 레드라인 프롬프트 + 컨텍스트)",
  highend_raw: "하이엔드 맨몸 (Gemini Pro + 범용 프롬프트, 컨텍스트 없음)",
  highend_spec: "하이엔드 + 우리 파이프라인 (공정 비교 상한선)",
};
const WINNER_LABEL = { our: "우리 승", highend: "하이엔드 승", tie: "무승부" };
const WINNER_COLOR = { our: "text-green-600", highend: "text-red-500", tie: "text-gray-500" };

function ScoreCell({ value }) {
  return <span className={`font-bold ${SCORE_COLOR(value)}`}>{fmt(value)}</span>;
}

export default function ModelBenchmarkPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  const run = async ({ mode, full }) => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const qs = new URLSearchParams();
      qs.set("mode", mode);
      if (full) qs.set("full", "1");
      const res = await fetch(`/api/admin/khidi/run-benchmark?${qs.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const json = await res.json();
      if (!json.ok) {
        setError(
          json.error === "ai_key_missing"
            ? "서버에 Google AI 키(GOOGLE_GENERATIVE_AI_API_KEY)가 설정돼 있지 않습니다."
            : `실행 실패: ${json.error || "알 수 없는 오류"}`
        );
      } else {
        setResult(json);
      }
    } catch (e) {
      console.error("[admin/khidi/model-benchmark]", e);
      setError("요청 실패 (타임아웃일 수 있음 — 하이엔드 응답이 느립니다)");
    } finally {
      setRunning(false);
    }
  };

  const scenarioIds = result ? [...new Set(result.rows.map((r) => r.scenarioId))] : [];
  const pw = result?.pairwiseSummary;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">모델 성능 비교</h1>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
          우리 의료특화 AI 에이전트가 일반 하이엔드 모델(Gemini Pro)과 비교해 얼마나 잘하는지
          <b> 같은 질문·같은 채점</b>으로 실측합니다. 방법: ①절대점수(AI 채점관) ②맞대결(승률) ③사람 검수
          표본. KHIDI 중간평가 “왜 거대모델 안 쓰고 자체 에이전트 쓰나” 답변 근거자료
          (<code>docs/AI_MODEL_BENCHMARK.md</code>).
        </p>
      </div>

      {/* 실행 버튼 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => run({ mode: "quick", full: false })}
            disabled={running}
            className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-50"
          >
            {running ? "실행 중…" : "빠른 실행 (대표 문항 · 저비용)"}
          </button>
          <button
            onClick={() => run({ mode: "full", full: false })}
            disabled={running}
            className="px-4 py-2 rounded-lg border border-teal-700 text-teal-700 text-sm font-semibold hover:bg-teal-50 disabled:opacity-50"
          >
            {running ? "실행 중…" : "정밀 실행 (전체 문항)"}
          </button>
          <button
            onClick={() => run({ mode: "full", full: true })}
            disabled={running}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            {running ? "실행 중…" : "정밀 + 상한선 (하이엔드+특화)"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          ⚠️ AI 호출 비용 소액 발생(무료 한도면 자동 재시도 후 일부 에러로 표시될 수 있음). 하이엔드(Pro)가
          느려 <b>빠른 실행 1~2분 / 정밀 실행 3~5분</b> 걸릴 수 있습니다. 창을 닫지 마세요.
        </p>
      </div>

      {running && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
          실행 중… 각 문항을 두 모델에 돌리고 하이엔드 채점관이 절대점수 + 맞대결로 채점합니다.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <>
          {/* 메타 */}
          <div className="text-xs text-gray-500">
            모드 <b>{result.meta.mode}</b> · 우리=<code>{result.meta.ourModel}</code> ·
            하이엔드=<code>{result.meta.highendModel}</code> · 채점관=<code>{result.meta.judgeModel}</code> ·
            문항 {result.meta.scenarioCount}개 · LLM 호출 {result.meta.llmCalls}회 ·
            {" "}{new Date(result.meta.ranAt).toLocaleString("ko-KR")}
          </div>

          {/* 맞대결 요약 (핵심) */}
          {pw && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-3">⚔️ 맞대결 — 우리 vs 하이엔드 맨몸</h2>
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <div className="text-4xl font-bold text-teal-700">{fmt(pw.ourWinRatePct, 0)}%</div>
                  <div className="text-xs text-gray-500 mt-1">우리 승률 (무승부 제외)</div>
                </div>
                <div className="text-sm text-gray-600">
                  우리 <b className="text-green-600">{pw.ourWins}</b>승 ·
                  하이엔드 <b className="text-red-500">{pw.highendWins}</b>승 ·
                  무승부 <b className="text-gray-500">{pw.ties}</b> <span className="text-gray-500">(총 {pw.n})</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                두 답변을 익명(A/B, 위치 교대로 편향↓)으로 채점관에게 보여주고 “의료관광 컨시어지에 더 적합한 쪽”을 고르게 한 결과.
              </p>
            </div>
          )}

          {/* 종합 절대점수 표 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">종합 절대점수 (0~1, 높을수록 좋음 / 위반·지연은 낮을수록 좋음)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-3 font-semibold">비교군</th>
                    <th className="px-4 py-3 font-semibold">환각</th>
                    <th className="px-4 py-3 font-semibold">안전</th>
                    <th className="px-4 py-3 font-semibold">관련성</th>
                    <th className="px-4 py-3 font-semibold">종합</th>
                    <th className="px-4 py-3 font-semibold">통과율</th>
                    <th className="px-4 py-3 font-semibold">레드라인위반</th>
                    <th className="px-4 py-3 font-semibold">평균지연</th>
                  </tr>
                </thead>
                <tbody>
                  {result.aggs.map((a) => (
                    <tr key={a.armKey} className="border-b border-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{a.armKey}</div>
                        <div className="text-xs text-gray-500">{ARM_DESC[a.armKey] || a.label}</div>
                      </td>
                      <td className="px-4 py-3"><ScoreCell value={a.hallucination} /></td>
                      <td className="px-4 py-3"><ScoreCell value={a.safety} /></td>
                      <td className="px-4 py-3"><ScoreCell value={a.relevance} /></td>
                      <td className="px-4 py-3 text-base"><ScoreCell value={a.overall} /></td>
                      <td className={`px-4 py-3 font-bold ${PCT_COLOR(a.passRate)}`}>{fmt(a.passRate, 0)}%</td>
                      <td className={`px-4 py-3 font-bold ${a.redlineViolations === 0 ? "text-green-600" : "text-red-500"}`}>
                        {a.redlineViolations}/{a.n}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{fmt(a.avgLatency, 0)}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 bg-gray-50 text-xs text-gray-500 leading-relaxed">
              <b>읽는 법:</b> 우리(our)의 <b>안전·환각 점수</b>와 <b>레드라인 위반 건수</b>를 하이엔드 맨몸(highend_raw)과
              비교하세요. 종합 75%가 안전+사실성 가중이라 의료특화가 강세일 것. highend_spec(상한선 실행 시)은
              “모델을 바꾸면 얼마나 더 좋아지나”의 상한선입니다.
            </div>
          </div>

          {/* 사람 검수 표본 */}
          {result.calibration?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">👤 사람 검수용 표본</h2>
                <p className="text-xs text-gray-500 mt-1">
                  AI 채점이 맞는지 직접 눈으로 확인하세요(자기채점 편향 점검). 우리/하이엔드 답을 비교하고 판정이 타당한지 보세요.
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {result.calibration.map((c) => (
                  <div key={c.scenarioId} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{c.category} · {c.lang}</span>
                      {c.pairwise && (
                        <span className={`text-xs font-bold ${WINNER_COLOR[c.pairwise.winner]}`}>
                          맞대결: {WINNER_LABEL[c.pairwise.winner]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 font-medium mb-2">Q. {c.query}</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="bg-teal-50/50 rounded-lg p-3 border border-teal-100">
                        <div className="text-xs font-semibold text-teal-700 mb-1">
                          우리 (종합 {fmt(c.ourScores.overall)})
                          {c.ourScores.flags?.length > 0 && <span className="text-red-500"> [{c.ourScores.flags.join(", ")}]</span>}
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.ourResponse}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="text-xs font-semibold text-gray-500 mb-1">하이엔드 맨몸</div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.highendResponse}</p>
                      </div>
                    </div>
                    {c.pairwise?.reason && (
                      <p className="text-xs text-gray-500 mt-2">판정 이유: {c.pairwise.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 시나리오별 상세 (전체) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">전체 시나리오별 응답 ({scenarioIds.length}개)</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {scenarioIds.map((sid) => {
                const rows = result.rows.filter((r) => r.scenarioId === sid);
                const first = rows[0];
                const open = expanded[sid];
                return (
                  <div key={sid} className="px-5 py-4">
                    <button
                      className="w-full text-left flex items-start justify-between gap-4"
                      onClick={() => setExpanded((e) => ({ ...e, [sid]: !e[sid] }))}
                    >
                      <div>
                        <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 mr-2">
                          {first?.category} · {first?.lang}
                        </span>
                        <span className="text-sm text-gray-800">{first?.query}</span>
                      </div>
                      <span className="text-gray-600 text-xs shrink-0">{open ? "▲" : "▼"}</span>
                    </button>
                    {open && (
                      <div className="mt-3 space-y-2">
                        {rows.map((r) => (
                          <div key={r.arm} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-gray-700">{r.arm}</span>
                              <span className={`text-xs font-bold ${SCORE_COLOR(r.scores.overall)}`}>
                                종합 {fmt(r.scores.overall)}
                              </span>
                              {r.scores.flags.length > 0 && (
                                <span className="text-xs text-red-500">[{r.scores.flags.join(", ")}]</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{r.response}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
