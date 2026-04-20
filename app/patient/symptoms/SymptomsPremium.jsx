"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import PageShell from "../../../components/healo/PageShell";
import { Eyebrow, Rule, ButtonGold, Chip } from "../../../components/healo/Primitives";
import { useLang } from "../../../src/lib/i18n/LangContext";
import { createSupabaseBrowserClient } from "../../../src/lib/supabase/browser";
import { aggregateSymptomsByDay } from "../../../src/lib/patient/journeyState";

const COPY = {
  en: {
    heroEyebrow: "Symptom log",
    heroTitle: "Track how you",
    heroTitleItalic: "really feel.",
    heroLede:
      "Log symptoms as they come. Our AI watches for concerning patterns and suggests a follow-up if needed.",
    loginRequired: "Please sign in to log your symptoms.",
    addSymptom: "Add a symptom",
    symptomName: "Symptom",
    severity: "Severity (1–10)",
    duration: "Duration",
    notes: "Notes (optional)",
    submit: "Submit report",
    submitting: "Analyzing…",
    trend: "30-day trend",
    recent: "Recent reports",
    noReports: "No reports yet.",
    aiAssessment: "AI assessment",
    riskScore: "Risk score",
    durationUnits: ["hours", "days", "weeks"],
    placeholders: {
      symptom: "e.g. Nausea, headache, fatigue",
      notes: "Context that might help the doctor",
    },
  },
  ko: {
    heroEyebrow: "증상 기록",
    heroTitle: "실제로 어떤지",
    heroTitleItalic: "기록하세요.",
    heroLede:
      "증상이 생길 때마다 바로 기록해 주세요. AI가 패턴을 지켜보다가 필요하면 재진을 제안합니다.",
    loginRequired: "증상 기록을 위해 로그인해 주세요.",
    addSymptom: "증상 추가",
    symptomName: "증상명",
    severity: "심각도 (1-10)",
    duration: "지속 시간",
    notes: "메모 (선택)",
    submit: "보고서 제출",
    submitting: "분석 중…",
    trend: "30일 추이",
    recent: "최근 보고",
    noReports: "아직 보고된 증상이 없습니다.",
    aiAssessment: "AI 분석",
    riskScore: "위험도",
    durationUnits: ["시간", "일", "주"],
    placeholders: {
      symptom: "예: 메스꺼움, 두통, 피로",
      notes: "의사에게 도움될 수 있는 맥락",
    },
  },
};

