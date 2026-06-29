"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";

// 원시 err.message 노출 금지 — 6개어 일반 실패 안내(보안+UX)
const FAIL_MSG = {
  ko: "요청 처리에 실패했습니다. 다시 시도해 주세요.",
  en: "The request failed. Please try again.",
  ru: "Не удалось выполнить запрос. Попробуйте ещё раз.",
  kz: "Сұрауды орындау мүмкін болмады. Қайталап көріңіз.",
  zh: "请求失败，请重试。",
  ja: "リクエストに失敗しました。もう一度お試しください。",
};

const STATUS_LABELS = {
  draft: { ko: "작성 중", color: "bg-gray-100 text-gray-700" },
  documents_pending: { ko: "서류 준비", color: "bg-amber-100 text-amber-800" },
  under_review: { ko: "코디 검수 중", color: "bg-blue-100 text-blue-800" },
  changes_requested: { ko: "수정 필요", color: "bg-orange-100 text-orange-800" },
  invitation_ready: { ko: "초청장 발급 준비", color: "bg-indigo-100 text-indigo-800" },
  invitation_issued: { ko: "초청장 발급 완료", color: "bg-emerald-100 text-emerald-800" },
  submitted_embassy: { ko: "대사관 접수", color: "bg-teal-100 text-teal-800" },
  approved: { ko: "비자 승인", color: "bg-green-100 text-green-800" },
  rejected: { ko: "거절", color: "bg-red-100 text-red-800" },
  cancelled: { ko: "취소", color: "bg-gray-100 text-gray-500" },
};

const REVIEW_LABELS = {
  pending: { ko: "검수 대기", color: "text-amber-700" },
  approved: { ko: "승인", color: "text-emerald-700" },
  rejected: { ko: "반려", color: "text-red-700" },
  needs_revision: { ko: "수정 요청", color: "text-orange-700" },
};

const DOCUMENT_TYPES = [
  { value: "passport", label: "여권 (Passport)" },
  { value: "photo", label: "증명사진 (Photo)" },
  { value: "visa_application_form", label: "비자 신청서 (Visa Application Form)" },
  { value: "medical_certificate", label: "의료 확인서 (Medical Certificate)" },
  { value: "diagnosis_document", label: "진단서 (Diagnosis Document)" },
  { value: "treatment_plan", label: "치료 계획서 (Treatment Plan)" },
  { value: "bank_statement", label: "재정 증명 (Bank Statement)" },
  { value: "hospital_confirmation", label: "병원 확인서 (Hospital Confirmation)" },
  { value: "insurance", label: "보험 증서 (Insurance)" },
  { value: "other", label: "기타 (Other)" },
];

