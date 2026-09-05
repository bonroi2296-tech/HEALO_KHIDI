"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { kstDate, kstTime } from "@/lib/datetime/kst";
import {
  Video,
  Calendar,
  Clock,
  MapPin,
  Phone,
  ChevronRight,
  Info,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/LangContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

// 언어별 로케일 (날짜·시간 표시용)
function localeOf(lang) {
  return lang === "ko"
    ? "ko-KR"
    : lang === "ru"
    ? "ru-RU"
    : lang === "kz"
    ? "kk-KZ"
    : lang === "zh"
    ? "zh-CN"
    : lang === "ja"
    ? "ja-JP"
    : "en-US";
}

// 문의 상태 — DB 값(received/reviewing/…)은 그대로 두고, 표시 라벨만 i18n 키로.
const STATUS_LABELS = {
  received: {
    cls: "bg-yellow-100 text-yellow-700",
    labelKey: "patientConsults.status.received",
  },
  reviewing: {
    cls: "bg-blue-100 text-blue-700",
    labelKey: "patientConsults.status.reviewing",
  },
  matched: {
    cls: "bg-teal-100 text-teal-700",
    labelKey: "patientConsults.status.matched",
  },
  completed: {
    cls: "bg-gray-100 text-gray-600",
    labelKey: "patientConsults.status.completed",
  },
};

// 암종 — DB 값 → 표시 라벨 i18n 키
const CANCER_LABEL_KEYS = {
  stomach: "patientConsults.cancer.stomach",
  liver: "patientConsults.cancer.liver",
  lung: "patientConsults.cancer.lung",
  breast: "patientConsults.cancer.breast",
  thyroid: "patientConsults.cancer.thyroid",
  colorectal: "patientConsults.cancer.colorectal",
  pancreatic: "patientConsults.cancer.pancreatic",
  other: "patientConsults.cancer.other",
};

export default function PatientConsultationsClient() {
  const lang = useLang();

  const [sessions, setSessions] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;
        const [consultRes, inqRes] = await Promise.all([
          fetch("/api/khidi/consultation?limit=50", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/portal/my-inquiries", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const result = await consultRes.json();
        if (result.ok) setSessions(result.data || []);
        const inqResult = await inqRes.json();
        if (inqResult.ok) setInquiries(inqResult.items || []);
      } catch (err) {
        console.error("[patient/consultations]", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  const upcoming = sessions.filter((s) => s.status === "scheduled");
  const past = sessions.filter((s) =>
    ["completed", "cancelled", "no_show"].includes(s.status)
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t("patientConsults.title", lang)}</h1>
        <p className="text-gray-500 mt-2">{t("patientConsults.subtitle", lang)}</p>
      </div>

      {/* Info card */}
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex items-start gap-3">
        <Info size={20} className="text-teal-700 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-teal-900">
          <p className="font-semibold mb-1">{t("patientConsults.infoTitle", lang)}</p>
          <p className="text-teal-800 leading-relaxed">
            {t("patientConsults.infoBodyPre", lang)}
            <Link href="/inquiry" className="underline font-medium">
              {t("patientConsults.infoLink", lang)}
            </Link>
            {t("patientConsults.infoBodyPost", lang)}
          </p>
        </div>
      </div>

      {/* 내 문의 — 접수한 상담 신청 내역 */}
      {!loading && inquiries.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            {t("patientConsults.myInquiries", lang)} ({inquiries.length})
          </h2>
          <div className="space-y-3">
            {inquiries.map((q) => {
              const st = STATUS_LABELS[q.status] || STATUS_LABELS.received;
              const cancerKey = CANCER_LABEL_KEYS[q.cancer_type];
              return (
                <div
                  key={q.id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[clamp(24px,2.5vw,32px)] font-bold text-gray-900">
                        {(cancerKey && t(cancerKey, lang)) ||
                          q.cancer_type ||
                          t("patientConsults.inquiryFallback", lang)}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${st.cls}`}>
                        {t(st.labelKey, lang)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {q.created_at
                          ? new Date(q.created_at).toLocaleDateString(localeOf(lang))
                          : "—"}
                      </span>
                      {q.step2_completed_at ? (
                        <span className="text-teal-700">{t("patientConsults.step2Done", lang)}</span>
                      ) : (
                        <span className="text-gray-500">{t("patientConsults.step1Done", lang)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-500">{t("patientConsults.loading", lang)}</div>
      ) : sessions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
          <Video size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            {t("patientConsults.emptyTitle", lang)}
          </h2>
          <p className="text-gray-500 text-sm mb-6">{t("patientConsults.emptyBody", lang)}</p>
          <Link
            href="/telemedicine"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800"
          >
            {t("patientConsults.seeTelemedicine", lang)} <ChevronRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                {t("patientConsults.upcoming", lang)} ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.map((s) => (
                  <ConsultationCard key={s.id} session={s} lang={lang} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                {t("patientConsults.past", lang)} ({past.length})
              </h2>
              <div className="space-y-3">
                {past.map((s) => (
                  <ConsultationCard key={s.id} session={s} past lang={lang} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ConsultationCard({ session, past, lang }) {
  const scheduled = new Date(session.scheduled_at);
  const isToday = scheduled.toDateString() === new Date().toDateString();
  const isSoon = isToday && scheduled.getTime() - Date.now() < 30 * 60 * 1000;
  const locale = localeOf(lang);

  return (
    <div
      className={`bg-white border rounded-2xl p-5 transition ${
        past
          ? "border-gray-200 opacity-75"
          : isSoon
          ? "border-teal-500 shadow-md"
          : "border-gray-200 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            past
              ? "bg-gray-100 text-gray-500"
              : isSoon
              ? "bg-teal-100 text-teal-700"
              : "bg-blue-100 text-blue-600"
          }`}
        >
          <Video size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[clamp(24px,2.5vw,32px)] font-bold text-gray-900">
              {session.hospitals?.name || t("patientConsults.sessionFallback", lang)}
            </h3>
            {session.partner_doctors?.name_ko && (
              <span className="text-sm text-gray-600">
                Dr. {session.partner_doctors.name_ko}
                {session.partner_doctors.subspecialty && (
                  <span className="text-gray-500">
                    {" "}
                    · {session.partner_doctors.subspecialty}
                  </span>
                )}
              </span>
            )}
            {isSoon && (
              <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">
                {t("patientConsults.startingSoon", lang)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {kstDate(scheduled, locale, {
                month: "short",
                day: "numeric",
                weekday: "short",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {kstTime(scheduled, locale, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {session.hospitals?.address && (
              <span className="flex items-center gap-1 text-xs truncate max-w-xs">
                <MapPin size={12} />
                {session.hospitals.address}
              </span>
            )}
          </div>
          {session.notes && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">
              {session.notes}
            </p>
          )}
        </div>
        {!past && (
          <Link
            href={`/consultation/${session.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800 transition flex-shrink-0"
          >
            <Phone size={16} />
            {t("patientConsults.join", lang)}
          </Link>
        )}
      </div>
    </div>
  );
}
