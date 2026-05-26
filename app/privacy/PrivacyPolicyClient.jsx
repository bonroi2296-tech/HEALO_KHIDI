"use client";

import { useState, useEffect } from "react";
import {
  getPrivacyPolicy,
  getPrivacySectionsList,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_VERSION,
} from "../../src/lib/legal/privacyPolicy";
import { useLang } from "../../src/lib/i18n/LangContext";
import { Eyebrow, Rule } from "../../components/healo/Primitives";

export default function PrivacyPolicyClient() {
  const langCode = useLang();
  const policy = getPrivacyPolicy(langCode);
  const sections = getPrivacySectionsList(langCode);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (sections.length > 0) setActiveId(sections[0].id);
  }, []); // eslint-disable-line

  const translationPending = policy._translationPending;
  const pageLabels = policy._labels || policy;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--cream-0)",
        color: "var(--fg-on-light-1)",
      }}
    >
      {/* HEADER — editorial, cream */}
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
            {pageLabels.pageTitle}
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
              {pageLabels.lastUpdated}{" "}
              <strong style={{ color: "var(--fg-on-light-1)", fontWeight: 500 }}>
                {PRIVACY_EFFECTIVE_DATE}
              </strong>
            </span>
            <span>
              {pageLabels.version}{" "}
              <strong style={{ color: "var(--fg-on-light-1)", fontWeight: 500 }}>
                {PRIVACY_VERSION}
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
              Professional legal translation for this language is in progress. The English
              version is shown below. For legal interpretation, please refer to the Korean or
              English version.
            </div>
          )}
        </div>
      </header>

      {/* BODY — two column editorial layout */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 24px 96px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 260px) minmax(0, 1fr)",
            gap: 64,
          }}
          className="healo-legal-grid"
        >
          {/* TOC — sticky sidebar */}
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
              <Eyebrow tone="muted">{pageLabels.tableOfContents || "Contents"}</Eyebrow>
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {sections.map((s, idx) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={() => setActiveId(s.id)}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "8px 0",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    lineHeight: 1.4,
                    color:
                      activeId === s.id ? "var(--fg-on-light-1)" : "var(--fg-on-light-3)",
                    textDecoration: "none",
                    borderLeft:
                      activeId === s.id
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

          {/* ARTICLE */}
          <article>
            {sections.map((section, idx) => (
              <section
                key={section.id}
                id={section.id}
                style={{
                  scrollMarginTop: 24,
                  marginBottom: 64,
                  paddingBottom: 48,
                  borderBottom:
                    idx < sections.length - 1 ? "1px solid var(--cream-2)" : "none",
                }}
              >
                <Eyebrow tone="muted">Section {String(idx + 1).padStart(2, "0")}</Eyebrow>
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

            {/* Footer note */}
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
                  ko: "이 문서는 대한민국 개인정보보호법, 의료법, 의료해외진출법, 카자흐스탄 94-V ЗРК, EU GDPR을 기반으로 작성되었습니다. 최종 법적 효력은 관할 법령 및 변호사의 검토에 따릅니다.",
                  en: "This document is drafted based on Korean PIPA, the Medical Service Act, the Medical Tourism Act, Kazakhstan Law 94-V, and the EU GDPR. Final legal effect is subject to applicable laws and professional review.",
                  ru: "Этот документ составлен на основе закона Кореи PIPA, закона о медицинском обслуживании, закона о медицинском туризме, закона Казахстана 94-V и Регламента ЕС GDPR. Окончательная юридическая сила определяется применимым законодательством и профессиональной проверкой.",
                  kz: "Бұл құжат Корея PIPA заңы, медициналық қызмет туралы заң, медициналық туризм туралы заң, Қазақстанның 94-V заңы және ЕО GDPR негізінде жасалған. Түпкілікті заңды күші қолданыстағы заңнама мен кәсіби тексеруге байланысты.",
                  zh: "本文件依据韩国《个人信息保护法（PIPA）》《医疗法》《医疗观光法》、哈萨克斯坦94-V法及欧盟《通用数据保护条例（GDPR）》制定。最终法律效力以适用法律及专业审核为准。",
                  ja: "本書類は韓国の個人情報保護法（PIPA）、医療法、医療観光法、カザフスタン94-V法、EU GDPRに基づいて作成されています。最終的な法的効力は適用法令および専門家の確認に従います。",
                }; return t[langCode] || t.en; })()}
              </p>
            </footer>
          </article>
        </div>
      </div>

      {/* Mobile sidebar collapse */}
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
