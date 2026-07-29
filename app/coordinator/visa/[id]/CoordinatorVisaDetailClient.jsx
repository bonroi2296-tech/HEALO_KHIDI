"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useBackofficeLang, useCoordinatorL, useDateLocale } from "@/lib/i18n/coordinator";
import { nationalityLabelL } from "@/lib/khidi/nationality";

// 비자 진행 상태 코드(라벨은 컴포넌트에서 L로 해석). 목록 파일의 STATUS_LABEL과 같은 vi 키 공유.
const ALL_STATUSES = [
  "draft",
  "documents_pending",
  "under_review",
  "changes_requested",
  "invitation_ready",
  "invitation_issued",
  "submitted_embassy",
  "approved",
  "rejected",
  "cancelled",
];

// 서류 검수 상태 색상만 모듈 상수(언어 무관). 라벨은 컴포넌트에서 L로 해석.
const REVIEW_COLOR = {
  pending: "text-amber-700 bg-amber-50",
  approved: "text-emerald-700 bg-emerald-50",
  rejected: "text-red-700 bg-red-50",
  needs_revision: "text-orange-700 bg-orange-50",
};

export default function CoordinatorVisaDetailClient({ applicationId }) {
  const L = useCoordinatorL();
  const lang = useBackofficeLang();
  const dateLoc = useDateLocale();
  // 비자 진행 상태 라벨(목록 파일과 동일한 vi 키)
  const STATUS_LABEL = {
    draft: L.viStatusDraft,
    documents_pending: L.viStatusDocsPending,
    under_review: L.viStatusUnderReview,
    changes_requested: L.viStatusChangesRequested,
    invitation_ready: L.viStatusInvitationReady,
    invitation_issued: L.viStatusInvitationIssued,
    submitted_embassy: L.viStatusSubmittedEmbassy,
    approved: L.viStatusApproved,
    rejected: L.viStatusRejected,
    cancelled: L.viStatusCancelled,
  };
  // 서류 검수 상태 라벨
  const REVIEW_LABEL = {
    pending: L.viReviewPending,
    approved: L.viReviewApproved,
    rejected: L.viReviewRejected,
    needs_revision: L.viReviewNeedsRevision,
  };
  const [application, setApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coordinatorNotes, setCoordinatorNotes] = useState("");
  const [invitationUrl, setInvitationUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);

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
      if (!appRes.ok || !appJson.ok) throw new Error(appJson.error || "failed");
      setApplication(appJson.data);
      setCoordinatorNotes(appJson.data.coordinator_notes || "");
      setDocuments(docJson.data || []);

      if (appJson.data.invitation_letter_url) {
        const invRes = await fetch(
          `/api/khidi/visa/applications/${applicationId}/invitation`,
          { credentials: "include" }
        );
        const invJson = await invRes.json();
        if (invJson.ok) setInvitationUrl(invJson.invitation_letter_url);
      }
    } catch (err) {
      console.error("[coordinator/visa]", err);
      setError(L.viLoadDetailError);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus) {
    const note = prompt(L.viPromptStatusChange.replace("{status}", STATUS_LABEL[newStatus]));
    if (note === null) return;
    try {
      const res = await fetch(
        `/api/khidi/visa/applications/${applicationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: newStatus, status_note: note || null }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || json.detail || "failed");
      await loadAll();
    } catch (_err) {
      alert(L.viStatusChangeFail);
    }
  }

  async function handleDocReview(docId, reviewStatus) {
    const note = reviewStatus === "rejected" || reviewStatus === "needs_revision"
      ? prompt(L.viPromptReviewReason)
      : null;
    if (note === null && (reviewStatus === "rejected" || reviewStatus === "needs_revision")) return;
    try {
      const res = await fetch(
        `/api/khidi/visa/applications/${applicationId}/documents/${docId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ review_status: reviewStatus, review_note: note }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      await loadAll();
    } catch (_err) {
      alert(L.viReviewFail);
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/khidi/visa/applications/${applicationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ coordinator_notes: coordinatorNotes }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      alert(L.viNotesSaved);
    } catch (_err) {
      alert(L.viNotesSaveFail);
    } finally {
      setSaving(false);
    }
  }

  async function handleIssueInvitation() {
    if (!confirm(L.viConfirmIssue)) return;
    setIssuing(true);
    try {
      const res = await fetch(
        `/api/khidi/visa/applications/${applicationId}/invitation`,
        { method: "POST", credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || json.detail || "failed");
      await loadAll();
      alert(L.viIssueDone);
    } catch (_err) {
      alert(L.viIssueFail);
    } finally {
      setIssuing(false);
    }
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-10"><p className="text-gray-500 text-sm">{L.processing}</p></div>;
  }
  if (error || !application) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-red-600 text-sm">{L.viErrorPrefix}: {error}</p>
        <Link href="/coordinator/visa" className="text-sm underline mt-4 inline-block">{L.viBackShort}</Link>
      </div>
    );
  }

  const canIssueInvitation =
    ["under_review", "invitation_ready", "changes_requested"].includes(application.status);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/coordinator/visa" className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4">
        {L.viBackToList}
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {application.visa_type} · {nationalityLabelL(application.nationality, lang)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {L.viPatientId}: <span className="font-mono">{application.patient_user_id.slice(0, 8)}...</span> ·
            {" "}{L.viCreatedLabel} {new Date(application.created_at).toLocaleString(dateLoc)}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
            {L.viCurrentLabel}: {STATUS_LABEL[application.status]}
          </span>
        </div>
      </div>

      {/* 상태 변경 */}
      <section className="mt-6 border border-gray-200 rounded-lg p-4 bg-white">
        <h2 className="font-medium text-sm mb-3">{L.viStatusChangeTitle}</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={s === application.status}
              className={`text-xs px-3 py-1.5 rounded border ${
                s === application.status
                  ? "bg-black text-white border-black cursor-default"
                  : "border-gray-300 hover:border-black"
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </section>

      {/* 초청장 발급 */}
      <section className="mt-6 border border-gray-200 rounded-lg p-4 bg-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-medium text-sm">{L.viInvitationTitle}</h2>
            <p className="text-xs text-gray-500 mt-1">
              {L.viInvitationDesc}
            </p>
          </div>
          {application.invitation_issued_at ? (
            <div className="text-right">
              <p className="text-xs text-emerald-700">
                {L.viIssuedDoneLabel} {new Date(application.invitation_issued_at).toLocaleDateString(dateLoc)}
              </p>
              {invitationUrl && (
                <a
                  href={invitationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-teal-700 hover:underline block mt-1"
                >
                  {L.viPdfDownload}
                </a>
              )}
            </div>
          ) : (
            <button
              onClick={handleIssueInvitation}
              disabled={!canIssueInvitation || issuing}
              className="bg-emerald-700 text-white px-4 py-2 rounded text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canIssueInvitation ? L.viIssueDisabledHint.replace("{status}", STATUS_LABEL[application.status]) : ""}
            >
              {issuing ? L.viIssuing : L.viIssueBtn}
            </button>
          )}
        </div>
      </section>

      {/* 코디 메모 */}
      <section className="mt-6 border border-gray-200 rounded-lg p-4 bg-white">
        <h2 className="font-medium text-sm mb-2">{L.viNotesTitle}</h2>
        <textarea
          value={coordinatorNotes}
          onChange={(e) => setCoordinatorNotes(e.target.value)}
          rows={4}
          placeholder={L.viNotesPlaceholder}
          className="w-full border border-gray-300 rounded p-2 text-sm"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSaveNotes}
            disabled={saving}
            className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? L.viNotesSaving : L.viNotesSaveBtn}
          </button>
        </div>
      </section>

      {/* 서류 검수 */}
      <section className="mt-6 border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-medium text-sm">{L.viDocsTitle.replace("{n}", documents.length)}</h2>
        </div>
        {documents.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">{L.viDocsEmpty}</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {documents.map((doc) => {
              const reviewColor = REVIEW_COLOR[doc.review_status] || REVIEW_COLOR.pending;
              const reviewLabel = REVIEW_LABEL[doc.review_status] || REVIEW_LABEL.pending;
              return (
                <li key={doc.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {doc.document_label || doc.document_type}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${reviewColor}`}>
                          {reviewLabel}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {doc.file_name} · {(doc.file_size / 1024).toFixed(0)} KB ·{" "}
                        {new Date(doc.created_at).toLocaleString(dateLoc)}
                      </p>
                      {doc.review_note && (
                        <p className="text-xs text-orange-700 mt-1">
                          {L.viReviewNoteLabel}: {doc.review_note}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0 items-center">
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-teal-700 hover:underline"
                        >
                          {L.viDocView}
                        </a>
                      )}
                      <button
                        onClick={() => handleDocReview(doc.id, "approved")}
                        className="text-xs text-emerald-700 hover:underline"
                      >
                        {L.viDocApprove}
                      </button>
                      <button
                        onClick={() => handleDocReview(doc.id, "needs_revision")}
                        className="text-xs text-orange-700 hover:underline"
                      >
                        {L.viDocRequestRevision}
                      </button>
                      <button
                        onClick={() => handleDocReview(doc.id, "rejected")}
                        className="text-xs text-red-700 hover:underline"
                      >
                        {L.viDocReject}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
