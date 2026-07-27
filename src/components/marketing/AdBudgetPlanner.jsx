"use client";

/**
 * 광고 예산 계산기 (Ad Budget Planner) — 공유 컴포넌트
 * PO가 "일 예산 얼마 할래"만 넣으면 → 예상 리드·유치·유치당 광고비·평가목표 기여를 자동 계산.
 * 순수 클라이언트 계산(민감데이터 없음). 가정값(CPL·전환율)은 슬라이더로 조정.
 * 사용처: /admin/khidi/ad-budget (어드민) + /ad-budget (공개·noindex).
 * 근거: docs/marketing/paid-ads-plan.md (검증 리서치 기반 추정).
 */

import { useState, useMemo } from "react";
import { KHIDI_TARGETS } from "@/lib/khidi/targets";

const USD_TO_KRW = 1380; // 환율 근사(표시용). 정확한 값 아님.

const PRESETS = [
  { label: "테스트", daily: 15, hint: "키워드·카피 검증 (권장 시작)" },
  { label: "성장", daily: 40, hint: "전환 확인 후 확대" },
  { label: "공격", daily: 100, hint: "8월 평가 직전 부스트" },
];

function fmt(n, digits = 0) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("ko-KR", { maximumFractionDigits: digits });
}

function StatCard({ label, value, unit, sub, accent = "teal" }) {
  const accentMap = {
    teal: "text-teal-700",
    green: "text-green-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
    gray: "text-gray-900",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
      <div className={`text-3xl font-bold tabular-nums ${accentMap[accent] ?? accentMap.gray}`}>
        {value}
        {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
      </div>
      {sub && <p className="text-xs text-gray-500 mt-2">{sub}</p>}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, suffix, hint }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-bold text-gray-900 tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-teal-600"
      />
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

export default function AdBudgetPlanner() {
  const [daily, setDaily] = useState(15); // 일 예산 USD (PO가 만지는 핵심)
  const [days, setDays] = useState(68); // 캠페인 일수 (D-68 기본)
  const [cpl, setCpl] = useState(25); // 리드당 비용 USD (추정 $15~40)
  const [convPct, setConvPct] = useState(8); // 리드→유치 전환율 %

  const r = useMemo(() => {
    const monthly = daily * 30;
    const totalSpend = daily * days;
    const leadsPerMonth = cpl > 0 ? monthly / cpl : 0;
    const leadsTotal = cpl > 0 ? totalSpend / cpl : 0;
    const conv = convPct / 100;
    const admitsPerMonth = leadsPerMonth * conv;
    const admitsTotal = leadsTotal * conv;
    const costPerAdmit = admitsTotal > 0 ? totalSpend / admitsTotal : Infinity;
    return { monthly, totalSpend, leadsPerMonth, leadsTotal, admitsPerMonth, admitsTotal, costPerAdmit };
  }, [daily, days, cpl, convPct]);

  const attractionTarget = KHIDI_TARGETS.attraction ?? 12;
  const consultTarget = KHIDI_TARGETS.consultAndCare ?? 120;
  const admitContribPct = Math.min(100, Math.round((r.admitsTotal / attractionTarget) * 100));
  const consultContribPct = Math.min(100, Math.round((r.leadsTotal / consultTarget) * 100));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">광고 예산 계산기</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          일 예산만 정하면 예상 리드·유치·유치당 광고비를 바로 계산합니다. 가정값(CPL·전환율)은 아래에서 조정.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setDaily(p.daily)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              daily === p.daily
                ? "bg-teal-50 text-teal-700 border-teal-200 shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
            title={p.hint}
          >
            {p.label} · ${p.daily}/일
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-8 shadow-sm space-y-5">
        <Slider
          label="일 예산"
          value={daily}
          min={5}
          max={200}
          step={5}
          onChange={setDaily}
          suffix=" USD/일"
          hint={`월 약 $${fmt(daily * 30)} · ₩${fmt(daily * 30 * USD_TO_KRW)} (환율 근사)`}
        />
        <Slider
          label="캠페인 기간"
          value={days}
          min={7}
          max={150}
          step={1}
          onChange={setDays}
          suffix=" 일"
          hint="기본 68일 = 8/27 중간평가까지(D-68)"
        />
        <Slider
          label="리드당 비용 (CPL) — 추정"
          value={cpl}
          min={5}
          max={80}
          step={1}
          onChange={setCpl}
          suffix=" USD"
          hint="의료관광·암 키워드 추정 $15~40. 광고 2주 후 실측으로 교정하세요."
        />
        <Slider
          label="리드 → 유치 전환율 — 추정"
          value={convPct}
          min={1}
          max={30}
          step={1}
          onChange={setConvPct}
          suffix=" %"
          hint="문의(리드)가 실제 유치로 이어지는 비율. 암 의료관광은 검토기간이 길어 보수적으로."
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="월 예산" value={`$${fmt(r.monthly)}`} sub={`₩${fmt(r.monthly * USD_TO_KRW)} 근사`} accent="gray" />
        <StatCard label="예상 리드 / 월" value={fmt(r.leadsPerMonth, 1)} unit="건" sub="= 월예산 ÷ CPL" accent="teal" />
        <StatCard label="예상 유치 / 월" value={fmt(r.admitsPerMonth, 1)} unit="건" sub="= 리드 × 전환율" accent="green" />
        <StatCard
          label="유치 1건당 광고비"
          value={isFinite(r.costPerAdmit) ? `$${fmt(r.costPerAdmit)}` : "—"}
          sub={isFinite(r.costPerAdmit) ? `₩${fmt(r.costPerAdmit * USD_TO_KRW)} 근사` : "전환율 0"}
          accent="amber"
        />
      </div>

      <div className="bg-teal-50 border border-teal-100 rounded-xl p-5 md:p-8">
        <h2 className="text-sm font-bold text-teal-800 mb-4">캠페인 전체 ({days}일 합산)</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="총 광고비" value={`$${fmt(r.totalSpend)}`} sub={`₩${fmt(r.totalSpend * USD_TO_KRW)} 근사`} accent="gray" />
          <StatCard label="예상 총 리드" value={fmt(r.leadsTotal, 0)} unit="건" accent="teal" />
          <StatCard label="예상 총 유치" value={fmt(r.admitsTotal, 1)} unit="건" accent="green" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-8 shadow-sm">
        <h2 className="text-sm font-bold text-gray-800 mb-1">8/27 평가 목표 기여 (추정)</h2>
        <p className="text-xs text-gray-500 mb-4">이 광고만으로 채워지는 비율. 에이전시·콘텐츠 유입은 별도로 더해짐.</p>
        <div className="space-y-4">
          <Contribution
            label={`외국인환자 유치 — 광고 기여 ${fmt(r.admitsTotal, 1)} / 목표 ${attractionTarget}건`}
            pct={admitContribPct}
            color="bg-green-500"
          />
          <Contribution
            label={`사전상담 — 광고 리드 ${fmt(r.leadsTotal, 0)} / 목표 ${consultTarget}건 (리드 1≈상담 1 가정)`}
            pct={consultContribPct}
            color="bg-teal-500"
          />
        </div>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        ⚠️ CPL·전환율은 <b>추정값</b>입니다(검증 전). 실제 광고 2주 후 <code>/admin/khidi/conversion</code>의 실측 리드·유치로 두 값을
        교정하면 정확해집니다. 결제·계정 개설은 <code>docs/YANDEX_SEO_SETUP.md</code> 참고. 채널: 카자흐=Google / 러시아=Yandex 권장.
      </p>
    </div>
  );
}

function Contribution({ label, pct, color }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="font-bold text-gray-900 tabular-nums">{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all duration-200`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
