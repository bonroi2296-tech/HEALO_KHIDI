"use client";

/**
 * 새 원격상담 예약 모달 (공용) — admin·coordinator 둘 다 사용.
 * 단일 SoR: 상담 생성/초대링크 로직을 한 곳에만 둬 화면별 분기를 막는다(POSTMORTEM #28 교훈).
 * 드롭다운(문의/유저 picker)·생성·초대 API는 staff(admin·coordinator) 권한.
 */
import { useState, useEffect } from "react";
import { Video, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import QRCode from "qrcode";

const supabase = createSupabaseBrowserClient();

// ─── 새 상담 예약 모달 ──────────────────────────────────────────
export function CreateConsultationModal({ onClose, onSuccess }) {
  const toast = useToast();
  const [form, setForm] = useState(() => {
    // 기본 값: 1시간 후로 예약
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return {
      selected_inquiry_id: "",
      patient_user_id: "",
      coordinator_user_id: "",
      session_type: "pre_consultation",
      scheduled_at: d.toISOString().slice(0, 16),
      patient_language: "ru",
      doctor_language: "ko",
      hospital_id: "",
      partner_doctor_id: "",
      notes: "",
      // 통합 초대 링크 1개(role=guest) — 환자·의사 등 모두 이 링크로 입장.
      // inviteeName/Email 은 자동 발송용 대표 수신자(보통 환자).
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

  // 문의 선택 시 환자 정보 자동 채움 (이름·언어·메모 즉시 + 이메일은 서버에서 복호화해 보강)
  async function applyInquiry(inquiryId) {
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
      notes: f.notes || `문의 #${inq.id} · ${inq.nationality || ""} · ${inq.cancer_type || ""}`.trim(),
    }));
    // 이메일은 암호화돼 있어 picker 목록엔 없음 → 단건 상세 API로 복호화해 자동 채움(자동 발송용)
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`/api/portal/inbox/${inquiryId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const result = await res.json();
      if (res.ok && result.ok && result.inquiry) {
        const full = [result.inquiry.first_name, result.inquiry.last_name].filter(Boolean).join(" ").trim();
        setForm((f) => ({
          ...f,
          inviteeEmail: result.inquiry.email && result.inquiry.email.includes("@") ? result.inquiry.email : f.inviteeEmail,
          inviteeName: full || f.inviteeName,
        }));
      }
    } catch {
      // silent — 이메일 자동 채움 실패해도 수동 입력 가능
    }
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
        // datetime-local 은 tz 없는 naive 문자열 → KST(+09:00)로 해석해 UTC 저장.
        // (과거엔 브라우저 로컬 tz 로 해석돼, 어드민 PC 가 KST 가 아니면 예약시각·리마인더가 틀어짐)
        scheduled_at: new Date(`${form.scheduled_at}+09:00`).toISOString(),
      };
      // 게스트 관련 필드 / UI 플래그 제거
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

      // 2. 통합 초대 링크(role=guest) 1개 발급 — 환자·의사 등 모든 참여자가 이 링크로 입장.
      //    inviteeName/Email 이 있으면(보통 환자) 자동 발송 + 리마인더에 사용.
      const invites = [];
      if (sessionId) {
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
                role: "guest",
                inviteeName: form.inviteeName || undefined,
                inviteeEmail: form.inviteeEmail || undefined,
                expiresInHours: 72,
                // 재접속(끊김·새로고침)·여러 참여자 공용이라 넉넉하게 — API 상한 20
                maxUses: 20,
              }),
            }
          );
          const inviteResult = await inviteRes.json();
          if (inviteRes.ok && inviteResult.ok) {
            invites.push({
              role: "guest",
              url: inviteResult.inviteUrl,
              expiresAt: inviteResult.expiresAt,
            });
          } else {
            console.warn("[invite:guest] 실패:", inviteResult.error);
          }
        } catch (inviteErr) {
          console.error("[invite:guest] 예외:", inviteErr);
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
                아래 참여 링크를 모든 참여자에게 공유하세요.
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
                  <li>이 링크 <b>하나</b>를 환자·의사·통역 등 모든 참여자에게 공유 (각자 이름 입력 후 입장)</li>
                  <li>환자는 이메일/카카오톡/SMS, 의료진은 내부 메신저 권장</li>
                  <li>링크 유출 방지 — 공개된 곳에 올리지 않기</li>
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
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
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
          {/* 통합 초대 링크 — 1개로 모두 입장 */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
            <p className="font-semibold text-sm text-gray-900 mb-1">
              🔗 참여 링크 (계정 불필요)
            </p>
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              상담을 만들면 <b>참여 링크 1개</b>가 생성됩니다. 환자·의사·통역 등 모든 참여자에게
              이 링크 하나만 공유하세요. 각자 이름을 입력하고 입장합니다 (만료 72시간).
            </p>

            {/* 문의에서 환자 선택 — 직접 타이핑 대신 실제 문의 목록에서 (오타·중복 입력 방지) */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">문의에서 환자 선택 (선택)</label>
              <select
                value={form.selected_inquiry_id}
                onChange={(e) => applyInquiry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">— 문의 목록에서 선택 (이름·이메일·언어 자동 입력) —</option>
                {inquiryOptions.map((inq) => (
                  <option key={inq.id} value={inq.id}>
                    #{inq.id} · {inq.name || "(이름 미상)"} · {inq.nationality || "?"} · {inq.cancer_type || "?"} · {inq.status || ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">문의를 고르면 환자 이름·이메일이 자동 입력됩니다(자동 발송용). 이메일이 없으면 링크를 복사해 직접 전달하세요.</p>
            </div>

            <div className="mt-3 pt-3 border-t border-teal-200 space-y-2">
              <input
                type="text"
                value={form.inviteeName}
                onChange={(e) => setForm({ ...form, inviteeName: e.target.value })}
                placeholder="대표 수신자(환자) 이름 — 문의 선택 시 자동"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <input
                type="email"
                value={form.inviteeEmail}
                onChange={(e) => setForm({ ...form, inviteeEmail: e.target.value })}
                placeholder="대표 수신자(환자) 이메일 (선택) — 입력 시 자동 발송·리마인더"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <UserSearchField
            label="환자 계정 (선택 — 기존 계정)"
            value={form.patient_user_id}
            onSelect={(id) => setForm({ ...form, patient_user_id: id })}
            placeholder="비워두면 게스트 링크 전용"
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
              className="flex-1 px-4 py-3 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800 disabled:opacity-60"
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
              className="text-teal-700 hover:text-teal-800 text-sm"
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
      guest: "🔗 참여",
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
            className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800"
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
