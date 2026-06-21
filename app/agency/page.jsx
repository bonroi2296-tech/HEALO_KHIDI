"use client";

/**
 * 에이전시 포털 — 의뢰한 환자들의 진행 상황을 확인.
 * 카자흐 현지 에이전시 요구: 병원 응답이 느려도 "지금 어느 단계인지" 가시화.
 */

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

const EMPTY_FORM = {
  firstName: "", lastName: "", nationality: "", treatmentType: "",
  contactMethod: "whatsapp", contactId: "", email: "", message: "",
};

export default function AgencyPortal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  // 환자 의뢰하기 폼
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);

  const load = async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) { setError("login"); setLoading(false); return; }
      const res = await fetch("/api/agency/inquiries", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.status === 403) { setError("forbidden"); setLoading(false); return; }
      const json = await res.json();
      if (!json.ok) { setError(json.error ?? "오류"); setLoading(false); return; }
      setData(json); setError(null);
    } catch { setError("서버 연결 실패"); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submitReferral = async (e) => {
    e.preventDefault();
    setSubmitMsg(null);
    if (!form.treatmentType.trim()) { setSubmitMsg({ type: "err", text: "암종/치료 종류를 입력하세요." }); return; }
    if (!form.email.trim() && !form.contactId.trim()) {
      setSubmitMsg({ type: "err", text: "이메일 또는 메신저 연락처 중 하나는 필수입니다." }); return;
    }
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      const res = await fetch("/api/agency/refer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.ok) {
        setSubmitMsg({ type: "ok", text: "의뢰가 접수되었습니다. 목록에 추가됩니다." });
        setForm(EMPTY_FORM);
        setShowForm(false);
        await load();
      } else {
        const map = {
          missing_contact: "이메일 또는 메신저 연락처를 입력하세요.",
          invalid_email: "이메일 형식이 올바르지 않습니다.",
          unauthorized: "권한이 없습니다. 다시 로그인해 주세요.",
        };
        setSubmitMsg({ type: "err", text: map[json.error] || "접수 실패. 다시 시도해 주세요." });
      }
    } catch {
      setSubmitMsg({ type: "err", text: "서버 연결 실패." });
    } finally { setSubmitting(false); }
  };

  if (loading) return <Center>불러오는 중…</Center>;
  if (error === "login") return <Center>로그인이 필요합니다. <a className="text-teal-700 underline ml-1" href="/login">로그인</a></Center>;
  if (error === "forbidden") return <Center>파트너 포털 권한이 없는 계정입니다. 관리자에게 문의하세요.</Center>;
  if (error) return <Center className="text-red-500">{error}</Center>;

  const steps = data?.statusSteps?.filter((s) => s.order < 90) ?? [];
  const orderOf = (k) => data?.statusSteps?.find((s) => s.key === k)?.order ?? 0;
  const isClinic = data?.agency?.partnerType === "medical_institution";
  const partnerKind = isClinic ? "해외 의료기관" : "해외 에이전시";

  return (
    <div className="max-w-3xl mx-auto px-4 pt-20 md:pt-24 pb-10">
      <div className="mb-6">
        <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2 ${isClinic ? "bg-indigo-50 text-indigo-700" : "bg-teal-50 text-teal-700"}`}>{partnerKind}</span>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{data?.agency?.name} · 환자 진행 현황</h1>
            <p className="text-sm text-gray-500 mt-1">의뢰하신 환자들의 현재 진행 단계입니다. 단계를 누르면 상세 이력이 보입니다.</p>
          </div>
          <button
            onClick={() => { setShowForm((v) => !v); setSubmitMsg(null); }}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold hover:bg-teal-800 transition"
          >
            {showForm ? "닫기" : "+ 환자 의뢰하기"}
          </button>
        </div>
      </div>

      {submitMsg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${submitMsg.type === "ok" ? "bg-teal-50 text-teal-800 border border-teal-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {submitMsg.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={submitReferral} className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 space-y-3">
          <h2 className="text-sm font-bold text-gray-800">환자 의뢰 접수</h2>
          <p className="text-xs text-gray-400 -mt-1">의뢰하면 우리 팀(코디네이터)에게 바로 전달되고, 아래 목록에서 진행 단계를 추적할 수 있습니다.</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="환자 이름(First name)"
              value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="환자 성(Last name)"
              value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="국적 (예: Kazakhstan)"
              value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="암종/치료 종류 (필수)"
              value={form.treatmentType} onChange={(e) => setForm({ ...form, treatmentType: e.target.value })} />
          </div>

          <div className="pt-1">
            <p className="text-xs font-semibold text-gray-500 mb-1.5">연락처 (이메일 또는 메신저 중 하나 필수)</p>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2" placeholder="이메일 (선택)"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div className="flex gap-2">
              <select className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white shrink-0"
                value={form.contactMethod} onChange={(e) => setForm({ ...form, contactMethod: e.target.value })}>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="wechat">WeChat</option>
                <option value="line">LINE</option>
                <option value="phone">전화</option>
              </select>
              <input className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="메신저 아이디/번호 (선택)"
                value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })} />
            </div>
          </div>

          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={2} placeholder="메모 (증상·진단 요약 등, 선택)"
            value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setShowForm(false); setSubmitMsg(null); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">취소</button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2 rounded-lg text-sm font-bold bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40">
              {submitting ? "접수 중…" : "의뢰 접수"}
            </button>
          </div>
        </form>
      )}

      {(data?.cases ?? []).length === 0 ? (
        <p className="text-sm text-gray-400">표시할 환자가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {data.cases.map((c) => {
            const curOrder = orderOf(c.case_status);
            return (
              <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                <button onClick={() => setOpenId(openId === c.id ? null : c.id)} className="w-full text-left">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-sm font-semibold text-gray-800">
                      {c.name} · {c.nationality} · {c.cancer_type}
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${c.case_status ? "bg-teal-50 text-teal-700" : "bg-gray-100 text-gray-400"}`}>
                      {c.case_status_label}
                    </span>
                  </div>
                  {/* 단계 진행 바 */}
                  <div className="flex items-center gap-1">
                    {steps.map((s) => (
                      <div key={s.key} className="flex-1 h-1.5 rounded-full"
                        style={{ background: s.order <= curOrder ? "#14b8a6" : "#e5e7eb" }} title={s.ko} />
                    ))}
                  </div>
                  {c.case_status_note && (
                    <p className="text-xs text-gray-500 mt-2">📌 {c.case_status_note}</p>
                  )}
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    {c.insurance_status && <span>보험: {c.insurance_status}</span>}
                    {c.case_status_updated_at && <span>업데이트 {new Date(c.case_status_updated_at).toLocaleDateString("ko-KR")}</span>}
                  </div>
                </button>

                {openId === c.id && c.timeline.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                    {c.timeline.map((t, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <span className="text-gray-400 text-xs w-20 shrink-0">{new Date(t.at).toLocaleDateString("ko-KR")}</span>
                        <span className="text-gray-700">
                          <b>{t.status_label}</b>{t.note ? ` — ${t.note}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {openId === c.id && c.timeline.length === 0 && (
                  <p className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">아직 기록된 진행 이력이 없습니다.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Center({ children, className = "" }) {
  return <div className={`max-w-3xl mx-auto px-4 py-24 text-center text-gray-500 ${className}`}>{children}</div>;
}
