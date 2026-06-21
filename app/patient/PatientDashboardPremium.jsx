"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import PageShell from "../../components/healo/PageShell";
import {
  Eyebrow,
  Rule,
  ButtonGold,
  LinkArrow,
  Chip,
  FilmGrain,
} from "../../components/healo/Primitives";
import { useLang } from "@/lib/i18n/LangContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  fetchPatientJourney,
  computeCurrentStage,
  computeStageProgress,
  computeNextActions,
  computeDayCount,
  aggregateSymptomsByDay,
  JOURNEY_STAGES,
} from "@/lib/patient/journeyState";

const COPY = {
  en: {
    loginTitle: "Sign in to your care",
    loginBody: "Your healwith care journey is private and secure. Please sign in to view your dashboard.",
    loginBtn: "Sign in",
    welcome: "Welcome back",
    journey: "Your journey",
    dday: (d) => `Day ${d} since treatment began`,
    ddayBefore: (d) => `${Math.abs(d)} days until treatment`,
    nextActions: "Next",
    noActions: "Nothing urgent. Take a breath.",
    quickLinks: "Quick access",
    symptomsChart: "Symptom trend (last 30 days)",
    noSymptoms: "No symptoms logged yet.",
    inbox: "Inbox",
    documents: "Documents",
    education: "Learn",
    symptoms: "Symptoms",
    rebooking: "Rebook",
    chat: "AI assistant",
    calendar: "Calendar",
    visa: "Visa",
    unreadMessages: (n) => `${n} unread`,
    footerNote: "All data is encrypted end-to-end. Contact your coordinator for any concerns.",
  },
  ko: {
    loginTitle: "내 치료 여정에 로그인",
    loginBody: "healwith의 치료 여정은 비공개로 안전하게 관리됩니다. 대시보드 확인을 위해 로그인해 주세요.",
    loginBtn: "로그인",
    welcome: "다시 오신 것을 환영합니다",
    journey: "당신의 여정",
    dday: (d) => `치료 시작 후 ${d}일차`,
    ddayBefore: (d) => `치료까지 ${Math.abs(d)}일`,
    nextActions: "다음 할 일",
    noActions: "긴급한 일은 없습니다. 편히 쉬세요.",
    quickLinks: "빠른 메뉴",
    symptomsChart: "증상 추이 (최근 30일)",
    noSymptoms: "증상 기록이 아직 없습니다.",
    inbox: "메시지",
    documents: "의료 문서",
    education: "건강 교육",
    symptoms: "증상 기록",
    rebooking: "재예약",
    chat: "AI 상담",
    calendar: "캘린더",
    visa: "비자",
    unreadMessages: (n) => `읽지 않음 ${n}`,
    footerNote: "모든 데이터는 종단 간 암호화되어 있습니다. 문의사항은 코디네이터에게 연락 주세요.",
  },
};

const QUICK_LINKS = [
  { key: "inbox", href: "/patient/messages" },
  { key: "chat", href: "/patient/chat" },
  { key: "calendar", href: "/patient/calendar" },
  { key: "documents", href: "/patient/documents" },
  { key: "symptoms", href: "/patient/symptoms" },
  { key: "rebooking", href: "/patient/rebooking" },
  { key: "visa", href: "/visa" },
  { key: "education", href: "/education" },
];

