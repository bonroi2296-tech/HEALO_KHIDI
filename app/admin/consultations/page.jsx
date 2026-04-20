"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Phone,
  Edit2,
  X,
  ChevronDown,
  Globe,
  AlertCircle,
} from "lucide-react";
import { createSupabaseBrowserClient } from "../../../src/lib/supabase/browser";
import { useToast } from "../../../src/components/Toast";

const supabase = createSupabaseBrowserClient();

export default function ConsultationsPage() {
  const router = useRouter();
  const toast = useToast();

  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming"); // upcoming, active, completed, all
  const [expandedId, setExpandedId] = useState(null);
  const [_showScheduleModal, setShowScheduleModal] = useState(false);
  const [_selectedConsultation, setSelectedConsultation] = useState(null);

  // Fetch consultations
  useEffect(() => {
    fetchConsultations();
  }, [filter]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error("인증 오류. 다시 로그인하세요.");
        return;
      }

      let url = "/api/khidi/consultation?limit=100";

      if (filter !== "all") {
        url += `&status=${filter === "upcoming" ? "scheduled" : filter}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.ok) {
        setConsultations(result.data || []);
      } else {
        toast.error(`상담 로딩 실패: ${result.error}`);
      }
    } catch (error) {
      console.error("[ConsultationsPage] fetchConsultations error:", error);
      toast.error("상담 로딩 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinConsultation = (consultation) => {
    router.push(`/consultation/${consultation.id}`);
  };

  const handleReschedule = (consultation) => {
    setSelectedConsultation(consultation);
    setShowScheduleModal(true);
  };

  const handleCancel = async (id) => {
    if (!confirm("상담을 취소하시겠습니까?")) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const _token = sessionData?.session?.access_token;

      // In real implementation, call an update API
      // For now, just show success
      toast.success("상담이 취소되었습니다.");
      setConsultations(
        consultations.map((c) =>
          c.id === id ? { ...c, status: "cancelled" } : c
        )
      );
    } catch (error) {
      console.error("[ConsultationsPage] handleCancel error:", error);
      toast.error("취소 실패");
    }
  };

  const sessionTypeLabel = {
    pre_consultation: "진료 전 평가",
    follow_up: "추후 진료",
    emergency: "긴급 상담",
    diagnostic: "검사 결과 검토",
  };

  const statusLabel = {
    scheduled: "예정됨",
    active: "진행 중",
    completed: "완료",
    cancelled: "취소됨",
    no_show: "무응답",
  };

  const statusColor = {
    scheduled: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800",
    completed: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
    no_show: "bg-yellow-100 text-yellow-800",
  };

  const filteredConsultations = consultations.filter((c) => {
    if (filter === "all") return true;
    if (filter === "upcoming") return c.status === "scheduled";
    return c.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">원격협진 관리</h1>
        <p className="text-gray-500 mt-2">
          카자흐스탄 환자와 한국 병원 간 WebRTC 화상 상담
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: "upcoming", label: "예정됨" },
          { key: "active", label: "진행 중" },
          { key: "completed", label: "완료" },
          { key: "all", label: "전체" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-3 font-medium transition border-b-2 ${
              filter === tab.key
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">로딩 중...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredConsultations.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-semibold">상담이 없습니다.</p>
          <p className="text-gray-500 text-sm mt-1">
            {filter === "upcoming" && "예정된 상담이 없습니다."}
            {filter === "active" && "진행 중인 상담이 없습니다."}
            {filter === "completed" && "완료된 상담이 없습니다."}
            {filter === "all" && "상담 기록이 없습니다."}
          </p>
        </div>
      )}

      {/* Consultations list */}
      {!loading && filteredConsultations.length > 0 && (
        <div className="space-y-4">
          {filteredConsultations.map((consultation) => (
            <div
              key={consultation.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition"
            >
              {/* Summary row */}
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 transition"
                onClick={() =>
                  setExpandedId(
                    expandedId === consultation.id ? null : consultation.id
                  )
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">
                          {consultation.cancer_patient_intakes?.[0]?.first_name ||
                            "Patient"}{" "}
                          - {consultation.cancer_patient_intakes?.[0]?.cancer_type || "N/A"}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {sessionTypeLabel[consultation.session_type] || consultation.session_type}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          statusColor[consultation.status] || "bg-gray-100"
                        }`}
                      >
                        {statusLabel[consultation.status] || consultation.status}
                      </span>
                    </div>

                    {/* Key info grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={16} />
                        <span>
                          {new Date(consultation.scheduled_at).toLocaleDateString(
                            "ko-KR"
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock size={16} />
                        <span>
                          {new Date(consultation.scheduled_at).toLocaleTimeString(
                            "ko-KR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Globe size={16} />
                        <span>
                          {consultation.patient_language.toUpperCase()} ↔{" "}
                          {consultation.doctor_language.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User size={16} />
                        <span>
                          Stage:{" "}
                          {consultation.cancer_patient_intakes?.[0]?.cancer_stage ||
                            "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <ChevronDown
                      size={24}
                      className={`text-gray-400 transition ${
                        expandedId === consultation.id ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === consultation.id && (
                <div className="border-t border-gray-200 bg-gray-50 p-6 space-y-4">
                  {/* Doctor info */}
                  {consultation.doctor_id && (
                    <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
                      <Stethoscope size={20} className="text-teal-600 mt-1" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          담당 의사
                        </p>
                        <p className="text-sm text-gray-600">
                          {consultation.doctor_id}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Coordinator info */}
                  {consultation.coordinator_id && (
                    <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
                      <User size={20} className="text-teal-600 mt-1" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          코디네이터
                        </p>
                        <p className="text-sm text-gray-600">
                          {consultation.coordinator_id}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Room info */}
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
                    <AlertCircle size={20} className="text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        방 정보
                      </p>
                      <p className="text-xs text-gray-600 font-mono mt-1">
                        {consultation.livekit_room_name}
                      </p>
                    </div>
                  </div>

                  {/* Notes */}
                  {consultation.notes && (
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <p className="text-sm font-semibold text-gray-900 mb-2">
                        비고
                      </p>
                      <p className="text-sm text-gray-600">
                        {consultation.notes}
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-4">
                    {consultation.status === "scheduled" && (
                      <>
                        <button
                          onClick={() => handleJoinConsultation(consultation)}
                          className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium flex items-center justify-center gap-2"
                        >
                          <Phone size={16} />
                          상담 시작
                        </button>
                        <button
                          onClick={() => handleReschedule(consultation)}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium flex items-center justify-center gap-2"
                        >
                          <Edit2 size={16} />
                          일정 변경
                        </button>
                        <button
                          onClick={() => handleCancel(consultation.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    {consultation.status === "active" && (
                      <button
                        onClick={() => handleJoinConsultation(consultation)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
                      >
                        <Phone size={16} />
                        상담 재진입
                      </button>
                    )}
                    {consultation.status === "completed" && (
                      <button
                        onClick={() => handleJoinConsultation(consultation)}
                        className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg opacity-75 cursor-not-allowed"
                        disabled
                      >
                        <span>완료됨</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
