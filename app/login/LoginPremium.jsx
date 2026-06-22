"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Eyebrow, Rule, ButtonGold, LinkArrow, FilmGrain } from "../../components/healo/Primitives";
import { IMMUNE_PHOTOS, IMMUNE_PHOTO_FILTER as PHOTO_FILTER } from "../../components/healo/Photos";
const PHOTOS = { hero: IMMUNE_PHOTOS.facilityRoom };

const COPY = {
  en: {
    eyebrow: "Sign in",
    title: "Welcome",
    titleItalic: "back.",
    lede: "Your care continues here. Sign in to see your journey, messages, and upcoming appointments.",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signingIn: "Signing in…",
    or: "or",
    google: "Continue with Google",
    forgot: "Forgot password?",
    noAccount: "New to healwith?",
    createAccount: "Create an account",
    quote: "Care is a conversation, not a transaction.",
    errorInvalid: "Incorrect email or password.",
    errorGeneric: "Something went wrong. Please try again.",
  },
  ko: {
    eyebrow: "로그인",
    title: "다시",
    titleItalic: "오셨네요.",
    lede: "여정이 계속됩니다. 로그인하여 진행 상황, 메시지, 예정된 일정을 확인하세요.",
    email: "이메일",
    password: "비밀번호",
    signIn: "로그인",
    signingIn: "로그인 중…",
    or: "또는",
    google: "Google로 계속하기",
    forgot: "비밀번호를 잊으셨나요?",
    noAccount: "healwith가 처음이신가요?",
    createAccount: "계정 만들기",
    quote: "치료는 거래가 아닌 대화입니다.",
    errorInvalid: "이메일 또는 비밀번호가 올바르지 않습니다.",
    errorGeneric: "문제가 발생했습니다. 다시 시도해 주세요.",
  },
};

export default function LoginPremium() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: _data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErr(
          error.message?.toLowerCase().includes("invalid") ? copy.errorInvalid : copy.errorGeneric
        );
        return;
      }
      // 역할별 착지 경로 — 에이전시·병원·코디·의사·관리자는 각자 포털로.
      // (예전엔 무조건 /patient 라 비환자 계정이 환자 화면을 봤음)
      let dest = "/patient";
      try {
        const token = _data?.session?.access_token;
        const res = await fetch("/api/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
          cache: "no-store",
        });
        const j = await res.json();
        if (j?.ok && j.landing) dest = j.landing;
      } catch (_ignore) { /* 폴백 /patient */ }
      // ?redirect= 내부 경로가 있으면 우선(스태프 포털 게이트에서 옴)
      const rp = new URLSearchParams(window.location.search).get("redirect");
      const safeRp = rp && rp.startsWith("/") && !rp.startsWith("//") ? rp : null;
      // 하드 내비게이션: 로그인 페이지(레거시 헤더)→포털 전환 시 옛 UI가 잠깐
      // 보이던 깜빡임 제거. 목적지를 깨끗한 SSR 상태로 새로 로드한다.
      window.location.assign(safeRp || dest);
    } catch (_e) {
      setErr(copy.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
    } catch (_e) {
      setErr(copy.errorGeneric);
    }
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
      {/* LEFT — photo + quote (dark) */}
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
          src={PHOTOS.hero}
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
            healwith
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

      {/* RIGHT — form */}
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
            ← healwith
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
            <AuthField label={copy.email} type="email" value={email} onChange={setEmail} autoFocus />
            <AuthField label={copy.password} type="password" value={password} onChange={setPassword} />

            {err ? (
              <p style={{ color: "#8c3a2e", fontSize: 13, margin: "8px 0 16px", fontFamily: "var(--font-sans)" }}>
                {err}
              </p>
            ) : null}

            <div style={{ marginTop: 16 }}>
              <ButtonGold style={{ width: "100%" }}>
                {loading ? copy.signingIn : copy.signIn}
              </ButtonGold>
            </div>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "32px 0 24px" }}>
            <div style={{ flex: 1, height: 1, background: "var(--cream-2)" }} />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--fg-on-light-4)",
              }}
            >
              {copy.or}
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--cream-2)" }} />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            style={{
              width: "100%",
              padding: "14px 20px",
              background: "transparent",
              border: "1px solid var(--ink-0)",
              color: "var(--ink-0)",
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              minHeight: 44,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 48 48">
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 13 4.5 4 13.5 4 24.5s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-4z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.6 15.1 19 12.5 24 12.5c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5c-7.4 0-13.8 4-17.7 10.2z"
              />
              <path
                fill="#4CAF50"
                d="M24 44.5c5.3 0 10.2-2 13.9-5.3l-6.4-5.4c-2.1 1.6-4.8 2.6-7.5 2.6-5.3 0-9.7-3.4-11.3-8l-6.5 5c3.9 6.3 10.4 11.1 17.8 11.1z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.7l6.4 5.4c4.5-4.2 7.3-10.2 7.3-17.1 0-1.3-.1-2.7-.4-4z"
              />
            </svg>
            {copy.google}
          </button>

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
              {copy.noAccount}{" "}
              <Link href="/signup" style={{ color: "var(--gold-2)", fontWeight: 500 }}>
                {copy.createAccount} →
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
            min-height: 220px;
            max-height: 35vh;
          }
          :global(.healo-auth-right) {
            padding: 40px 24px !important;
          }
        }
      `}</style>
    </div>
  );
}

function AuthField({ label, type, value, onChange, autoFocus }) {
  return (
    <label style={{ display: "block", marginBottom: 24 }}>
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
        autoComplete={type === "password" ? "current-password" : "email"}
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
          transition: "border-color 150ms var(--ease-out)",
        }}
        onFocus={(e) => (e.currentTarget.style.borderBottomColor = "var(--gold-0)")}
        onBlur={(e) => (e.currentTarget.style.borderBottomColor = "var(--fg-on-light-4)")}
      />
    </label>
  );
}
