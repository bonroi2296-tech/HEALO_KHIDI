"use client";

/**
 * 유치 전환 깔때기 대시보드
 * 문의 → 사전상담 완료 → 견적·비자 → 유치 확정(코디 수동) → 사후관리 완료
 * 자동 신호(상담·비자·견적)는 시스템이 채우고, 유치확정/이탈만 코디가 1클릭.
 */

import { useState, useEffect, useCallback } from "react";

const RANGES = [
  { key: "30", label: "최근 30일", days: 30 },
  { key: "90", label: "최근 90일", days: 90 },
  { key: "365", label: "최근 1년", days: 365 },
];

// inquiries.source → 사람이 읽는 채널명
const SOURCE_LABELS = {
  web: "웹 문의폼",
  ai_agent: "AI 상담",
  "(미상)": "(미상)",
};

export default function ConversionDashboard() {
  const [rangeKey, setRangeKey] = useState("90");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  // 테스트 데이터 포함 보기(평소엔 실적만 = 평가에 제출하는 진짜 숫자).
  const [includeTest, setIncludeTest] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const days = RANGES.find((r) => r.key === rangeKey)?.days ?? 90;
      const to = new Date();
      const from = new Date(to.getTime() - days * 86400000);
      let qs = `from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`;
      if (includeTest) qs += "&includeTest=1";
      const res = await fetch(`/api/admin/khidi/conversion-funnel?${qs}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "오류");
        return;
      }
      setData(json);
    } catch {
      setError("서버 연결 실패");
    } finally {
      setLoading(false);
    }
  }, [rangeKey, includeTest]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setOutcome = async (inquiryId, outcome) => {
    setBusyId(inquiryId);
    try {
      const res = await fetch(`/api/admin/khidi/conversion-funnel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inquiry_id: inquiryId, outcome }),
      });
      const json = await res.json();
      if (json.ok) await fetchData();
      else alert("저장 실패: " + (json.error ?? ""));
    } finally {
      setBusyId(null);
    }
  };

  // 수동 테스트 표시/해제 — 전화로 들어온 진짜환자가 사무실IP로 잘못 태깅된 경우 등.
  const markTest = async (inquiryId, isTest) => {
    setBusyId(inquiryId);
    try {
      const res = await fetch(`/api/admin/khidi/conversion-funnel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inquiry_id: inquiryId, is_test: isTest }),
      });
      const json = await res.json();
      if (json.ok) await fetchData();
      else alert("저장 실패: " + (json.error ?? ""));
    } finally {
      setBusyId(null);
    }
  };

  const stages = data?.funnel?.stages ?? [];
  const conv = data?.funnel?.conversion ?? {};
  const maxCount = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">유치 전환 상세</h1>
          <p className="text-sm text-gray-500 mt-1">
            문의가 실제 환자 유치로 이어지는 전 과정을 단계별로 추적합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRangeKey(r.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  rangeKey === r.key
                    ? "bg-teal-700 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {/* 평소엔 실적만(평가 제출 숫자). 켜면 테스트 데이터 포함해 확인. */}
          <button
            onClick={() => setIncludeTest((v) => !v)}
            title="평가에 제출하는 숫자는 '실적만'입니다. 테스트 데이터가 섞였는지 확인할 때만 켜세요."
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              includeTest
                ? "bg-amber-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {includeTest ? "테스트 포함 중" : "실적만"}
          </button>
        </div>
      </div>
      {includeTest && (
        <div className="mb-4 -mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          테스트 데이터를 포함해 보고 있습니다. <b>이 숫자는 평가에 제출하지 마세요.</b> 아래 목록에서 「테스트로 표시」로 가짜를 분리할 수 있습니다.
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-gray-400">불러오는 중…</div>
      ) : error ? (
        <div className="py-12 text-center text-red-500">{error}</div>
      ) : (
        <>
          {/* 깔때기 */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-bold text-gray-700 mb-4">유치 깔때기</h2>
            <div className="space-y-2.5">
              {stages.map((s, i) => (
                <div key={s.key} className="flex items-center gap-3">
                  <div className="w-28 text-sm text-gray-600 shrink-0">{s.label}</div>
                  <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden h-9 relative">
                    <div
                      className="h-full bg-teal-700 rounded-lg transition-all"
                      style={{ width: `${Math.max(4, (s.count / maxCount) * 100)}%` }}
                    />
                    <span className="absolute inset-y-0 left-3 flex items-center text-sm font-bold text-gray-900">
                      {s.count.toLocaleString()}
                    </span>
                  </div>
                  {i > 0 && (
                    <div className="w-16 text-right text-xs text-gray-400 shrink-0">
                      {stages[i - 1].count > 0
                        ? `${Math.round((s.count / stages[i - 1].count) * 100)}%`
                        : "—"}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
              <Kpi label="문의→사전상담" value={`${conv.inquiry_to_preconsult ?? 0}%`} />
              <Kpi label="사전상담→유치" value={`${conv.preconsult_to_admitted ?? 0}%`} />
              <Kpi label="전체 유치율" value={`${conv.overall_admit_rate ?? 0}%`} highlight />
            </div>
            {data?.funnel?.lost > 0 && (
              <p className="mt-3 text-xs text-gray-400">이탈 처리: {data.funnel.lost}건</p>
            )}
          </section>

          {/* 국가별 */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-bold text-gray-700 mb-3">국가별</h2>
            {(data?.byCountry ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">데이터 없음</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="py-2 font-medium">국가</th>
                    <th className="py-2 font-medium text-right">문의</th>
                    <th className="py-2 font-medium text-right">사전상담</th>
                    <th className="py-2 font-medium text-right">유치확정</th>
                    <th className="py-2 font-medium text-right">사후관리</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCountry.map((c) => (
                    <tr key={c.nationality} className="border-b border-gray-50">
                      <td className="py-2 font-medium text-gray-800">{c.nationality}</td>
                      <td className="py-2 text-right text-gray-600">{c.total}</td>
                      <td className="py-2 text-right text-gray-600">{c.pre_consult}</td>
                      <td className="py-2 text-right font-semibold text-teal-700">{c.admitted}</td>
                      <td className="py-2 text-right text-gray-600">{c.followup}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* 채널별 (유입경로: 웹 문의폼 / AI 상담) */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-bold text-gray-700 mb-1">채널별 (유입경로)</h2>
            <p className="text-xs text-gray-400 mb-3">
              어느 유입 채널(웹 문의폼 / AI 상담)이 실제 유치로 이어지는지 비교합니다.
            </p>
            {(data?.bySource ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">데이터 없음</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="py-2 font-medium">채널</th>
                    <th className="py-2 font-medium text-right">문의</th>
                    <th className="py-2 font-medium text-right">사전상담</th>
                    <th className="py-2 font-medium text-right">유치확정</th>
                    <th className="py-2 font-medium text-right">사후관리</th>
                    <th className="py-2 font-medium text-right">유치율</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bySource.map((s) => (
                    <tr key={s.source} className="border-b border-gray-50">
                      <td className="py-2 font-medium text-gray-800">{SOURCE_LABELS[s.source] ?? s.source}</td>
                      <td className="py-2 text-right text-gray-600">{s.total}</td>
                      <td className="py-2 text-right text-gray-600">{s.pre_consult}</td>
                      <td className="py-2 text-right font-semibold text-teal-700">{s.admitted}</td>
                      <td className="py-2 text-right text-gray-600">{s.followup}</td>
                      <td className="py-2 text-right text-gray-500">
                        {s.total > 0 ? `${Math.round((s.admitted / s.total) * 100)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* 기관별 (참여기관 한방 / 협진 대학병원) */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-bold text-gray-700 mb-1">기관별 상담·사후관리</h2>
            <p className="text-xs text-gray-400 mb-3">
              참여기관(한방)·협진(대학병원)별 상담 세션 집계. 참여기관 「원격 사후관리」 실적 = 사후관리 열.
            </p>
            {(data?.byOrg ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">데이터 없음 (상담 생성 시 병원을 지정하면 집계됩니다)</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="py-2 font-medium">기관</th>
                    <th className="py-2 font-medium">구분</th>
                    <th className="py-2 font-medium text-right">전체 세션</th>
                    <th className="py-2 font-medium text-right">사전상담</th>
                    <th className="py-2 font-medium text-right">사후관리</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byOrg.map((o, i) => (
                    <tr key={o.hospital_id || `none-${i}`} className="border-b border-gray-50">
                      <td className="py-2 font-medium text-gray-800">{o.hospital_name}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          o.kind === "한방(참여기관)" ? "bg-teal-50 text-teal-700"
                          : o.kind === "대학병원(협진)" ? "bg-blue-50 text-blue-700"
                          : "bg-gray-100 text-gray-500"
                        }`}>{o.kind}</span>
                      </td>
                      <td className="py-2 text-right text-gray-600">{o.total_sessions}</td>
                      <td className="py-2 text-right text-gray-600">{o.pre_consult}</td>
                      <td className="py-2 text-right font-semibold text-teal-700">{o.followup}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* 유치확정 대기 — 코디 액션 */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-bold text-gray-700 mb-1">유치 확정 대기</h2>
            <p className="text-xs text-gray-400 mb-4">
              사전상담을 마쳤거나 병원이 응답한 환자 중 결과가 입력되지 않은 건입니다. 실제
              입국·치료를 시작했으면 「유치 확정」, 연락이 끊겼으면 「이탈」을 눌러 주세요.
            </p>
            {(data?.pending ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">대기 중인 환자가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {data.pending.map((p) => (
                  <div
                    key={p.inquiry_id}
                    className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate flex items-center gap-1.5">
                        {p.name} · {p.nationality}
                        {p.is_test && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium shrink-0">
                            테스트
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {p.cancer_type} · {new Date(p.created_at).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        disabled={busyId === p.inquiry_id}
                        onClick={() => setOutcome(p.inquiry_id, "admitted")}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40 transition"
                      >
                        유치 확정
                      </button>
                      <button
                        disabled={busyId === p.inquiry_id}
                        onClick={() => setOutcome(p.inquiry_id, "lost")}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-40 transition"
                      >
                        이탈
                      </button>
                      <button
                        disabled={busyId === p.inquiry_id}
                        onClick={() => markTest(p.inquiry_id, !p.is_test)}
                        title="평가 숫자에서 제외/포함"
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition"
                      >
                        {p.is_test ? "테스트 해제" : "테스트로 표시"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 유치 확정됨 — 되돌리기(코디) */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 mt-6">
            <h2 className="text-sm font-bold text-gray-700 mb-1">유치 확정됨 (되돌리기)</h2>
            <p className="text-xs text-gray-400 mb-4">
              유치로 집계된 환자입니다. 「자동」 배지는 병원이 「치료 확정」해 자동 집계된 건이며,
              실제 유치가 아니면 「유치 취소」(집계 제외) 또는 「이탈」로 코디가 되돌릴 수 있습니다.
            </p>
            {(data?.admitted ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">유치 확정된 환자가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {data.admitted.map((p) => (
                  <div
                    key={p.inquiry_id}
                    className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate flex items-center gap-1.5">
                        {p.name} · {p.nationality}
                        {p.auto && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium shrink-0">
                            자동
                          </span>
                        )}
                        {p.is_test && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium shrink-0">
                            테스트
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {p.cancer_type} · {new Date(p.created_at).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        disabled={busyId === p.inquiry_id}
                        onClick={() => setOutcome(p.inquiry_id, null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-40 transition"
                      >
                        유치 취소
                      </button>
                      <button
                        disabled={busyId === p.inquiry_id}
                        onClick={() => setOutcome(p.inquiry_id, "lost")}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-40 transition"
                      >
                        이탈
                      </button>
                      <button
                        disabled={busyId === p.inquiry_id}
                        onClick={() => markTest(p.inquiry_id, !p.is_test)}
                        title="평가 숫자에서 제외/포함"
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition"
                      >
                        {p.is_test ? "테스트 해제" : "테스트로 표시"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, highlight }) {
  return (
    <div>
      <div className={`text-xl font-bold ${highlight ? "text-teal-700" : "text-gray-900"}`}>
        {value}
      </div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}
