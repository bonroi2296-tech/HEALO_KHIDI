"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";

// M1 단계 목표 데이터 (실제 운영 시 API 연동)
const M1_TARGETS = {
  aiAccuracy: { target: 60, current: 0, label: "AI 자동응답 정확도" },
  escalationRate: { target: 40, current: 0, label: "에스컬레이션 비율" },
  patientSatisfaction: { target: 70, current: 0, label: "환자 만족도" },
  responseTime: { target: 30, current: 0, label: "평균 응답 시간(분)" },
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
        {Object.entries(M1_TARGETS).map(([key, data]) => (
          <div key={key} className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">{data.label}</div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {data.current || "–"}
                {key !== "responseTime" && "%"}
              </span>
              <span className="text-xs text-gray-400 mb-1">
                / 목표 {data.target}{key !== "responseTime" && "%"}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all"
                style={{
                  width: `${Math.min((data.current / data.target) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

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
            현재 등록된 패턴: 0건
          </p>
        </div>
      </div>
    </div>
  );
}
