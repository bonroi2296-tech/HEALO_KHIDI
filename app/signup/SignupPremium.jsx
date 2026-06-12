"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/LangContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Eyebrow, Rule, ButtonGold, FilmGrain } from "../../components/healo/Primitives";
import { IMMUNE_PHOTOS, IMMUNE_PHOTO_FILTER as PHOTO_FILTER } from "../../components/healo/Photos";
const PHOTOS = { hospital2: IMMUNE_PHOTOS.facilityTreatment };

const COPY = {
  en: {
    eyebrow: "Create account",
    title: "Start your",
    titleItalic: "journey.",
    lede:
      "One account to manage your consultations, documents, and follow-up care. It takes less than a minute.",
    email: "Email",
    password: "Password (8+ characters)",
    confirm: "Confirm password",
    agree: "I agree to the",
    terms: "Terms",
    and: "and",
    privacy: "Privacy Policy",
    overseasTitle: "Consent to overseas transfer of personal data (required)",
    overseasDetail: "View details",
    overseasLabel: "I consent to the overseas transfer of my data for the purposes listed above (PIPA §28-8).",
    create: "Create account",
    creating: "Creating…",
    haveAccount: "Already have an account?",
    signIn: "Sign in",
    quote: "Every journey starts with a single inquiry.",
    errorMismatch: "Passwords do not match.",
    errorShort: "Password must be at least 8 characters.",
    errorConsent: "Please agree to the terms to continue.",
    errorOverseas: "Please consent to overseas data transfer to continue.",
    errorExists: "An account with this email already exists.",
    errorGeneric: "Something went wrong. Please try again.",
    success: "Check your email to verify your account.",
  },
  ko: {
    eyebrow: "계정 만들기",
    title: "여정을",
    titleItalic: "시작하세요.",
    lede: "하나의 계정으로 상담·문서·사후관리를 관리합니다. 1분도 안 걸립니다.",
    email: "이메일",
    password: "비밀번호 (8자 이상)",
    confirm: "비밀번호 확인",
    agree: "다음에 동의합니다:",
    terms: "이용약관",
    and: "및",
    privacy: "개인정보처리방침",
    overseasTitle: "개인정보 국외이전 동의 (필수)",
    overseasDetail: "세부 내용 보기",
    overseasLabel: "위 목적으로의 개인정보 국외이전에 동의합니다 (개인정보 보호법 제28조의8).",
    create: "계정 만들기",
    creating: "생성 중…",
    haveAccount: "이미 계정이 있으신가요?",
    signIn: "로그인",
    quote: "모든 여정은 한 번의 문의로 시작됩니다.",
    errorMismatch: "비밀번호가 일치하지 않습니다.",
    errorShort: "비밀번호는 8자 이상이어야 합니다.",
    errorConsent: "약관에 동의해 주세요.",
    errorOverseas: "개인정보 국외이전에 동의해야 가입이 가능합니다.",
    errorExists: "이미 가입된 이메일입니다.",
    errorGeneric: "문제가 발생했습니다. 다시 시도해 주세요.",
    success: "이메일을 확인해 계정을 인증해 주세요.",
  },
};

// PIPA §28조의8 — 개인정보 국외이전 고지 내용
// 실제 법무 검토 전 참고용이며, 최종 문구는 법무팀 검토 필요.
const OVERSEAS_TRANSFER = {
  en: {
    purpose: "Medical consultation matching, translation, AI chat, telemedicine hosting",
    items: "Name, email, phone, medical history, treatment preferences, consultation audio/video",
    recipients: [
      { name: "Google LLC (Gemini AI)", country: "United States", purpose: "LLM translation & RAG" },
      { name: "LiveKit Inc.", country: "United States", purpose: "Telemedicine WebRTC hosting" },
      { name: "Amazon Web Services", country: "United States", purpose: "Cloud infrastructure (SES email)" },
    ],
    method: "Encrypted HTTPS / TLS 1.3",
    retention: "Until account deletion or 3 years of inactivity",
    refusal: "You may refuse, but without overseas data transfer the matching / translation / telemedicine features will not be available.",
  },
  ko: {
    purpose: "의료 상담 매칭, 번역, AI 챗봇, 원격진료 호스팅",
    items: "이름, 이메일, 전화번호, 병력, 치료 선호도, 상담 영상/음성",
    recipients: [
      { name: "Google LLC (Gemini AI)", country: "미국", purpose: "LLM 번역 및 RAG" },
      { name: "LiveKit Inc.", country: "미국", purpose: "원격진료 WebRTC 호스팅" },
      { name: "Amazon Web Services", country: "미국", purpose: "클라우드 인프라 (SES 이메일)" },
    ],
    method: "암호화된 HTTPS / TLS 1.3",
    retention: "계정 삭제 시 또는 3년간 미활동 시까지",
    refusal: "거부할 수 있으나, 국외이전 미동의 시 매칭·번역·원격진료 기능을 제공받을 수 없습니다.",
  },
};

