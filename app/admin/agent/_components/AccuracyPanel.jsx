"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// KHIDI 마일스톤 목표(고정) — 현재값(current)은 실측 API로 채움.
// 실측 소스가 있는 지표(AI 정확도·환자 만족도)만 숫자, 없는 지표(에스컬레이션율·응답시간)는 "–".
// (하드코딩 current:0 잔재 제거, POSTMORTEMS #57 후속)
const METRIC_META = {
  aiAccuracy: { target: 60, label: "AI 자동응답 정확도", pct: true },
  escalationRate: { target: 40, label: "에스컬레이션 비율", pct: true },
  patientSatisfaction: { target: 70, label: "환자 만족도", pct: true },
  responseTime: { target: 30, label: "평균 응답 시간(분)", pct: false },
};

const MILESTONE_TARGETS = [
  { phase: "M1 (4~6월)", accuracy: 60, escalation: 40 },
  { phase: "M2 (7~8월)", accuracy: 75, escalation: 25 },
  { phase: "M3 (9~11월)", accuracy: 85, escalation: 15 },
];

const CORRECTION_TYPES = [
  { type: "factual", label: "사실 오류", color: "bg-red-400" },
  { type: "tone", label: "톤/어조", color: "bg-yellow-400" },
  { type: "medical", label: "의료 정보", color: "bg-purple-400" },
  { type: "translation", label: "번역 오류", color: "bg-blue-400" },
  { type: "escalation", label: "에스컬레이션", color: "bg-orange-400" },
];

export function AccuracyPanel() {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  // 실측값: 소스 있는 지표만 채움. null = 아직 데이터 없음 → 화면에 "–"(가짜 숫자 금지).
  const [current, setCurrent] = useState({
    aiAccuracy: null,
    escalationRate: null, // 실측 소스 없음(집계 파이프라인 미구축)
    patientSatisfaction: null,
    responseTime: null, // 실측 소스 없음
  });

  const fetchMetrics = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const days = selectedPeriod === "7d" ? 7 : selectedPeriod === "90d" ? 90 : 30;
      const to = new Date();
      const from = new Date(to.getTime() - days * 86400000);
      const fromStr = from.toISOString().slice(0, 10);
      const toStr = to.toISOString().slice(0, 10);

      const [qRes, sRes] = await Promise.all([
        fetch(`/api/admin/khidi/ai-quality?from=${fromStr}&to=${toStr}`, {
          headers,
          credentials: "include",
        }),
        fetch(`/api/admin/khidi/satisfaction`, { headers, credentials: "include" }),
      ]);
      const q = await qRes.json();
      const s = await sRes.json();

      setCurrent((c) => ({
        ...c,
        aiAccuracy:
          q?.ok && q.summary?.total_count > 0 && q.summary?.avg_overall != null
            ? Math.round(q.summary.avg_overall * 100)
            : null,
        // 만족도는 전체기간 집계(satisfaction API에 기간 필터 없음) → overallAvg100(0~100).
        patientSatisfaction:
          s?.ok && s.totalResponses > 0 ? Math.round(s.overallAvg100) : null,
      }));
    } catch {
      // 실패 시 기존값(대부분 null="–") 유지
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">AI 성과 지표</h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {["7d", "30d", "90d"].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                selectedPeriod === p
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p === "7d" ? "7일" : p === "30d" ? "30일" : "90일"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(METRIC_META).map(([key, meta]) => {
          const val = current[key];
          const hasVal = val != null;
          return (
            <div key={key} className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">{meta.label}</div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-gray-900 tabular-nums">
                  {hasVal ? val : "–"}
                  {hasVal && meta.pct && "%"}
                </span>
                <span className="text-xs text-gray-400 mb-1">
                  / 목표 {meta.target}
                  {meta.pct && "%"}
                </span>
              </div>
              {/* Progress Bar */}
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-700 rounded-full transition-all"
                  style={{
                    width: `${hasVal ? Math.min((val / meta.target) * 100, 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-400 -mt-2">
        AI 정확도·환자 만족도는 실측(AI 품질 평가·설문). 에스컬레이션 비율·응답 시간은 집계 파이프라인 준비 중이라 "–"로 표시됩니다.
      </p>

      {/* Milestone Roadmap */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">마일스톤 목표</h4>
        <div className="grid grid-cols-3 gap-3">
          {MILESTONE_TARGETS.map((m, i) => (
            <div
              key={i}
              className={`rounded-xl p-4 border ${
                i === 0
                  ? "border-teal-300 bg-teal-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="text-sm font-semibold text-gray-900 mb-2">
                {m.phase}
                {i === 0 && (
                  <span className="ml-2 text-xs bg-teal-700 text-white px-2 py-0.5 rounded">
                    현재
                  </span>
                )}
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <div>정확도 목표: <span className="font-bold text-gray-900">{m.accuracy}%</span></div>
                <div>에스컬레이션: <span className="font-bold text-gray-900">{m.escalation}%</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Correction Type Breakdown */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">수정 유형 분포</h4>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="space-y-3">
            {CORRECTION_TYPES.map((ct) => (
              <div key={ct.type} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${ct.color}`} />
                <span className="text-sm text-gray-700 w-24">{ct.label}</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${ct.color}`}
                    style={{ width: "0%" }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right">0건</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">
            상담 운영 시작 후 데이터가 누적되면 자동으로 표시됩니다.
          </p>
        </div>
      </div>

      {/* Playbook Patterns */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">자동 학습된 Playbook 패턴</h4>
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <BarChart3 size={36} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            Human Agent의 수정 패턴이 3회 이상 반복되면<br />
            자동으로 Playbook에 등록됩니다.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            자세한 현황은 「AI 품질」·「레거시 도구 › 플레이북」 메뉴에서 확인하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
