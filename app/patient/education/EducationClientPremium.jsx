"use client";

import { useState } from "react";
import { getLangCodeFromCookie } from "../../../src/lib/i18n";
import { CANCER_TYPES, PAGE_LABELS, GUIDES } from "./EducationClient";
import {
  Eyebrow,
  Rule,
  LinkArrow,
  FilmGrain,
} from "../../../components/healo/Primitives";
import Nav from "../../../components/healo/Nav";
import Footer from "../../../components/healo/Footer";
import { PHOTO_FILTER } from "../../../components/healo/Photos";
import { useLang } from "../../../src/lib/i18n/LangContext";

export default function EducationClientPremium() {
  const langCode = useLang();
  const l = (obj) => obj?.[langCode] || obj?.en || Object.values(obj || {})[0] || "";

  const [selected, setSelected] = useState("stomach");
  const guide = GUIDES[selected];

  return (
    <div style={{ background: "var(--cream-0)", minHeight: "100vh" }}>
      <Nav current="education" />

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
          <Eyebrow>Patient guides</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(44px, 6vw, 88px)",
              lineHeight: 1.05,
              letterSpacing: "-0.015em",
              margin: "24px 0 32px",
              maxWidth: 900,
            }}
          >
            {l(PAGE_LABELS.title)}
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
            {l(PAGE_LABELS.subtitle)}
          </p>
        </div>
      </section>

      {/* CANCER TYPE SELECTOR */}
      <section
        style={{
          background: "var(--paper)",
          padding: "48px 24px",
          borderBottom: "1px solid var(--cream-2)",
          position: "sticky",
          top: 65,
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ marginBottom: 20 }}>
            <Eyebrow tone="muted">{l(PAGE_LABELS.selectCancer)}</Eyebrow>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CANCER_TYPES.map((t) => {
              const active = selected === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setSelected(t.value)}
                  style={{
                    background: active ? "var(--ink-0)" : "transparent",
                    color: active ? "var(--gold-0)" : "var(--fg-on-light-2)",
                    border: `1px solid ${active ? "var(--ink-0)" : "var(--cream-2)"}`,
                    borderRadius: 2,
                    padding: "10px 18px",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    transition: "all 150ms var(--ease-out)",
                  }}
                >
                  {l(t.label)}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* GUIDE */}
      <section style={{ padding: "96px 24px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          {/* Guide title */}
          <div style={{ marginBottom: 72, maxWidth: 900 }}>
            <Eyebrow>{selected.toUpperCase()}</Eyebrow>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(36px, 5vw, 64px)",
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
                margin: "24px 0 0",
                color: "var(--fg-on-light-1)",
              }}
            >
              {l(guide.title)}
            </h2>
            <Rule width={64} />
          </div>

          {/* Sections — editorial: alternating image-left/image-right */}
          <div style={{ display: "flex", flexDirection: "column", gap: 96 }}>
            {guide.sections.map((s, idx) => {
              const imageRight = idx % 2 === 1;
              return (
                <article
                  key={idx}
                  className="healo-guide-section"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "5fr 6fr",
                    gap: 64,
                    alignItems: "start",
                    direction: imageRight ? "rtl" : "ltr",
                  }}
                >
                  {/* Photo */}
                  {s.image && (
                    <div style={{ direction: "ltr" }}>
                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "4 / 5",
                          overflow: "hidden",
                        }}
                      >
                        <img
                          src={s.image}
                          alt={s.imageAlt || ""}
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            filter: PHOTO_FILTER,
                          }}
                        />
                      </div>
                      {s.imageAlt && (
                        <p
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontStyle: "italic",
                            fontSize: 12,
                            color: "var(--fg-on-light-3)",
                            marginTop: 8,
                          }}
                        >
                          {s.imageAlt}
                        </p>
                      )}
                    </div>
                  )}
                  {/* Text */}
                  <div style={{ direction: "ltr" }}>
                    <Eyebrow>
                      {`${String(idx + 1).padStart(2, "0")} — ${
                        ["Treatment", "Diet & Nutrition", "Exercise", "Warning signs", "Mental health"][idx] || "Section"
                      }`}
                    </Eyebrow>
                    <h3
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontWeight: 400,
                        fontSize: "clamp(28px, 3.5vw, 44px)",
                        lineHeight: 1.15,
                        letterSpacing: "-0.005em",
                        margin: "16px 0 24px",
                        color: "var(--fg-on-light-1)",
                      }}
                    >
                      {l(s.title)}
                    </h3>
                    <Rule width={40} />
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 15,
                        lineHeight: 1.85,
                        color: "var(--fg-on-light-2)",
                        whiteSpace: "pre-line",
                        marginTop: 24,
                      }}
                    >
                      {l(s.body)}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Disclaimer */}
          <aside
            style={{
              marginTop: 96,
              padding: "32px 40px",
              borderTop: "1px solid var(--gold-tint)",
              borderBottom: "1px solid var(--gold-tint)",
              background: "var(--paper)",
            }}
          >
            <Eyebrow tone="muted">Disclaimer</Eyebrow>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 17,
                lineHeight: 1.65,
                color: "var(--fg-on-light-2)",
                margin: "12px 0 0",
              }}
            >
              {l(PAGE_LABELS.disclaimer)}
            </p>
          </aside>

          {/* CTA */}
          <div style={{ textAlign: "center", marginTop: 72 }}>
            <LinkArrow href="/intake">
              {langCode === "ko" ? "상담 신청하기 →" : "Request consultation →"}
            </LinkArrow>
          </div>
        </div>
      </section>

      <Footer />

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.healo-guide-section) {
            grid-template-columns: 1fr !important;
            direction: ltr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </div>
  );
}
