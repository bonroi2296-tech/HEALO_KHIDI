"use client";

import { useState, useEffect } from "react";
import {
  getTermsOfService,
  TERMS_EFFECTIVE_DATE,
  TERMS_VERSION,
} from "../../src/lib/legal/termsOfService";
import { useLang } from "../../src/lib/i18n/LangContext";

export default function TermsOfServiceClientLegacy() {
  const langCode = useLang();
  const policy = getTermsOfService(langCode);
  const sections = policy.sections || [];
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (sections.length > 0) setActiveId(sections[0].id || "section-0");
  }, []); // eslint-disable-line

  const translationPending = policy.__translationPending;

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>

      {/* ── HEADER ── */}
      <header style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)", color: "#fff", padding: "64px 24px 56px" }}>
        <div style={{ maxWidth: "64rem", margin: "0 auto" }}>
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)", marginBottom: 12 }}>
            HEALO · Legal
          </p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, lineHeight: 1.15, margin: "0 0 20px" }}>
            {policy.pageTitle}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: "0.8125rem", color: "rgba(255,255,255,0.8)" }}>
            <span>
              {policy.lastUpdated || "Effective"}{" "}
              <strong style={{ color: "#fff" }}>{TERMS_EFFECTIVE_DATE}</strong>
            </span>
            <span>
              {policy.version || "Version"}{" "}
              <strong style={{ color: "#fff" }}>{TERMS_VERSION}</strong>
            </span>
          </div>
          {translationPending && (
            <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(255,255,255,0.12)", borderRadius: 10, fontSize: "0.8125rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
              ⚠️ Translation for this language is pending professional legal review. Korean version shown below.
            </div>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "40px 24px 80px" }}>
        <div className="healo-terms-legacy-grid" style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 40 }}>

          {/* TOC — sticky sidebar */}
          <aside style={{ position: "sticky", top: 24, alignSelf: "start", maxHeight: "calc(100vh - 48px)", overflowY: "auto", paddingRight: 8 }}>
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#0d9488", marginBottom: 12 }}>
              목차 · Contents
            </p>
            <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {sections.map((s, idx) => {
                const id = s.id || `section-${idx}`;
                return (
                  <a
                    key={id}
                    href={`#${id}`}
                    onClick={() => setActiveId(id)}
                    style={{
                      display: "flex",
                      gap: 8,
                      padding: "7px 10px",
                      fontSize: "0.75rem",
                      lineHeight: 1.4,
                      borderRadius: 8,
                      textDecoration: "none",
                      color: activeId === id ? "#fff" : "#475569",
                      background: activeId === id ? "#0d9488" : "transparent",
                      transition: "all 150ms",
                    }}
                    onMouseEnter={e => { if (activeId !== id) e.currentTarget.style.background = "#f0fdfa"; }}
                    onMouseLeave={e => { if (activeId !== id) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ color: activeId === id ? "rgba(255,255,255,0.65)" : "#94a3b8", fontSize: "0.625rem", paddingTop: 2, flexShrink: 0 }}>
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span>{s.title}</span>
                  </a>
                );
              })}
            </nav>
          </aside>

          {/* ARTICLE */}
          <article>
            {sections.map((section, idx) => {
              const id = section.id || `section-${idx}`;
              return (
                <section
                  key={id}
                  id={id}
                  style={{
                    scrollMarginTop: 24,
                    marginBottom: 48,
                    paddingBottom: 40,
                    borderBottom: idx < sections.length - 1 ? "1px solid #e2e8f0" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ background: "#0d9488", color: "#fff", borderRadius: 8, padding: "2px 8px", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.12em", fontFamily: "monospace" }}>
                      Article {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h2 style={{ fontSize: "clamp(1.125rem, 2.5vw, 1.5rem)", fontWeight: 800, color: "#0f172a", margin: "0 0 16px", lineHeight: 1.25 }}>
                    {section.title}
                  </h2>
                  <div style={{ fontSize: "0.9375rem", lineHeight: 1.75, color: "#334155" }}>
                    {section.body.map((paragraph, i) => (
                      <p key={i} style={{ margin: "0 0 14px", whiteSpace: "pre-line" }}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              );
            })}

            {/* Footer notice */}
            <footer style={{ marginTop: 48, paddingTop: 24, borderTop: "2px solid #99f6e4", fontSize: "0.75rem", color: "#64748b", lineHeight: 1.7 }}>
              <p style={{ margin: 0 }}>
                이 약관은 대한민국 전자상거래법, 의료법, 의료해외진출법을 기반으로
                작성되었습니다. 최종 법적 효력은 관할 법령 및 변호사의 검토에 따릅니다.
              </p>
            </footer>
          </article>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          :global(.healo-terms-legacy-grid) {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          :global(.healo-terms-legacy-grid aside) {
            position: static !important;
            max-height: 220px !important;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 20px;
          }
        }
      `}</style>
    </div>
  );
}
