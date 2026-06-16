"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STATUS_LABELS = {
  draft: { ko: "작성 중", en: "Draft", color: "bg-gray-100 text-gray-700" },
  documents_pending: { ko: "서류 준비", en: "Documents pending", color: "bg-amber-100 text-amber-800" },
  under_review: { ko: "코디 검수 중", en: "Under review", color: "bg-blue-100 text-blue-800" },
  changes_requested: { ko: "수정 필요", en: "Changes requested", color: "bg-orange-100 text-orange-800" },
  invitation_ready: { ko: "초청장 발급 준비", en: "Invitation ready", color: "bg-indigo-100 text-indigo-800" },
  invitation_issued: { ko: "초청장 발급 완료", en: "Invitation issued", color: "bg-emerald-100 text-emerald-800" },
  submitted_embassy: { ko: "대사관 접수", en: "Submitted to embassy", color: "bg-teal-100 text-teal-800" },
  approved: { ko: "비자 승인", en: "Approved", color: "bg-green-100 text-green-800" },
  rejected: { ko: "거절", en: "Rejected", color: "bg-red-100 text-red-800" },
  cancelled: { ko: "취소", en: "Cancelled", color: "bg-gray-100 text-gray-500" },
};

const VISA_TYPES = [
  { value: "C-3-3", label: "C-3-3 (단기 의료 90일 이내)" },
  { value: "G-1-10", label: "G-1-10 (장기 치료 91일 이상)" },
];

const NATIONALITIES = [
  { value: "KZ", label: "카자흐스탄 (Kazakhstan)" },
  { value: "RU", label: "러시아 (Russia)" },
  { value: "UZ", label: "우즈베키스탄 (Uzbekistan)" },
  { value: "MN", label: "몽골 (Mongolia)" },
  { value: "CN", label: "중국 (China)" },
  { value: "OTHER", label: "기타" },
];

export default function VisaApplicationsClient() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    visa_type: "C-3-3",
    nationality: "KZ",
    purpose: "",
    duration_days: "",
    planned_arrival_date: "",
    planned_departure_date: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    setLoading(true);
    try {
      const res = await fetch("/api/khidi/visa/applications", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "failed");
      }
      setApplications(json.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.duration_days) delete payload.duration_days;
      if (!payload.planned_arrival_date) delete payload.planned_arrival_date;
      if (!payload.planned_departure_date) delete payload.planned_departure_date;

      const res = await fetch("/api/khidi/visa/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || json.detail || "failed");
      }
      setShowCreate(false);
      await loadApplications();
    } catch (err) {
      alert("신청 생성 실패: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">비자 발급 지원</h1>
          <p className="text-gray-500 mt-1 text-sm">
            healwith 코디네이터가 초청장 발급부터 대사관 제출까지 돕습니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/visa"
            className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
          >
            비자 종류 안내
          </Link>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800"
          >
            {showCreate ? "취소" : "+ 신청 시작"}
          </button>
        </div>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="border border-gray-200 rounded-lg p-6 mb-8 bg-white shadow-sm"
        >
          <h2 className="font-medium mb-4">새 비자 신청</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-700">비자 유형</span>
              <select
                value={form.visa_type}
                onChange={(e) => setForm({ ...form, visa_type: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                {VISA_TYPES.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">국적</span>
              <select
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                {NATIONALITIES.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm text-gray-700">방문 목적 (진단명 등)</span>
              <input
                type="text"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="예: 위암 수술 및 항암 치료"
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">체류 예정 일수</span>
              <input
                type="number"
                min="1"
                max="730"
                value={form.duration_days}
                onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">예상 입국일</span>
              <input
                type="date"
                value={form.planned_arrival_date}
                onChange={(e) =>
                  setForm({ ...form, planned_arrival_date: e.target.value })
                }
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">예상 출국일</span>
              <input
                type="date"
                value={form.planned_departure_date}
                onChange={(e) =>
                  setForm({ ...form, planned_departure_date: e.target.value })
                }
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? "생성 중..." : "신청 생성"}
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-gray-500 text-sm">불러오는 중...</p>}
      {error && <p className="text-red-600 text-sm">오류: {error}</p>}

      {!loading && applications.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">진행 중인 비자 신청이 없습니다.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 text-sm underline underline-offset-4 text-gray-700"
          >
            첫 신청 시작하기
          </button>
        </div>
      )}

      {applications.length > 0 && (
        <div className="space-y-3">
          {applications.map((app) => {
            const label = STATUS_LABELS[app.status] || STATUS_LABELS.draft;
            return (
              <Link
                key={app.id}
                href={`/patient/visa/applications/${app.id}`}
                className="block border border-gray-200 rounded-lg p-5 bg-white hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{app.visa_type}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${label.color}`}
                      >
                        {label.ko}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {app.purpose || "목적 미작성"}
                    </p>
                    <div className="text-xs text-gray-400 mt-2 flex gap-4">
                      <span>국적: {app.nationality}</span>
                      {app.duration_days && (
                        <span>체류: {app.duration_days}일</span>
                      )}
                      <span>생성: {new Date(app.created_at).toLocaleDateString("ko-KR")}</span>
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
