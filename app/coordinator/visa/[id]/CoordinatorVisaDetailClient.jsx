"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STATUS_LABELS = {
  draft: "작성 중",
  documents_pending: "서류 준비",
  under_review: "검수 중",
  changes_requested: "수정 요청",
  invitation_ready: "초청장 준비",
  invitation_issued: "초청장 발급",
  submitted_embassy: "대사관 접수",
  approved: "비자 승인",
  rejected: "거절",
  cancelled: "취소",
};

const ALL_STATUSES = Object.keys(STATUS_LABELS);

const REVIEW_LABELS = {
  pending: { ko: "대기", color: "text-amber-700 bg-amber-50" },
  approved: { ko: "승인", color: "text-emerald-700 bg-emerald-50" },
  rejected: { ko: "반려", color: "text-red-700 bg-red-50" },
  needs_revision: { ko: "수정 요청", color: "text-orange-700 bg-orange-50" },
};

export default function CoordinatorVisaDetailClient({ applicationId }) {
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
      setError("신청 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus) {
    const note = prompt(`"${STATUS_LABELS[newStatus]}" 로 상태 변경. 메모(선택):`);
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
      alert("상태 변경 실패");
    }
  }

  async function handleDocReview(docId, reviewStatus) {
    const note = reviewStatus === "rejected" || reviewStatus === "needs_revision"
      ? prompt("사유(환자에게 보일 메모):")
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
      alert("검수 실패");
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
      alert("메모 저장됨");
    } catch (_err) {
      alert("저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleIssueInvitation() {
    if (!confirm("초청장을 발급하시겠습니까? PDF 가 생성되고 상태가 'invitation_issued' 로 변경됩니다.")) return;
    setIssuing(true);
    try {
      const res = await fetch(
        `/api/khidi/visa/applications/${applicationId}/invitation`,
        { method: "POST", credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || json.detail || "failed");
      await loadAll();
      alert("초청장 발급 완료");
    } catch (_err) {
      alert("발급 실패");
    } finally {
      setIssuing(false);
    }
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-10"><p className="text-gray-500 text-sm">불러오는 중...</p></div>;
  }
  if (error || !application) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-red-600 text-sm">오류: {error}</p>
        <Link href="/coordinator/visa" className="text-sm underline mt-4 inline-block">← 목록</Link>
      </div>
    );
  }

  const canIssueInvitation =
    ["under_review", "invitation_ready", "changes_requested"].includes(application.status);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/coordinator/visa" className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4">
        ← 비자 목록
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {application.visa_type} · {application.nationality}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            환자 ID: <span className="font-mono">{application.patient_user_id.slice(0, 8)}...</span> ·
            생성 {new Date(application.created_at).toLocaleString("ko-KR")}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
            현재: {STATUS_LABELS[application.status]}
          </span>
        </div>
      </div>

      {/* 상태 변경 */}
      <section className="mt-6 border border-gray-200 rounded-lg p-4 bg-white">
        <h2 className="font-medium text-sm mb-3">상태 변경</h2>
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
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </section>

      {/* 초청장 발급 */}
      <section className="mt-6 border border-gray-200 rounded-lg p-4 bg-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-medium text-sm">초청장 (Invitation Letter)</h2>
            <p className="text-xs text-gray-500 mt-1">
              서류 검수 완료 후 초청장 PDF 를 자동 발급합니다. 발급되면 환자에게 즉시 노출됩니다.
            </p>
          </div>
          {application.invitation_issued_at ? (
            <div className="text-right">
              <p className="text-xs text-emerald-700">
                발급 완료 {new Date(application.invitation_issued_at).toLocaleDateString("ko-KR")}
              </p>
              {invitationUrl && (
                <a
                  href={invitationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline block mt-1"
                >
                  PDF 다운로드
                </a>
              )}
            </div>
          ) : (
            <button
              onClick={handleIssueInvitation}
              disabled={!canIssueInvitation || issuing}
              className="bg-emerald-700 text-white px-4 py-2 rounded text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canIssueInvitation ? `현재 상태(${STATUS_LABELS[application.status]})에서는 발급 불가` : ""}
            >
              {issuing ? "발급 중..." : "초청장 발급"}
            </button>
          )}
        </div>
      </section>

      {/* 코디 메모 */}
      <section className="mt-6 border border-gray-200 rounded-lg p-4 bg-white">
        <h2 className="font-medium text-sm mb-2">코디 메모 (환자에게도 표시됨)</h2>
        <textarea
          value={coordinatorNotes}
          onChange={(e) => setCoordinatorNotes(e.target.value)}
          rows={4}
          placeholder="환자에게 전달할 메모 (서류 수정 사항, 일정 공유 등)"
          className="w-full border border-gray-300 rounded p-2 text-sm"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSaveNotes}
            disabled={saving}
            className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "저장 중..." : "메모 저장"}
          </button>
        </div>
      </section>

      {/* 서류 검수 */}
      <section className="mt-6 border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-medium text-sm">제출 서류 ({documents.length}건)</h2>
        </div>
        {documents.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">제출된 서류 없음</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {documents.map((doc) => {
              const review = REVIEW_LABELS[doc.review_status] || REVIEW_LABELS.pending;
              return (
                <li key={doc.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {doc.document_label || doc.document_type}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${review.color}`}>
                          {review.ko}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {doc.file_name} · {(doc.file_size / 1024).toFixed(0)} KB ·{" "}
                        {new Date(doc.created_at).toLocaleString("ko-KR")}
                      </p>
                      {doc.review_note && (
                        <p className="text-xs text-orange-700 mt-1">
                          메모: {doc.review_note}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0 items-center">
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
                      <button
                        onClick={() => handleDocReview(doc.id, "approved")}
                        className="text-xs text-emerald-700 hover:underline"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => handleDocReview(doc.id, "needs_revision")}
                        className="text-xs text-orange-700 hover:underline"
                      >
                        수정요청
                      </button>
                      <button
                        onClick={() => handleDocReview(doc.id, "rejected")}
                        className="text-xs text-red-700 hover:underline"
                      >
                        반려
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
