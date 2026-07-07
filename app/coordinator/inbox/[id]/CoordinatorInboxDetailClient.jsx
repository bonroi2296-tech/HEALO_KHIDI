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
  Send, Copy, Check, ExternalLink, Download,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { CASE_STATUS_STEPS } from "@/lib/khidi/caseStatus";

const CANCER_LABELS = {
  stomach: "위암", liver: "간암", lung: "폐암",
  breast: "유방암", thyroid: "갑상선암", colorectal: "대장암",
  pancreatic: "췌장암", other: "기타",
};

const NATIONALITY_LABELS = {
  KZ: "카자흐스탄", RU: "러시아", UZ: "우즈베키스탄",
  KG: "키르기스스탄", MN: "몽골", CN: "중국",
  JP: "일본", KR: "한국", OTHER: "기타",
};

const STATUS_COLORS = {
  received: "bg-yellow-100 text-yellow-700",
  reviewing: "bg-blue-100 text-blue-700",
  matched: "bg-teal-100 text-teal-700",
  completed: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
};

// 암 인테이크(Step2) 코드값 → 코디용 한글 라벨. 폼(IntakeClient)의 value 와 1:1.
const CI = {
  diagnosis_timing: { label: "진단 시기", map: { lt1m: "최근 1개월", "1to6m": "1~6개월", "6mto1y": "6개월~1년", gt1y: "1년 이상", unknown: "모름" } },
  stage: { label: "병기", map: { "1": "1기", "2": "2기", "3": "3기", "4": "4기", unknown: "모름" } },
  current_status: { label: "현재 치료 상태", map: { diagnosed: "진단만 받음", surgery_done: "수술 받음", chemo: "항암치료 중", radiation: "방사선치료 중", completed: "치료 완료", recurrence: "재발·전이" } },
  entry_timing: { label: "입국 희망 시기", map: { lt1m: "1개월 내", "1to3m": "1~3개월", gt3m: "3개월 이후", undecided: "미정" } },
};
const CI_MULTI = {
  treatments_received: { label: "받은 치료", map: { surgery: "수술", chemo: "항암", radiation: "방사선", immuno: "면역", oriental: "한방", none: "없음" } },
  documents: { label: "보유 서류", map: { pathology: "병리결과", imaging: "영상(CT·MRI·PET)", records: "진료기록" } },
};

