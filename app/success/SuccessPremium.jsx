"use client";

import Link from "next/link";
import { useLang } from "../../src/lib/i18n/LangContext";
import PageShell from "../../components/healo/PageShell";
import { Eyebrow, Rule, ButtonGold, LinkArrow, FilmGrain } from "../../components/healo/Primitives";

const COPY = {
  en: {
    eyebrow: "Received",
    titleA: "Your inquiry",
    titleB: "has arrived.",
    body: "A coordinator will respond within one business day in your preferred language. Check your email — we may ask a few follow-up questions to prepare the right specialists.",
    cta: "Return home",
    ctaSecondary: "View patient guides",
  },
  ko: {
    eyebrow: "접수 완료",
    titleA: "문의가",
    titleB: "접수되었습니다.",
    body: "전담 코디네이터가 영업일 기준 하루 안에 선호 언어로 회신드립니다. 이메일을 확인해 주세요 — 적합한 전문의를 준비하기 위해 몇 가지 추가 질문을 드릴 수 있습니다.",
    cta: "홈으로",
    ctaSecondary: "환자 가이드 보기",
  },
};

export default function SuccessPremium() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;

  return (
    <PageShell current="" noHero>
      <section
        style={{
          position: "relative",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          padding: "160px 24px 120px",
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <FilmGrain />
        <div style={{ position: "relative", maxWidth: 720, textAlign: "center" }}>
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(48px, 7vw, 96px)",
              lineHeight: 1.05,
              margin: "24px 0 24px",
            }}
          >
            {copy.titleA}{" "}
            <span style={{ fontStyle: "italic", color: "var(--gold-0)" }}>{copy.titleB}</span>
          </h1>
          <Rule width={64} style={{ margin: "24px auto" }} />
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              lineHeight: 1.75,
              color: "var(--fg-on-dark-2)",
              margin: "32px auto 40px",
              maxWidth: 560,
            }}
          >
            {copy.body}
          </p>
          <div style={{ display: "flex", gap: 32, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <ButtonGold>{copy.cta}</ButtonGold>
            </Link>
            <Link href="/education" style={{ textDecoration: "none" }}>
              <LinkArrow onDark>{copy.ctaSecondary} →</LinkArrow>
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
