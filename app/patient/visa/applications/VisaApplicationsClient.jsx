"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";

// 신청 상태 — key 는 DB status 값(로직 키, 그대로 유지). 색상만 여기, 표시 라벨(6개 언어)은
// 중앙 i18n 사전 visaApps.status.* 키로 이동.
const STATUS_META = {
  draft: { color: "bg-gray-100 text-gray-700" },
  documents_pending: { color: "bg-amber-100 text-amber-800" },
  under_review: { color: "bg-blue-100 text-blue-800" },
  changes_requested: { color: "bg-orange-100 text-orange-800" },
  invitation_ready: { color: "bg-indigo-100 text-indigo-800" },
  invitation_issued: { color: "bg-emerald-100 text-emerald-800" },
  submitted_embassy: { color: "bg-teal-100 text-teal-800" },
  approved: { color: "bg-green-100 text-green-800" },
  rejected: { color: "bg-red-100 text-red-800" },
  cancelled: { color: "bg-gray-100 text-gray-500" },
};

// 비자 유형·국적 — value 는 API 로직 키, 표시 라벨은 중앙 i18n 사전 키(visaApps.visaType.* / visaApps.nation.*).
const VISA_TYPE_OPTIONS = [
  { value: "C-3-3", labelKey: "visaApps.visaType.c33" },
  { value: "G-1-10", labelKey: "visaApps.visaType.g110" },
];

const NATIONALITY_VALUES = ["KZ", "RU", "UZ", "MN", "CN", "OTHER"];

const DATE_LOCALES = {
  ko: "ko-KR", ru: "ru-RU", kz: "kk-KZ", zh: "zh-CN", ja: "ja-JP", en: "en-US",
};

export default function VisaApplicationsClient() {
  const lang = useLang();
  const dateLocale = DATE_LOCALES[lang] || DATE_LOCALES.en;

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
      console.error("[patient/visa/list]", err);
      // 원시 err.message 노출 금지 — 일반 실패 안내(보안+UX)
      setError(true);
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
    } catch (_err) {
      alert(t("visaApps.createFailed", lang));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("visaApps.title", lang)}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {t("visaApps.subtitle", lang)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/visa"
            className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
          >
            {t("visaApps.visaGuide", lang)}
          </Link>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800"
          >
            {showCreate ? t("visaApps.cancel", lang) : t("visaApps.startApplication", lang)}
          </button>
        </div>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="border border-gray-200 rounded-lg p-6 mb-8 bg-white shadow-sm"
        >
          <h2 className="text-[clamp(36px,4.5vw,64px)] font-medium mb-4">{t("visaApps.newApplication", lang)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-700">{t("visaApps.visaType", lang)}</span>
              <select
                value={form.visa_type}
                onChange={(e) => setForm({ ...form, visa_type: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                {VISA_TYPE_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {t(v.labelKey, lang)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">{t("visaApps.nationality", lang)}</span>
              <select
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                {NATIONALITY_VALUES.map((n) => (
                  <option key={n} value={n}>
                    {t(`visaApps.nation.${n}`, lang)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm text-gray-700">{t("visaApps.purpose", lang)}</span>
              <input
                type="text"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder={t("visaApps.purposePlaceholder", lang)}
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">{t("visaApps.durationDays", lang)}</span>
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
              <span className="text-sm text-gray-700">{t("visaApps.arrivalDate", lang)}</span>
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
              <span className="text-sm text-gray-700">{t("visaApps.departureDate", lang)}</span>
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
              {t("visaApps.cancel", lang)}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? t("visaApps.submitting", lang) : t("visaApps.submitApplication", lang)}
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-gray-500 text-sm">{t("visaApps.loading", lang)}</p>}
      {error && <p className="text-red-600 text-sm">{t("visaApps.errorPrefix", lang)}</p>}

      {!loading && applications.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">{t("visaApps.emptyTitle", lang)}</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 text-sm underline underline-offset-4 text-gray-700"
          >
            {t("visaApps.startFirst", lang)}
          </button>
        </div>
      )}

      {applications.length > 0 && (
        <div className="space-y-3">
          {applications.map((app) => {
            const statusKey = STATUS_META[app.status] ? app.status : "draft";
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
                        className={`text-xs px-2 py-1 rounded ${STATUS_META[statusKey].color}`}
                      >
                        {t(`visaApps.status.${statusKey}`, lang)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {app.purpose || t("visaApps.purposeFallback", lang)}
                    </p>
                    <div className="text-xs text-gray-500 mt-2 flex gap-4">
                      <span>{t("visaApps.nationalityLabel", lang)}: {app.nationality}</span>
                      {app.duration_days && (
                        <span>{t("visaApps.stayLabel", lang)}: {app.duration_days}{t("visaApps.daysSuffix", lang)}</span>
                      )}
                      <span>{t("visaApps.createdLabel", lang)}: {new Date(app.created_at).toLocaleDateString(dateLocale)}</span>
                    </div>
                  </div>
                  <span className="text-gray-500 text-sm">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
