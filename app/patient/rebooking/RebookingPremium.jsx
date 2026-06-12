"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "../../../components/healo/PageShell";
import { Eyebrow, Rule, ButtonGold, LinkArrow, Chip } from "../../../components/healo/Primitives";
import { useLang } from "@/lib/i18n/LangContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const COPY = {
  en: {
    heroEyebrow: "Rebooking",
    heroTitle: "Smart",
    heroTitleItalic: "follow-ups.",
    heroLede:
      "When AI detects a pattern or your plan calls for it, we propose a rebooking here. You stay in control — confirm or dismiss.",
    loading: "Loading…",
    loginRequired: "Please sign in to view rebooking recommendations.",
    noRebookings: "No rebooking recommendations right now.",
    activeBookings: "Pending recommendations",
    history: "Booking history",
    trigger: "Triggered by",
    reason: "Reason",
    scheduledFor: "Suggested for",
    confirm: "Confirm booking",
    dismiss: "Dismiss",
    pending: "Pending",
    confirmed: "Confirmed",
    dismissed: "Dismissed",
    triggers: {
      symptom: "Symptom pattern",
      followup: "Follow-up schedule",
      doctor: "Doctor recommendation",
    },
  },
  ko: {
    heroEyebrow: "재예약",
    heroTitle: "똑똑한",
    heroTitleItalic: "사후 예약.",
    heroLede:
      "AI가 패턴을 감지하거나 치료 계획이 요청할 때, 여기서 재진을 제안드립니다. 최종 결정은 당신의 것입니다.",
    loading: "불러오는 중…",
    loginRequired: "재예약 추천 확인을 위해 로그인해 주세요.",
    noRebookings: "현재 추천된 재예약이 없습니다.",
    activeBookings: "대기 중 추천",
    history: "예약 이력",
    trigger: "트리거",
    reason: "사유",
    scheduledFor: "제안된 일정",
    confirm: "예약 확정",
    dismiss: "무시",
    pending: "대기",
    confirmed: "확정",
    dismissed: "무시됨",
    triggers: {
      symptom: "증상 패턴",
      followup: "사후관리 스케줄",
      doctor: "의사 권고",
    },
  },
};

export default function RebookingPremium() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [actingId, setActingId] = useState(null);

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      setUser(session.user);
      const { data } = await supabase
        .from("followup_schedules")
        .select("*")
        .eq("patient_user_id", session.user.id)
        .order("created_at", { ascending: false });
      setSchedules(data || []);
      setLoading(false);
    })();
  }, []);

  async function act(id, status) {
    setActingId(id);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.from("followup_schedules").update({ status }).eq("id", id);
      setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    } finally {
      setActingId(null);
    }
  }

  if (!loading && !user) {
    return (
      <PageShell current="" heroEyebrow={copy.heroEyebrow} heroTitle={copy.heroTitle} heroTitleItalic={copy.heroTitleItalic}>
        <div style={{ padding: "72px 24px", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--fg-on-light-3)", marginBottom: 24 }}>
            {copy.loginRequired}
          </p>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <ButtonGold>Sign in</ButtonGold>
          </Link>
        </div>
      </PageShell>
    );
  }

  const pending = schedules.filter((s) => !s.status || s.status === "pending" || s.status === "proposed");
  const history = schedules.filter((s) => s.status && s.status !== "pending" && s.status !== "proposed");

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
          {/* Pending */}
          <div style={{ marginBottom: 56 }}>
            <Eyebrow>{copy.activeBookings}</Eyebrow>
            <Rule />
            <div style={{ marginTop: 24 }}>
              {loading ? (
                <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--fg-on-light-3)" }}>
                  {copy.loading}
                </p>
              ) : pending.length === 0 ? (
                <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 18, color: "var(--fg-on-light-3)", padding: "32px 0" }}>
                  {copy.noRebookings}
                </p>
              ) : (
                pending.map((s) => (
                  <RebookCard
                    key={s.id}
                    rebooking={s}
                    copy={copy}
                    lang={lang}
                    onConfirm={() => act(s.id, "confirmed")}
                    onDismiss={() => act(s.id, "dismissed")}
                    loading={actingId === s.id}
                  />
                ))
              )}
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div>
              <Eyebrow tone="muted">{copy.history}</Eyebrow>
              <div style={{ marginTop: 16, borderTop: "1px solid var(--cream-2)" }}>
                {history.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      padding: "14px 0",
                      borderBottom: "1px solid var(--cream-2)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: 16,
                          color: "var(--fg-on-light-2)",
                        }}
                      >
                        {s.cancer_type || "Follow-up"} · {s.current_phase || "—"}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-on-light-4)", marginTop: 4 }}>
                        {new Date(s.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Chip tone={s.status === "confirmed" ? "success" : "cream"}>
                      {copy[s.status] || s.status}
                    </Chip>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function RebookCard({ rebooking, copy, lang, onConfirm, onDismiss, loading }) {
  const triggerKey = rebooking.metadata?.trigger || "followup";
  const reason = rebooking.metadata?.reason || rebooking.current_phase || "";
  const scheduledAt = rebooking.next_action_at;

  return (
    <div
      style={{
        padding: "28px 32px",
        border: "1px solid var(--gold-tint)",
        background: "var(--paper)",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Chip tone="gold">{copy.triggers[triggerKey] || triggerKey}</Chip>
        <Chip tone="cream">{rebooking.cancer_type || "Cancer follow-up"}</Chip>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 24 }} className="healo-rebook-meta">
        {scheduledAt && (
          <Field label={copy.scheduledFor}>
            {new Date(scheduledAt).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Field>
        )}
        {reason && <Field label={copy.reason}>{reason}</Field>}
        {rebooking.current_phase && <Field label="Phase">{rebooking.current_phase}</Field>}
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <ButtonGold onClick={onConfirm} style={{ opacity: loading ? 0.5 : 1 }}>
          {loading ? "…" : copy.confirm}
        </ButtonGold>
        <button
          onClick={onDismiss}
          disabled={loading}
          style={{
            background: "transparent",
            border: 0,
            padding: "14px 4px",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--fg-on-light-3)",
            borderBottom: "1px solid var(--fg-on-light-4)",
          }}
        >
          {copy.dismiss}
        </button>
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          :global(.healo-rebook-meta) {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "var(--fg-on-light-3)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--fg-on-light-1)" }}>
        {children}
      </div>
    </div>
  );
}
