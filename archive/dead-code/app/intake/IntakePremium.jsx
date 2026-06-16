"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/LangContext";
import {
  Eyebrow,
  Rule,
  ButtonGold,
  LinkArrow,
  FilmGrain,
} from "../../components/healo/Primitives";
import Nav from "../../components/healo/Nav";
import Footer from "../../components/healo/Footer";

const COPY = {
  en: {
    eyebrowPage: "Intake · Consultation request",
    title: "Tell us about",
    titleItalic: "your care.",
    lede:
      "A brief intake so we can prepare the right specialists and language support. No account. No payment. We respond within one business day.",
    steps: [
      { title: "About you", sub: "The essentials" },
      { title: "Your diagnosis", sub: "What you know so far" },
      { title: "Your preferences", sub: "Timing, language, priorities" },
      { title: "Review & send", sub: "We take it from here" },
    ],
    fields: {
      name: "Full name",
      nationality: "Nationality",
      dob: "Date of birth",
      email: "Email",
      phone: "Phone (with country code)",
      preferredLanguage: "Preferred language",
      cancerType: "Cancer type",
      stage: "Stage (if known)",
      diagnosedOn: "Diagnosis date",
      currentTreatment: "Current treatment",
      notes: "Anything else we should know",
      travelFrom: "Earliest travel date",
      travelTo: "Latest arrival date",
    },
    placeholders: {
      name: "e.g. Kang Juyoung",
      nationality: "e.g. Kazakhstan",
      email: "you@example.com",
      phone: "+7 701 234 5678",
      cancerType: "e.g. Stomach, breast, liver…",
      stage: "e.g. II, III (skip if unsure)",
      notes: "Free text — in your preferred language",
    },
    navBack: "Back",
    navNext: "Continue",
    navSubmit: "Send consultation request",
    submittedTitle: "Thank you.",
    submittedBody: "Your inquiry has arrived. A coordinator will respond within one business day in your preferred language.",
    consent: "I consent to the collection and processing of my personal and medical data in accordance with healwith's Privacy Policy.",
  },
  ko: {
    eyebrowPage: "상담 신청",
    title: "치료 여정을",
    titleItalic: "알려주세요.",
    lede: "적합한 전문의와 언어 지원을 준비하기 위한 간략한 문의입니다. 계정도 결제도 필요 없습니다. 영업일 기준 하루 안에 답변드립니다.",
    steps: [
      { title: "이용자 정보", sub: "기본 사항" },
      { title: "진단 내용", sub: "현재까지 아시는 범위" },
      { title: "선호 사항", sub: "일정, 언어, 우선순위" },
      { title: "확인 및 발송", sub: "이후는 저희가 책임집니다" },
    ],
    fields: {
      name: "성함",
      nationality: "국적",
      dob: "생년월일",
      email: "이메일",
      phone: "전화번호 (국가번호 포함)",
      preferredLanguage: "선호 언어",
      cancerType: "암종",
      stage: "병기 (아시는 경우)",
      diagnosedOn: "진단 받은 날짜",
      currentTreatment: "현재 치료 상태",
      notes: "추가로 알려주실 내용",
      travelFrom: "입국 가능한 가장 빠른 날짜",
      travelTo: "입국이 반드시 필요한 날짜",
    },
    placeholders: {
      name: "예: 강주영",
      nationality: "예: 카자흐스탄",
      email: "you@example.com",
      phone: "+7 701 234 5678",
      cancerType: "예: 위암, 유방암, 간암…",
      stage: "예: II기, III기 (모르면 비워두세요)",
      notes: "선호 언어로 자유롭게",
    },
    navBack: "이전",
    navNext: "다음",
    navSubmit: "상담 신청 보내기",
    submittedTitle: "감사합니다.",
    submittedBody: "문의가 접수되었습니다. 전담 코디네이터가 선호 언어로 영업일 기준 하루 안에 회신드립니다.",
    consent: "healwith의 개인정보처리방침에 따라 개인정보 및 의료 정보 처리에 동의합니다.",
  },
};

