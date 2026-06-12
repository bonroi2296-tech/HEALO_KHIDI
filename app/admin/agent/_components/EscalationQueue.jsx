"use client";

import { useState, useEffect } from "react";
import { Clock, User, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const CANCER_TYPE_LABELS = {
  stomach: "위암",
  liver: "간암",
  lung: "폐암",
  breast: "유방암",
  thyroid: "갑상선암",
  other: "기타",
};

const CANCER_TYPE_COLORS = {
  stomach: "bg-purple-100 text-purple-700",
  liver: "bg-yellow-100 text-yellow-700",
  lung: "bg-blue-100 text-blue-700",
  breast: "bg-pink-100 text-pink-700",
  thyroid: "bg-green-100 text-green-700",
  other: "bg-gray-100 text-gray-700",
};

export function EscalationQueue() {
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetchIntakes();
  }, []);

  const fetchIntakes = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch("/api/khidi/intake?limit=50", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const result = await response.json();
      if (result.ok) {
        setIntakes(result.data || []);
      }
    } catch (error) {
      console.error("[EscalationQueue] Fetch error:", error);
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

  if (intakes.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 size={48} className="text-green-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900">대기 중인 항목이 없습니다</h3>
        <p className="text-sm text-gray-500 mt-1">
          모든 에스컬레이션이 처리되었습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          신규 인테이크 ({intakes.length}건)
        </h3>
      </div>

      {intakes.map((intake) => (
        <div
          key={intake.id}
          onClick={() => setSelectedId(selectedId === intake.id ? null : intake.id)}
          className={`border rounded-xl p-4 cursor-pointer transition hover:shadow-md ${
            selectedId === intake.id
              ? "border-teal-300 bg-teal-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  CANCER_TYPE_COLORS[intake.cancer_type] || CANCER_TYPE_COLORS.other
                }`}
              >
                {CANCER_TYPE_LABELS[intake.cancer_type] || intake.cancer_type}
              </span>
              {intake.cancer_stage && (
                <span className="text-sm text-gray-600">
                  Stage {intake.cancer_stage}
                </span>
              )}
              <span className="text-xs text-gray-400">
                {intake.language_preference?.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock size={14} />
              {new Date(intake.created_at).toLocaleString("ko-KR", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              <ChevronRight
                size={16}
                className={`transition ${selectedId === intake.id ? "rotate-90" : ""}`}
              />
            </div>
          </div>

          {/* Expanded Detail */}
          {selectedId === intake.id && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {intake.diagnosis_date && (
                  <>
                    <span className="text-gray-500">진단일</span>
                    <span>{intake.diagnosis_date}</span>
                  </>
                )}
                {intake.current_treatment && (
                  <>
                    <span className="text-gray-500">현재 치료</span>
                    <span>{intake.current_treatment}</span>
                  </>
                )}
                {intake.budget_range && (
                  <>
                    <span className="text-gray-500">예산</span>
                    <span>
                      {intake.budget_range.min || "–"} ~ {intake.budget_range.max || "–"}{" "}
                      {intake.budget_range.currency}
                    </span>
                  </>
                )}
                {intake.travel_dates && (
                  <>
                    <span className="text-gray-500">여행 일정</span>
                    <span>
                      {intake.travel_dates.earliest || "–"} ~ {intake.travel_dates.latest || "–"}
                      {intake.travel_dates.flexible && " (유동적)"}
                    </span>
                  </>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <button className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition">
                  병원 매칭 시작
                </button>
                <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                  상세 보기
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