export default function SignupPremium() {
  const _router = useRouter();
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm: "",
    consent: false,
    overseasConsent: false,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [showOverseasDetail, setShowOverseasDetail] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!form.consent) return setErr(copy.errorConsent);
    if (!form.overseasConsent) return setErr(copy.errorOverseas);
    if (form.password.length < 8) return setErr(copy.errorShort);
    if (form.password !== form.confirm) return setErr(copy.errorMismatch);

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: _data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/patient` : undefined,
          // PIPA §28조의8 동의 기록 — user_metadata 에 감사 추적 가능하게 저장
          data: {
            tos_consent_at: new Date().toISOString(),
            overseas_transfer_consent_at: new Date().toISOString(),
            consent_lang: lang,
            consent_version: "2026-04-20",
          },
        },
      });
      if (error) {
        setErr(error.message?.toLowerCase().includes("registered") ? copy.errorExists : copy.errorGeneric);
        return;
      }
      setOk(true);
    } catch {
      setErr(copy.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  if (ok) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <FilmGrain />
        <div style={{ position: "relative", maxWidth: 560, textAlign: "center" }}>
          <Eyebrow>Check your email</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: "clamp(40px, 5vw, 64px)",
              lineHeight: 1.08,
              margin: "24px 0 24px",
              color: "var(--gold-0)",
            }}
          >
            Thank you.
          </h1>
          <Rule width={48} style={{ margin: "24px auto" }} />
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, lineHeight: 1.7, color: "var(--fg-on-dark-2)", margin: "24px 0 40px" }}>
            {copy.success}
          </p>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <ButtonGold>{copy.signIn}</ButtonGold>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        minHeight: "100vh",
        background: "var(--cream-0)",
      }}
      className="healo-auth-grid"
    >
      {/* LEFT */}
      <section
        className="healo-auth-left"
        style={{
          position: "relative",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          overflow: "hidden",
        }}
      >
        <img
          src={PHOTOS.hospital2}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.35,
            filter: PHOTO_FILTER,
          }}
        />
        <FilmGrain />
        <div
          style={{
            position: "relative",
            height: "100%",
            padding: "64px 56px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 26,
              fontWeight: 500,
              color: "var(--fg-on-dark-1)",
              textDecoration: "none",
              letterSpacing: "0.04em",
            }}
          >
            HEALO
          </Link>
          <blockquote
            style={{
              margin: 0,
              maxWidth: 480,
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "clamp(24px, 3vw, 36px)",
              lineHeight: 1.3,
              color: "var(--gold-0)",
            }}
          >
            — {copy.quote}
          </blockquote>
        </div>
      </section>

      {/* RIGHT */}
      <section
        className="healo-auth-right"
        style={{
          background: "var(--cream-0)",
          padding: "56px 56px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ maxWidth: 420, width: "100%", margin: "0 auto" }}>
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--fg-on-light-3)",
              textDecoration: "none",
              display: "inline-block",
              marginBottom: 32,
            }}
          >
            ← HEALO
          </Link>

          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(40px, 5vw, 64px)",
              lineHeight: 1.08,
              margin: "16px 0 16px",
              color: "var(--fg-on-light-1)",
            }}
          >
            {copy.title}{" "}
            <span style={{ fontStyle: "italic", color: "var(--gold-2)" }}>{copy.titleItalic}</span>
          </h1>
          <Rule width={48} />
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              lineHeight: 1.65,
              color: "var(--fg-on-light-3)",
              margin: "16px 0 32px",
            }}
          >
            {copy.lede}
          </p>

          <form onSubmit={handleSubmit}>
            <AuthField label={copy.email} type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} autoFocus />
            <AuthField label={copy.password} type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
            <AuthField label={copy.confirm} type="password" value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} />

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginTop: 8,
                marginBottom: 8,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                style={{ marginTop: 3, accentColor: "var(--gold-0)" }}
              />
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg-on-light-2)", lineHeight: 1.55 }}>
                {copy.agree}{" "}
                <Link href="/terms" style={{ color: "var(--gold-2)", fontWeight: 500 }}>
                  {copy.terms}
                </Link>{" "}
                {copy.and}{" "}
                <Link href="/privacy" style={{ color: "var(--gold-2)", fontWeight: 500 }}>
                  {copy.privacy}
                </Link>
                .
              </span>
            </label>

            {/* PIPA §28조의8 — 개인정보 국외이전 별도 동의 */}
            <div style={{
              border: "1px solid var(--cream-2)",
              borderRadius: 6,
              padding: 12,
              marginTop: 8,
              background: "var(--cream-1, #faf8f3)",
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-on-light-1)", marginBottom: 6 }}>
                {copy.overseasTitle}
              </div>
              <button
                type="button"
                onClick={() => setShowOverseasDetail((v) => !v)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: 11,
                  color: "var(--gold-2)",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  marginBottom: 8,
                }}
              >
                {showOverseasDetail ? "▴" : "▾"} {copy.overseasDetail}
              </button>
              {showOverseasDetail ? (() => {
                const t = OVERSEAS_TRANSFER[lang] || OVERSEAS_TRANSFER.en;
                return (
                  <div style={{ fontSize: 11, lineHeight: 1.6, color: "var(--fg-on-light-3)", margin: "8px 0 10px" }}>
                    <div><strong>1.</strong> {lang === "ko" ? "이전 목적" : "Purpose"}: {t.purpose}</div>
                    <div><strong>2.</strong> {lang === "ko" ? "이전 항목" : "Items"}: {t.items}</div>
                    <div style={{ marginTop: 4 }}>
                      <strong>3.</strong> {lang === "ko" ? "이전받는 자 / 국가 / 목적" : "Recipients"}:
                      <ul style={{ margin: "4px 0 0 18px", paddingLeft: 0 }}>
                        {t.recipients.map((r, i) => (
                          <li key={i}>{r.name} — {r.country} — {r.purpose}</li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ marginTop: 4 }}><strong>4.</strong> {lang === "ko" ? "이전 방법" : "Method"}: {t.method}</div>
                    <div><strong>5.</strong> {lang === "ko" ? "보유·이용 기간" : "Retention"}: {t.retention}</div>
                    <div style={{ marginTop: 4, color: "#8c3a2e" }}><strong>6.</strong> {lang === "ko" ? "거부권 및 불이익" : "Right to refuse"}: {t.refusal}</div>
                  </div>
                );
              })() : null}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.overseasConsent}
                  onChange={(e) => setForm({ ...form, overseasConsent: e.target.checked })}
                  style={{ marginTop: 3, accentColor: "var(--gold-0)" }}
                />
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg-on-light-2)", lineHeight: 1.5 }}>
                  {copy.overseasLabel}
                </span>
              </label>
            </div>

            {err ? (
              <p style={{ color: "#8c3a2e", fontSize: 13, margin: "8px 0 16px", fontFamily: "var(--font-sans)" }}>
                {err}
              </p>
            ) : null}

            <div style={{ marginTop: 16 }}>
              <ButtonGold style={{ width: "100%" }}>
                {loading ? copy.creating : copy.create}
              </ButtonGold>
            </div>
          </form>

          <div
            style={{
              marginTop: 32,
              paddingTop: 24,
              borderTop: "1px solid var(--cream-2)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--fg-on-light-3)",
              lineHeight: 1.8,
            }}
          >
            <div>
              {copy.haveAccount}{" "}
              <Link href="/login" style={{ color: "var(--gold-2)", fontWeight: 500 }}>
                {copy.signIn} →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.healo-auth-grid) {
            grid-template-columns: 1fr !important;
          }
          :global(.healo-auth-left) {
            min-height: 180px;
            max-height: 25vh;
          }
          :global(.healo-auth-right) {
            padding: 32px 24px !important;
          }
        }
      `}</style>
    </div>
  );
}

function AuthField({ label, type, value, onChange, autoFocus }) {
  return (
    <label style={{ display: "block", marginBottom: 22 }}>
      <span
        style={{
          display: "block",
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "var(--fg-on-light-3)",
          marginBottom: 8,
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        autoFocus={autoFocus}
        autoComplete={type === "password" ? "new-password" : "email"}
        style={{
          width: "100%",
          border: 0,
          borderBottom: "1px solid var(--fg-on-light-4)",
          padding: "10px 0",
          fontFamily: "var(--font-serif)",
          fontSize: 18,
          background: "transparent",
          color: "var(--fg-on-light-1)",
          outline: "none",
        }}
        onFocus={(e) => (e.currentTarget.style.borderBottomColor = "var(--gold-0)")}
        onBlur={(e) => (e.currentTarget.style.borderBottomColor = "var(--fg-on-light-4)")}
      />
    </label>
  );
}
