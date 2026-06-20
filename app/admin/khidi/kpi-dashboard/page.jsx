"use client";

import { useState, useEffect, useCallback } from "react";
import { KHIDI_TARGETS } from "@/lib/khidi/targets";

// ============================================================
// 사업 기간 (2026-04-01 ~ 2026-11-30)
// ============================================================
const PROJECT_START = new Date("2026-04-01");
const PROJECT_END   = new Date("2026-11-30");

// 공식 목표(8/27 중간평가, 사업 누적) — src/lib/khidi/targets.ts SoR
const KPI_TARGETS = KHIDI_TARGETS;

// 월 이름 한글
const MONTH_NAMES = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

function projectProgress() {
  const now = new Date();
  const total = PROJECT_END - PROJECT_START;
  const elapsed = Math.min(now - PROJECT_START, total);
  return Math.max(0, Math.round((elapsed / total) * 100));
}

// ============================================================
// 서브 컴포넌트들
// ============================================================

function ProgressBar({ value, max, colorClass = "bg-teal-700", height = "h-2" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`w-full bg-gray-200 rounded-full ${height} overflow-hidden`}>
      <div
        className={`${colorClass} rounded-full h-full transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function KpiCard({ title, kpiId, actual, target, unit = "건", note, accentColor = "teal" }) {
  const pct = target ? Math.min(100, Math.round((actual / target) * 100)) : null;
  const colorMap = {
    teal: { bar: "bg-teal-700", badge: "bg-teal-50 text-teal-700 border-teal-200", ring: "ring-teal-200" },
    blue: { bar: "bg-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-200", ring: "ring-blue-200" },
    amber: { bar: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border-amber-200", ring: "ring-amber-200" },
    green: { bar: "bg-green-500", badge: "bg-green-50 text-green-700 border-green-200", ring: "ring-green-200" },
  };
  const c = colorMap[accentColor] ?? colorMap.teal;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ring-1 ${c.ring} shadow-sm`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{kpiId}</span>
        {pct !== null && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${c.badge}`}>
            {pct}%
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 mb-2">{title}</p>
      <div className="text-3xl font-bold text-gray-900 mb-1">
        {actual !== null ? actual.toLocaleString() : "—"}
        <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
      </div>
      {target && (
        <p className="text-xs text-gray-400 mb-2">목표 {target.toLocaleString()}{unit}</p>
      )}
      {pct !== null && (
        <ProgressBar value={actual} max={target} colorClass={c.bar} />
      )}
      {note && <p className="text-xs text-gray-400 mt-2">{note}</p>}
    </div>
  );
}

/** CSS-only 바 차트 */
function BarChart({ data, keys, colors, labels, height = 120 }) {
  const maxVal = Math.max(1, ...data.flatMap(d => keys.map(k => d[k] ?? 0)));
  return (
    <div className="flex items-end gap-1 w-full" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="flex items-end gap-0.5 w-full" style={{ height: height - 20 }}>
            {keys.map((k, ki) => {
              const pct = ((d[k] ?? 0) / maxVal) * 100;
              return (
                <div
                  key={k}
                  className={`flex-1 rounded-t transition-all duration-500 ${colors[ki]}`}
                  style={{ height: `${Math.max(2, pct)}%` }}
                  title={`${labels[ki]}: ${d[k] ?? 0}`}
                />
              );
            })}
          </div>
          <span className="text-[10px] text-gray-400 truncate w-full text-center">{d.label ?? ""}</span>
        </div>
      ))}
    </div>
  );
}

/** 도넛 게이지 (SVG) */
function GaugeCircle({ pct, label, sublabel, color = "#14b8a6" }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(100, pct) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="48" cy="48" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
        <text x="48" y="44" textAnchor="middle" className="text-sm font-bold" fontSize="14" fill="#111827" fontWeight="bold">
          {pct !== null ? `${pct}%` : "—"}
        </text>
        <text x="48" y="60" textAnchor="middle" fontSize="9" fill="#6b7280">
          {sublabel}
        </text>
      </svg>
      <span className="text-xs text-gray-600 font-medium">{label}</span>
    </div>
  );
}

// ============================================================
// 메인 페이지
// ============================================================
export default function KpiDashboardPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // xlsx 다운로드 상태
  const [dlLoading, setDlLoading] = useState(false);
  const [dlYear, setDlYear] = useState(now.getFullYear());
  const [dlMonth, setDlMonth] = useState(now.getMonth() + 1);

  const fetchKpi = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/khidi/kpi?year=${year}&month=${month}`, {
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
  }, [year, month]);

  useEffect(() => {
    fetchKpi();
  }, [fetchKpi]);

  const handleDownload = async () => {
    setDlLoading(true);
    try {
      const res = await fetch("/api/admin/khidi/monthly-report", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: dlYear, month: dlMonth }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(`오류: ${json.detail ?? json.error ?? res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `KHIDI_월간보고_${dlYear}년${dlMonth}월_본로이.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("다운로드 실패: " + e.message);
    } finally {
      setDlLoading(false);
    }
  };

  const kpi = data?.kpi ?? null;
  const cum = data?.cumulative ?? null; // 사업 누적 (8/27 평가 기준)
  const daily = data?.daily ?? [];
  const projPct = projectProgress();

  // 집계 쿼리 오류(컬럼명 오류 등) — 조용한 0 대신 화면에 경고로 노출
  const kpiErrors = [...(kpi?.errors ?? []), ...(cum?.errors ?? [])];

  // 사업 누적: 사전상담+사후관리 합산 (공식 120 목표)
  const cumConsultCare =
    cum != null ? (cum.preConsultation ?? 0) + (cum.followUp ?? 0) : null;

  // 월별 바 차트용 데이터 (daily → 일별 누적)
  const dailyChartData = daily.slice(-30).map((d) => ({
    label: d.date.slice(5), // MM-DD
    pre: d.pre,
    follow: d.follow,
    attraction: d.attraction,
  }));

  // 국가 분포
  const countries = kpi?.countries ?? [];
  const totalPatients = kpi?.uniquePatients ?? 0;

  // 만족도 응답률 (%)
  const satRate = kpi?.satisfactionResponseRate ?? null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">KHIDI KPI 대시보드</h1>
          <p className="text-sm text-gray-500 mt-0.5">ICT 기반 외국인환자 사전상담·사후관리 지원 사업 (2026.04 ~ 2026.11)</p>
        </div>
        {/* 월 선택 */}
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            {[2026, 2027].map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            {[4,5,6,7,8,9,10,11].map((m) => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>
          <button
            onClick={fetchKpi}
            disabled={loading}
            className="text-sm px-3 py-1.5 bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-50 transition"
          >
            {loading ? "로딩..." : "조회"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          오류: {error}
        </div>
      )}

      {/* 집계 쿼리 오류 경고 (조용한 0 방지) */}
      {kpiErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          ⚠️ 일부 지표 집계에 오류가 있어 값이 부정확할 수 있습니다:
          <ul className="list-disc ml-5 mt-1">
            {kpiErrors.map((e, i) => (
              <li key={i} className="font-mono text-xs">{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 사업 기간 진척률 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">사업 기간 진척률</span>
          <span className="text-sm font-bold text-teal-700">{projPct}%</span>
        </div>
        <ProgressBar value={projPct} max={100} colorClass="bg-teal-700" height="h-3" />
        <div className="flex justify-between mt-1.5 text-xs text-gray-400">
          <span>2026년 4월</span>
          <span>2026년 11월</span>
        </div>
      </div>

      {/* 공식 정량지표 달성률 (사업 누적 — 8/27 중간평가표 기준) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-800">
            공식 정량지표 달성률 <span className="text-gray-400 font-normal">· 사업 누적 (8/27 중간평가 기준)</span>
          </h2>
          <span className="text-xs text-gray-400">2026.04 ~ 현재</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            kpiId="K-01"
            title="외국인환자 유치 (admitted)"
            actual={cum?.attraction ?? null}
            target={KPI_TARGETS.attraction}
            accentColor="green"
          />
          <KpiCard
            kpiId="K-02+K-04"
            title="사전상담 + 사후관리 (합산)"
            actual={cumConsultCare}
            target={KPI_TARGETS.consultAndCare}
            note={cum ? `사전 ${cum.preConsultation ?? 0} · 사후 ${cum.followUp ?? 0}` : ""}
            accentColor="teal"
          />
          <KpiCard
            kpiId="K-03"
            title="환자 만족도 평균"
            actual={cum?.satisfactionAvg ?? null}
            target={KPI_TARGETS.satisfaction}
            unit="점"
            note={cum ? `응답 ${cum.satisfactionResponseCount ?? 0}건` : ""}
            accentColor="amber"
          />
        </div>
      </div>

      {/* 월별 상세 (선택한 달의 운영 수치 — 목표 바 없음) */}
      <div>
        <h2 className="text-sm font-bold text-gray-800 mb-2">
          이번 달 상세 <span className="text-gray-400 font-normal">· {year}년 {month}월 운영 수치</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            kpiId="K-02"
            title="원격 사전상담"
            actual={kpi?.preConsultation ?? null}
            target={null}
            note="이번 달 완료"
            accentColor="teal"
          />
          <KpiCard
            kpiId="K-04"
            title="사후관리"
            actual={kpi?.followUp ?? null}
            target={null}
            note="이번 달 완료"
            accentColor="blue"
          />
          <KpiCard
            kpiId="K-01"
            title="환자유치"
            actual={kpi?.attraction ?? null}
            target={null}
            note="이번 달 확정"
            accentColor="green"
          />
          <KpiCard
            kpiId="K-03"
            title="만족도 평균"
            actual={kpi?.satisfactionAvg ?? null}
            target={null}
            unit="점"
            note={kpi ? `응답 ${kpi.satisfactionResponseCount}건` : ""}
            accentColor="amber"
          />
        </div>
      </div>

      {/* 일별 추이 차트 (최근 30일) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          일별 추이 — {year}년 {month}월 (스냅샷 기록 기준)
        </h2>
        {dailyChartData.length > 0 ? (
          <>
            <BarChart
              data={dailyChartData}
              keys={["pre", "follow", "attraction"]}
              colors={["bg-teal-400", "bg-blue-400", "bg-green-400"]}
              labels={["사전상담", "사후관리", "환자유치"]}
              height={140}
            />
            <div className="flex gap-4 mt-3 justify-center">
              {[
                { color: "bg-teal-400", label: "사전상담" },
                { color: "bg-blue-400", label: "사후관리" },
                { color: "bg-green-400", label: "환자유치" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded ${l.color}`} />
                  <span className="text-xs text-gray-500">{l.label}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">
            {loading ? "데이터 로딩 중..." : "이 달의 스냅샷 데이터가 없습니다. Cron 설정 후 쌓입니다."}
          </p>
        )}
      </div>

      {/* 국가별 분포 + 만족도 응답률 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 국가별 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">국가별 환자 분포</h2>
          {countries.length > 0 ? (
            <div className="space-y-2">
              {countries.slice(0, 6).map((c) => (
                <div key={c.nationality}>
                  <div className="flex justify-between text-sm mb-0.5">
                    <span className="text-gray-700">{c.nationality}</span>
                    <span className="text-gray-500 font-medium">
                      {c.count}명 ({totalPatients > 0 ? Math.round((c.count / totalPatients) * 100) : 0}%)
                    </span>
                  </div>
                  <ProgressBar
                    value={c.count}
                    max={totalPatients}
                    colorClass={
                      c.nationality.includes("카자흐") || c.nationality.includes("KZ")
                        ? "bg-amber-400"
                        : c.nationality.includes("러시아") || c.nationality.includes("RU")
                        ? "bg-blue-400"
                        : "bg-gray-400"
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">
              {loading ? "로딩 중..." : "환자 데이터 없음"}
            </p>
          )}
        </div>

        {/* 만족도 응답률 게이지 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col items-center justify-center gap-4">
          <h2 className="text-sm font-semibold text-gray-700 self-start">K-03 만족도 응답률</h2>
          <div className="flex gap-8">
            <GaugeCircle
              pct={satRate !== null ? Math.round(satRate) : 0}
              label="응답률"
              sublabel="목표 60%"
              color={satRate !== null && satRate >= 60 ? "#22c55e" : "#f59e0b"}
            />
            <GaugeCircle
              pct={kpi?.satisfactionAvg !== null ? Math.round(((kpi?.satisfactionAvg ?? 0) / 100) * 100) : 0}
              label="만족도"
              sublabel={`목표 ${KPI_TARGETS.satisfaction}점`}
              color={kpi?.satisfactionAvg !== null && (kpi?.satisfactionAvg ?? 0) >= KPI_TARGETS.satisfaction ? "#14b8a6" : "#f59e0b"}
            />
          </div>
          <div className="text-xs text-gray-400 text-center">
            응답 {kpi?.satisfactionResponseCount ?? 0}건 / 만족도 {kpi?.satisfactionAvg ?? "—"}점
          </div>
        </div>
      </div>

      {/* 월간 보고 xlsx 다운로드 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">월간 보고 xlsx 자동 생성</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">연도</label>
            <select
              value={dlYear}
              onChange={(e) => setDlYear(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              {[2026, 2027].map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">월</label>
            <select
              value={dlMonth}
              onChange={(e) => setDlMonth(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              {[4,5,6,7,8,9,10,11].map((m) => <option key={m} value={m}>{m}월</option>)}
            </select>
          </div>
          <button
            onClick={handleDownload}
            disabled={dlLoading}
            className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 disabled:opacity-50 transition shadow-sm"
          >
            {dlLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                생성 중...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {dlYear}년 {dlMonth}월 보고 xlsx 다운로드
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          KHIDI 양식 기준으로 사전상담·사후관리·환자유치 건수 + 외국인환자 명단이 자동 채워진 xlsx 파일이 생성됩니다.
        </p>
      </div>
    </div>
  );
}
