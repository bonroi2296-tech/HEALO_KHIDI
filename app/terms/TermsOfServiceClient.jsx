"use client";

import { useState, useEffect } from "react";
import {
  getTermsOfService,
  TERMS_EFFECTIVE_DATE,
  TERMS_VERSION,
} from "@/lib/legal/termsOfService";
import { useLang } from "@/lib/i18n/LangContext";
import { Eyebrow, Rule } from "../../components/healo/Primitives";

export default function TermsOfServiceClient() {
  const langCode = useLang();
  const policy = getTermsOfService(langCode);
  const sections = policy.sections || [];
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (sections.length > 0) setActiveId(sections[0].id);
  }, []); // eslint-disable-line

  const translationPending = policy.__translationPending;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--cream-0)",
        color: "var(--fg-on-light-1)",
      }}
    >
      <header style={{ background: "var(--paper)", borderBottom: "1px solid var(--cream-2)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px 48px" }}>
          <Eyebrow>HEALO · Legal</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(44px, 6vw, 80px)",
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
              margin: "16px 0 0",
              color: "var(--fg-on-light-1)",
            }}
          >
            {policy.pageTitle}
          </h1>
          <Rule width={64} />
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 24,
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--fg-on-light-3)",
              marginTop: 16,
            }}
          >
            <span>
              {policy.lastUpdated || "Effective"}{" "}
              <strong style={{ color: "var(--fg-on-light-1)", fontWeight: 500 }}>
                {TERMS_EFFECTIVE_DATE}
              </strong>
            </span>
            <span>
              {policy.version || "Version"}{" "}
              <strong style={{ color: "var(--fg-on-light-1)", fontWeight: 500 }}>
                {TERMS_VERSION}
              </strong>
            </span>
          </div>
          {translationPending && (
            <div
              style={{
                marginTop: 24,
                padding: 16,
                background: "var(--gold-wash)",
                border: "1px solid var(--gold-tint)",
                color: "var(--fg-on-light-2)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: "var(--gold-2)" }}>Translation pending.</strong>{" "}
              Korean version shown below.
            </div>
          )}
        </div>
      </header>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 24px 96px" }}>
        <div
          className="healo-legal-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 260px) minmax(0, 1fr)",
            gap: 64,
          }}
        >
          <aside
            style={{
              position: "sticky",
              top: 24,
              alignSelf: "start",
              maxHeight: "calc(100vh - 48px)",
              overflowY: "auto",
              paddingRight: 8,
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <Eyebrow tone="muted">목차 · Contents</Eyebrow>
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {sections.map((s, idx) => (
                <a
                  key={s.id || idx}
                  href={`#${s.id || `section-${idx}`}`}
                  onClick={() => setActiveId(s.id || `section-${idx}`)}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "8px 0",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    lineHeight: 1.4,
                    color:
                      activeId === (s.id || `section-${idx}`)
                        ? "var(--fg-on-light-1)"
                        : "var(--fg-on-light-3)",
                    textDecoration: "none",
                    borderLeft:
                      activeId === (s.id || `section-${idx}`)
                        ? "1px solid var(--gold-0)"
                        : "1px solid transparent",
                    paddingLeft: 12,
                    marginLeft: -12,
                    transition: "all 150ms var(--ease-out)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--fg-on-light-4)",
                      fontSize: 10,
                      paddingTop: 2,
                    }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span>{s.title}</span>
                </a>
              ))}
            </nav>
          </aside>

          <article>
            {sections.map((section, idx) => (
              <section
                key={section.id || idx}
                id={section.id || `section-${idx}`}
                style={{
                  scrollMarginTop: 24,
                  marginBottom: 64,
                  paddingBottom: 48,
                  borderBottom:
                    idx < sections.length - 1 ? "1px solid var(--cream-2)" : "none",
                }}
              >
                <Eyebrow tone="muted">Article {String(idx + 1).padStart(2, "0")}</Eyebrow>
                <h2
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "clamp(28px, 3vw, 40px)",
                    fontWeight: 400,
                    lineHeight: 1.15,
                    color: "var(--fg-on-light-1)",
                    margin: "12px 0 24px",
                  }}
                >
                  {section.title}
                </h2>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 15,
                    lineHeight: 1.75,
                    color: "var(--fg-on-light-2)",
                  }}
                >
                  {section.body.map((paragraph, i) => (
                    <p key={i} style={{ margin: "0 0 16px", whiteSpace: "pre-line" }}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}

            <footer
              style={{
                marginTop: 64,
                paddingTop: 32,
                borderTop: "1px solid var(--gold-tint)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--fg-on-light-3)",
                lineHeight: 1.7,
              }}
            >
              <p style={{ margin: 0 }}>
                {(() => { const t = {
                  ko: "이 약관은 대한민국 전자상거래법, 의료법, 의료해외진출법을 기반으로 작성되었습니다. 최종 법적 효력은 관할 법령 및 변호사의 검토에 따릅니다.",
                  en: "These terms are based on the Republic of Korea's E-Commerce Act, Medical Service Act, and Act on Support for Overseas Expansion of Healthcare. Final legal effect is subject to applicable law and attorney review.",
                  ru: "Настоящие условия основаны на законах Республики Корея об электронной торговле, о медицинском обслуживании и о поддержке зарубежного развития здравоохранения. Окончательная юридическая сила определяется применимым законодательством и проверкой юриста.",
                  kz: "Бұл шарттар Корея Республикасының электрондық сауда, медициналық қызмет және денсаулық сақтауды шетелде дамыту туралы заңдарына негізделген. Түпкілікті заңды күші қолданыстағы заңнама мен заңгердің тексеруіне байланысты.",
                  zh: "本条款依据韩国《电子商务法》《医疗法》及《医疗海外拓展法》制定。最终法律效力以适用法律及律师审核为准。",
                  ja: "本規約は韓国の電子商取引法、医療法、医療海外進出法に基づいて作成されています。最終的な法的効力は適用法令および弁護士の確認に従います。",
                }; return t[langCode] || t.en; })()}
              </p>
            </footer>
          </article>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          :global(.healo-legal-grid) {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          :global(.healo-legal-grid aside) {
            position: static !important;
            max-height: 240px !important;
            border-bottom: 1px solid var(--cream-2);
            padding-bottom: 24px;
          }
        }
      `}</style>
    </div>
  );
}
