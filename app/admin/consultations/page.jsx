"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Phone,
  X,
  ChevronDown,
  Globe,
  AlertCircle,
  Plus,
  FileText,
  Loader2,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import { CreateConsultationModal } from "@/components/consultation/CreateConsultationModal";

const supabase = createSupabaseBrowserClient();

export default function ConsultationsPage() {
  const router = useRouter();
  const toast = useToast();

  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming"); // upcoming, active, completed, all
  const [expandedId, setExpandedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // AI 회의록 생성 상태: { [consultationId]: { loading, data, error } }
  const [summaryState, setSummaryState] = useState({});

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

  // 상담 링크(초대 토큰 포함) 1개 발급 → API 응답 반환. 링크 하나로 입장 + 환자 공유 통일.
  const issueInvite = async (consultationId) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      toast.error("인증 오류");
      return null;
    }
    try {
      const res = await fetch(
        `/api/khidi/consultation/${consultationId}/invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            role: "patient",
            expiresInHours: 72,
            // 재접속마다 1회 차감 → 끊김 잦은 모바일 환경 고려해 넉넉하게
            maxUses: 20,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok || !result.ok) {
        toast.error(`상담 링크 생성 실패: ${result.error}`);
        return null;
      }
      return result;
    } catch (err) {
      console.error("[issueInvite] error:", err);
      toast.error("상담 링크 생성 실패");
      return null;
    }
  };

  // 상담 시작 = 링크 하나로 통일: 어드민도 이 초대 링크로 입장(로그인돼 있어 자동으로 staff 인식).
  //   주소창에 뜨는 게 곧 환자에게 그대로 보내면 되는 링크 → 편하게 클립보드에도 복사.
  const handleJoinConsultation = async (consultation) => {
    const result = await issueInvite(consultation.id);
    if (!result?.inviteUrl) { router.push(`/consultation/${consultation.id}`); return; }
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      toast.success("상담 링크를 복사했어요 — 환자에게 붙여넣어 보내세요. 나는 지금 입장합니다");
    } catch { /* 클립보드 권한 없으면 조용히 패스 — 입장은 계속 */ }
    router.push(result.inviteUrl.replace(/^https?:\/\/[^/]+/, ""));
  };

  // 링크만 복사(입장 없이 환자에게 먼저 보낼 때) — 위와 같은 종류의 링크.
  const handleIssueInvite = async (consultation) => {
    const result = await issueInvite(consultation.id);
    if (!result?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      toast.success(
        result.emailSent
          ? "상담 링크를 복사했고, 등록된 이메일로도 발송했습니다"
          : `상담 링크가 클립보드에 복사됐습니다 (만료: ${new Date(
              result.expiresAt
            ).toLocaleString("ko-KR")})`
      );
    } catch {
      // 클립보드 권한 없으면 prompt 로
      prompt("아래 링크를 복사해 환자에게 공유하세요:", result.inviteUrl);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm("상담을 취소하시겠습니까? 발송된 환자 초대 링크도 함께 폐기됩니다.")) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error("인증 오류 — 다시 로그인하세요.");
        return;
      }

      // 실제 취소: 상담 상태를 cancelled 로 PATCH (서버가 게스트 초대 토큰도 폐기함).
      // (과거엔 API 호출 없이 토스트만 띄우는 '가짜 성공'이라 실제론 취소 안 됨 — POSTMORTEMS #58)
      const res = await fetch(`/api/khidi/consultation/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        toast.error(`취소 실패: ${result.error || res.statusText}`);
        return;
      }

      toast.success("상담이 취소되었습니다. 초대 링크도 폐기됐습니다.");
      setConsultations((cs) =>
        cs.map((c) => (c.id === id ? { ...c, status: "cancelled" } : c))
      );
    } catch (error) {
      console.error("[ConsultationsPage] handleCancel error:", error);
      toast.error("취소 실패");
    }
  };

  const handleGenerateSummary = async (consultation) => {
    const id = consultation.id;
    setSummaryState((s) => ({ ...s, [id]: { loading: true } }));
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(
        `/api/khidi/consultation/${id}/summarize`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        const msg =
          json.error === "billing_required"
            ? "AI 회의록은 Gemini 유료 설정 후 켜집니다 (현재 비활성)."
            : json.error === "no_transcript"
            ? "번역 기록이 없어 회의록을 만들 수 없어요."
            : json.error === "ai_failed" || json.error === "ai_parse_failed"
            ? "AI 생성에 실패했어요. 잠시 후 다시 시도해 주세요."
            : "회의록 생성 실패";
        setSummaryState((s) => ({ ...s, [id]: { error: msg } }));
        toast.error(msg);
        return;
      }
      setSummaryState((s) => ({ ...s, [id]: { data: json.data } }));
      setConsultations((cs) =>
        cs.map((c) => (c.id === id ? { ...c, ai_summary: json.data } : c))
      );
      toast.success("AI 회의록을 만들었어요.");
    } catch (error) {
      console.error("[ConsultationsPage] handleGenerateSummary error:", error);
      setSummaryState((s) => ({ ...s, [id]: { error: "회의록 생성 실패" } }));
      toast.error("회의록 생성 실패");
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">원격협진 관리</h1>
          <p className="text-gray-500 mt-2">
            카자흐스탄 환자와 한국 병원 간 WebRTC 화상 상담
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-teal-700 text-white rounded-lg font-semibold shadow-md hover:bg-teal-800 active:scale-[0.98] transition"
        >
          <Plus size={18} />
          새 상담 예약
        </button>
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
                ? "border-teal-600 text-teal-700"
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
                        {/* 병원 / 의사 배지 */}
                        {(consultation.hospitals?.name ||
                          consultation.partner_doctors?.name_ko ||
                          consultation.partner_doctors?.name_en) && (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {consultation.hospitals?.name && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-full border border-teal-200">
                                🏥 {consultation.hospitals.name}
                              </span>
                            )}
                            {(consultation.partner_doctors?.name_ko ||
                              consultation.partner_doctors?.name_en) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                                👨‍⚕️ Dr. {consultation.partner_doctors.name_ko || consultation.partner_doctors.name_en}
                                {consultation.partner_doctors.subspecialty && (
                                  <span className="text-amber-600">
                                    · {consultation.partner_doctors.subspecialty}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
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
                      <Stethoscope size={20} className="text-teal-700 mt-1" />
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
                      <User size={20} className="text-teal-700 mt-1" />
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
                  <div className="flex gap-3 pt-4 flex-wrap">
                    {consultation.status === "scheduled" && (
                      <>
                        <button
                          onClick={() => handleJoinConsultation(consultation)}
                          className="flex-1 min-w-[140px] px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition font-medium flex items-center justify-center gap-2"
                        >
                          <Phone size={16} />
                          상담 시작
                        </button>
                        <button
                          onClick={() => handleIssueInvite(consultation)}
                          className="flex-1 min-w-[140px] px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition font-medium flex items-center justify-center gap-2"
                          title="입장 없이 환자에게 보낼 링크만 복사 — 「상담 시작」과 같은 링크"
                        >
                          🔗 환자 링크 복사
                        </button>
                        <button
                          onClick={() => handleCancel(consultation.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium flex items-center gap-1.5"
                          title="상담 취소 (초대 링크도 폐기)"
                        >
                          <X size={16} /> 취소
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
                      <>
                        <span className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium flex items-center">
                          완료됨
                        </span>
                        <button
                          onClick={() => handleGenerateSummary(consultation)}
                          disabled={summaryState[consultation.id]?.loading}
                          className="flex-1 min-w-[160px] px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {summaryState[consultation.id]?.loading ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              회의록 생성 중…
                            </>
                          ) : (
                            <>
                              <FileText size={16} />
                              {consultation.ai_summary
                                ? "AI 회의록 다시 생성"
                                : "AI 회의록 생성"}
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  {/* AI 회의록 결과 */}
                  {(() => {
                    const ai =
                      summaryState[consultation.id]?.data ||
                      consultation.ai_summary;
                    if (!ai) return null;
                    const section = (title, items) =>
                      Array.isArray(items) && items.length > 0 ? (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            {title}
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            {items.map((it, i) => (
                              <li key={i}>{it}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null;
                    return (
                      <div className="p-4 bg-white rounded-lg border border-teal-200">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText size={16} className="text-teal-700" />
                          <p className="text-sm font-semibold text-gray-900">
                            AI 회의록
                          </p>
                          <span className="text-xs text-gray-400">
                            (AI 자동 생성 · 참고용, 의료진 확인 필요)
                          </span>
                        </div>
                        {section("요약", ai.summary)}
                        {section("결정사항", ai.decisions)}
                        {section("다음 단계", ai.next_steps)}
                        {section("환자 우려", ai.patient_concerns)}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 새 상담 예약 모달 */}
      {showCreateModal && (
        <CreateConsultationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchConsultations();
            toast.success("상담 예약이 생성되었습니다");
          }}
        />
      )}
    </div>
  );
}
