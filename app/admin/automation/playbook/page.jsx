"use client";

import { useState, useEffect, useCallback } from "react";

function GuideModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">Playbook 자동화 가이드</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-600 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-5 space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 시스템은 무엇인가요?</h3>
            <p>
              AI 챗봇이 환자에게 응답할 때 참조하는 <strong>Playbook 패턴</strong>(응대 템플릿)을
              <strong> 자동으로 평가하고, 품질이 낮은 패턴을 개선하고, A/B 테스트로 검증한 뒤, 좋은 것만 남기는</strong> 자동화 루프입니다.
            </p>
            <p className="mt-2 text-gray-500">
              사람이 직접 모든 패턴을 관리하지 않아도, 시스템이 스스로 품질을 유지/개선합니다.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">전체 흐름 (5단계)</h3>
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">1</span>
                <div>
                  <p className="font-medium text-gray-900">Daily Eval (매일 평가)</p>
                  <p className="text-gray-500">최근 7일간 사용 데이터를 분석해서 각 패턴에 0~100점 점수를 매깁니다. 85점 미만이면 "개선 대상(candidate)"으로 표시됩니다.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">2</span>
                <div>
                  <p className="font-medium text-gray-900">Auto Improve (자동 개선)</p>
                  <p className="text-gray-500">개선 대상 패턴을 AI(Gemini)가 분석해서 더 나은 버전(variant)을 자동 생성합니다. 안전성 검사와 품질 게이트를 통과해야만 승인됩니다.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">3</span>
                <div>
                  <p className="font-medium text-gray-900">A/B Testing (비교 실험)</p>
                  <p className="text-gray-500">자동 승인된 variant는 기존 패턴(control)과 20/80 비율로 실제 트래픽에 노출됩니다. 같은 대화 세션에서는 항상 같은 버전이 보입니다.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">4</span>
                <div>
                  <p className="font-medium text-gray-900">AB Finalize (결과 판정)</p>
                  <p className="text-gray-500">7일 경과 또는 50회 이상 사용 후, variant가 기존보다 사용률 10%p 이상 좋으면 승격합니다. 아니면 variant를 퇴출하고 기존을 유지합니다.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">5</span>
                <div>
                  <p className="font-medium text-gray-900">반복</p>
                  <p className="text-gray-500">이 과정이 매일 반복되면서 패턴 품질이 점진적으로 올라갑니다.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">버튼 사용법</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="font-medium text-gray-900">Daily Eval</p>
                <p className="text-gray-500">지금 바로 전체 패턴의 점수를 다시 산정합니다. 보통은 매일 자동 실행되지만, 수동으로 트리거할 수도 있습니다.</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Auto Improve</p>
                <p className="text-gray-500">candidate 상태인 패턴들을 AI로 개선합니다. 안전성/품질 검사를 통과하면 자동 승인 후 A/B 테스트가 시작됩니다.</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">AB Finalize</p>
                <p className="text-gray-500">진행 중인 A/B 테스트 중 조건(7일/50회)을 만족한 것들의 결과를 확정합니다. 좋은 variant는 승격, 나쁜 것은 퇴출됩니다.</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">점수(Auto Score) 읽는 법</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-green-700">85+</p>
                <p className="text-xs text-green-600">양호 - 변경 불필요</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-yellow-700">50~84</p>
                <p className="text-xs text-yellow-600">개선 대상</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-red-600">{"<50"}</p>
                <p className="text-xs text-red-500">퇴출 후보</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-purple-700">90+</p>
                <p className="text-xs text-purple-600">자동 승인 가능 기준</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">상태(Status) 의미</h3>
            <div className="space-y-1.5">
              {[
                { s: "none", d: "정상 운영 중. 별도 조치 불필요" },
                { s: "candidate", d: "점수가 낮아 개선 대상으로 지정됨" },
                { s: "drafted", d: "AI가 개선 버전을 생성함 (아직 미승인)" },
                { s: "auto_approved", d: "안전성/품질 통과하여 자동 승인됨" },
                { s: "ab_testing", d: "실제 트래픽으로 A/B 테스트 진행 중" },
                { s: "promoted", d: "A/B에서 승리하여 정식 채택됨" },
                { s: "auto_retired", d: "A/B에서 패배하거나 퇴출됨" },
                { s: "blocked", d: "안전성/품질 검사 불통과 (수동 확인 필요)" },
              ].map(({ s, d }) => (
                <div key={s} className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium min-w-[100px] text-center ${STATUS_COLORS[s]}`}>{s}</span>
                  <span className="text-gray-600">{d}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">안전장치</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>자동 승인 조건: 추정 점수 90점 이상 + 안전성 검사 통과 필수</li>
              <li>모든 패턴에 "의료 단정 금지 / 가격 확정 금지 / 순위화 금지" 문구 필수</li>
              <li>PII(개인정보) 자동 제거 후 저장</li>
              <li>모든 자동 행동은 이벤트 로그에 기록 (감사 추적 가능)</li>
              <li>같은 작업의 중복 실행은 시스템이 자동 차단</li>
            </ul>
          </section>

          <section className="bg-teal-50 rounded-lg p-4">
            <h3 className="text-base font-semibold text-teal-800 mb-1">권장 운영 방법</h3>
            <ol className="list-decimal list-inside space-y-1 text-teal-700">
              <li>매일 아침: Daily Eval 결과 확인 (candidate 수 모니터링)</li>
              <li>주 2~3회: Auto Improve 실행 (candidate가 있을 때)</li>
              <li>주 1회: AB Finalize 실행 (7일+ 된 테스트 확정)</li>
              <li>blocked 상태 패턴은 수동으로 검토 후 응대 패턴 페이지에서 수정</li>
            </ol>
          </section>

        </div>
      </div>
    </div>
  );
}

const JOB_TYPES = [
  { key: "daily_eval", label: "Daily Eval", desc: "usage 집계 → auto_score 산정" },
  { key: "auto_improve", label: "Auto Improve", desc: "LLM 개선 → 자동 승인 → AB 배정" },
  { key: "ab_finalize", label: "AB Finalize", desc: "AB 비교 → 승격/퇴출" },
];

const STATUS_COLORS = {
  none: "bg-gray-100 text-gray-700",
  candidate: "bg-yellow-100 text-yellow-800",
  drafted: "bg-blue-100 text-blue-700",
  auto_approved: "bg-emerald-100 text-emerald-700",
  ab_testing: "bg-purple-100 text-purple-700",
  promoted: "bg-green-100 text-green-800",
  auto_retired: "bg-red-100 text-red-700",
  blocked: "bg-red-200 text-red-800",
};

function Badge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function KpiCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AutomationPlaybookPage() {
  const [jobs, setJobs] = useState([]);
  const [events, setEvents] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [abPatterns, setAbPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [jobsRes, eventsRes, candRes, abRes] = await Promise.all([
        fetch("/api/admin/automation/data?type=jobs"),
        fetch("/api/admin/automation/data?type=events"),
        fetch("/api/admin/automation/data?type=candidates"),
        fetch("/api/admin/automation/data?type=ab_testing"),
      ]);
      const [jobsData, eventsData, candData, abData] = await Promise.all([
        jobsRes.json(), eventsRes.json(), candRes.json(), abRes.json(),
      ]);
      if (jobsData.ok) setJobs(jobsData.data || []);
      if (eventsData.ok) setEvents(eventsData.data || []);
      if (candData.ok) setCandidates(candData.data || []);
      if (abData.ok) setAbPatterns(abData.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRun = async (jobType) => {
    setRunning(jobType);
    setRunResult(null);
    try {
      const res = await fetch(`/api/admin/automation/run?job=${jobType}`, { method: "POST" });
      const data = await res.json();
      setRunResult({ type: jobType, ...data });
      fetchData();
    } catch (_err) {
      setRunResult({ type: jobType, ok: false, error: "실행 실패" });
    } finally {
      setRunning(null);
    }
  };

  const runningJobs = jobs.filter((j) => j.status === "running");
  const recentDone = jobs.filter((j) => j.status === "done").slice(0, 5);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map((i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl">
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Playbook 자동화</h1>
          <p className="text-sm text-gray-500 mt-1">자동 평가 → 개선 → AB 테스트 → 승격/퇴출 루프</p>
        </div>
        <button
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          사용 가이드
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Candidates" value={candidates.length} sub="개선 대상" />
        <KpiCard label="AB Testing" value={abPatterns.length} sub="진행 중" />
        <KpiCard label="Running Jobs" value={runningJobs.length} />
        <KpiCard label="Recent Events" value={events.length} sub="최근 50건" />
      </div>

      {/* Run Buttons */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">워커 실행</h2>
        <div className="flex flex-wrap gap-3">
          {JOB_TYPES.map((jt) => (
            <button
              key={jt.key}
              onClick={() => handleRun(jt.key)}
              disabled={running !== null}
              className="flex flex-col items-start px-4 py-3 rounded-lg border border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px]"
            >
              <span className="text-sm font-medium text-gray-900">{jt.label}</span>
              <span className="text-xs text-gray-500 mt-0.5">{jt.desc}</span>
              {running === jt.key && <span className="text-xs text-teal-700 mt-1 animate-pulse">실행 중...</span>}
            </button>
          ))}
        </div>
        {runResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${runResult.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            <strong>{runResult.type}</strong>: {runResult.ok ? JSON.stringify(runResult.stats) : runResult.error}
          </div>
        )}
      </div>

      {/* Candidates */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Candidates (개선 대상 top 20)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3 font-medium">ID</th>
                <th className="text-left p-3 font-medium">User Intent</th>
                <th className="text-left p-3 font-medium">Auto Score</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Evaluated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {candidates.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">없음</td></tr>
              ) : candidates.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs text-gray-500">{c.id?.slice(0, 8)}</td>
                  <td className="p-3 max-w-[200px] truncate">{c.user_intent}</td>
                  <td className="p-3">
                    <span className={`font-medium ${c.auto_score < 50 ? "text-red-600" : c.auto_score < 70 ? "text-yellow-600" : "text-gray-700"}`}>
                      {c.auto_score}
                    </span>
                  </td>
                  <td className="p-3"><Badge status={c.auto_status} /></td>
                  <td className="p-3 text-xs text-gray-500">{c.last_evaluated_at ? new Date(c.last_evaluated_at).toLocaleString("ko-KR") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AB Testing */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">AB Testing 진행 중</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3 font-medium">ID</th>
                <th className="text-left p-3 font-medium">Bucket</th>
                <th className="text-left p-3 font-medium">Split</th>
                <th className="text-left p-3 font-medium">Parent</th>
                <th className="text-left p-3 font-medium">Version</th>
                <th className="text-left p-3 font-medium">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {abPatterns.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center text-gray-500">없음</td></tr>
              ) : abPatterns.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs text-gray-500">{p.id?.slice(0, 8)}</td>
                  <td className="p-3"><Badge status={p.ab_bucket || "?"} /></td>
                  <td className="p-3">{p.traffic_split}%</td>
                  <td className="p-3 font-mono text-xs text-gray-500">{p.auto_parent_id?.slice(0, 8) || "-"}</td>
                  <td className="p-3">v{p.auto_version}</td>
                  <td className="p-3 text-xs text-gray-500">{p.last_auto_action_at ? new Date(p.last_auto_action_at).toLocaleString("ko-KR") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">최근 Job 실행</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Started</th>
                <th className="text-left p-3 font-medium">Duration</th>
                <th className="text-left p-3 font-medium">Stats</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...runningJobs, ...recentDone].length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">없음</td></tr>
              ) : [...runningJobs, ...recentDone].map((j) => {
                const dur = j.completed_at && j.started_at
                  ? `${((new Date(j.completed_at) - new Date(j.started_at)) / 1000).toFixed(1)}s`
                  : j.status === "running" ? "..." : "-";
                return (
                  <tr key={j.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium">{j.job_type}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        j.status === "done" ? "bg-green-100 text-green-700" :
                        j.status === "running" ? "bg-blue-100 text-blue-700 animate-pulse" :
                        "bg-red-100 text-red-700"
                      }`}>{j.status}</span>
                    </td>
                    <td className="p-3 text-xs text-gray-500">{j.started_at ? new Date(j.started_at).toLocaleString("ko-KR") : "-"}</td>
                    <td className="p-3 text-xs">{dur}</td>
                    <td className="p-3 text-xs text-gray-500 max-w-[200px] truncate">{j.output ? JSON.stringify(j.output) : j.error || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">최근 이벤트 (50건)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3 font-medium">Time</th>
                <th className="text-left p-3 font-medium">Event</th>
                <th className="text-left p-3 font-medium">Step</th>
                <th className="text-left p-3 font-medium">Pattern</th>
                <th className="text-left p-3 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">없음</td></tr>
              ) : events.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="p-3 text-xs text-gray-500">{new Date(e.created_at).toLocaleString("ko-KR")}</td>
                  <td className="p-3 font-medium">{e.event_type}</td>
                  <td className="p-3 text-xs text-gray-500">{e.step || "-"}</td>
                  <td className="p-3 font-mono text-xs text-gray-500">{e.data?.pattern_id?.slice(0, 8) || "-"}</td>
                  <td className="p-3 text-xs text-gray-500 max-w-[250px] truncate">{e.data ? JSON.stringify(e.data) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
