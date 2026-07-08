"use client";

import { useState, useEffect, useCallback } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

// ============================================================
// 외부 서비스 사용량 — 모든 연동 서비스 한눈에 (실측/프록시/콘솔)
// 데이터: /api/admin/usage (src/lib/admin/serviceUsage.ts)
// ============================================================

function fmtVal(m) {
  if (m == null) return "—";
  const { value, unit } = m;
  if (unit === "USD") {
    const n = Number(value);
    if (n === 0) return "$0";
    if (n < 0.01) return `$${n.toFixed(4)}`;
    return `$${n.toFixed(2)}`;
  }
  const v = typeof value === "number" ? value.toLocaleString() : value;
  return unit ? `${v} ${unit}` : v;
}

const STATUS_BAR = { ok: "bg-teal-500", warn: "bg-amber-400", danger: "bg-red-500", none: "bg-gray-300" };
const MEASURE_BADGE = {
  live: { t: "● 실측", c: "text-green-600 bg-green-50 border-green-200" },
  proxy: { t: "≈ 추정", c: "text-blue-600 bg-blue-50 border-blue-200" },
  console: { t: "콘솔", c: "text-gray-500 bg-gray-50 border-gray-200" },
};
const CATEGORY_TONE = {
  AI: "bg-teal-50 text-teal-700 border-teal-200",
  "백엔드 · DB": "bg-blue-50 text-blue-700 border-blue-200",
  이메일: "bg-violet-50 text-violet-700 border-violet-200",
  메시지: "bg-amber-50 text-amber-700 border-amber-200",
  영상: "bg-rose-50 text-rose-700 border-rose-200",
  호스팅: "bg-indigo-50 text-indigo-700 border-indigo-200",
  모니터링: "bg-gray-50 text-gray-600 border-gray-200",
};

function Bar({ pct, status }) {
  if (pct == null) return null;
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mt-1">
      <div className={`${STATUS_BAR[status] ?? "bg-gray-300"} h-full rounded-full transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function Metric({ m, big }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`${big ? "text-xs" : "text-[11px]"} text-gray-500`}>{m.label}</span>
        {m.limit && <span className="text-[10px] text-gray-400">/ {m.limit}{m.pct != null ? ` · ${m.pct}%` : ""}</span>}
      </div>
      <div className={`${big ? "text-2xl font-bold" : "text-sm font-semibold"} text-gray-900`}>{fmtVal(m)}</div>
      <Bar pct={m.pct} status={m.status} />
      {m.note && <p className="text-[10px] text-gray-400 mt-0.5">{m.note}</p>}
    </div>
  );
}

export default function UsagePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/usage", { credentials: "include", cache: "no-store" });
      const json = await res.json();
      if (!json.ok) {
        setError(json.detail ?? json.error ?? "알 수 없는 오류");
        return;
      }
      setData(json);
    } catch {
      setError("서버 연결 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const services = data?.services ?? [];
  const byId = Object.fromEntries(services.map((s) => [s.id, s]));

  // 상단 요약 4종
  const summary = [
    { label: "제미나이 이번 달", m: byId.gemini?.usage?.primary, tone: "teal" },
    { label: "Supabase DB", m: byId.supabase?.usage?.primary, tone: "blue" },
    { label: "이메일(Resend) 이번 달", m: byId.resend?.usage?.primary, tone: "violet" },
    { label: "영상 상담방 이번 달", m: byId.livekit?.usage?.primary, tone: "rose" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">💳 외부 서비스 사용량</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            모든 연동 서비스를 한눈에 — 지금 얼마나 쓰는지 · 언제부터 돈이 나가는지
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-50 transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "조회 중" : "새로고침"}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">오류: {error}</div>}
      {data?.errors?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          ⚠️ 일부 집계 오류: {data.errors.join(" · ")}
        </div>
      )}

      {/* 상단 요약 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{loading ? "—" : fmtVal(s.m)}</p>
            {s.m?.limit && (
              <>
                <p className="text-[11px] text-gray-400 mt-0.5">/ {s.m.limit}{s.m.pct != null ? ` · ${s.m.pct}%` : ""}</p>
                <Bar pct={s.m?.pct} status={s.m?.status} />
              </>
            )}
            {s.m?.note && !s.m?.limit && <p className="text-[11px] text-gray-400 mt-0.5">{s.m.note}</p>}
          </div>
        ))}
      </div>

      {/* 서비스별 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {services.map((s) => {
          const badge = MEASURE_BADGE[s.usage?.kind] ?? MEASURE_BADGE.console;
          return (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-gray-900">{s.name}</h3>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${CATEGORY_TONE[s.category] ?? CATEGORY_TONE["모니터링"]}`}>
                      {s.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{s.what}</p>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${badge.c}`}>{badge.t}</span>
              </div>

              {/* 실측치 */}
              {s.usage?.primary ? (
                <div className="bg-gray-50/70 rounded-lg p-3 mt-1">
                  <Metric m={s.usage.primary} big />
                  {s.usage.extra?.length > 0 && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-gray-100">
                      {s.usage.extra.map((m, i) => (
                        <Metric key={i} m={m} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50/70 rounded-lg p-3 mt-1 text-xs text-gray-400">
                  앱에서 직접 측정 불가 — 아래 콘솔에서 실제 사용량을 확인하세요.
                </div>
              )}

              {/* 플랜·한도 */}
              <dl className="text-xs space-y-1.5 mt-3">
                <div className="flex gap-2">
                  <dt className="text-gray-400 w-16 shrink-0">플랜</dt>
                  <dd className="text-gray-700 font-medium">{s.plan}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-400 w-16 shrink-0">무료 한도</dt>
                  <dd className="text-gray-600">{s.freeTier}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-400 w-16 shrink-0">유료 시작</dt>
                  <dd className="text-gray-600">{s.paidTrigger}</dd>
                </div>
              </dl>

              <a
                href={s.consoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 self-start"
              >
                콘솔에서 확인 <ExternalLink size={12} />
              </a>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-400">
        ※ <b>실측</b>=앱이 직접 집계 · <b>추정</b>=우리 DB로 대신 측정(정확치는 콘솔) · <b>콘솔</b>=벤더 콘솔에서만 확인.
        무료 한도·단가는 참고치(벤더 수시 변경) — 정확한 청구는 각 콘솔. 제미나이 비용은 추정 단가.
        {data?.generatedAt && ` · 조회 ${new Date(data.generatedAt).toLocaleString("ko-KR")}`}
      </p>
    </div>
  );
}
