"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { kstDate, kstTime, kstDateParts } from "@/lib/datetime/kst";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/LangContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { fetchPatientJourney } from "@/lib/patient/journeyState";

// 이벤트 종류(코드) → 표시 라벨 i18n 키. 코드 값은 DB/로직용이라 그대로 둔다.
const TYPE_LABEL_KEYS = {
  consultation: "patientCalendar.types.consultation",
  followup: "patientCalendar.types.followup",
  rebooking: "patientCalendar.types.rebooking",
  deadline: "patientCalendar.types.deadline",
};

// 사후관리 케이던스 action(snake_case 코드) → 표시 라벨 i18n 키
const CADENCE_LABEL_KEYS = {
  survey: "patientCalendar.types.cadence.survey",
  medication_check: "patientCalendar.types.cadence.medicationCheck",
  video_call: "patientCalendar.types.cadence.videoCall",
  lab_review: "patientCalendar.types.cadence.labReview",
};

// 요일 헤더(일~토 순서 고정 — getDay() 인덱스와 1:1)
const DOW_KEYS = [
  "patientCalendar.dow.sun",
  "patientCalendar.dow.mon",
  "patientCalendar.dow.tue",
  "patientCalendar.dow.wed",
  "patientCalendar.dow.thu",
  "patientCalendar.dow.fri",
  "patientCalendar.dow.sat",
];

const LOCALES = {
  en: "en-US",
  ko: "ko-KR",
  ru: "ru-RU",
  kz: "kk-KZ",
  zh: "zh-CN",
  ja: "ja-JP",
};

const localeFor = (lang) => LOCALES[lang] || "en-US";

/**
 * 이벤트 종류별 색 — 기본 톤(teal). 두 자리에서 쓴다.
 *  · pill  = 월간 격자의 좁은 알약. 칸이 작아 «채움»으로 위계를 준다.
 *  · badge = 목록 보기의 라벨. 옆에 제목·부제가 있으므로 연한 배경으로 눌러 준다.
 * 대비는 DESIGN.md 4-b 기준 — 흰 글씨는 700번대(teal-700 5.47:1 · red-600 4.83:1) 위에만 얹는다.
 */
