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
  Plus,
  Video,
} from "lucide-react";
import { createSupabaseBrowserClient } from "../../../src/lib/supabase/browser";
import { useToast } from "../../../src/components/Toast";
import QRCode from "qrcode";

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
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const handleIssueInvite = async (consultation) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error("인증 오류");
        return;
      }

      const res = await fetch(
        `/api/khidi/consultation/${consultation.id}/invite`,
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
        toast.error(`초대 링크 생성 실패: ${result.error}`);
        return;
      }

      // 클립보드 복사
      try {
        await navigator.clipboard.writeText(result.inviteUrl);
        toast.success(
          `환자 초대 링크가 클립보드에 복사됐습니다 (만료: ${new Date(
            result.expiresAt
          ).toLocaleString("ko-KR")})`
        );
      } catch {
        // 클립보드 권한 없으면 alert 로
        prompt("아래 링크를 복사해 환자에게 공유하세요:", result.inviteUrl);
      }
    } catch (err) {
      console.error("[handleIssueInvite] error:", err);
      toast.error("초대 링크 생성 실패");
    }
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">원격협진 관리</h1>
          <p className="text-gray-500 mt-2">
            카자흐스탄 환자와 한국 병원 간 WebRTC 화상 상담
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-teal-600 text-white rounded-lg font-semibold shadow-md hover:bg-teal-700 active:scale-[0.98] transition"
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
                  <div className="flex gap-3 pt-4 flex-wrap">
                    {consultation.status === "scheduled" && (
                      <>
                        <button
                          onClick={() => handleJoinConsultation(consultation)}
                          className="flex-1 min-w-[140px] px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium flex items-center justify-center gap-2"
                        >
                          <Phone size={16} />
                          상담 시작
                        </button>
                        <button
                          onClick={() => handleIssueInvite(consultation)}
                          className="flex-1 min-w-[140px] px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition font-medium flex items-center justify-center gap-2"
                        >
                          🔗 환자 초대 링크
                        </button>
                        <button
                          onClick={() => handleReschedule(consultation)}
                          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium flex items-center justify-center gap-2"
                        >
                          <Edit2 size={16} />
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

// ─── 새 상담 예약 모달 ──────────────────────────────────────────
function CreateConsultationModal({ onClose, onSuccess }) {
  const toast = useToast();
  const [form, setForm] = useState(() => {
    // 기본 값: 1시간 후로 예약
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return {
      selected_inquiry_id: "",
      patient_user_id: "",
      doctor_user_id: "",
      coordinator_user_id: "",
      session_type: "pre_consultation",
      scheduled_at: d.toISOString().slice(0, 16),
      patient_language: "ru",
      doctor_language: "ko",
      hospital_id: "",
      partner_doctor_id: "",
      notes: "",
      // 역할별 초대 링크 생성 여부 (multi-party 지원)
      inviteRoles: {
        patient: true,
        doctor: false,
        translator: false,
        coordinator: false,
        observer: false,
      },
      inviteeName: "",
      inviteeEmail: "",
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null); // 생성 후 initiate 결과 (세션 + invite)
  // 병원/의사 옵션 (DB 에서 lazy load)
  const [hospitalOptions, setHospitalOptions] = useState([]);
  const [doctorOptions, setDoctorOptions] = useState([]);
  // 문의(inquiries) 옵션 — 환자를 직접 타이핑하지 않고 실제 문의에서 선택
  const [inquiryOptions, setInquiryOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      try {
        const { data: hospitalsData } = await supabase
          .from("hospitals")
          .select("id, name, address")
          .eq("is_active", true)
          .order("name");
        if (!cancelled && hospitalsData) setHospitalOptions(hospitalsData);
      } catch {
        // silent
      }
      try {
        // 문의는 RLS상 service_role 만 읽기 가능 + 이름 암호화 → 서버 picker API 사용
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const res = await fetch("/api/admin/inquiries/picker", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const result = await res.json();
        if (!cancelled && result.ok) setInquiryOptions(result.inquiries || []);
      } catch {
        // silent
      }
    }
    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  // 문의 선택 시 환자 정보 자동 채움
  function applyInquiry(inquiryId) {
    const inq = inquiryOptions.find((i) => String(i.id) === String(inquiryId));
    if (!inq) {
      setForm((f) => ({ ...f, selected_inquiry_id: "" }));
      return;
    }
    setForm((f) => ({
      ...f,
      selected_inquiry_id: inquiryId,
      inviteeName: inq.name && inq.name !== "(이름 미상)" ? inq.name : f.inviteeName,
      patient_language: inq.preferred_language || f.patient_language,
      inviteRoles: { ...f.inviteRoles, patient: true },
      notes: f.notes || `문의 #${inq.id} · ${inq.nationality || ""} · ${inq.cancer_type || ""}`.trim(),
    }));
  }

  // 병원 변경 시 해당 병원의 의사 목록 로드
  useEffect(() => {
    if (!form.hospital_id) {
      setDoctorOptions([]);
      return;
    }
    let cancelled = false;
    async function loadDoctors() {
      try {
        // partner_doctors 는 branch_id 참조, branches 가 hospital_id 참조
        const { data: branchesData } = await supabase
          .from("partner_branches")
          .select("id")
          .eq("hospital_id", form.hospital_id);
        const branchIds = (branchesData || []).map((b) => b.id);
        if (branchIds.length === 0) {
          if (!cancelled) setDoctorOptions([]);
          return;
        }
        const { data: doctorsData } = await supabase
          .from("partner_doctors")
          .select("id, name_ko, name_en, position_ko, subspecialty")
          .eq("is_active", true)
          .in("branch_id", branchIds)
          .order("display_order", { ascending: true, nullsFirst: false });
        if (!cancelled && doctorsData) setDoctorOptions(doctorsData);
      } catch {
        // silent
      }
    }
    loadDoctors();
    return () => {
      cancelled = true;
    };
  }, [form.hospital_id]);

  async function handleSubmit(e) {
    e.preventDefault();

    // 환자 계정 or 최소 1개 역할 초대 필수
    const hasAnyInvite = Object.values(form.inviteRoles).some((v) => v);
    if (!form.patient_user_id && !hasAnyInvite) {
      toast.error("환자 계정 ID 또는 초대 링크 역할 중 하나는 필요합니다");
      return;
    }

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error("인증 오류 — 다시 로그인하세요");
        return;
      }

      // 1. 세션 생성
      // 게스트 전용이면 서버는 patient_user_id 필수로 요구할 수 있으므로
      // admin 본인 ID 를 placeholder 로 세팅 (후속 PATCH 로 환자 확정 가능)
      const payload = {
        ...form,
        patient_user_id: form.patient_user_id || sessionData.session.user.id,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
      };
      // 게스트 관련 필드 / UI 플래그 제거
      delete payload.inviteRoles;
      delete payload.inviteeName;
      delete payload.inviteeEmail;
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "" || payload[k] == null) delete payload[k];
      });

      const res = await fetch("/api/khidi/consultation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        toast.error(`생성 실패: ${result.error || res.statusText}`);
        return;
      }

      const sessionId = result.data?.id;

      // 2. (옵션) 선택된 역할별로 게스트 초대 링크 일괄 발급
      const invites = [];
      if (sessionId) {
        const rolesToInvite = Object.entries(form.inviteRoles)
          .filter(([, enabled]) => enabled)
          .map(([role]) => role);

        for (const role of rolesToInvite) {
          try {
            const inviteRes = await fetch(
              `/api/khidi/consultation/${sessionId}/invite`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  role,
                  inviteeName: role === "patient" ? form.inviteeName || undefined : undefined,
                  inviteeEmail: role === "patient" ? form.inviteeEmail || undefined : undefined,
                  expiresInHours: 72,
                  // 재접속(네트워크 끊김·새로고침)마다 1회 차감되므로 넉넉하게 — API 상한 20
                  maxUses: 20,
                }),
              }
            );
            const inviteResult = await inviteRes.json();
            if (inviteRes.ok && inviteResult.ok) {
              invites.push({
                role,
                url: inviteResult.inviteUrl,
                expiresAt: inviteResult.expiresAt,
              });
            } else {
              console.warn(`[invite:${role}] 실패:`, inviteResult.error);
            }
          } catch (inviteErr) {
            console.error(`[invite:${role}] 예외:`, inviteErr);
          }
        }
      }

      setCreated({
        sessionId,
        invites,
      });
    } catch (err) {
      console.error("[CreateConsultationModal] error:", err);
      toast.error("생성 실패");
    } finally {
      setSubmitting(false);
    }
  }

  // 생성 완료 화면
  if (created) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={() => {
          onSuccess();
        }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center text-2xl">
              ✓
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">상담 예약 생성 완료</h2>
              <p className="text-sm text-gray-500">
                아래 링크를 환자에게 공유하세요.
              </p>
            </div>
          </div>

          {created.invites && created.invites.length > 0 ? (
            <div className="space-y-4">
              {created.invites.map((inv) => (
                <div key={inv.role} className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                  <InviteLinkBlock
                    url={inv.url}
                    expiresAt={inv.expiresAt}
                    toast={toast}
                    label={`${roleLabelKo(inv.role)} 초대 링크`}
                  />
                </div>
              ))}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">📋 전달 시 참고사항</p>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li>각 참여자에게 역할별 링크를 분리해 공유 (링크가 역할을 고정함)</li>
                  <li>환자는 이메일/카카오톡/SMS, 의료진은 내부 메신저 권장</li>
                  <li>링크 유출 방지 — 공용 채팅방에 올리지 않기</li>
                  <li>예정 30분 전 자동 리마인더 발송됨 (환자 이메일 입력 시)</li>
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              초대 링크 생성 대상이 없거나 모두 실패했습니다. 세션은 생성되었으니 목록에서 개별 발급하세요.
            </p>
          )}

          <button
            onClick={onSuccess}
            className="w-full mt-6 px-4 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Video size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">새 원격 상담 예약</h2>
              <p className="text-sm text-gray-500">환자-의사 간 WebRTC 화상 세션 생성</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 게스트 초대 링크 — 역할별 다중 선택 (Multi-party) */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
            <p className="font-semibold text-sm text-gray-900 mb-1">
              🔗 초대 링크 생성 (Zoom 스타일, 계정 불필요)
            </p>
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              참여자 역할별로 초대 링크를 각각 발급합니다. 각 링크는 만료 72시간 +
              접속 횟수 제한 + 고정 역할 부여.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "patient", label: "🧑 환자", desc: "카메라/마이크 송수신" },
                { key: "doctor", label: "👨‍⚕️ 의사", desc: "카메라/마이크 송수신 + 주도권" },
                { key: "translator", label: "🗣 통역사", desc: "음성 송수신" },
                { key: "coordinator", label: "🤝 코디네이터", desc: "참관 + 채팅" },
                { key: "observer", label: "👁 참관자", desc: "시청만 (보호자 등)" },
              ].map((r) => (
                <label
                  key={r.key}
                  className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-white"
                >
                  <input
                    type="checkbox"
                    checked={!!form.inviteRoles[r.key]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        inviteRoles: {
                          ...form.inviteRoles,
                          [r.key]: e.target.checked,
                        },
                      })
                    }
                    className="mt-1 accent-teal-600"
                  />
                  <div className="flex-1 text-xs">
                    <p className="font-semibold text-gray-800">{r.label}</p>
                    <p className="text-gray-500">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* 문의에서 환자 선택 — 직접 타이핑 대신 실제 문의 목록에서 (오타·중복 입력 방지) */}
            <div className="mt-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1">문의에서 환자 선택</label>
              <select
                value={form.selected_inquiry_id}
                onChange={(e) => applyInquiry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">— 문의 목록에서 선택 (이름·언어 자동 입력) —</option>
                {inquiryOptions.map((inq) => (
                  <option key={inq.id} value={inq.id}>
                    #{inq.id} · {inq.name || "(이름 미상)"} · {inq.nationality || "?"} · {inq.cancer_type || "?"} · {inq.status || ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">연락처(이메일/전화)는 보안상 암호화되어 있어 자동 표시되지 않습니다. 초대 링크를 복사해 해당 문의 연락수단으로 전달하세요.</p>
            </div>

            {form.inviteRoles.patient && (
              <div className="mt-3 pt-3 border-t border-teal-200 space-y-2">
                <input
                  type="text"
                  value={form.inviteeName}
                  onChange={(e) => setForm({ ...form, inviteeName: e.target.value })}
                  placeholder="환자 이름 (문의 선택 시 자동) — 예: Айжан Нурланова"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <input
                  type="email"
                  value={form.inviteeEmail}
                  onChange={(e) => setForm({ ...form, inviteeEmail: e.target.value })}
                  placeholder="환자 이메일 (선택) — 자동 발송 시 사용"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}
          </div>

          <UserSearchField
            label="환자 계정 (선택 — 기존 계정)"
            value={form.patient_user_id}
            onSelect={(id) => setForm({ ...form, patient_user_id: id })}
            placeholder="비워두면 게스트 링크 전용"
          />
          <RoleUserSelect
            label="담당 의사 (지정 의사 목록)"
            role="doctor"
            value={form.doctor_user_id}
            onSelect={(id) => setForm({ ...form, doctor_user_id: id })}
          />
          <RoleUserSelect
            label="담당 코디네이터 (지정 코디 목록)"
            role="coordinator"
            value={form.coordinator_user_id}
            onSelect={(id) => setForm({ ...form, coordinator_user_id: id })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Field label="세션 유형">
              <select
                value={form.session_type}
                onChange={(e) => setForm({ ...form, session_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="pre_consultation">진료 전 평가</option>
                <option value="follow_up">추후 진료</option>
                <option value="emergency">긴급 상담</option>
                <option value="diagnostic">검사 결과 검토</option>
              </select>
            </Field>

            <Field label="예약 시각 (KST · 한국 시간 기준)">
              <input
                type="datetime-local"
                required
                value={form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="환자 언어">
              <select
                value={form.patient_language}
                onChange={(e) => setForm({ ...form, patient_language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="ru">러시아어</option>
                <option value="kz">카자흐어</option>
                <option value="en">영어</option>
                <option value="zh">중국어</option>
              </select>
            </Field>
            <Field label="의사 언어">
              <select
                value={form.doctor_language}
                onChange={(e) => setForm({ ...form, doctor_language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="ko">한국어</option>
                <option value="en">영어</option>
              </select>
            </Field>
          </div>

          {/* 병원 / 의사 (브랜딩용) */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-700">
              🏥 병원 / 의사 지정 (선택) — 환자 이메일 & UI 에 표시됨
            </p>
            <Field label="병원">
              <select
                value={form.hospital_id}
                onChange={(e) =>
                  setForm({ ...form, hospital_id: e.target.value, partner_doctor_id: "" })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="">(선택 안함)</option>
                {hospitalOptions.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="담당 의사" hint={form.hospital_id ? "" : "병원 먼저 선택"}>
              <select
                value={form.partner_doctor_id}
                onChange={(e) =>
                  setForm({ ...form, partner_doctor_id: e.target.value })
                }
                disabled={!form.hospital_id || doctorOptions.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">
                  {!form.hospital_id
                    ? "병원 먼저 선택"
                    : doctorOptions.length === 0
                    ? "등록된 의사 없음"
                    : "(선택 안함)"}
                </option>
                {doctorOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name_ko || d.name_en}
                    {d.position_ko ? ` · ${d.position_ko}` : ""}
                    {d.subspecialty ? ` · ${d.subspecialty}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="비고 (선택)">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              placeholder="상담 목적 / 주요 증상 / 사전 확인 필요 사항 등"
            />
          </Field>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? "생성 중…" : "상담 예약 생성"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 사용자 검색 필드 ─────────────────────────────
// 이메일로 auth.users 검색 → 선택 → UUID 자동 입력
// 역할(doctor/coordinator) 회원을 드롭다운으로 — 이메일 검색 대신 지정 명단에서 선택
function RoleUserSelect({ label, role, value, onSelect }) {
  const [options, setOptions] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;
        const res = await fetch(`/api/admin/users/search?role=${encodeURIComponent(role)}&limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (!cancelled && result.ok) setOptions(result.users || []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [role]);

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        <option value="">
          {loaded && options.length === 0 ? `등록된 ${role === "doctor" ? "의사" : "코디네이터"} 계정 없음 — 회원가입 후 역할 부여 필요` : "— 선택 —"}
        </option>
        {options.map((u) => (
          <option key={u.id} value={u.id}>
            {u.full_name ? `${u.full_name} (${u.email})` : u.email}
          </option>
        ))}
      </select>
    </div>
  );
}

function UserSearchField({ label, value, onSelect, placeholder }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState("");

  // value 가 바깥에서 변경되면 보이는 텍스트도 맞춤
  useEffect(() => {
    if (!value) setSelectedEmail("");
  }, [value]);

  // debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;
        const res = await fetch(
          `/api/admin/users/search?q=${encodeURIComponent(query)}&limit=8`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const result = await res.json();
        if (cancelled) return;
        if (result.ok) setResults(result.users || []);
      } catch (err) {
        console.error("[UserSearchField] error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const handlePick = (user) => {
    onSelect(user.id);
    setSelectedEmail(user.email);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  };

  const handleClear = () => {
    onSelect("");
    setSelectedEmail("");
    setQuery("");
    setResults([]);
  };

  return (
    <Field label={label}>
      <div className="relative">
        {value && selectedEmail ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg">
            <span className="flex-1 text-sm text-teal-900 truncate">
              ✓ {selectedEmail}
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="text-teal-600 hover:text-teal-800 text-sm"
            >
              변경
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              placeholder={placeholder || "이메일로 검색"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {showDropdown && query.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto z-20">
                {loading ? (
                  <div className="px-3 py-3 text-sm text-gray-500">검색 중...</div>
                ) : results.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-gray-500">
                    일치하는 계정 없음
                  </div>
                ) : (
                  results.map((user) => (
                    <button
                      type="button"
                      key={user.id}
                      onMouseDown={() => handlePick(user)}
                      className="w-full text-left px-3 py-2 hover:bg-teal-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-sm text-gray-900 truncate">
                        {user.email}
                      </div>
                      {user.full_name && (
                        <div className="text-xs text-gray-500 truncate">
                          {user.full_name}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Field>
  );
}

function roleLabelKo(role) {
  return (
    {
      patient: "🧑 환자",
      doctor: "👨‍⚕️ 의사",
      translator: "🗣 통역사",
      coordinator: "🤝 코디네이터",
      observer: "👁 참관자",
    }[role] || role
  );
}

// ─── 초대 링크 + QR 코드 블록 ─────────────────────────────
function InviteLinkBlock({ url, expiresAt, toast, label = "환자 초대 링크 (계정 불필요)" }) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!url) return;
    // QR 생성 (512x512, 에러 정정 M 레벨)
    QRCode.toDataURL(url, {
      width: 256,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [url]);

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `healo-consultation-qr-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">{label}</label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={url}
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono text-gray-800"
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(url).then(
                () => toast.success("링크 복사 완료"),
                () => toast.error("복사 실패")
              );
            }}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700"
          >
            복사
          </button>
        </div>
        {expiresAt && (
          <p className="text-xs text-gray-500 mt-2">
            만료: {new Date(expiresAt).toLocaleString("ko-KR")}
          </p>
        )}
      </div>

      {/* QR 코드 — 환자 모바일 스캔용 */}
      {qrDataUrl && (
        <div className="flex items-start gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
          <img
            src={qrDataUrl}
            alt="초대 링크 QR 코드"
            className="w-32 h-32 rounded-lg bg-white p-1 shadow-sm"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800 mb-1">📱 모바일 QR 스캔</p>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              환자가 자기 핸드폰 카메라로 스캔하면 앱 설치 없이 바로 접속. 이메일에 링크
              + QR 둘 다 넣는 걸 권장.
            </p>
            <button
              onClick={handleDownloadQR}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              <span>⬇</span> PNG 다운로드
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        {hint && <span className="text-xs text-gray-500">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