export default function PatientDashboardPremium() {
  const _router = useRouter();
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);

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

      // 비환자 계정(에이전시·병원·코디·의사·관리자)은 환자 대시보드 대신
      // 자기 포털로 자동 이동 — 이미 로그인된 채 /patient 로 와도 튕겨냄.
      try {
        const token = session.access_token;
        const meRes = await fetch("/api/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
          cache: "no-store",
        });
        const me = await meRes.json();
        if (me?.ok && me.landing && me.landing !== "/patient") {
          _router.replace(me.landing);
          return;
        }
      } catch (_ignore) {
        /* 실패 시 환자 대시보드 그대로 표시 */
      }

      setUser(session.user);

      try {
        const journey = await fetchPatientJourney();
        setData(journey);
      } catch (e) {
        console.error("[dashboard] fetch error", e);
      }
      setLoading(false);
    })();
  }, []);

  // Not logged in
  if (!loading && !user) {
    return (
      <PageShell current="" noHero>
        <section
          style={{
            position: "relative",
            background: "var(--ink-0)",
            color: "var(--fg-on-dark-1)",
            padding: "128px 24px",
            minHeight: "70vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <FilmGrain />
          <div style={{ position: "relative", maxWidth: 560, textAlign: "center" }}>
            <Eyebrow>Dashboard</Eyebrow>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(40px, 5vw, 64px)",
                lineHeight: 1.1,
                margin: "24px 0 16px",
              }}
            >
              {copy.loginTitle}
            </h1>
            <Rule width={64} style={{ margin: "24px auto" }} />
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                lineHeight: 1.7,
                color: "var(--fg-on-dark-2)",
                margin: "24px 0 40px",
              }}
            >
              {copy.loginBody}
            </p>
            <Link href="/login" style={{ textDecoration: "none" }}>
              <ButtonGold>{copy.loginBtn}</ButtonGold>
            </Link>
          </div>
        </section>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell current="" noHero>
        <div style={{ padding: "128px 24px", textAlign: "center" }}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "var(--fg-on-light-3)",
            }}
          >
            —
          </p>
        </div>
      </PageShell>
    );
  }

  const stage = computeCurrentStage(data);
  const stages = computeStageProgress(data);
  const actions = computeNextActions(data, lang);
  const dd = computeDayCount(data);
  const symptomsData = aggregateSymptomsByDay(data?.symptoms || [], 30);

  const firstName =
    data?.inquiry?.first_name ||
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "";

  const currentStageObj = JOURNEY_STAGES.find((s) => s.id === stage);
  const stageLabel = currentStageObj?.label[lang] || currentStageObj?.label.en || stage;

  return (
    <PageShell current="" noHero>
      {/* Header — dark */}
      <section
        style={{
          position: "relative",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          padding: "64px 24px 48px",
          overflow: "hidden",
        }}
      >
        <FilmGrain />
        <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{copy.welcome}</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(40px, 5.5vw, 80px)",
              lineHeight: 1.05,
              letterSpacing: "-0.015em",
              margin: "16px 0 8px",
            }}
          >
            {firstName ? `${firstName}.` : "—"}
          </h1>
          <Rule width={48} />
          <div
            style={{
              display: "flex",
              gap: 24,
              alignItems: "baseline",
              marginTop: 20,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 20,
                color: "var(--gold-0)",
              }}
            >
              {stageLabel}
            </span>
            {dd && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--fg-on-dark-3)",
                  letterSpacing: "0.1em",
                }}
              >
                {dd.days >= 0 ? copy.dday(dd.days) : copy.ddayBefore(dd.days)}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Journey timeline strip */}
      <section
        style={{
          background: "var(--paper)",
          borderTop: "1px solid var(--gold-tint)",
          borderBottom: "1px solid var(--cream-2)",
          padding: "40px 24px",
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ marginBottom: 16 }}>
            <Eyebrow tone="muted">{copy.journey}</Eyebrow>
          </div>
          <JourneyTimeline stages={stages} lang={lang} />
        </div>
      </section>

      {/* Grid: Next actions + Symptoms chart */}
      <section style={{ padding: "72px 24px" }}>
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "5fr 7fr",
            gap: 48,
          }}
          className="healo-dashboard-grid"
        >
          {/* Next actions */}
          <div>
            <Eyebrow>{copy.nextActions}</Eyebrow>
            <Rule />
            <div style={{ marginTop: 24 }}>
              {actions.length === 0 ? (
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: 17,
                    color: "var(--fg-on-light-3)",
                    lineHeight: 1.7,
                  }}
                >
                  {copy.noActions}
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {actions.map((a) => (
                    <ActionRow key={a.id} action={a} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Symptom chart */}
          <div>
            <Eyebrow>{copy.symptomsChart}</Eyebrow>
            <Rule />
            <div
              style={{
                marginTop: 24,
                height: 260,
                background: "var(--paper)",
                border: "1px solid var(--cream-2)",
                padding: "16px 8px 8px 0",
              }}
            >
              {symptomsData.length === 0 ? (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    color: "var(--fg-on-light-4)",
                  }}
                >
                  {copy.noSymptoms}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={symptomsData} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                    <CartesianGrid stroke="#e3dbcc" strokeDasharray="2 2" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#9a9284"
                      tick={{ fontSize: 10, fontFamily: "monospace" }}
                      tickFormatter={(v) => v?.slice(5)}
                    />
                    <YAxis
                      stroke="#9a9284"
                      tick={{ fontSize: 10, fontFamily: "monospace" }}
                      domain={[0, 10]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0a0a0a",
                        border: "1px solid #c8a96a",
                        borderRadius: 0,
                        color: "#f5f0e8",
                        fontSize: 11,
                        fontFamily: "monospace",
                      }}
                      labelStyle={{ color: "#c8a96a" }}
                    />
                    <ReferenceLine y={7} stroke="#b88534" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="avgSeverity"
                      stroke="#c8a96a"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#c8a96a" }}
                      activeDot={{ r: 5 }}
                      name={lang === "ko" ? "평균" : "Avg"}
                    />
                    <Line
                      type="monotone"
                      dataKey="maxSeverity"
                      stroke="#8c3a2e"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      name={lang === "ko" ? "최고" : "Max"}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            {symptomsData.length > 0 && (
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 12,
                  color: "var(--fg-on-light-3)",
                  marginTop: 8,
                }}
              >
                ── Avg severity ···· Max · Amber line = elevated risk threshold
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Quick access grid */}
      <section
        style={{
          padding: "64px 24px 96px",
          background: "var(--cream-0)",
          borderTop: "1px solid var(--cream-2)",
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{copy.quickLinks}</Eyebrow>
          <div
            className="healo-quick-grid"
            style={{
              marginTop: 32,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))",
              gap: 0,
              borderTop: "1px solid var(--gold-tint)",
              borderLeft: "1px solid var(--cream-2)",
            }}
          >
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                style={{
                  padding: "32px 24px",
                  borderRight: "1px solid var(--cream-2)",
                  borderBottom: "1px solid var(--cream-2)",
                  textDecoration: "none",
                  color: "inherit",
                  display: "block",
                  transition: "background 150ms var(--ease-out)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--paper)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--gold-2)",
                    letterSpacing: "0.2em",
                    marginBottom: 12,
                  }}
                >
                  {String(QUICK_LINKS.indexOf(link) + 1).padStart(2, "0")}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 22,
                    fontWeight: 500,
                    color: "var(--fg-on-light-1)",
                  }}
                >
                  {copy[link.key]}
                </div>
              </Link>
            ))}
          </div>

          <p
            style={{
              marginTop: 48,
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 12,
              color: "var(--fg-on-light-3)",
              textAlign: "center",
            }}
          >
            {copy.footerNote}
          </p>
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.healo-dashboard-grid) {
            grid-template-columns: 1fr !important;
            gap: 56px !important;
          }
        }
      `}</style>
    </PageShell>
  );
}

// ============ Sub-components ============

function JourneyTimeline({ stages, lang }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        overflowX: "auto",
        overflowY: "hidden",
        WebkitOverflowScrolling: "touch",
        paddingBottom: 8,
        scrollSnapType: "x mandatory",
      }}
    >
      {stages.map((s, i) => {
        const isActive = s.status === "active";
        const isDone = s.status === "done";
        const label = s.label[lang] || s.label.en;
        return (
          <div
            key={s.id}
            style={{
              flex: "1 1 0",
              minWidth: 120,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              paddingRight: i < stages.length - 1 ? 16 : 0,
              position: "relative",
              scrollSnapAlign: "start",
            }}
          >
            {/* Top bar */}
            <div
              style={{
                height: 2,
                width: "100%",
                background: isDone ? "var(--gold-0)" : isActive ? "var(--gold-0)" : "var(--cream-2)",
                marginBottom: 12,
              }}
            />
            {/* Dot */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 10,
                background: isActive ? "var(--gold-0)" : isDone ? "var(--fg-on-light-2)" : "var(--cream-2)",
                marginBottom: 8,
                boxShadow: isActive ? "0 0 0 4px rgba(200,169,106,0.3)" : "none",
              }}
            />
            {/* Number */}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: isActive ? "var(--gold-2)" : "var(--fg-on-light-4)",
                letterSpacing: "0.2em",
              }}
            >
              {String(s.order).padStart(2, "0")}
            </div>
            {/* Label */}
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: isActive ? 17 : 14,
                fontStyle: isActive ? "italic" : "normal",
                fontWeight: isActive ? 500 : 400,
                color: isActive
                  ? "var(--fg-on-light-1)"
                  : isDone
                  ? "var(--fg-on-light-2)"
                  : "var(--fg-on-light-4)",
                marginTop: 4,
              }}
            >
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionRow({ action }) {
  const isHigh = action.priority === "high";
  const row = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "16px 0",
        borderBottom: "1px solid var(--cream-2)",
        gap: 16,
        cursor: action.href ? "pointer" : "default",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: 8,
          background: isHigh ? "var(--gold-0)" : "var(--fg-on-light-4)",
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 17,
            fontWeight: 400,
            color: "var(--fg-on-light-1)",
            lineHeight: 1.4,
          }}
        >
          {action.label}
        </div>
        {action.sub && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-on-light-3)",
              letterSpacing: "0.1em",
              marginTop: 4,
            }}
          >
            {action.sub}
          </div>
        )}
      </div>
      {action.href && (
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--gold-2)",
          }}
        >
          →
        </span>
      )}
    </div>
  );

  if (action.href) {
    return (
      <Link href={action.href} style={{ textDecoration: "none", color: "inherit" }}>
        {row}
      </Link>
    );
  }
  return row;
}
