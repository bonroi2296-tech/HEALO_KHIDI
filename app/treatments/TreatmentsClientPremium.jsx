"use client";

import Link from "next/link";
import { useLang } from "../../src/lib/i18n/LangContext";
import { CANCERS, TREATMENTS_L } from "./TreatmentsClient";
import {
  Eyebrow,
  Rule,
  ButtonGold,
  LinkArrow,
  FilmGrain,
} from "../../components/healo/Primitives";
import Nav from "../../components/healo/Nav";
import Footer from "../../components/healo/Footer";
import { PHOTOS, PHOTO_FILTER } from "../../components/healo/Photos";

const SECTION_PHOTOS = [
  PHOTOS.hero,
  PHOTOS.hospital1,
  PHOTOS.hospital2,
  PHOTOS.hospital3,
  PHOTOS.clinical1,
  PHOTOS.clinical2,
];

const COPY = {
  en: {
    eyebrow: "Treatments",
    titleA: "Treatment is not just",
    titleB: "fighting disease.",
    titleC: "It's restoring a life.",
    lede:
      "HEALO combines Korea's world-class oncology with Korean Medicine integrative care. Same diagnosis, two disciplines, one coordinator.",
    western: "Western Medicine",
    eastern: "Korean Medicine",
    partnerLabel: "Partner hospital",
    kmLabel: "Immune Hospital (HEALO direct)",
    strength: "Korea's advantage",
    readGuide: "Read patient guide",
    requestConsult: "Request consultation",
    bottomTitle: "Whichever cancer type,",
    bottomTitleItalic: "one journey.",
    bottomBody:
      "Submit a brief intake. Within one business day, we present a matched treatment plan — combining specialist oncology care with integrative Korean Medicine when appropriate.",
  },
  ko: {
    eyebrow: "치료 안내",
    titleA: "치료는 병을 이기는",
    titleB: "것이 아니라,",
    titleC: "삶을 되찾는 과정입니다.",
    lede:
      "HEALO는 한국의 세계 수준 종양학과 한방 통합 케어를 결합합니다. 같은 진단, 두 분야, 한 명의 코디네이터.",
    western: "양방 의학",
    eastern: "한방 의학",
    partnerLabel: "협진 병원",
    kmLabel: "면력한방병원 (HEALO 직영)",
    strength: "한국의 강점",
    readGuide: "환자 가이드 보기",
    requestConsult: "상담 신청",
    bottomTitle: "어떤 암종이든,",
    bottomTitleItalic: "하나의 여정.",
    bottomBody:
      "간단한 인테이크를 작성해 주세요. 영업일 기준 하루 안에, 전문의 치료와 적절한 한방 통합 케어를 결합한 맞춤 치료 계획을 안내합니다.",
  },
};

