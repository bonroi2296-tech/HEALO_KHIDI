"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminGuideModal } from "../_components/AdminGuideModal";

function zeroRateColor(zeroRate) {
  if (zeroRate < 10) return "text-green-600 bg-green-50 border-green-200";
  if (zeroRate <= 20) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function zeroRateBarBg(zeroRate) {
  if (zeroRate < 10) return "bg-green-400";
  if (zeroRate <= 20) return "bg-amber-400";
  return "bg-red-400";
}

function ZeroRateCard({ value, label, alert }) {
  const colorClass = zeroRateColor(value);
  return (
    <div className={`rounded-xl border-2 p-4 ${colorClass}`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-2xl md:text-3xl font-black mt-1">{typeof value === "number" ? value.toFixed(1) : value}%</p>
      {alert && (
        <p className="text-xs font-semibold mt-2 opacity-90">Zero rate &gt; 20% — 검토 권장</p>
      )}
    </div>
  );
}

export default function ObservabilityPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [windowParam, setWindowParam] = useState("7d");
  const [showGuide, setShowGuide] = useState(false);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/observability/rag/health?window=${windowParam}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load");
      setHealth(data);
    } catch (e) {
      console.error("[admin/observability]", e);
      setError("상태를 불러오지 못했습니다.");
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, [windowParam]);

  useEffect(() => {
    fetchHealth();
    const t = setInterval(fetchHealth, 60000);
    return () => clearInterval(t);
  }, [fetchHealth]);

  if (loading && !health) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-gray-900">관측성 / RAG Health</h1>
        <div className="animate-pulse rounded-xl bg-gray-200 h-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-gray-900">관측성 / RAG Health</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">로드 실패</p>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={fetchHealth} className="mt-3 px-3 py-1.5 bg-red-100 rounded-lg text-sm font-semibold hover:bg-red-200">
            재시도
          </button>
        </div>
      </div>
    );
  }

  const zeroRate = health?.zero_rate ?? 0;
  const alert = health?.alert === true;

  return (
    <div className="space-y-6">
      {showGuide && (
        <AdminGuideModal title="관측성 / RAG Health 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p>RAG 검색의 <strong>품질·건강도</strong>를 기간별로 확인합니다. Zero Rate(결과 0건 비율), 총 요청 수, 임베딩/RPC 실패율 등을 한눈에 보고, 이상 시 대응할 수 있습니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">지표 설명</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>Zero Rate</strong>: 검색 결과가 0건인 비율. 20% 초과 시 경고로 표시되며, RAG 데이터·필터를 점검하는 것이 좋습니다.</li>
              <li><strong>Embedding/RPC 실패율</strong>: 임베딩 API 또는 RPC 호출 실패 비율입니다.</li>
            </ul>
          </section>
          <section className="bg-teal-50 rounded-lg p-4">
            <h3 className="text-base font-semibold text-teal-800 mb-1">권장</h3>
            <p className="text-teal-700 text-sm">주기적으로 Zero Rate를 확인하고, 높으면 RAG 문서·패턴·ingest 상태를 점검하세요.</p>
          </section>
        </AdminGuideModal>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">관측성 / RAG Health</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            사용 가이드
          </button>
          <label className="text-sm font-medium text-gray-600">기간</label>
          <select
            value={windowParam}
            onChange={(e) => setWindowParam(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800"
          >
            <option value="24h">24시간</option>
            <option value="7d">7일</option>
            <option value="1d">1일</option>
          </select>
          <button onClick={fetchHealth} className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm font-medium hover:bg-gray-200">
            새로고침
          </button>
        </div>
      </div>

      {alert && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex items-center gap-3">
          <span className="text-amber-600 text-xl">⚠️</span>
          <div>
            <p className="font-bold text-amber-800">Zero Rate 경고</p>
            <p className="text-sm text-amber-700">최근 기간 Zero Rate가 20%를 초과했습니다. RAG 검색 품질을 확인하세요.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ZeroRateCard value={zeroRate} label="Zero Rate (핵심 품질 지표)" alert={alert} />
        <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">총 요청 수</p>
          <p className="text-2xl md:text-3xl font-black text-gray-900 mt-1">{health?.total_requests ?? 0}</p>
        </div>
        <div className="rounded-xl border-2 border-gray-200 p-4 grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs font-bold text-gray-500">Embedding 실패율</p>
            <p className="text-lg font-bold text-gray-800">{(health?.embedding_fail_rate ?? 0).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500">RPC 실패율</p>
            <p className="text-lg font-bold text-gray-800">{(health?.rpc_fail_rate ?? 0).toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-bold text-gray-900 mb-3">7일 일별 Zero Rate 추세</h2>
        <div className="flex flex-wrap gap-2 items-end">
          {(health?.daily_trend ?? []).map((d) => (
            <div key={d.date} className="flex flex-col items-center gap-1">
              <div
                className={`w-10 md:w-12 rounded-t transition-all ${zeroRateBarBg(d.zero_rate)}`}
                style={{ height: `${Math.min(100, (d.zero_rate || 0) * 2 + 8)}px` }}
                title={`${d.date}: ${d.zero_rate}% (${d.zero_count}/${d.total})`}
              />
              <span className="text-[10px] font-medium text-gray-500">{d.date?.slice(5) ?? ""}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">막대 높이 = Zero Rate %. 색상: 녹색 &lt;10%, 노랑 10–20%, 빨강 &gt;20%</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Source별 Zero Rate</h2>
          <ul className="space-y-1.5 text-sm">
            {(health?.source_breakdown ?? []).slice(0, 8).map((s) => (
              <li key={s.source ?? "_"} className="flex justify-between items-center">
                <span className="font-medium text-gray-700">{s.source ?? "(null)"}</span>
                <span className={zeroRateColor(s.zero_rate).split(" ")[0]}>{s.zero_rate.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">언어별 Zero Rate</h2>
          <ul className="space-y-1.5 text-sm">
            {(health?.lang_breakdown ?? []).slice(0, 8).map((l) => (
              <li key={l.lang ?? "_"} className="flex justify-between items-center">
                <span className="font-medium text-gray-700">{l.lang ?? "(null)"}</span>
                <span className={zeroRateColor(l.zero_rate).split(" ")[0]}>{l.zero_rate.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Zero Rate 상위 5 Source (total≥3, zero_rate 기준)</h2>
        <ul className="space-y-1.5 text-sm">
          {(health?.top_5_sources_by_zero_rate ?? []).map((s, i) => (
            <li key={i} className="flex justify-between items-center">
              <span className="font-medium text-gray-700">{s.source ?? "(null)"}</span>
              <span className={zeroRateColor(s.zero_rate).split(" ")[0]}>{s.zero_rate.toFixed(1)}%</span>
              <span className="text-gray-500 text-xs">({s.zero_count}/{s.total})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
