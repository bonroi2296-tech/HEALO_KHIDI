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
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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
            <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
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
          <Row icon={Phone} label="연락처(ID)" value={inquiry.contact_id} />
          <Row icon={Mail} label="이메일" value={inquiry.email} />
          <Row icon={Phone} label="전화" value={inquiry.phone} />
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
        {inquiry.message ? (
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{inquiry.message}</p>
        ) : (
          <p className="text-sm text-gray-400">남긴 메시지가 없습니다.</p>
        )}
      </Card>

      {/* 추가 인테이크 정보 */}
      {intakeEntries.length > 0 && (
        <Card title="추가 정보 (인테이크)">
          <div className="grid gap-x-6 sm:grid-cols-2">
            {intakeEntries.map(([k, v]) => (
              <div key={k} className="flex gap-2 py-1.5 border-b border-gray-50 text-sm">
                <span className="text-gray-500 shrink-0">{k}</span>
                <span className="text-gray-900 break-words">{String(v)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 접수/타임라인 */}
      <Card title="진행 상태">
        <Row icon={FileText} label="접수 경로" value={inquiry.source} />
        <Row icon={Calendar} label="접수일" value={fmtDate(inquiry.created_at)} />
        <Row icon={Calendar} label="Step 1 완료" value={fmtDate(inquiry.step1_completed_at)} />
        <Row icon={Calendar} label="Step 2 완료" value={fmtDate(inquiry.step2_completed_at)} />
      </Card>

      {/* 다음 단계 (기존 코디 화면으로 연결) */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/coordinator/consultations"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          <Video size={16} /> 상담 일정 잡기
        </Link>
        <Link
          href="/coordinator/cases"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition"
        >
          <ClipboardList size={16} /> 케이스/병원 배정
        </Link>
      </div>
    </div>
  );
}
