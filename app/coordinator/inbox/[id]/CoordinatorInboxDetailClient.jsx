"use client";

/**
 * 코디네이터 인박스 — 문의 상세
 * 목록(/coordinator/inbox)에서 행 클릭 시 진입. inquiries 단건 상세를
 * /api/portal/inbox/[id] (staff 전용·서버 복호화)로 불러와 표시.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, User, Globe, Mail, Phone, MessageCircle, Calendar,
  AlertCircle, FileText, Stethoscope, ClipboardList, Video,
  Send, Copy, Check, ExternalLink,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { CASE_STATUS_STEPS, caseStatusLabelL } from "@/lib/khidi/caseStatus";
import { cancerTypeLabelL } from "@/lib/khidi/medicalLabels";
import { nationalityLabelL } from "@/lib/khidi/nationality";
import { useCoordinatorL, useDateLocale, coordinatorL } from "@/lib/i18n/coordinator";
import { useLang } from "@/lib/i18n/LangContext";

const STATUS_COLORS = {
  received: "bg-yellow-100 text-yellow-700",
  reviewing: "bg-blue-100 text-blue-700",
  matched: "bg-teal-100 text-teal-700",
  completed: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
};

// 암 인테이크(Step2) 코드값 → L 라벨키. 폼(IntakeClient)의 value 와 1:1.
// label/값 모두 L.<키> 로 해석(컴포넌트 안에서 현재 언어로 매핑).
const CI_DEF = {
  diagnosis_timing: { label: "ibFieldDiagnosisTiming", map: { lt1m: "ibDiagLt1m", "1to6m": "ibDiag1to6m", "6mto1y": "ibDiag6mto1y", gt1y: "ibDiagGt1y", unknown: "ibUnknown" } },
  stage: { label: "fieldStage", map: { "1": "ibStage1", "2": "ibStage2", "3": "ibStage3", "4": "ibStage4", unknown: "ibUnknown" } },
  current_status: { label: "ibFieldCurrentStatus", map: { diagnosed: "ibStatDiagnosed", surgery_done: "ibStatSurgeryDone", chemo: "ibStatChemo", radiation: "ibStatRadiation", completed: "ibStatCompleted", recurrence: "ibStatRecurrence" } },
  entry_timing: { label: "ibFieldEntryTiming", map: { lt1m: "ibEntryLt1m", "1to3m": "ibEntry1to3m", gt3m: "ibEntryGt3m", undecided: "ibEntryUndecided" } },
};
const CI_MULTI_DEF = {
  treatments_received: { label: "ibFieldTreatmentsReceived", map: { surgery: "ibTxSurgery", chemo: "ibTxChemo", radiation: "ibTxRadiation", immuno: "ibTxImmuno", oriental: "ibTxOriental", none: "ibTxNone" } },
  documents: { label: "ibFieldDocuments", map: { pathology: "ibDocPathology", imaging: "ibDocImaging", records: "ibDocRecords" } },
};

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <div className="w-6 shrink-0 text-gray-400 pt-0.5">
        <Icon size={16} />
      </div>
      <div className="w-28 shrink-0 text-sm text-gray-500">{label}</div>
      <div className="flex-1 text-sm text-gray-900 break-words">{value || "—"}</div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">{title}</h2>
      {children}
    </div>
  );
}

export default function CoordinatorInboxDetailClient({ inquiryId }) {
  const L = useCoordinatorL();
  const lang = useLang();
  const dateLoc = useDateLocale();

  // inquiries.status enum → 언어별 라벨. (목록 페이지와 동일. pending 은 접수됨과 같은 대기.)
  const STATUS_LABELS = {
    received: L.invStatusReceived, reviewing: L.invStatusReviewing,
    matched: L.invStatusMatched, completed: L.invStatusCompleted,
    pending: L.invStatusReceived,
  };

  // 날짜/시간 — 앱 언어 로케일로(ko-KR 하드코딩 방지).
  const fmtDate = (v) => {
    if (!v) return "—";
    try {
      return new Date(v).toLocaleString(dateLoc);
    } catch {
      return String(v);
    }
  };

  // 인테이크 코드값 정의 → 현재 언어 라벨로 해석.
  const CI = Object.fromEntries(
    Object.entries(CI_DEF).map(([field, def]) => [
      field,
      { label: L[def.label], map: Object.fromEntries(Object.entries(def.map).map(([k, v]) => [k, L[v]])) },
    ])
  );
  const CI_MULTI = Object.fromEntries(
    Object.entries(CI_MULTI_DEF).map(([field, def]) => [
      field,
      { label: L[def.label], map: Object.fromEntries(Object.entries(def.map).map(([k, v]) => [k, L[v]])) },
    ])
  );

  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqResult, setReqResult] = useState(null); // { link, emailSent, email, lang }
  const [reqError, setReqError] = useState(null);
  const [copied, setCopied] = useState(false);

  // 케이스 진행 단계(코디가 설정 → 환자·에이전시가 같은 상태를 봄). 인라인 편집.
  const [caseStatus, setCaseStatus] = useState("");
  const [caseNote, setCaseNote] = useState("");
  const [caseSaving, setCaseSaving] = useState(false);
  const [caseSaved, setCaseSaved] = useState(false);

  // 코디 → 환자 '추가 정보 요청': Step2 폼 링크 발송(이메일) + 코디용 복사/왓츠앱 링크 반환.
  async function requestInfo() {
    setReqLoading(true);
    setReqError(null);
    setReqResult(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setReqError(L.ibLoginRequired); setReqLoading(false); return; }

      const res = await fetch(`/api/coordinator/inquiries/${inquiryId}/request-info`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.ok) throw new Error(result.error || "request_failed");
      setReqResult(result);
    } catch (e) {
      console.error("[request-info] error:", e);
      setReqError(L.ibReqSendError);
    }
    setReqLoading(false);
  }

  async function copyLink() {
    if (!reqResult?.link) return;
    try {
      await navigator.clipboard.writeText(reqResult.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard 미지원 시 무시 */ }
  }

  // 첨부 열람: storage 경로 → 서명URL(5분) 발급 후 새 탭. staff 권한으로 /api/attachments/sign.
  const [attLoadingPath, setAttLoadingPath] = useState(null);
  async function viewAttachment(path) {
    if (!path) return;
    setAttLoadingPath(path);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const cleanPath = path.startsWith("/") ? path.slice(1) : path;
      const res = await fetch("/api/attachments/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ path: cleanPath }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    } catch (e) {
      console.error("[attachment] sign error:", e);
    }
    setAttLoadingPath(null);
  }

  // 케이스 진행 단계 저장 (코디·어드민 공용 API 재사용). 환자/에이전시 포털에 같은 상태가 노출됨.
  async function saveCase() {
    setCaseSaving(true);
    setCaseSaved(false);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setCaseSaving(false); return; }
      const res = await fetch("/api/admin/khidi/cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          inquiry_id: Number(inquiryId),
          case_status: caseStatus || null,
          case_status_note: caseNote || null,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok && result.ok) {
        setCaseSaved(true);
        setInquiry((prev) => prev ? { ...prev, case_status: caseStatus, case_status_note: caseNote } : prev);
        setTimeout(() => setCaseSaved(false), 2000);
      }
    } catch (e) {
      console.error("[case] save error:", e);
    }
    setCaseSaving(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError(L.ibLoginRequired); setLoading(false); return; }

      const res = await fetch(`/api/portal/inbox/${inquiryId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json();
      if (res.status === 404) { setError("not_found"); setLoading(false); return; }
      if (!res.ok || !result.ok) throw new Error(result.error || "fetch_failed");
      setInquiry(result.inquiry);
      setCaseStatus(result.inquiry?.case_status || "");
      setCaseNote(result.inquiry?.case_status_note || "");
    } catch (e) {
      console.error("[inbox/detail] fetch error:", e);
      setError(L.ibLoadError);
    }
    setLoading(false);
  }

  const backLink = (
    <Link
      href="/coordinator/inbox"
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-700 transition"
    >
      <ArrowLeft size={16} /> {L.ibBackToInbox}
    </Link>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error === "not_found") {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">{L.ibNotFoundTitle}</p>
          <p className="text-gray-400 text-sm mt-1">{L.ibNotFoundDesc}</p>
        </div>
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="text-center py-16 bg-red-50 rounded-xl">
          <AlertCircle size={40} className="mx-auto text-red-300 mb-3" />
          <p className="text-red-600">{error || L.ibLoadFailed}</p>
          <button
            onClick={load}
            className="mt-3 px-4 py-2 text-sm bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
          >
            {L.ibRetry}
          </button>
        </div>
      </div>
    );
  }

  const fullName =
    [inquiry.first_name, inquiry.last_name].filter(Boolean).join(" ").trim() || L.ibNameUnknown;
  const step2Done = !!inquiry.step2_completed_at;
  const cancer =
    (inquiry.cancer_type ? cancerTypeLabelL(inquiry.cancer_type, lang) : "") ||
    inquiry.treatment_type || "—";
  const nationality =
    inquiry.nationality ? nationalityLabelL(inquiry.nationality, lang) : "—";

  // intake JSONB 의 추가 정보(있으면 key/value 로 표시).
  // 혹시 복호화 안 된 암호문 문자열({"v":"v1",...})은 화면에 안 띄움.
  const looksEncrypted = (s) =>
    typeof s === "string" && /^\{"(v|iv|tag|data)"\s*:/.test(s.trim());
  // 방어선: 복호화 실패로 암호문이 흘러와도 코디 화면엔 raw JSON 대신 "—".
  const safe = (v) => (looksEncrypted(v) ? "—" : v);
  const intakeEntries =
    inquiry.intake && typeof inquiry.intake === "object" && !Array.isArray(inquiry.intake)
      ? Object.entries(inquiry.intake).filter(
          ([, v]) =>
            v !== null && v !== undefined && v !== "" &&
            typeof v !== "object" && !looksEncrypted(v)
        )
      : [];

  return (
    <div className="space-y-6">
      {backLink}

      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-teal-50 rounded-full flex items-center justify-center shrink-0">
            <User size={20} className="text-teal-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
              {/* 접수 주체 배지: 에이전시 의뢰 vs 환자 직접 — 코디가 한눈에 구분 */}
              {inquiry.agency_id ? (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-violet-100 text-violet-700">
                  🏢 {L.agencyReferral}{inquiry.agency_name ? ` · ${inquiry.agency_name}` : ""}
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-700">
                  🙋 {L.ibPatientDirect}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{L.ibInquiryNo} #{inquiry.id} · {L.ibReceivedLabel} {fmtDate(inquiry.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
              step2Done ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700"
            }`}
          >
            {step2Done ? L.ibStepBothDone : L.ibStepOneNeedInfo}
          </span>
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
              STATUS_COLORS[inquiry.status] || "bg-gray-100 text-gray-600"
            }`}
          >
            {STATUS_LABELS[inquiry.status] || L.invStatusReceived}
          </span>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* 연락 정보 */}
        <Card title={L.ibContactCard}>
          <Row icon={MessageCircle} label={L.contactMethod} value={inquiry.contact_method} />
          <Row icon={Phone} label={L.ibContactId} value={safe(inquiry.contact_id)} />
          <Row icon={Mail} label={L.ibEmail} value={safe(inquiry.email)} />
          <Row icon={Phone} label={L.ibPhone} value={safe(inquiry.phone)} />
        </Card>

        {/* 의료 / 여정 정보 */}
        <Card title={L.ibMedicalCard}>
          <Row icon={Globe} label={L.nationality} value={nationality} />
          <Row icon={Stethoscope} label={L.cancerType} value={cancer} />
          <Row
            icon={Calendar}
            label={L.ibPreferredDate}
            value={
              inquiry.preferred_date
                ? `${new Date(inquiry.preferred_date).toLocaleDateString(dateLoc)}${inquiry.preferred_date_flex ? ` (${L.ibFlexible})` : ""}`
                : "—"
            }
          />
          <Row
            icon={Globe}
            label={L.fieldLanguage}
            value={inquiry.preferred_language || inquiry.spoken_language}
          />
          <Row icon={ClipboardList} label={L.inboxColMatch} value={`${inquiry.match_accuracy ?? 60}%`} />
        </Card>
      </div>

      {/* 문의 메시지 */}
      <Card title={L.ibMessageCard}>
        {inquiry.message && !looksEncrypted(inquiry.message) ? (
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{inquiry.message}</p>
        ) : (
          <p className="text-sm text-gray-400">{L.ibNoMessage}</p>
        )}
      </Card>

      {/* 추가 인테이크 정보 (암 Step2) */}
      {(() => {
        const intake = inquiry.intake && typeof inquiry.intake === "object" ? inquiry.intake : {};
        const cancer = intake.cancer && typeof intake.cancer === "object" ? intake.cancer : null;
        const notes = !looksEncrypted(intake.notes) ? intake.notes : null;
        const rows = [];
        if (cancer) {
          for (const k of Object.keys(CI)) {
            const v = cancer[k];
            if (v) rows.push([CI[k].label, CI[k].map[v] || String(v)]);
          }
          for (const k of Object.keys(CI_MULTI)) {
            const arr = Array.isArray(cancer[k]) ? cancer[k] : null;
            if (arr && arr.length) rows.push([CI_MULTI[k].label, arr.map((x) => CI_MULTI[k].map[x] || x).join(", ")]);
          }
        }
        // 옛 데이터(complaint/history 구조 등) 호환: 위 매핑에 안 잡힌 top-level 스칼라.
        const legacy = intakeEntries.filter(([k]) => k !== "notes" && k !== "cancer");
        if (rows.length === 0 && legacy.length === 0 && !notes) return null;
        return (
          <Card title={L.ibIntakeCard}>
            <div className="grid gap-x-6 sm:grid-cols-2">
              {rows.map(([k, v]) => (
                <div key={k} className="flex gap-2 py-1.5 border-b border-gray-50 text-sm">
                  <span className="text-gray-500 shrink-0">{k}</span>
                  <span className="text-gray-900 break-words">{v}</span>
                </div>
              ))}
              {legacy.map(([k, v]) => (
                <div key={k} className="flex gap-2 py-1.5 border-b border-gray-50 text-sm">
                  <span className="text-gray-500 shrink-0">{k}</span>
                  <span className="text-gray-900 break-words">{String(v)}</span>
                </div>
              ))}
            </div>
            {notes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">{L.notes}</span>
                <p className="text-sm text-gray-900 whitespace-pre-wrap mt-1">{notes}</p>
              </div>
            )}
          </Card>
        );
      })()}

      {/* 첨부 서류 — 에이전시/환자가 올린 의료서류(병리·영상·진료기록). staff 서명URL로 열람. */}
      {Array.isArray(inquiry.attachments) && inquiry.attachments.length > 0 && (
        <Card title={`${L.ibAttachmentsCard} (${inquiry.attachments.length})`}>
          <div className="space-y-2">
            {inquiry.attachments.map((a, i) => {
              const path = typeof a === "string" ? a : a?.path;
              const name = (typeof a === "object" && a?.name) || (path ? path.split("/").pop() : `${L.ibAttachment} ${i + 1}`);
              const cat = typeof a === "object" ? a?.category : null;
              return (
                <button
                  key={path || i}
                  onClick={() => viewAttachment(path)}
                  disabled={!path || attLoadingPath === path}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition text-left disabled:opacity-50"
                >
                  <FileText size={18} className="text-teal-600 shrink-0" />
                  <span className="flex-1 text-sm text-gray-800 truncate">{name}</span>
                  {cat && cat !== "other" && (
                    <span className="text-[11px] text-gray-400 shrink-0">{cat}</span>
                  )}
                  {attLoadingPath === path ? (
                    <span className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <ExternalLink size={14} className="text-gray-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* 진행 단계 — 코디가 설정. 환자·에이전시 포털에 같은 상태가 노출된다(흐름: 접수→사전상담→병원검토→일정조율→비자준비→입국치료→사후관리→완료). */}
      <Card title={L.ibCaseCard}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {CASE_STATUS_STEPS.filter((s) => s.order < 90).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setCaseStatus(s.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  caseStatus === s.key
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-teal-400"
                }`}
              >
                {s.order}. {caseStatusLabelL(s.key, lang)}
              </button>
            ))}
          </div>
          <textarea
            value={caseNote}
            onChange={(e) => setCaseNote(e.target.value)}
            rows={2}
            placeholder={L.ibCaseNotePlaceholder}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={saveCase}
              disabled={caseSaving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition disabled:opacity-50"
            >
              {caseSaving ? L.ibCaseSaving : L.ibCaseSave}
            </button>
            {caseSaved && <span className="text-sm text-teal-600 inline-flex items-center gap-1"><Check size={15} /> {L.ibCaseSaved}</span>}
          </div>
        </div>
      </Card>

      {/* 접수 정보 (타임라인) */}
      <Card title={L.ibIntakeInfoCard}>
        <Row icon={FileText} label={L.ibIntakeChannel} value={inquiry.agency_id ? `${L.agencyReferral}${inquiry.agency_name ? ` (${inquiry.agency_name})` : ""}` : (inquiry.source || L.ibPatientDirectIntake)} />
        <Row icon={Calendar} label={L.receivedDate} value={fmtDate(inquiry.created_at)} />
        <Row icon={Calendar} label={L.ibStep1Done} value={fmtDate(inquiry.step1_completed_at)} />
        <Row icon={Calendar} label={L.ibStep2Done} value={fmtDate(inquiry.step2_completed_at)} />
      </Card>

      {/* 추가 정보 요청 — 환자에게 Step2 상세폼 링크 발송(이메일) + 코디용 복사/왓츠앱 */}
      {!step2Done && (
        <Card title={L.ibReqCard}>
          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
            {L.ibReqDesc1}
            {" "}<b>{L.ibReqDescBold}</b>{L.ibReqDesc2}
          </p>

          {!reqResult ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={requestInfo}
                disabled={reqLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
              >
                <Send size={16} /> {reqLoading ? L.ibReqSending : L.ibReqButton}
              </button>
              {inquiry.info_requested_at && (
                <span className="text-xs text-gray-400">
                  {L.ibReqLast}: {fmtDate(inquiry.info_requested_at)}
                </span>
              )}
              {reqError && <span className="text-sm text-red-600">{reqError}</span>}
            </div>
          ) : (
            <div className="space-y-3">
              <p className={`text-sm font-medium flex items-center gap-1.5 ${reqResult.emailSent ? "text-teal-700" : "text-amber-700"}`}>
                <Check size={16} />
                {reqResult.emailSent
                  ? `${L.ibReqEmailSent} (${reqResult.email})`
                  : reqResult.email
                    ? `${L.ibReqEmailFailed.replace("{email}", reqResult.email)}`
                    : L.ibReqNoEmail}
              </p>

              {/* 코디가 어떤 채널로든 보낼 수 있는 링크 */}
              <div className="flex items-stretch gap-2">
                <input
                  readOnly
                  value={reqResult.link}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                />
                <button
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition shrink-0"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? L.ibCopied : L.ibCopy}
                </button>
              </div>

              {/* 환자가 쓴 채널(왓츠앱 등)로 바로 보내기 */}
              {(() => {
                // 환자에게 가는 문구는 코디 화면 언어가 아니라 '환자 언어'로 — 못 알아보면 무의미하므로.
                const patientLang = inquiry.preferred_language || inquiry.spoken_language || "en";
                const msg = `${coordinatorL(patientLang).ibWaMessage}: ${reqResult.link}`;
                const digits = String(inquiry.contact_id || "").replace(/[^\d]/g, "");
                const isWa = String(inquiry.contact_method || "").toLowerCase().includes("whats");
                const waUrl = `https://wa.me/${isWa && digits.length >= 6 ? digits : ""}?text=${encodeURIComponent(msg)}`;
                return (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#25D366] text-white rounded-lg hover:opacity-90 transition"
                  >
                    <ExternalLink size={15} /> {L.ibWaSend}
                  </a>
                );
              })()}
            </div>
          )}
        </Card>
      )}

      {/* 다음 단계 — 병원 검토 후 화상 상담 (흐름상 진행 단계·추가정보 다음). */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-400 mb-2">{L.ibNextStepDesc}</p>
        <Link
          href="/coordinator/consultations"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          <Video size={16} /> {L.ibScheduleConsult}
        </Link>
      </div>
    </div>
  );
}
