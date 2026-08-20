"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eyebrow, Rule, Chip, ButtonGold, LinkArrow } from "../../../components/healo/Primitives";
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
  // 교육 글 제안(cron 이 단계 도래 시 생성, schedule.kind='education')도 같은 라벨 표를 쓴다.
  education: "patientCalendar.types.cadence.education",
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
          journey.followup.schedule?.kind === "cadence" ||
          journey.followup.schedule?.kind === "education"
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

  if (!loading && !user) {
    return (
      <main style={{ maxWidth: 1240, margin: "0 auto", paddingTop: 64 }}>
        <div style={{ padding: "24px" }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#0f766e" }}>{t("patientCalendar.heroEyebrow", lang)}</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginTop: 4 }}>{heroTitle}{heroTitleItalic ? ` ${heroTitleItalic}` : ""}</h1>
        </div>
        <div style={{ padding: "72px 24px", textAlign: "center" }}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "var(--fg-on-light-3)",
              marginBottom: 24,
            }}
          >
            {t("patientCalendar.loginRequired", lang)}
          </p>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <ButtonGold>{t("patientCalendar.signIn", lang)}</ButtonGold>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1240, margin: "0 auto", paddingTop: 64 }}>
      <div style={{ padding: "24px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#0f766e" }}>{t("patientCalendar.heroEyebrow", lang)}</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginTop: 4 }}>{heroTitle}{heroTitleItalic ? ` ${heroTitleItalic}` : ""}</h1>
      </div>
      <section style={{ padding: "48px 24px 96px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 24,
                  fontWeight: 500,
                  color: "var(--fg-on-light-1)",
                }}
              >
                {cursor.toLocaleString(localeFor(lang), {
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <IconBtn
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                >
                  ←
                </IconBtn>
                <IconBtn onClick={() => setCursor(new Date())}>{t("patientCalendar.today", lang)}</IconBtn>
                <IconBtn
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                >
                  →
                </IconBtn>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <ViewTab active={view === "month"} onClick={() => setView("month")}>
                {t("patientCalendar.monthView", lang)}
              </ViewTab>
              <ViewTab active={view === "list"} onClick={() => setView("list")}>
                {t("patientCalendar.listView", lang)}
              </ViewTab>
            </div>
          </div>

          {loading ? (
            <p
              style={{
                padding: 72,
                textAlign: "center",
                color: "var(--fg-on-light-3)",
                fontStyle: "italic",
                fontFamily: "var(--font-serif)",
              }}
            >
              —
            </p>
          ) : events.length === 0 && view === "list" ? (
            <p
              style={{
                padding: 72,
                textAlign: "center",
                color: "var(--fg-on-light-3)",
                fontStyle: "italic",
                fontFamily: "var(--font-serif)",
              }}
            >
              {t("patientCalendar.noEvents", lang)}
            </p>
          ) : view === "month" ? (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <div style={{ minWidth: 700 }}>
                <MonthGrid cursor={cursor} events={events} daysOfWeek={DOW_KEYS.map((k) => t(k, lang))} lang={lang} />
              </div>
            </div>
          ) : (
            <ListView events={events} lang={lang} />
          )}
        </div>
      </section>

      {/* styled-jsx silently no-ops in the App Router (POSTMORTEMS #113) — plain style tag. */}
      <style>{`
        @media (max-width: 640px) {
          .healo-calendar-list-row {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
        }
      `}</style>
    </main>
  );
}

function IconBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "1px solid var(--cream-2)",
        padding: "6px 14px",
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--fg-on-light-1)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function ViewTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "var(--ink-0)" : "transparent",
        color: active ? "var(--gold-0)" : "var(--fg-on-light-2)",
        border: `1px solid ${active ? "var(--ink-0)" : "var(--cream-2)"}`,
        padding: "6px 14px",
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      {children}
    </button>
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

  return (
    <div>
      {/* Day headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          borderTop: "1px solid var(--gold-tint)",
          borderLeft: "1px solid var(--cream-2)",
        }}
      >
        {daysOfWeek.map((d, i) => (
          <div
            key={i}
            style={{
              padding: "10px 12px",
              borderRight: "1px solid var(--cream-2)",
              borderBottom: "1px solid var(--cream-2)",
              background: "var(--paper)",
              fontFamily: "var(--font-sans)",
              fontSize: 9,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: i === 0 ? "var(--danger, #8c3a2e)" : "var(--fg-on-light-3)",
              fontWeight: 600,
            }}
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
    <div
      style={{
        minHeight: 110,
        padding: "8px 10px",
        borderRight: "1px solid var(--cream-2)",
        borderBottom: "1px solid var(--cream-2)",
        background: isToday ? "var(--gold-wash)" : day ? "var(--cream-0)" : "var(--paper)",
        position: "relative",
      }}
    >
      {day && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: isToday ? 700 : 400,
            color: isToday
              ? "var(--gold-2)"
              : isWeekend
              ? "var(--danger, #8c3a2e)"
              : "var(--fg-on-light-2)",
            marginBottom: 6,
          }}
        >
          {String(day).padStart(2, "0")}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {events.slice(0, 3).map((e) => (
          <EventPill key={e.id} event={e} lang={lang} />
        ))}
        {events.length > 3 && (
          <div style={{ fontSize: 10, color: "var(--fg-on-light-4)", fontFamily: "var(--font-mono)" }}>
            +{events.length - 3}
          </div>
        )}
      </div>
    </div>
  );
}

function EventPill({ event, lang }) {
  const colors = {
    consultation: { bg: "var(--ink-0)", fg: "var(--gold-0)" },
    followup: { bg: "var(--gold-0)", fg: "var(--ink-0)" },
    rebooking: { bg: "var(--cream-2)", fg: "var(--ink-0)" },
    deadline: { bg: "#8c3a2e", fg: "var(--cream-0)" },
  };
  const c = colors[event.type] || colors.consultation;

  const time = kstTime(event.date, localeFor(lang), { hour: "numeric", minute: "2-digit" });

  const content = (
    <div
      style={{
        background: c.bg,
        color: c.fg,
        padding: "3px 8px",
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        cursor: event.href ? "pointer" : "default",
      }}
      title={event.sub}
    >
      <span style={{ fontFamily: "var(--font-mono)", marginRight: 6, opacity: 0.7 }}>{time}</span>
      {event.title}
    </div>
  );

  if (event.href) {
    return (
      <Link href={event.href} style={{ textDecoration: "none" }}>
        {content}
      </Link>
    );
  }
  return content;
}

function ListView({ events, lang }) {
  if (events.length === 0) {
    return (
      <p
        style={{
          padding: 72,
          textAlign: "center",
          color: "var(--fg-on-light-3)",
          fontStyle: "italic",
          fontFamily: "var(--font-serif)",
        }}
      >
        {t("patientCalendar.noEvents", lang)}
      </p>
    );
  }

  return (
    <div style={{ borderTop: "1px solid var(--gold-tint)" }}>
      {events.map((e) => (
        <div
          key={e.id}
          className="healo-calendar-list-row"
          style={{
            display: "grid",
            gridTemplateColumns: "140px 1fr auto",
            gap: 24,
            padding: "20px 16px",
            borderBottom: "1px solid var(--cream-2)",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-on-light-3)",
                letterSpacing: "0.1em",
              }}
            >
              {kstDate(e.date, localeFor(lang), {
                year: "numeric",
                month: "short",
                day: "2-digit",
              })}
            </div>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 20,
                fontWeight: 500,
                color: "var(--fg-on-light-1)",
                marginTop: 2,
              }}
            >
              {kstTime(e.date, localeFor(lang), {
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          </div>
          <div>
            <Chip tone={e.type === "deadline" ? "warn" : e.type === "followup" ? "gold" : "ink"}>
              {TYPE_LABEL_KEYS[e.type] ? t(TYPE_LABEL_KEYS[e.type], lang) : e.type}
            </Chip>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 18,
                fontWeight: 500,
                color: "var(--fg-on-light-1)",
                marginTop: 8,
              }}
            >
              {e.title}
            </div>
            {e.sub && (
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--fg-on-light-3)",
                  marginTop: 4,
                }}
              >
                {e.sub}
              </div>
            )}
          </div>
          {e.href ? (
            <Link href={e.href} style={{ textDecoration: "none" }}>
              <LinkArrow>{t("patientCalendar.join", lang)} →</LinkArrow>
            </Link>
          ) : (
            <span />
          )}
        </div>
      ))}
    </div>
  );
}