const EVENT_STYLES = {
  consultation: {
    pill: "bg-teal-700 text-white",
    badge: "bg-teal-50 text-teal-700 border-teal-100",
  },
  followup: {
    pill: "bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-100",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  rebooking: {
    pill: "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200",
    badge: "bg-gray-100 text-gray-700 border-gray-200",
  },
  deadline: {
    pill: "bg-red-600 text-white",
    badge: "bg-red-50 text-red-700 border-red-100",
  },
};

const styleFor = (type) => EVENT_STYLES[type] || EVENT_STYLES.consultation;

export default function CalendarClient() {
  const lang = useLang();
  const heroTitle = t("patientCalendar.heroTitle", lang);
  const heroTitleItalic = t("patientCalendar.heroTitleItalic", lang);

  const [user, setUser] = useState(null);
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(new Date()); // Month cursor

  // 모바일에서는 기본 list view
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setView("list");
    }
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      setUser(session.user);
      const j = await fetchPatientJourney();
      setJourney(j);
      setLoading(false);
    })();
  }, []);

  // Aggregate events
  const events = useMemo(() => {
    if (!journey) return [];
    const list = [];

    (journey.consultations || []).forEach((c) => {
      if (c.scheduled_at) {
        list.push({
          id: `cons-${c.id}`,
          type: "consultation",
          date: new Date(c.scheduled_at),
          title: t("patientCalendar.types.consultation", lang),
          sub: c.session_type || "",
          href: `/consultation/${c.id}`,
          status: c.status,
        });
      }
    });

    if (journey.followup?.next_action_at) {
      list.push({
        id: `followup-${journey.followup.id}`,
        type: "followup",
        date: new Date(journey.followup.next_action_at),
        title: t("patientCalendar.types.followup", lang),
        // 케이던스 제안(cron 생성)은 phase 원문(week_2 등 영어 키) 대신 action 라벨로(6개 언어)
        sub:
          journey.followup.schedule?.kind === "cadence"
            ? (CADENCE_LABEL_KEYS[journey.followup.schedule.action]
                ? t(CADENCE_LABEL_KEYS[journey.followup.schedule.action], lang)
                : "")
            : journey.followup.current_phase || "",
      });
    }

    // Events from inquiry_events that are visit-related
    (journey.events || []).forEach((e) => {
      if (e.event_type === "visa_deadline" && e.metadata?.deadline) {
        list.push({
          id: `deadline-${e.id}`,
          type: "deadline",
          date: new Date(e.metadata.deadline),
          title: t("patientCalendar.types.deadline", lang),
          sub: e.metadata.note || "",
        });
      }
    });

    return list.sort((a, b) => a.date - b.date);
  }, [journey, lang]);

  const hero = (
    <div className="px-4 md:px-6 pt-6">
      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
        {t("patientCalendar.heroEyebrow", lang)}
      </p>
      <h1 className="mt-1 text-3xl md:text-4xl font-bold text-gray-900">
        {heroTitle}
        {heroTitleItalic ? ` ${heroTitleItalic}` : ""}
      </h1>
    </div>
  );

  if (!loading && !user) {
    return (
      <main className="max-w-[1240px] mx-auto pt-16">
        {hero}
        <div className="px-4 md:px-6 py-16 text-center">
          <p className="text-sm md:text-base text-gray-600 mb-5">
            {t("patientCalendar.loginRequired", lang)}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center px-6 py-3 rounded-xl bg-teal-700 text-white text-sm font-bold hover:bg-teal-800 transition-all duration-200"
          >
            {t("patientCalendar.signIn", lang)}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1240px] mx-auto pt-16">
      {hero}
      <section className="px-4 md:px-6 py-8 md:py-10 pb-20">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 tabular-nums">
              {cursor.toLocaleString(localeFor(lang), {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <div className="flex items-center gap-1.5">
              <IconBtn
                label={t("patientCalendar.previous", lang)}
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              >
                <ChevronLeft size={16} />
              </IconBtn>
              <IconBtn onClick={() => setCursor(new Date())}>{t("patientCalendar.today", lang)}</IconBtn>
              <IconBtn
                label={t("patientCalendar.next", lang)}
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              >
                <ChevronRight size={16} />
              </IconBtn>
            </div>
          </div>
          <div className="flex gap-1.5">
            <ViewTab active={view === "month"} onClick={() => setView("month")}>
              {t("patientCalendar.monthView", lang)}
            </ViewTab>
            <ViewTab active={view === "list"} onClick={() => setView("list")}>
              {t("patientCalendar.listView", lang)}
            </ViewTab>
          </div>
        </div>

        {loading ? (
          <CalendarSkeleton />
        ) : events.length === 0 && view === "list" ? (
          <EmptyState lang={lang} />
        ) : view === "month" ? (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <MonthGrid cursor={cursor} events={events} daysOfWeek={DOW_KEYS.map((k) => t(k, lang))} lang={lang} />
            </div>
          </div>
        ) : (
          <ListView events={events} lang={lang} />
        )}
      </section>
    </main>
  );
}

function IconBtn({ onClick, children, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label || undefined}
      className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 whitespace-nowrap hover:border-teal-400 hover:text-teal-700 transition-all duration-200"
    >
      {children}
    </button>
  );
}

function ViewTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-4 py-2 rounded-xl border text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
        active
          ? "bg-teal-700 text-white border-teal-700"
          : "bg-white text-gray-600 border-gray-300 hover:border-teal-400 hover:text-teal-700"
      }`}
    >
      {children}
    </button>
  );
}

// 로딩 — 스피너 단독 금지(DESIGN.md ux_states). 곧 그려질 모양을 그대로 흉내낸다.
function CalendarSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-16 border-b border-gray-100 last:border-b-0 bg-gray-50 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ lang }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
      <CalendarDays size={28} className="mx-auto mb-3 text-gray-500" aria-hidden="true" />
      <p className="text-sm md:text-base text-gray-600">{t("patientCalendar.noEvents", lang)}</p>
    </div>
  );
}

function MonthGrid({ cursor, events, daysOfWeek, lang }) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();

  const today = new Date();
  const isSameMonth = today.getFullYear() === year && today.getMonth() === month;

  // Group events by day
  const eventsByDay = {};
  events.forEach((e) => {
    const p = kstDateParts(e.date); // KST 달력일로 버킷팅(뷰어 tz 무관 — 자정 근처 날짜밀림 방지)
    if (p.year === year && p.month === month) {
      const d = p.day;
      if (!eventsByDay[d]) eventsByDay[d] = [];
      eventsByDay[d].push(e);
    }
  });

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // 마지막 주를 7칸으로 채운다 — 셀이 없으면 그 자리에 격자 바닥색(gray-200)이 그대로 드러난다.
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* 격자선은 gap-px + 바닥색으로 그린다(셀마다 테두리를 붙이면 끝단이 두 겹이 된다) */}
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {daysOfWeek.map((d, i) => (
          <div
            key={i}
            className={`px-3 py-2.5 bg-gray-50 text-xs font-semibold ${
              i === 0 ? "text-red-600" : "text-gray-600"
            }`}
          >
            {d}
          </div>
        ))}
        {cells.map((d, i) => (
          <DayCell
            key={i}
            day={d}
            isToday={isSameMonth && d === today.getDate()}
            isWeekend={i % 7 === 0}
            events={d ? eventsByDay[d] || [] : []}
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({ day, isToday, isWeekend, events, lang }) {
  return (
    <div className={`min-h-[104px] px-2.5 py-2 ${isToday ? "bg-teal-50" : day ? "bg-white" : "bg-gray-50"}`}>
      {day && (
        <div
          className={`mb-1.5 text-xs tabular-nums ${
            isToday ? "font-bold text-teal-700" : isWeekend ? "text-red-600" : "text-gray-600"
          }`}
        >
          {day}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {events.slice(0, 3).map((e) => (
          <EventPill key={e.id} event={e} lang={lang} />
        ))}
        {events.length > 3 && (
          <div className="text-[10px] tabular-nums text-gray-500">+{events.length - 3}</div>
        )}
      </div>
    </div>
  );
}

function EventPill({ event, lang }) {
  const time = kstTime(event.date, localeFor(lang), { hour: "numeric", minute: "2-digit" });

  const content = (
    <div
      className={`px-2 py-1 rounded-lg text-[11px] font-semibold truncate transition-all duration-200 ${
        styleFor(event.type).pill
      } ${event.href ? "cursor-pointer hover:opacity-90" : ""}`}
      title={event.sub}
    >
      {/* 시각은 굵기로만 눌러 준다 — opacity 로 흐리면 teal-700 위에서 4.13:1 이 되어 AA 미달(2026-08-27 axe 실측) */}
      <span className="mr-1.5 tabular-nums font-normal">{time}</span>
      {event.title}
    </div>
  );

  if (event.href) {
    return (
      <Link href={event.href} className="no-underline">
        {content}
      </Link>
    );
  }
  return content;
}

function ListView({ events, lang }) {
  if (events.length === 0) return <EmptyState lang={lang} />;

  return (
    <ul className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
      {events.map((e) => (
        <li
          key={e.id}
          className="grid grid-cols-1 sm:grid-cols-[150px_1fr_auto] gap-2 sm:gap-5 px-4 py-4 sm:px-5 sm:py-5 items-start sm:items-center"
        >
          <div>
            <div className="text-xs text-gray-500 tabular-nums">
              {kstDate(e.date, localeFor(lang), {
                year: "numeric",
                month: "short",
                day: "2-digit",
              })}
            </div>
            <div className="mt-0.5 text-lg font-bold text-gray-900 tabular-nums">
              {kstTime(e.date, localeFor(lang), {
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          </div>
          <div>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${
                styleFor(e.type).badge
              }`}
            >
              {TYPE_LABEL_KEYS[e.type] ? t(TYPE_LABEL_KEYS[e.type], lang) : e.type}
            </span>
            <div className="mt-1.5 text-base font-bold text-gray-900">{e.title}</div>
            {e.sub && <div className="mt-0.5 text-sm text-gray-500">{e.sub}</div>}
          </div>
          {e.href ? (
            <Link
              href={e.href}
              className="inline-flex items-center gap-1 text-sm font-bold text-teal-700 hover:text-teal-800 whitespace-nowrap transition-all duration-200"
            >
              {t("patientCalendar.join", lang)}
              <ChevronRight size={15} aria-hidden="true" />
            </Link>
          ) : (
            <span />
          )}
        </li>
      ))}
    </ul>
  );
}
