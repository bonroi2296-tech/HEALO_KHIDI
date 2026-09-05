"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";
import { uploadDirect } from "@/lib/uploadAttachment";
import { describeUpload, UPLOAD_POLICY } from "@/lib/uploadPolicy";
import { t } from "@/lib/i18n";

// 비자 신청 상태별 배지 색상 — 라벨은 i18n(visaAppDetail.status.*).
const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-700",
  documents_pending: "bg-amber-100 text-amber-800",
  under_review: "bg-blue-100 text-blue-800",
  changes_requested: "bg-orange-100 text-orange-800",
  invitation_ready: "bg-indigo-100 text-indigo-800",
  invitation_issued: "bg-emerald-100 text-emerald-800",
  submitted_embassy: "bg-teal-100 text-teal-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
};

// 서류 검수 상태별 색상 — 라벨은 i18n(visaAppDetail.review.*).
const REVIEW_COLORS = {
  pending: "text-amber-700",
  approved: "text-emerald-700",
  rejected: "text-red-700",
  needs_revision: "text-orange-700",
};

// 서류 종류 값(로직 키) — 라벨은 i18n(visaAppDetail.docType.*).
const DOCUMENT_TYPES = [
  "passport",
  "photo",
  "visa_application_form",
  "medical_certificate",
  "diagnosis_document",
  "treatment_plan",
  "bank_statement",
  "hospital_confirmation",
  "insurance",
  "other",
];

