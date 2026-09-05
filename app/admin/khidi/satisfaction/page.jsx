"use client";

import { useState, useEffect } from "react";

const QUESTION_LABELS = [
  "Q1. 의료진 전문성",
  "Q2. 통역 품질",
  "Q3. 시스템 편의성",
  "Q4. 응대 속도 & 코디네이터",
  "Q5. 전반적 만족도",
];

function ScoreBar({ label, avg100 }) {
  const isGood = avg100 >= 80;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-700">{label}</span>
        <span className={`font-bold ${isGood ? "text-green-700" : "text-red-600"}`}>
          {avg100}점
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isGood ? "bg-green-400" : "bg-red-400"}`}
          style={{ width: `${Math.min(avg100, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function SatisfactionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/admin/khidi/satisfaction", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setData(d);
        else setError(d.error || "unknown_error");
      })
      .catch((e) => { console.error("[admin/khidi/satisfaction]", e); setError("불러오기에 실패했습니다."); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">불러오는 중...</div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 text-sm">
        데이터 로드 실패: {error}
      </div>
    );
  }

  const {
    totalSurveys,
    respondedSurveys,
    totalResponses,
    responseRate,
    scores,
    overallAvg100,
    kpiK03Target,
    kpiK03Met,
    recentComments,
  } = data;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">환자 만족도 — KHIDI K-03</h1>
        <p className="text-sm text-gray-500 mt-1">목표: {kpiK03Target}점 이상</p>
      </div>

      {/* 전체 KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className={`text-3xl font-bold ${kpiK03Met ? "text-green-700" : "text-red-600"}`}>
            {overallAvg100}
          </div>
          <div className="text-xs text-gray-500 mt-1">전체 평균 (100점)</div>
          <div className={`text-xs mt-1 font-medium ${kpiK03Met ? "text-green-500" : "text-red-400"}`}>
            {kpiK03Met ? "✅ KPI 달성" : "❌ 목표 미달"}
          </div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-gray-800">{responseRate}%</div>
          <div className="text-xs text-gray-500 mt-1">응답률</div>
          <div className="text-xs text-gray-500 mt-1">
            {respondedSurveys} / {totalSurveys}건
          </div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-gray-800">{totalSurveys}</div>
          <div className="text-xs text-gray-500 mt-1">발송 총계</div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-gray-800">{totalResponses}</div>
          <div className="text-xs text-gray-500 mt-1">수집 응답</div>
        </div>
      </div>

      {/* 문항별 점수 */}
      {totalResponses > 0 && (
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">문항별 평균</h2>
          {QUESTION_LABELS.map((label, i) => {
            const key = `q${i + 1}`;
            return (
              <ScoreBar
                key={key}
                label={label}
                avg100={scores[key]?.avg100 ?? 0}
              />
            );
          })}
        </div>
      )}

      {totalResponses === 0 && (
        <div className="bg-white border rounded-xl p-8 text-center text-gray-500 text-sm">
          아직 응답이 없습니다.
        </div>
      )}

      {/* 자유 의견 */}
      {recentComments?.length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            자유 의견 (최근 {recentComments.length}건)
          </h2>
          <div className="space-y-3">
            {recentComments.map((c, i) => (
              <div key={i} className="border-l-2 border-teal-700 pl-3">
                <p className="text-sm text-gray-800 leading-relaxed">{c.comment}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(c.submittedAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
