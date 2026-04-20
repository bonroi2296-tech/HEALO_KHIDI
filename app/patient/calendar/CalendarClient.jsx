"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "../../../components/healo/PageShell";
import { Eyebrow, Rule, Chip, ButtonGold, LinkArrow } from "../../../components/healo/Primitives";
import { useLang } from "../../../src/lib/i18n/LangContext";
import { createSupabaseBrowserClient } from "../../../src/lib/supabase/browser";
import { fetchPatientJourney } from "../../../src/lib/patient/journeyState";

const COPY = {
  en: {
    heroEyebrow: "Calendar",
    heroTitle: "Your schedule,",
    heroTitleItalic: "at a glance.",
    heroLede: "All consultations, follow-up milestones, and recommended re-bookings in one view.",
    monthView: "Month",
    listView: "List",
    noEvents: "No scheduled events yet.",
    loginRequired: "Please sign in to view your calendar.",
    today: "Today",
    types: {
      consultation: "Consultation",
      followup: "Follow-up",
      rebooking: "Rebooking",
      deadline: "Deadline",
    },
    previous: "Previous",
    next: "Next",
    join: "Join",
    daysOfWeek: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },
  ko: {
    heroEyebrow: "캘린더",
    heroTitle: "모든 일정을",
    heroTitleItalic: "한 눈에.",
    heroLede: "상담, 사후관리 일정, 권장 재예약을 한 화면에 모았습니다.",
    monthView: "월간",
    listView: "목록",
    noEvents: "예정된 일정이 없습니다.",
    loginRequired: "캘린더 확인을 위해 로그인해 주세요.",
    today: "오늘",
    types: {
      consultation: "상담",
      followup: "사후관리",
      rebooking: "재예약 권장",
      deadline: "마감",
    },
    previous: "이전",
    next: "다음",
    join: "참여",
    daysOfWeek: ["일", "월", "화", "수", "목", "금", "토"],
  },
};

export default function CalendarClient() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;

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
          title: copy.types.consultation,
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
        title: copy.types.followup,
        sub: journey.followup.current_phase || "",
      });
    }

    // Events from inquiry_events that are visit-related
    (journey.events || []).forEach((e) => {
      if (e.event_type === "visa_deadline" && e.metadata?.deadline) {
        list.push({
          id: `deadline-${e.id}`,
          type: "deadline",
          date: new Date(e.metadata.deadline),
          title: copy.types.deadline,
          sub: e.metadata.note || "",
        });
      }
    });

    return list.sort((a, b) => a.date - b.date);
  }, [journey, lang]);

  if (!loading && !user) {
    return (
      <PageShell
        current=""
        heroEyebrow={copy.heroEyebrow}
        heroTitle={copy.heroTitle}
        heroTitleItalic={copy.heroTitleItalic}
      >
        <div style={{ padding: "72px 24px", textAlign: "center" }}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "var(--fg-on-light-3)",
              marginBottom: 24,
            }}
          >
            {copy.loginRequired}
          </p>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <ButtonGold>Sign in</ButtonGold>
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      current=""
      heroEyebrow={copy.heroEyebrow}
      heroTitle={copy.heroTitle}
      heroTitleItalic={copy.heroTitleItalic}
      heroLede={copy.heroLede}
    >
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
                {cursor.toLocaleString(lang === "ko" ? "ko-KR" : "en-US", {
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
                <IconBtn onClick={() => setCursor(new Date())}>{copy.today}</IconBtn>
                <IconBtn
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                >
                  →
                </IconBtn>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <ViewTab active={view === "month"} onClick={() => setView("month")}>
                {copy.monthView}
              </ViewTab>
              <ViewTab active={view === "list"} onClick={() => setView("list")}>
                {copy.listView}
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
              {copy.noEvents}
            </p>
          ) : view === "month" ? (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <div style={{ minWidth: 700 }}>
                <MonthGrid cursor={cursor} events={events} daysOfWeek={copy.daysOfWeek} copy={copy} lang={lang} />
              </div>
            </div>
          ) : (
            <ListView events={events} copy={copy} lang={lang} />
          )}
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 640px) {
          :global(.healo-calendar-list-row) {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
        }
      `}</style>
    </PageShell>
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

function MonthGrid({ cursor, events, daysOfWeek, copy, lang }) {
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
    if (e.date.getFullYear() === year && e.date.getMonth() === month) {
      const d = e.date.getDate();
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
            copy={copy}
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({ day, isToday, isWeekend, events, copy }) {
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
          <EventPill key={e.id} event={e} copy={copy} />
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

function EventPill({ event, copy }) {
  const colors = {
    consultation: { bg: "var(--ink-0)", fg: "var(--gold-0)" },
    followup: { bg: "var(--gold-0)", fg: "var(--ink-0)" },
    rebooking: { bg: "var(--cream-2)", fg: "var(--ink-0)" },
    deadline: { bg: "#8c3a2e", fg: "var(--cream-0)" },
  };
  const c = colors[event.type] || colors.consultation;

  const time = event.date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

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

function ListView({ events, copy, lang }) {
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
        {copy.noEvents}
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
              {e.date.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
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
              {e.date.toLocaleTimeString(lang === "ko" ? "ko-KR" : "en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          </div>
          <div>
            <Chip tone={e.type === "deadline" ? "warn" : e.type === "followup" ? "gold" : "ink"}>
              {copy.types[e.type] || e.type}
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
              <LinkArrow>{copy.join} →</LinkArrow>
            </Link>
          ) : (
            <span />
          )}
        </div>
      ))}
    </div>
  );
}