export default function VisaApplicationDetailClient({ applicationId }) {
  const lang = useLang();

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
      // 원시 err.message 노출 금지 — 일반 실패 안내(보안+UX)
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
      const json = await uploadDirect(
        `/api/khidi/visa/applications/${applicationId}/documents`,
        file,
        {
          document_type: uploadType,
          document_label: DOCUMENT_TYPES.includes(uploadType)
            ? t(`visaAppDetail.docType.${uploadType}`, lang)
            : uploadType,
        },
        { fetch: (url, init) => fetch(url, { ...init, credentials: "include" }) }
      );
      if (!json.ok) {
        throw new Error(json.error || json.detail || "upload_failed");
      }
      await loadAll();
      e.target.value = "";
    } catch (_err) {
      alert(t("visaAppDetail.uploadFailed", lang));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmitForReview() {
    if (!confirm(t("visaAppDetail.confirmReview", lang))) return;
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
    } catch (_err) {
      alert(t("visaAppDetail.submitFailed", lang));
    }
  }

  async function handleDeleteDoc(docId) {
    if (!confirm(t("visaAppDetail.confirmDelete", lang))) return;
    try {
      const res = await fetch(
        `/api/khidi/visa/applications/${applicationId}/documents/${docId}`,
        { method: "DELETE", credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "delete_failed");
      await loadAll();
    } catch (_err) {
      alert(t("visaAppDetail.deleteFailed", lang));
    }
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-10"><p className="text-gray-500 text-sm">{t("visaAppDetail.loading", lang)}</p></div>;
  }
  if (error || !application) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-red-600 text-sm">{t("visaAppDetail.errorPrefix", lang)}</p>
        <Link href="/patient/visa/applications" className="text-sm underline mt-4 inline-block">
          {t("visaAppDetail.backToList", lang)}
        </Link>
      </div>
    );
  }

  const statusKey = STATUS_COLORS[application.status] ? application.status : "draft";
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
        {t("visaAppDetail.backToVisaList", lang)}
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("visaAppDetail.visaApplicationTitle", lang).replace("{type}", application.visa_type)}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[statusKey]}`}>
              {t(`visaAppDetail.status.${statusKey}`, lang)}
            </span>
            <span className="text-sm text-gray-500">
              {t("visaAppDetail.nationality", lang)} {application.nationality}
            </span>
          </div>
        </div>
      </div>

      {/* 코디 메모 (코디가 남긴 메모 표시) */}
      {application.coordinator_notes && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">{t("visaAppDetail.coordinatorNotes", lang)}</p>
          <p className="text-sm text-blue-800 mt-1 whitespace-pre-wrap">
            {application.coordinator_notes}
          </p>
        </div>
      )}

      {/* 기본 정보 */}
      <section className="mt-8">
        <h2 className="text-lg font-medium mb-3">{t("visaAppDetail.applicationInfo", lang)}</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-500">{t("visaAppDetail.purpose", lang)}</dt>
            <dd>{application.purpose || "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t("visaAppDetail.durationDays", lang)}</dt>
            <dd>{application.duration_days ? `${application.duration_days}${t("visaAppDetail.daysUnit", lang)}` : "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t("visaAppDetail.plannedArrival", lang)}</dt>
            <dd>{application.planned_arrival_date || "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t("visaAppDetail.plannedDeparture", lang)}</dt>
            <dd>{application.planned_departure_date || "—"}</dd>
          </div>
          {application.visa_number && (
            <div>
              <dt className="text-gray-500">{t("visaAppDetail.visaNumber", lang)}</dt>
              <dd className="font-mono">{application.visa_number}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* 초청장 */}
      {invitationUrl && (
        <section className="mt-8 border border-emerald-200 bg-emerald-50 rounded-lg p-5">
          <h2 className="text-[clamp(36px,4.5vw,64px)] font-medium text-emerald-900">{t("visaAppDetail.invitationIssued", lang)}</h2>
          <p className="text-sm text-emerald-800 mt-1">
            {t("visaAppDetail.invitationDesc", lang)}
          </p>
          <a
            href={invitationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block bg-emerald-700 text-white px-4 py-2 rounded text-sm hover:bg-emerald-700"
          >
            {t("visaAppDetail.downloadInvitation", lang)}
          </a>
        </section>
      )}

      {/* 서류 업로드 */}
      <section className="mt-8">
        <h2 className="text-lg font-medium mb-3">{t("visaAppDetail.submittedDocs", lang)}</h2>

        {canUpload && (
          <div className="border border-gray-200 rounded-lg p-4 bg-white mb-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <label className="flex-1 w-full">
                <span className="text-sm text-gray-700">{t("visaAppDetail.documentType", lang)}</span>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {DOCUMENT_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {t(`visaAppDetail.docType.${value}`, lang)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex-1 w-full">
                <span className="text-sm text-gray-700">{t("visaAppDetail.chooseFile", lang)}</span>
                <span className="block text-xs text-gray-500">{describeUpload("medicalDoc", lang)}</span>
                <input
                  type="file"
                  accept={UPLOAD_POLICY.medicalDoc.accept}
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="mt-1 block w-full text-sm"
                />
              </label>
            </div>
            {uploading && (
              <p className="text-sm text-gray-500 mt-2">{t("visaAppDetail.uploadingFile", lang)}</p>
            )}
          </div>
        )}

        {documents.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center border-2 border-dashed border-gray-200 rounded">
            {t("visaAppDetail.noDocs", lang)}
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
            {documents.map((doc) => {
              const reviewKey = REVIEW_COLORS[doc.review_status] ? doc.review_status : "pending";
              return (
                <li key={doc.id} className="p-4 bg-white flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{doc.document_label || doc.document_type}</span>
                      <span className={`text-xs ${REVIEW_COLORS[reviewKey]}`}>· {t(`visaAppDetail.review.${reviewKey}`, lang)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{doc.file_name}</p>
                    {doc.review_note && (
                      <p className="text-xs text-orange-700 mt-1">
                        {t("visaAppDetail.reviewerNote", lang)}{doc.review_note}
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
                        {t("visaAppDetail.view", lang)}
                      </a>
                    )}
                    {canUpload && doc.document_type !== "invitation_letter" && (
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        {t("visaAppDetail.delete", lang)}
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
              {t("visaAppDetail.requestReview", lang)}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