function fmtDate(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("ko-KR");
  } catch {
    return String(v);
  }
}

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
      if (!session) { setReqError("로그인이 필요합니다."); setReqLoading(false); return; }

      const res = await fetch(`/api/coordinator/inquiries/${inquiryId}/request-info`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.ok) throw new Error(result.error || "request_failed");
      setReqResult(result);
    } catch (e) {
      console.error("[request-info] error:", e);
      setReqError("요청 발송 중 문제가 발생했습니다.");
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
      if (!session) { setError("로그인이 필요합니다."); setLoading(false); return; }

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
      setError("조회 중 문제가 발생했습니다.");
    }
    setLoading(false);
  }

  const backLink = (
    <Link
      href="/coordinator/inbox"
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-700 transition"
    >
      <ArrowLeft size={16} /> 인박스로
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
          <p className="text-gray-600 font-medium">문의를 찾을 수 없습니다.</p>
          <p className="text-gray-400 text-sm mt-1">삭제되었거나 잘못된 주소예요.</p>
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
          <p className="text-red-600">{error || "문의를 불러오지 못했습니다."}</p>
          <button
            onClick={load}
            className="mt-3 px-4 py-2 text-sm bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const fullName =
    [inquiry.first_name, inquiry.last_name].filter(Boolean).join(" ").trim() || "(이름 미상)";
  const step2Done = !!inquiry.step2_completed_at;
  const cancer =
    CANCER_LABELS[inquiry.cancer_type] || inquiry.cancer_type || inquiry.treatment_type || "—";
  const nationality =
    NATIONALITY_LABELS[inquiry.nationality] || inquiry.nationality || "—";

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
                  🏢 에이전시 의뢰{inquiry.agency_name ? ` · ${inquiry.agency_name}` : ""}
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-700">
                  🙋 환자 직접
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">문의 #{inquiry.id} · 접수 {fmtDate(inquiry.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
              step2Done ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700"
            }`}
          >
            {step2Done ? "Step 1+2 완료" : "Step 1만 (추가 정보 필요)"}
          </span>
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
              STATUS_COLORS[inquiry.status] || "bg-gray-100 text-gray-600"
            }`}
          >
            {inquiry.status || "received"}
          </span>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* 연락 정보 */}
        <Card title="연락 정보">
          <Row icon={MessageCircle} label="연락 방법" value={inquiry.contact_method} />
          <Row icon={Phone} label="연락처(ID)" value={safe(inquiry.contact_id)} />
          <Row icon={Mail} label="이메일" value={safe(inquiry.email)} />
          <Row icon={Phone} label="전화" value={safe(inquiry.phone)} />
        </Card>

        {/* 의료 / 여정 정보 */}
        <Card title="의료 · 여정 정보">
          <Row icon={Globe} label="국적" value={nationality} />
          <Row icon={Stethoscope} label="암종" value={cancer} />
          <Row
            icon={Calendar}
            label="희망일"
            value={
              inquiry.preferred_date
                ? `${new Date(inquiry.preferred_date).toLocaleDateString("ko-KR")}${inquiry.preferred_date_flex ? " (조율 가능)" : ""}`
                : "—"
            }
          />
          <Row
            icon={Globe}
            label="언어"
            value={inquiry.preferred_language || inquiry.spoken_language}
          />
          <Row icon={ClipboardList} label="매칭 정확도" value={`${inquiry.match_accuracy ?? 60}%`} />
        </Card>
      </div>

      {/* 문의 메시지 */}
      <Card title="문의 메시지">
        {inquiry.message && !looksEncrypted(inquiry.message) ? (
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{inquiry.message}</p>
        ) : (
          <p className="text-sm text-gray-400">남긴 메시지가 없습니다.</p>
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
          <Card title="추가 정보 (인테이크)">
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
                <span className="text-xs text-gray-500">메모</span>
                <p className="text-sm text-gray-900 whitespace-pre-wrap mt-1">{notes}</p>
              </div>
            )}
          </Card>
        );
      })()}

      {/* 첨부 서류 — 에이전시/환자가 올린 의료서류(병리·영상·진료기록). staff 서명URL로 열람. */}
      {Array.isArray(inquiry.attachments) && inquiry.attachments.length > 0 && (
        <Card title={`첨부 서류 (${inquiry.attachments.length})`}>
          <div className="space-y-2">
            {inquiry.attachments.map((a, i) => {
              const path = typeof a === "string" ? a : a?.path;
              const name = (typeof a === "object" && a?.name) || (path ? path.split("/").pop() : `첨부 ${i + 1}`);
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
      <Card title="진행 단계 (설정하면 환자·에이전시에게 표시)">
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
                {s.order}. {s.ko}
              </button>
            ))}
          </div>
          <textarea
            value={caseNote}
            onChange={(e) => setCaseNote(e.target.value)}
            rows={2}
            placeholder='환자·에이전시에게 표시될 메모 (예: "병원 검토 중, 3일 내 회신")'
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={saveCase}
              disabled={caseSaving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition disabled:opacity-50"
            >
              {caseSaving ? "저장 중…" : "진행 단계 저장"}
            </button>
            {caseSaved && <span className="text-sm text-teal-600 inline-flex items-center gap-1"><Check size={15} /> 저장됨</span>}
          </div>
        </div>
      </Card>

      {/* 접수 정보 (타임라인) */}
      <Card title="접수 정보">
        <Row icon={FileText} label="접수 경로" value={inquiry.agency_id ? `에이전시 의뢰${inquiry.agency_name ? ` (${inquiry.agency_name})` : ""}` : (inquiry.source || "환자 직접 접수")} />
        <Row icon={Calendar} label="접수일" value={fmtDate(inquiry.created_at)} />
        <Row icon={Calendar} label="Step 1 완료" value={fmtDate(inquiry.step1_completed_at)} />
        <Row icon={Calendar} label="Step 2 완료" value={fmtDate(inquiry.step2_completed_at)} />
      </Card>

      {/* 추가 정보 요청 — 환자에게 Step2 상세폼 링크 발송(이메일) + 코디용 복사/왓츠앱 */}
      {!step2Done && (
        <Card title="추가 정보 요청">
          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
            환자에게 상세 정보(진단·치료 단계·희망 일정 등) 입력 링크를 보냅니다.
            환자는 <b>회원가입·앱 설치 없이</b> 링크로 바로 작성하고, 완료되면 이 문의에 자동 반영됩니다.
          </p>

          {!reqResult ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={requestInfo}
                disabled={reqLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
              >
                <Send size={16} /> {reqLoading ? "발송 중…" : "추가 정보 요청"}
              </button>
              {inquiry.info_requested_at && (
                <span className="text-xs text-gray-400">
                  마지막 요청: {fmtDate(inquiry.info_requested_at)}
                </span>
              )}
              {reqError && <span className="text-sm text-red-600">{reqError}</span>}
            </div>
          ) : (
            <div className="space-y-3">
              <p className={`text-sm font-medium flex items-center gap-1.5 ${reqResult.emailSent ? "text-teal-700" : "text-amber-700"}`}>
                <Check size={16} />
                {reqResult.emailSent
                  ? `이메일 발송 완료 (${reqResult.email})`
                  : reqResult.email
                    ? `메일 자동발송은 안 됐어요 (${reqResult.email}) — 아래 링크를 직접 보내세요.`
                    : "이메일 주소가 없어요 — 아래 링크를 직접 보내세요."}
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
                  {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "복사됨" : "복사"}
                </button>
              </div>

              {/* 환자가 쓴 채널(왓츠앱 등)로 바로 보내기 */}
              {(() => {
                const msg = `healwith: 치료 안내를 위해 추가 정보를 입력해 주세요 / Please share a few more details: ${reqResult.link}`;
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
                    <ExternalLink size={15} /> 왓츠앱으로 보내기
                  </a>
                );
              })()}
            </div>
          )}
        </Card>
      )}

      {/* 다음 단계 — 병원 검토 후 화상 상담 (흐름상 진행 단계·추가정보 다음). */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-400 mb-2">병원 치료가능 검토가 끝나면 환자와 화상 상담을 잡습니다.</p>
        <Link
          href="/coordinator/consultations"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          <Video size={16} /> 상담 일정 잡기
        </Link>
      </div>
    </div>
  );
}