export default function SymptomsPremium() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({
    name: "",
    severity: 5,
    durationValue: "1",
    durationUnit: "days",
    notes: "",
  });

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
        .from("symptom_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);

      setReports(data || []);
      setLoading(false);
    })();
  }, []);

  const chartData = aggregateSymptomsByDay(reports, 30);

  async function submit() {
    if (!form.name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/khidi/followup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          symptoms: [
            {
              name: form.name,
              severity: Number(form.severity),
              duration: `${form.durationValue} ${form.durationUnit}`,
              notes: form.notes,
            },
          ],
          report_type: "self",
        }),
      });

      if (res.ok) {
        // Reload
        const { data } = await supabase
          .from("symptom_reports")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(60);
        setReports(data || []);
        setForm({ name: "", severity: 5, durationValue: "1", durationUnit: "days", notes: "" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && !user) {
    return (
      <PageShell
        current=""
        heroEyebrow={copy.heroEyebrow}
        heroTitle={copy.heroTitle}
        heroTitleItalic={copy.heroTitleItalic}
      >
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

  return (
    <PageShell
      current=""
      heroEyebrow={copy.heroEyebrow}
      heroTitle={copy.heroTitle}
      heroTitleItalic={copy.heroTitleItalic}
      heroLede={copy.heroLede}
    >
      <section style={{ padding: "48px 24px 96px" }}>
        <div
          className="healo-sx-grid"
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "5fr 7fr",
            gap: 56,
            alignItems: "start",
          }}
        >
          {/* Left: Form */}
          <div>
            <Eyebrow>{copy.addSymptom}</Eyebrow>
            <Rule />
            <div style={{ marginTop: 24 }}>
              <UnderlineField
                label={copy.symptomName}
                placeholder={copy.placeholders.symptom}
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
              />

              <div style={{ marginBottom: 28 }}>
                <SmallLabel>{copy.severity}</SmallLabel>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value })}
                    style={{ flex: 1, accentColor: "var(--gold-0)" }}
                  />
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 32,
                      fontWeight: 500,
                      color:
                        form.severity >= 8
                          ? "#8c3a2e"
                          : form.severity >= 5
                          ? "var(--gold-2)"
                          : "var(--fg-on-light-2)",
                      minWidth: 36,
                      textAlign: "right",
                    }}
                  >
                    {form.severity}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <SmallLabel>{copy.duration}</SmallLabel>
                <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "flex-end" }}>
                  <input
                    type="number"
                    min={1}
                    value={form.durationValue}
                    onChange={(e) => setForm({ ...form, durationValue: e.target.value })}
                    style={{
                      width: 80,
                      border: 0,
                      borderBottom: "1px solid var(--fg-on-light-4)",
                      padding: "10px 0",
                      fontFamily: "var(--font-serif)",
                      fontSize: 20,
                      background: "transparent",
                      outline: "none",
                    }}
                  />
                  <select
                    value={form.durationUnit}
                    onChange={(e) => setForm({ ...form, durationUnit: e.target.value })}
                    style={{
                      border: 0,
                      borderBottom: "1px solid var(--fg-on-light-4)",
                      padding: "10px 0",
                      fontFamily: "var(--font-serif)",
                      fontSize: 18,
                      background: "transparent",
                      outline: "none",
                      color: "var(--fg-on-light-2)",
                    }}
                  >
                    {["hours", "days", "weeks"].map((u, i) => (
                      <option key={u} value={u}>
                        {copy.durationUnits[i]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <UnderlineField
                label={copy.notes}
                placeholder={copy.placeholders.notes}
                value={form.notes}
                onChange={(v) => setForm({ ...form, notes: v })}
                multiline
              />

              <div style={{ marginTop: 32 }}>
                <ButtonGold onClick={submit}>
                  {submitting ? copy.submitting : copy.submit}
                </ButtonGold>
              </div>
            </div>
          </div>

          {/* Right: Chart + Recent reports */}
          <div>
            <Eyebrow>{copy.trend}</Eyebrow>
            <Rule />
            <div
              style={{
                marginTop: 24,
                height: 320,
                background: "var(--paper)",
                border: "1px solid var(--cream-2)",
                padding: "16px 8px 8px 0",
              }}
            >
              {chartData.length === 0 ? (
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
                  —
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                    <CartesianGrid stroke="#e3dbcc" strokeDasharray="2 2" vertical={false} />
                    <XAxis dataKey="date" stroke="#9a9284" tick={{ fontSize: 10, fontFamily: "monospace" }} tickFormatter={(v) => v?.slice(5)} />
                    <YAxis stroke="#9a9284" tick={{ fontSize: 10, fontFamily: "monospace" }} domain={[0, 10]} />
                    <Tooltip
                      contentStyle={{
                        background: "#0a0a0a",
                        border: "1px solid #c8a96a",
                        borderRadius: 0,
                        color: "#f5f0e8",
                        fontSize: 11,
                        fontFamily: "monospace",
                      }}
                    />
                    <ReferenceLine y={7} stroke="#b88534" strokeDasharray="3 3" />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-sans)" }} />
                    <Line
                      type="monotone"
                      dataKey="avgSeverity"
                      stroke="#c8a96a"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#c8a96a" }}
                      name={lang === "ko" ? "평균 심각도" : "Avg severity"}
                    />
                    <Line
                      type="monotone"
                      dataKey="maxSeverity"
                      stroke="#8c3a2e"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      name={lang === "ko" ? "최고 심각도" : "Max severity"}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Recent reports list */}
            <div style={{ marginTop: 48 }}>
              <Eyebrow>{copy.recent}</Eyebrow>
              <div style={{ marginTop: 16, borderTop: "1px solid var(--gold-tint)" }}>
                {reports.slice(0, 10).map((r) => {
                  const items = Array.isArray(r.symptoms?.items) ? r.symptoms.items : (Array.isArray(r.symptoms) ? r.symptoms : []);
                  const first = items[0];
                  const risk = r.ai_risk_score || 0;
                  return (
                    <div
                      key={r.id}
                      style={{
                        padding: "16px 0",
                        borderBottom: "1px solid var(--cream-2)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 12 }}>
                        <div style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 500, color: "var(--fg-on-light-1)" }}>
                          {first?.name || r.report_type || "symptom"}
                          {items.length > 1 && (
                            <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg-on-light-3)", marginLeft: 8 }}>
                              +{items.length - 1}
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {first?.severity && (
                            <Chip tone={first.severity >= 8 ? "warn" : first.severity >= 5 ? "gold" : "cream"}>
                              {first.severity}/10
                            </Chip>
                          )}
                          {risk > 0.5 && (
                            <Chip tone="warn">AI {Math.round(risk * 100)}%</Chip>
                          )}
                        </div>
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-on-light-3)", letterSpacing: "0.05em" }}>
                        {new Date(r.created_at).toLocaleString()}
                      </div>
                      {r.ai_assessment && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: "10px 14px",
                            background: "var(--paper)",
                            borderLeft: "2px solid var(--gold-0)",
                            fontFamily: "var(--font-sans)",
                            fontSize: 13,
                            lineHeight: 1.6,
                            color: "var(--fg-on-light-2)",
                          }}
                        >
                          <span style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold-2)", marginRight: 8 }}>
                            {copy.aiAssessment}
                          </span>
                          {r.ai_assessment}
                        </div>
                      )}
                    </div>
                  );
                })}
                {reports.length === 0 && (
                  <p
                    style={{
                      padding: "32px 0",
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      color: "var(--fg-on-light-3)",
                      textAlign: "center",
                    }}
                  >
                    {copy.noReports}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.healo-sx-grid) {
            grid-template-columns: 1fr !important;
            gap: 56px !important;
          }
        }
      `}</style>
    </PageShell>
  );
}

function UnderlineField({ label, value, onChange, placeholder, multiline }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <SmallLabel>{label}</SmallLabel>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{
            width: "100%",
            border: 0,
            borderBottom: "1px solid var(--fg-on-light-4)",
            padding: "10px 0",
            fontFamily: "var(--font-serif)",
            fontSize: 17,
            background: "transparent",
            outline: "none",
            resize: "vertical",
            color: "var(--fg-on-light-1)",
            marginTop: 8,
          }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            border: 0,
            borderBottom: "1px solid var(--fg-on-light-4)",
            padding: "10px 0",
            fontFamily: "var(--font-serif)",
            fontSize: 20,
            background: "transparent",
            outline: "none",
            color: "var(--fg-on-light-1)",
            marginTop: 8,
          }}
        />
      )}
    </div>
  );
}

function SmallLabel({ children }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color: "var(--fg-on-light-3)",
      }}
    >
      {children}
    </div>
  );
}