export default function VisaApplicationDetailClient({ applicationId }) {
  const failMsg = FAIL_MSG[useLang()] || FAIL_MSG.en;
  const [application, setApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [_role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invitationUrl, setInvitationUrl] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState("passport");

  useEffect(() => {
    loadAll();
  }, [applicationId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [appRes, docRes] = await Promise.all([
        fetch(`/api/khidi/visa/applications/${applicationId}`, { credentials: "include" }),
        fetch(`/api/khidi/visa/applications/${applicationId}/documents`, { credentials: "include" }),
      ]);
      const appJson = await appRes.json();
      const docJson = await docRes.json();

      if (!appRes.ok || !appJson.ok) {
        throw new Error(appJson.error || "failed_to_load");
      }
      setApplication(appJson.data);
      setRole(appJson.role);
      setDocuments(docJson.data || []);

      // 초청장 발급되어 있으면 signed URL 가져오기
      if (appJson.data.invitation_letter_url) {
        const invRes = await fetch(
          `/api/khidi/visa/applications/${applicationId}/invitation`,
          { credentials: "include" }
        );
        const invJson = await invRes.json();
        if (invJson.ok) {
          setInvitationUrl(invJson.invitation_letter_url);
        }
      }
    } catch (err) {
      console.error("[patient/visa/detail]", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", uploadType);
      formData.append(
        "document_label",
        DOCUMENT_TYPES.find((d) => d.value === uploadType)?.label || uploadType
      );
      const res = await fetch(
        `/api/khidi/visa/applications/${applicationId}/documents`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || json.detail || "upload_failed");
      }
      await loadAll();
      e.target.value = "";
    } catch (err) {
      alert(failMsg);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmitForReview() {
    if (!confirm("코디 검수를 요청하시겠습니까? 이후에는 서류 수정이 제한됩니다.")) return;
    try {
      const res = await fetch(
        `/api/khidi/visa/applications/${applicationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: "under_review" }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || json.detail || "failed");
      }
      await loadAll();
    } catch (err) {
      alert(failMsg);
    }
  }

  async function handleDeleteDoc(docId) {
    if (!confirm("이 서류를 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(
        `/api/khidi/visa/applications/${applicationId}/documents/${docId}`,
        { method: "DELETE", credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "delete_failed");
      await loadAll();
    } catch (err) {
      alert(failMsg);
    }
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-10"><p className="text-gray-500 text-sm">불러오는 중...</p></div>;
  }
  if (error || !application) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-red-600 text-sm">{failMsg}</p>
        <Link href="/patient/visa/applications" className="text-sm underline mt-4 inline-block">
          ← 목록으로
        </Link>
      </div>
    );
  }

  const status = STATUS_LABELS[application.status] || STATUS_LABELS.draft;
  const canUpload = ["draft", "documents_pending", "changes_requested"].includes(
    application.status
  );
  const canSubmit = application.status === "documents_pending" && documents.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link
        href="/patient/visa/applications"
        className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
      >
        ← 비자 신청 목록
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {application.visa_type} 비자 신청
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${status.color}`}>
              {status.ko}
            </span>
            <span className="text-sm text-gray-500">
              국적 {application.nationality}
            </span>
          </div>
        </div>
      </div>

      {/* 코디 메모 (코디가 남긴 메모 표시) */}
      {application.coordinator_notes && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">코디네이터 메모</p>
          <p className="text-sm text-blue-800 mt-1 whitespace-pre-wrap">
            {application.coordinator_notes}
          </p>
        </div>
      )}

      {/* 기본 정보 */}
      <section className="mt-8">
        <h2 className="text-lg font-medium mb-3">신청 정보</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-500">방문 목적</dt>
            <dd>{application.purpose || "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">체류 예정 일수</dt>
            <dd>{application.duration_days ? `${application.duration_days}일` : "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">예상 입국일</dt>
            <dd>{application.planned_arrival_date || "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">예상 출국일</dt>
            <dd>{application.planned_departure_date || "—"}</dd>
          </div>
          {application.visa_number && (
            <div>
              <dt className="text-gray-500">비자 번호</dt>
              <dd className="font-mono">{application.visa_number}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* 초청장 */}
      {invitationUrl && (
        <section className="mt-8 border border-emerald-200 bg-emerald-50 rounded-lg p-5">
          <h2 className="font-medium text-emerald-900">✅ 초청장 발급 완료</h2>
          <p className="text-sm text-emerald-800 mt-1">
            healwith 코디네이터가 발급한 초청장을 다운로드 받아 대사관에 제출하세요.
          </p>
          <a
            href={invitationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block bg-emerald-700 text-white px-4 py-2 rounded text-sm hover:bg-emerald-700"
          >
            초청장 PDF 다운로드
          </a>
        </section>
      )}

      {/* 서류 업로드 */}
      <section className="mt-8">
        <h2 className="text-lg font-medium mb-3">제출 서류</h2>

        {canUpload && (
          <div className="border border-gray-200 rounded-lg p-4 bg-white mb-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <label className="flex-1 w-full">
                <span className="text-sm text-gray-700">서류 종류</span>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {DOCUMENT_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex-1 w-full">
                <span className="text-sm text-gray-700">파일 선택 (PDF/JPG/PNG, 20MB 이하)</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="mt-1 block w-full text-sm"
                />
              </label>
            </div>
            {uploading && (
              <p className="text-sm text-gray-500 mt-2">업로드 중...</p>
            )}
          </div>
        )}

        {documents.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center border-2 border-dashed border-gray-200 rounded">
            아직 제출된 서류가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
            {documents.map((doc) => {
              const review = REVIEW_LABELS[doc.review_status] || REVIEW_LABELS.pending;
              return (
                <li key={doc.id} className="p-4 bg-white flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{doc.document_label || doc.document_type}</span>
                      <span className={`text-xs ${review.color}`}>· {review.ko}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{doc.file_name}</p>
                    {doc.review_note && (
                      <p className="text-xs text-orange-700 mt-1">
                        검수자 메모: {doc.review_note}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 items-center shrink-0">
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        보기
                      </a>
                    )}
                    {canUpload && doc.document_type !== "invitation_letter" && (
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {canSubmit && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSubmitForReview}
              className="bg-black text-white px-5 py-2 rounded-md text-sm hover:bg-gray-800"
            >
              코디 검수 요청 →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
