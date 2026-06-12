"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Shield, Eye, CheckCircle2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const URGENCY_CONFIG = {
  emergency: { label: "응급", color: "bg-red-100 text-red-700 border-red-200", icon: "🚨" },
  high: { label: "높음", color: "bg-orange-100 text-orange-700 border-orange-200", icon: "⚠️" },
  medium: { label: "중간", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: "⚡" },
  low: { label: "낮음", color: "bg-green-100 text-green-700 border-green-200", icon: "✅" },
};

function getUrgencyFromScore(score) {
  if (score >= 0.9) return "emergency";
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

export function SymptomAlerts() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, unreviewed, high

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setLoading(false); return; }

      let url = "/api/khidi/followup?limit=50";
      if (filter === "high") url += "&urgency=high";
      if (filter === "unreviewed") url += "&unreviewed=true";

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const result = await response.json();
      if (result.ok) setReports(result.data || []);
    } catch (error) {
      console.error("[SymptomAlerts] Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        {[
          { id: "all", label: "전체" },
          { id: "unreviewed", label: "미검토" },
          { id: "high", label: "고위험" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f.id
                ? "bg-teal-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12">
          <Shield size={48} className="text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">알림 없음</h3>
          <p className="text-sm text-gray-500 mt-1">
            현재 대기 중인 증상 알림이 없습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const urgency = getUrgencyFromScore(report.ai_risk_score || 0);
            const config = URGENCY_CONFIG[urgency];

            return (
              <div
                key={report.id}
                className={`border rounded-xl p-4 ${config.color} border`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-sm text-gray-600 ml-2">
                        위험도 {((report.ai_risk_score || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.human_reviewed ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 size={14} /> 검토완료
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-orange-600">
                        <Eye size={14} /> 미검토
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(report.created_at).toLocaleString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* AI Assessment */}
                {report.ai_assessment && (
                  <p className="text-sm text-gray-700 mt-3 bg-white/60 rounded-lg p-3">
                    {report.ai_assessment}
                  </p>
                )}

                {/* Symptoms list */}
                {Array.isArray(report.symptoms) && report.symptoms.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {report.symptoms.map((s, i) => (
                      <span
                        key={i}
                        className="text-xs bg-white/80 px-2 py-1 rounded border"
                      >
                        {s.symptom || s.name} (심각도: {s.severity}/10)
                      </span>
                    ))}
                  </div>
                )}

                {/* Action */}
                <div className="mt-3 flex gap-2">
                  {!report.human_reviewed && (
                    <button className="px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 transition">
                      검토 완료 처리
                    </button>
                  )}
                  {urgency === "emergency" || urgency === "high" ? (
                    <button className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition">
                      화상 상담 예약
                    </button>
                  ) : null}
                  {(urgency === "high" || urgency === "medium") && (
                    <button
                      onClick={() => {
                        fetch("/api/khidi/rebooking/create", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            patientId: report.inquiry_id,
                            source: "symptom",
                            reason: report.ai_assessment || "증상 기반 재예약",
                            sessionType: urgency === "high" ? "diagnostic" : "follow_up",
                            daysFromNow: urgency === "high" ? 1 : 5,
                          }),
                        }).then(() => alert("재예약이 생성되었습니다."));
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                    >
                      재예약 제안
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
