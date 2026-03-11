"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminGuideModal } from "../_components/AdminGuideModal";

function KpiCard({ label, value, sub }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : "—");

export default function PlaybookAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [filters, setFilters] = useState({
    from: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    used: "",
    lang: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set("from", filters.from + "T00:00:00Z");
      if (filters.to) params.set("to", filters.to + "T23:59:59Z");
      if (filters.used) params.set("used", filters.used);
      if (filters.lang) params.set("lang", filters.lang);
      const res = await fetch(`/api/admin/playbook/analytics?${params}`);
      const json = await res.json();
      if (json.ok) setData(json);
    } catch (err) {
      console.error("Analytics fetch error:", err);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary;
  const tp = data?.top_patterns || [];
  const ts = data?.timeseries || [];

  return (
    <div className="max-w-7xl mx-auto p-4">
      {showGuide && (
        <AdminGuideModal title="패턴 분석 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p><strong>응대 패턴(Playbook Patterns)</strong>의 사용 현황을 기간·언어·사용 여부별로 집계합니다. 어떤 패턴이 많이 쓰였는지, 트렌드를 확인해 운영·개선에 참고할 수 있습니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">사용법</h3>
            <p className="text-gray-600 text-sm">From/To로 기간을 정하고, 필요 시 사용 여부·언어로 필터링합니다. 요약 지표와 상위 패턴, 시계열 데이터를 확인하세요.</p>
          </section>
        </AdminGuideModal>
      )}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Playbook Analytics</h1>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          사용 가이드
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-end">
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
          <label className="block text-xs text-gray-500 mb-1">Used</label>
          <select
            value={filters.used}
            onChange={(e) => setFilters((f) => ({ ...f, used: e.target.value }))}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Lang</label>
          <input
            type="text"
            placeholder="en / ko"
            value={filters.lang}
            onChange={(e) => setFilters((f) => ({ ...f, lang: e.target.value }))}
            className="border rounded px-2 py-1 text-sm w-20"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : !s ? (
        <div className="text-center py-16 text-gray-400">No data</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            <KpiCard label="Total Events" value={fmt(s.total)} />
            <KpiCard label="Retrieved Any" value={fmt(s.retrieved_any)} sub={s.total ? `${Math.round((s.retrieved_any / s.total) * 100)}%` : ""} />
            <KpiCard label="Used (선언)" value={fmt(s.used_count)} />
            <KpiCard label="Used Rate" value={`${s.used_rate}%`} />
            <KpiCard label="Avg Latency" value={`${fmt(s.avg_latency_ms)}ms`} />
            <KpiCard label="Handoff Rate" value={`${s.handoff_rate}%`} />
            <KpiCard label="Fallback Rate" value={`${s.fallback_rate ?? 0}%`} sub={`${s.fallback_count ?? 0}건 JSON 파싱 실패`} />
          </div>

          {/* Top Patterns */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Top Patterns (상위 20)</h2>
            {tp.length === 0 ? (
              <p className="text-sm text-gray-400">No pattern usage data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-3 py-2 border-b">#</th>
                      <th className="px-3 py-2 border-b">Pattern ID</th>
                      <th className="px-3 py-2 border-b text-right">Retrieves</th>
                      <th className="px-3 py-2 border-b text-right">Uses</th>
                      <th className="px-3 py-2 border-b text-right">Use Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tp.map((p, i) => (
                      <tr key={p.pattern_id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 border-b text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 border-b font-mono text-xs">{p.pattern_id}</td>
                        <td className="px-3 py-2 border-b text-right">{p.retrieves}</td>
                        <td className="px-3 py-2 border-b text-right font-medium">{p.uses}</td>
                        <td className="px-3 py-2 border-b text-right">
                          {p.retrieves > 0 ? `${Math.round((p.uses / p.retrieves) * 100)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Timeseries */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Daily Timeseries</h2>
            {ts.length === 0 ? (
              <p className="text-sm text-gray-400">No timeseries data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-3 py-2 border-b">Date</th>
                      <th className="px-3 py-2 border-b text-right">Total</th>
                      <th className="px-3 py-2 border-b text-right">Retrieved</th>
                      <th className="px-3 py-2 border-b text-right">Used</th>
                      <th className="px-3 py-2 border-b text-right">Handoff</th>
                      <th className="px-3 py-2 border-b text-right">Use Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ts.map((d) => (
                      <tr key={d.date} className="hover:bg-gray-50">
                        <td className="px-3 py-2 border-b">{d.date}</td>
                        <td className="px-3 py-2 border-b text-right">{d.total}</td>
                        <td className="px-3 py-2 border-b text-right">{d.retrieved_any}</td>
                        <td className="px-3 py-2 border-b text-right font-medium">{d.used}</td>
                        <td className="px-3 py-2 border-b text-right">{d.handoff}</td>
                        <td className="px-3 py-2 border-b text-right">
                          {d.total > 0 ? `${Math.round((d.used / d.total) * 100)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