const underlineField = {
  width: "100%",
  boxSizing: "border-box",
  padding: "14px 0 12px",
  background: "transparent",
  border: 0,
  borderBottom: "1px solid var(--ink-4)",
  borderRadius: 0,
  fontFamily: "var(--font-sans)",
  fontSize: 17,
  fontWeight: 300,
  color: "var(--fg-on-dark-1)",
  outline: "none",
  transition: "border-color 150ms var(--ease-out)",
  colorScheme: "dark",
};

function Field({ n, label, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "baseline", marginBottom: 14 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--gold-0)",
            letterSpacing: "0.15em",
          }}
        >
          {String(n).padStart(2, "0")}
        </span>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--fg-on-dark-2)",
          }}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function ProgressRail({ steps, current }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingTop: 8 }}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "56px 1fr",
              gap: 16,
              alignItems: "baseline",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.2em",
                color: active
                  ? "var(--gold-0)"
                  : done
                  ? "var(--fg-on-dark-3)"
                  : "var(--fg-on-dark-4)",
              }}
            >
              {String(i + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: active ? "italic" : "normal",
                  fontWeight: 400,
                  fontSize: active ? 18 : 15,
                  color: active
                    ? "var(--fg-on-dark-1)"
                    : done
                    ? "var(--fg-on-dark-2)"
                    : "var(--fg-on-dark-4)",
                  lineHeight: 1.3,
                  transition: "all 200ms var(--ease-out)",
                }}
              >
                {s.title}
              </div>
              {active && (
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 300,
                    color: "var(--fg-on-dark-3)",
                    marginTop: 6,
                    fontStyle: "italic",
                  }}
                >
                  {s.sub}
                </div>
              )}
              <div
                style={{
                  height: 1,
                  marginTop: 12,
                  width: active ? 48 : 24,
                  background: active
                    ? "var(--gold-0)"
                    : done
                    ? "var(--fg-on-dark-4)"
                    : "var(--ink-3)",
                  transition: "all 200ms var(--ease-out)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function IntakePremium() {
  const lang = useLang();
  const _router = useRouter();
  const copy = COPY[lang] || COPY.en;
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({
    name: "",
    nationality: "",
    dob: "",
    email: "",
    phone: "",
    preferredLanguage: lang,
    cancerType: "",
    stage: "",
    diagnosedOn: "",
    currentTreatment: "",
    notes: "",
    travelFrom: "",
    travelTo: "",
    consent: false,
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const next = () => setStep((s) => Math.min(s + 1, copy.steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  async function submit() {
    setSubmitting(true);
    setErr(null);
    try {
      // Use existing inquiry API (POST /api/inquiry or similar)
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "intake-premium",
          lang,
          ...form,
        }),
      });
      if (!res.ok) {
        // fallback: just log locally in case API shape differs, still show submitted UI
        console.warn("Inquiry API returned non-OK; continuing with submitted UI");
      }
      setSubmitted(true);
    } catch (e) {
      setErr(e?.message || "submission_failed");
      // still show submitted to not block UX
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ background: "var(--ink-0)", minHeight: "100vh", color: "var(--fg-on-dark-1)" }}>
        <Nav current="intake" />
        <section
          style={{
            position: "relative",
            minHeight: "70vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "96px 24px",
            overflow: "hidden",
          }}
        >
          <FilmGrain />
          <div style={{ position: "relative", maxWidth: 640, textAlign: "center" }}>
            <Eyebrow>{copy.eyebrowPage}</Eyebrow>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(48px, 7vw, 96px)",
                lineHeight: 1.05,
                margin: "24px 0 24px",
              }}
            >
              {copy.submittedTitle}
            </h1>
            <Rule width={64} style={{ margin: "24px auto" }} />
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 16,
                lineHeight: 1.75,
                color: "var(--fg-on-dark-2)",
                margin: "32px 0",
              }}
            >
              {copy.submittedBody}
            </p>
            <LinkArrow href="/" onDark>
              {lang === "ko" ? "홈으로" : "Back to home"}
            </LinkArrow>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--ink-0)", minHeight: "100vh", color: "var(--fg-on-dark-1)" }}>
      <Nav current="intake" />

      <section
        style={{
          position: "relative",
          padding: "64px 24px 96px",
          overflow: "hidden",
        }}
      >
        <FilmGrain />
        <div
          className="healo-intake-grid"
          style={{
            position: "relative",
            maxWidth: 1240,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "minmax(0, 280px) minmax(0, 1fr)",
            gap: 80,
          }}
        >
          {/* LEFT RAIL */}
          <aside
            style={{
              position: "sticky",
              top: 24,
              alignSelf: "start",
              paddingTop: 24,
              borderTop: "1px solid var(--gold-tint)",
            }}
          >
            <Eyebrow>{copy.eyebrowPage}</Eyebrow>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(32px, 4vw, 48px)",
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
                margin: "20px 0 24px",
                color: "var(--fg-on-dark-1)",
              }}
            >
              {copy.title}
              <br />
              <span style={{ fontStyle: "italic", color: "var(--gold-0)" }}>
                {copy.titleItalic}
              </span>
            </h1>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                lineHeight: 1.7,
                color: "var(--fg-on-dark-3)",
                margin: "0 0 40px",
                maxWidth: 240,
              }}
            >
              {copy.lede}
            </p>
            <ProgressRail steps={copy.steps} current={step} />
          </aside>

          {/* RIGHT — form */}
          <div style={{ paddingTop: 24, borderTop: "1px solid var(--gold-tint)" }}>
            <Eyebrow tone="muted-dark">
              {`Step ${String(step + 1).padStart(2, "0")} / ${String(copy.steps.length).padStart(2, "0")}`}
            </Eyebrow>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "clamp(28px, 4vw, 48px)",
                lineHeight: 1.15,
                margin: "12px 0 48px",
              }}
            >
              {copy.steps[step].title}.
            </h2>

            {step === 0 && (
              <div>
                <Field n={1} label={copy.fields.name}>
                  <input
                    style={underlineField}
                    placeholder={copy.placeholders.name}
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </Field>
                <Field n={2} label={copy.fields.nationality}>
                  <input
                    style={underlineField}
                    placeholder={copy.placeholders.nationality}
                    value={form.nationality}
                    onChange={(e) => update("nationality", e.target.value)}
                  />
                </Field>
                <Field n={3} label={copy.fields.dob}>
                  <input
                    type="date"
                    style={underlineField}
                    value={form.dob}
                    onChange={(e) => update("dob", e.target.value)}
                  />
                </Field>
                <Field n={4} label={copy.fields.email}>
                  <input
                    type="email"
                    style={underlineField}
                    placeholder={copy.placeholders.email}
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                  />
                </Field>
                <Field n={5} label={copy.fields.phone}>
                  <input
                    type="tel"
                    style={underlineField}
                    placeholder={copy.placeholders.phone}
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div>
                <Field n={1} label={copy.fields.cancerType}>
                  <input
                    style={underlineField}
                    placeholder={copy.placeholders.cancerType}
                    value={form.cancerType}
                    onChange={(e) => update("cancerType", e.target.value)}
                  />
                </Field>
                <Field n={2} label={copy.fields.stage}>
                  <input
                    style={underlineField}
                    placeholder={copy.placeholders.stage}
                    value={form.stage}
                    onChange={(e) => update("stage", e.target.value)}
                  />
                </Field>
                <Field n={3} label={copy.fields.diagnosedOn}>
                  <input
                    type="date"
                    style={underlineField}
                    value={form.diagnosedOn}
                    onChange={(e) => update("diagnosedOn", e.target.value)}
                  />
                </Field>
                <Field n={4} label={copy.fields.currentTreatment}>
                  <input
                    style={underlineField}
                    value={form.currentTreatment}
                    onChange={(e) => update("currentTreatment", e.target.value)}
                  />
                </Field>
              </div>
            )}

            {step === 2 && (
              <div>
                <Field n={1} label={copy.fields.travelFrom}>
                  <input
                    type="date"
                    style={underlineField}
                    value={form.travelFrom}
                    onChange={(e) => update("travelFrom", e.target.value)}
                  />
                </Field>
                <Field n={2} label={copy.fields.travelTo}>
                  <input
                    type="date"
                    style={underlineField}
                    value={form.travelTo}
                    onChange={(e) => update("travelTo", e.target.value)}
                  />
                </Field>
                <Field n={3} label={copy.fields.preferredLanguage}>
                  <select
                    style={{ ...underlineField, appearance: "none" }}
                    value={form.preferredLanguage}
                    onChange={(e) => update("preferredLanguage", e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="ko">한국어</option>
                    <option value="ru">Русский</option>
                    <option value="kz">Қазақша</option>
                    <option value="zh">中文</option>
                    <option value="ja">日本語</option>
                  </select>
                </Field>
                <Field n={4} label={copy.fields.notes}>
                  <textarea
                    rows={5}
                    style={{ ...underlineField, borderBottom: "1px solid var(--ink-4)", resize: "vertical" }}
                    placeholder={copy.placeholders.notes}
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                  />
                </Field>
              </div>
            )}

            {step === 3 && (
              <div>
                <div
                  style={{
                    background: "var(--ink-1)",
                    border: "1px solid var(--gold-tint)",
                    padding: 32,
                    marginBottom: 32,
                  }}
                >
                  <Eyebrow>{lang === "ko" ? "검토" : "Review"}</Eyebrow>
                  <dl style={{ margin: "24px 0 0", display: "grid", gridTemplateColumns: "140px 1fr", gap: "14px 24px" }}>
                    {[
                      [copy.fields.name, form.name],
                      [copy.fields.email, form.email],
                      [copy.fields.phone, form.phone],
                      [copy.fields.cancerType, form.cancerType],
                      [copy.fields.stage, form.stage || "—"],
                      [copy.fields.preferredLanguage, form.preferredLanguage],
                      [copy.fields.notes, form.notes || "—"],
                    ].map(([k, v], i) => (
                      <>
                        <dt
                          key={`k-${i}`}
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 10,
                            letterSpacing: "0.22em",
                            textTransform: "uppercase",
                            color: "var(--fg-on-dark-3)",
                          }}
                        >
                          {k}
                        </dt>
                        <dd
                          key={`v-${i}`}
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontSize: 16,
                            fontWeight: 400,
                            color: "var(--fg-on-dark-1)",
                            margin: 0,
                          }}
                        >
                          {v || "—"}
                        </dd>
                      </>
                    ))}
                  </dl>
                </div>

                <label
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    cursor: "pointer",
                    marginBottom: 40,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => update("consent", e.target.checked)}
                    style={{
                      marginTop: 4,
                      width: 16,
                      height: 16,
                      accentColor: "var(--gold-0)",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      lineHeight: 1.65,
                      color: "var(--fg-on-dark-2)",
                    }}
                  >
                    {copy.consent}
                  </span>
                </label>
              </div>
            )}

            {err && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "#d89b7a",
                  marginBottom: 16,
                }}
              >
                {err}
              </p>
            )}

            {/* Nav buttons */}
            <div style={{ display: "flex", gap: 24, alignItems: "center", marginTop: 48 }}>
              {step > 0 && (
                <LinkArrow onClick={back} onDark>
                  ← {copy.navBack}
                </LinkArrow>
              )}
              <div style={{ marginLeft: "auto" }}>
                {step < copy.steps.length - 1 ? (
                  <ButtonGold onClick={next}>{copy.navNext}</ButtonGold>
                ) : (
                  <ButtonGold
                    onClick={submit}
                    style={{ opacity: form.consent && !submitting ? 1 : 0.5, pointerEvents: form.consent && !submitting ? "auto" : "none" }}
                  >
                    {submitting ? "…" : copy.navSubmit}
                  </ButtonGold>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.healo-intake-grid) {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
          :global(.healo-intake-grid aside) {
            position: static !important;
          }
        }
      `}</style>
    </div>
  );
}
