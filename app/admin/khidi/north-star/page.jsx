"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, ArrowLeft } from "lucide-react";

// ============================================================
// 북극성 지표(NSM) 대시보드 — 주간 '사전상담 완료'가 단일 운전대.
// 데이터: /api/admin/khidi/north-star (src/lib/khidi/northStar.ts)
// ============================================================

const SOURCE_LABELS = {
  ai_agent: "AI 상담",
  web: "웹 문의폼",
  기타: "기타",
};
const SOURCE_COLORS = ["bg-teal-500", "bg-blue-500", "bg-amber-400", "bg-violet-400", "bg-gray-400"];

function DeltaBadge({ pct }) {
  if (pct === null || pct === undefined) {
    return <span className="text-xs text-gray-500">—</span>;
  }
  const up = pct > 0;
  const flat = pct === 0;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  const color = flat ? "text-gray-500" : up ? "text-green-700" : "text-red-600";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${color}`}>
      <Icon size={13} />
      {up ? "+" : ""}
      {pct}%
    </span>
  );
}

/** NSM 주간 추세 — SVG 라인+포인트 */
function TrendLine({ points, height = 160 }) {
  const w = 720;
  const padX = 28;
  const padY = 20;
  const maxV = Math.max(1, ...points.map((p) => p.preCompleted));
  const stepX = points.length > 1 ? (w - padX * 2) / (points.length - 1) : 0;
  const y = (v) => height - padY - (v / maxV) * (height - padY * 2);
  const x = (i) => padX + i * stepX;
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.preCompleted).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ maxHeight: height }}>
      {/* 기준선 */}
      {[0, 0.5, 1].map((f) => (
        <line
          key={f}
          x1={padX}
          x2={w - padX}
          y1={y(maxV * f)}
          y2={y(maxV * f)}
          stroke="#f1f5f9"
          strokeWidth="1"
        />
      ))}
      <path d={path} fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={p.weekStart}>
          <circle cx={x(i)} cy={y(p.preCompleted)} r="3.5" fill="#0f766e" />
          <text x={x(i)} y={y(p.preCompleted) - 9} textAnchor="middle" fontSize="11" fill="#0f766e" fontWeight="bold">
            {p.preCompleted}
          </text>
          <text x={x(i)} y={height - 4} textAnchor="middle" fontSize="9" fill="#94a3b8">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** 채널별 주간 신규문의 — 누적 막대 */
function SourceBars({ weeks, sources }) {
  const maxV = Math.max(1, ...weeks.map((w) => w.inquiriesTotal));
  return (
    <div className="flex items-end gap-1 w-full" style={{ height: 130 }}>
      {weeks.map((wk) => (
        <div key={wk.weekStart} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="w-full flex flex-col-reverse" style={{ height: 105 }}>
            {sources.map((s, si) => {
              const v = wk.bySource[s] ?? 0;
              if (!v) return null;
              return (
                <div
                  key={s}
                  className={SOURCE_COLORS[si % SOURCE_COLORS.length]}
                  style={{ height: `${(v / maxV) * 100}%` }}
                  title={`${SOURCE_LABELS[s] ?? s}: ${v}`}
                />
              );
            })}
          </div>
          <span className="text-[9px] text-gray-500 truncate w-full text-center">{wk.label}</span>
        </div>
      ))}
    </div>
  );
}

function LeadingCard({ label, value, unit, delta, sub, tone = "teal", muted }) {
  const toneRing = {
    teal: "ring-teal-100",
    blue: "ring-blue-100",
    amber: "ring-amber-100",
    gray: "ring-gray-100",
  }[tone];
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 ring-1 ${toneRing} shadow-sm`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        {delta !== undefined && <DeltaBadge pct={delta} />}
      </div>
      <div className={`text-2xl font-bold ${muted ? "text-gray-300" : "text-gray-900"}`}>
        {value}
        {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
      </div>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function NorthStarPage() {
  const [weeks, setWeeks] = useState(12);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/khidi/north-star?weeks=${weeks}`, {
        credentials: "include",
        cache: "no-store",
      });
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
  }, [weeks]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const nsm = data?.nsm;
  const leading = data?.leading;
  const weekList = data?.weeks ?? [];
  const sources = data?.sources ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/khidi/kpi-dashboard"
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-teal-700 mb-1"
          >
            <ArrowLeft size={13} /> KHIDI 리포트
          </Link>
          <h1 className="text-xl font-bold text-gray-900">🎯 북극성 지표</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            주간 <b className="text-teal-700">사전상담 완료</b> — 유치·상담120·만족도를 동시에 전진시키는 단일 운전대
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            {[8, 12, 16, 26].map((w) => (
              <option key={w} value={w}>최근 {w}주</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">오류: {error}</div>
      )}
      {data?.errors?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          ⚠️ 일부 집계 오류: {data.errors.join(" · ")}
        </div>
      )}

      {/* 왜 북극성인가 (설명) */}
      <div className="bg-teal-50/60 border border-teal-100 rounded-xl p-4 text-sm text-teal-900">
        <b>왜 이게 북극성인가?</b> 유치 12건·상담 120건·만족도 90점은 모두 <b>결과(후행)지표</b>라
        매주 직접 끌어올릴 수 없습니다. 반면 <b>사전상담 완료</b>는 매주 늘릴 수 있고, 이게 늘면
        상담 120건을 직접 채우고 → 유치 전환 모수가 되고 → 만족도 설문 모수가 됩니다.
        <b> 한 활동이 3개 점수를 동시에 밀어줍니다.</b>
      </div>

      {/* NSM 히어로 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3 mb-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">이번 주 사전상담 완료</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-teal-700">{loading ? "—" : nsm?.thisWeek ?? 0}</span>
              <span className="text-sm text-gray-500 mb-1">건</span>
              {nsm && <span className="mb-1.5"><DeltaBadge pct={nsm.deltaPct} /></span>}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            <div>지난주 <b className="text-gray-700">{nsm?.lastWeek ?? 0}건</b></div>
            <div>최근 4주 평균 <b className="text-gray-700">{nsm?.last4wAvg ?? 0}건</b></div>
          </div>
        </div>
        {weekList.length > 0 ? (
          <TrendLine points={weekList} />
        ) : (
          <p className="text-sm text-gray-500 text-center py-10">
            {loading ? "데이터 로딩 중..." : "표시할 데이터가 없습니다."}
          </p>
        )}
      </div>

      {/* 선행지표 4종 */}
      <div>
        <h2 className="text-sm font-bold text-gray-800 mb-2">선행지표 — 북극성을 미리 예측하는 신호</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <LeadingCard
            label="① 주간 신규 문의"
            value={loading ? "—" : leading?.newInquiriesThisWeek ?? 0}
            unit="건"
            delta={
              leading
                ? leading.newInquiriesLastWeek === 0
                  ? leading.newInquiriesThisWeek > 0
                    ? 100
                    : null
                  : Math.round(
                      ((leading.newInquiriesThisWeek - leading.newInquiriesLastWeek) /
                        leading.newInquiriesLastWeek) *
                        1000
                    ) / 10
                : undefined
            }
            sub={`지난주 ${leading?.newInquiriesLastWeek ?? 0}건`}
            tone="blue"
          />
          <LeadingCard
            label="② 예약 → 완료 전환율"
            value={loading ? "—" : leading?.bookingToCompletionPct ?? "—"}
            unit={leading?.bookingToCompletionPct != null ? "%" : ""}
            sub="최근 4주 누적"
            tone="teal"
          />
          <LeadingCard
            label="③ 만족도 응답률"
            value={loading ? "—" : leading?.satisfactionResponseRatePct ?? "—"}
            unit={leading?.satisfactionResponseRatePct != null ? "%" : ""}
            sub="윈도우 발송 대비"
            tone="amber"
          />
          <LeadingCard
            label="④ 에이전시 콜드메일 회신율"
            value="측정 예정"
            muted
            sub="아웃리치 트래킹 도입 시 자동"
            tone="gray"
          />
        </div>
      </div>

      {/* 채널별 주간 신규문의 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">채널별 주간 신규 문의</h2>
        {weekList.length > 0 ? (
          <>
            <SourceBars weeks={weekList} sources={sources} />
            <div className="flex flex-wrap gap-4 mt-3 justify-center">
              {sources.map((s, si) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded ${SOURCE_COLORS[si % SOURCE_COLORS.length]}`} />
                  <span className="text-xs text-gray-500">{SOURCE_LABELS[s] ?? s}</span>
                </div>
              ))}
              {sources.length === 0 && <span className="text-xs text-gray-500">문의 데이터 없음</span>}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500 text-center py-6">{loading ? "로딩 중..." : "데이터 없음"}</p>
        )}
      </div>
    </div>
  );
}