export default function TreatmentsClientPremium() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;
  const l = (obj) => obj?.[lang] || obj?.en || obj?.ko || "";

  return (
    <div style={{ background: "var(--cream-0)", minHeight: "100vh" }}>
      <Nav current="treatments" />

      {/* HERO — dark */}
      <section
        style={{
          position: "relative",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          padding: "96px 24px 72px",
          overflow: "hidden",
        }}
      >
        <FilmGrain />
        <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(44px, 6.5vw, 96px)",
              lineHeight: 1.05,
              letterSpacing: "-0.015em",
              margin: "32px 0 40px",
              maxWidth: 1100,
            }}
          >
            {copy.titleA} {copy.titleB}
            <br />
            <span style={{ fontStyle: "italic", color: "var(--gold-0)" }}>{copy.titleC}</span>
          </h1>
          <Rule width={64} />
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 300,
              fontSize: 17,
              lineHeight: 1.75,
              color: "var(--fg-on-dark-2)",
              marginTop: 24,
              maxWidth: 720,
            }}
          >
            {copy.lede}
          </p>
        </div>
      </section>

      {/* Cancer panels — alternating cream/dark */}
      {CANCERS.map((c, idx) => {
        const isDark = idx % 2 === 1;
        const isRight = idx % 2 === 1; // image on right for dark panels
        return (
          <section
            key={idx}
            style={{
              position: "relative",
              background: isDark ? "var(--ink-0)" : "var(--cream-0)",
              color: isDark ? "var(--fg-on-dark-1)" : "var(--fg-on-light-1)",
              padding: "96px 24px",
              overflow: "hidden",
              borderTop: isDark ? "1px solid var(--gold-tint)" : "1px solid var(--cream-2)",
            }}
          >
            {isDark && <FilmGrain />}
            <div
              className="healo-treatment-panel"
              style={{
                position: "relative",
                maxWidth: 1240,
                margin: "0 auto",
                display: "grid",
                gridTemplateColumns: "5fr 7fr",
                gap: 64,
                alignItems: "start",
                direction: isRight ? "rtl" : "ltr",
              }}
            >
              {/* Photo */}
              <div style={{ direction: "ltr" }}>
                <div style={{ width: "100%", aspectRatio: "4 / 5", overflow: "hidden" }}>
                  <img
                    src={SECTION_PHOTOS[idx % SECTION_PHOTOS.length]}
                    alt=""
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: PHOTO_FILTER,
                    }}
                  />
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: 12,
                    color: isDark ? "var(--fg-on-dark-3)" : "var(--fg-on-light-3)",
                    marginTop: 12,
                  }}
                >
                  {copy.strength}
                </p>
              </div>

              {/* Text */}
              <div style={{ direction: "ltr" }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--gold-0)",
                    letterSpacing: "0.2em",
                    marginBottom: 16,
                  }}
                >
                  {String(idx + 1).padStart(2, "0")} — CANCER
                </div>
                <h2
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontWeight: 400,
                    fontSize: "clamp(40px, 5.5vw, 72px)",
                    lineHeight: 1.05,
                    letterSpacing: "-0.01em",
                    color: isDark ? "var(--fg-on-dark-1)" : "var(--fg-on-light-1)",
                    margin: "0 0 20px",
                  }}
                >
                  {l(c.type)}
                </h2>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontWeight: 400,
                    fontSize: 20,
                    lineHeight: 1.5,
                    color: isDark ? "var(--gold-0)" : "var(--gold-2)",
                    margin: "0 0 40px",
                    maxWidth: 640,
                  }}
                >
                  {l(c.koreaStrength)}
                </p>
                <Rule width={48} />

                {/* Two-column treatment list */}
                <div
                  className="healo-treatment-cols"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 40,
                    marginTop: 40,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.24em",
                        textTransform: "uppercase",
                        color: isDark ? "var(--fg-on-dark-3)" : "var(--fg-on-light-3)",
                        marginBottom: 4,
                      }}
                    >
                      {copy.western}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontStyle: "italic",
                        fontSize: 12,
                        color: isDark ? "var(--fg-on-dark-4)" : "var(--fg-on-light-4)",
                        marginBottom: 18,
                      }}
                    >
                      {copy.partnerLabel}
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {c.western?.map((t, i) => (
                        <li
                          key={i}
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 14,
                            lineHeight: 1.65,
                            color: isDark ? "var(--fg-on-dark-2)" : "var(--fg-on-light-2)",
                            padding: "10px 0",
                            borderTop:
                              i === 0
                                ? `1px solid ${isDark ? "var(--ink-3)" : "var(--cream-2)"}`
                                : "none",
                            borderBottom: `1px solid ${isDark ? "var(--ink-3)" : "var(--cream-2)"}`,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              color: "var(--gold-0)",
                              marginRight: 10,
                            }}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {l(t)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.24em",
                        textTransform: "uppercase",
                        color: isDark ? "var(--fg-on-dark-3)" : "var(--fg-on-light-3)",
                        marginBottom: 4,
                      }}
                    >
                      {copy.eastern}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontStyle: "italic",
                        fontSize: 12,
                        color: isDark ? "var(--fg-on-dark-4)" : "var(--fg-on-light-4)",
                        marginBottom: 18,
                      }}
                    >
                      {copy.kmLabel}
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {c.eastern?.map((t, i) => (
                        <li
                          key={i}
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 14,
                            lineHeight: 1.65,
                            color: isDark ? "var(--fg-on-dark-2)" : "var(--fg-on-light-2)",
                            padding: "10px 0",
                            borderTop:
                              i === 0
                                ? `1px solid ${isDark ? "var(--ink-3)" : "var(--cream-2)"}`
                                : "none",
                            borderBottom: `1px solid ${isDark ? "var(--ink-3)" : "var(--cream-2)"}`,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              color: "var(--gold-0)",
                              marginRight: 10,
                            }}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {l(t)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* CTAs */}
                <div style={{ display: "flex", gap: 24, alignItems: "center", marginTop: 40, flexWrap: "wrap" }}>
                  <Link href="/education" style={{ textDecoration: "none" }}>
                    <LinkArrow onDark={isDark}>{copy.readGuide} →</LinkArrow>
                  </Link>
                  <Link href="/intake" style={{ textDecoration: "none" }}>
                    <ButtonGold>{copy.requestConsult}</ButtonGold>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* Final CTA */}
      <section style={{ background: "var(--paper)", padding: "96px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.5vw, 56px)",
              lineHeight: 1.1,
              margin: "24px 0 16px",
              color: "var(--fg-on-light-1)",
            }}
          >
            {copy.bottomTitle}
            <br />
            <span style={{ fontStyle: "italic", color: "var(--gold-2)" }}>
              {copy.bottomTitleItalic}
            </span>
          </h2>
          <Rule width={64} style={{ margin: "24px auto" }} />
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              lineHeight: 1.75,
              color: "var(--fg-on-light-2)",
              margin: "24px 0 40px",
            }}
          >
            {copy.bottomBody}
          </p>
          <Link href="/intake" style={{ textDecoration: "none" }}>
            <ButtonGold>{copy.requestConsult}</ButtonGold>
          </Link>
        </div>
      </section>

      <Footer />

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.healo-treatment-panel) {
            grid-template-columns: 1fr !important;
            direction: ltr !important;
            gap: 32px !important;
          }
          :global(.healo-treatment-cols) {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </div>
  );
}
