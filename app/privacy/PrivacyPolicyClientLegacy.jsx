"use client";

import { useState, useEffect } from "react";
import {
  getPrivacyPolicy,
  getPrivacySectionsList,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_VERSION,
} from "@/lib/legal/privacyPolicy";
import { useLang } from "@/lib/i18n/LangContext";
import { getTranslationPendingNotice } from "@/lib/legal/translationPendingNotice";

export default function PrivacyPolicyClientLegacy() {
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
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>

      {/* ── HEADER ── */}
      <header style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)", color: "#fff", padding: "64px 24px 56px" }}>
        <div style={{ maxWidth: "64rem", margin: "0 auto" }}>
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)", marginBottom: 12 }}>
            healwith · Legal
          </p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, lineHeight: 1.15, margin: "0 0 20px" }}>
            {pageLabels.pageTitle}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: "0.8125rem", color: "rgba(255,255,255,0.8)" }}>
            <span>
              {pageLabels.lastUpdated}{" "}
              <strong style={{ color: "#fff" }}>{PRIVACY_EFFECTIVE_DATE}</strong>
            </span>
            <span>
              {pageLabels.version}{" "}
              <strong style={{ color: "#fff" }}>{PRIVACY_VERSION}</strong>
            </span>
          </div>
          {translationPending && (
            <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(255,255,255,0.12)", borderRadius: 10, fontSize: "0.8125rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
              ⚠️ {getTranslationPendingNotice(langCode)}
            </div>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "40px 24px 80px" }}>
        <div className="healo-legal-legacy-grid" style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 40 }}>

          {/* TOC — sticky sidebar */}
          <aside style={{ position: "sticky", top: 24, alignSelf: "start", maxHeight: "calc(100vh - 48px)", overflowY: "auto", paddingRight: 8 }}>
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#0d9488", marginBottom: 12 }}>
              {pageLabels.tableOfContents || "Contents"}
            </p>
            <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {sections.map((s, idx) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={() => setActiveId(s.id)}
                  style={{
                    display: "flex",
                    gap: 8,
                    padding: "7px 10px",
                    fontSize: "0.75rem",
                    lineHeight: 1.4,
                    borderRadius: 8,
                    textDecoration: "none",
                    color: activeId === s.id ? "#fff" : "#475569",
                    background: activeId === s.id ? "#0d9488" : "transparent",
                    transition: "all 150ms",
                  }}
                  onMouseEnter={e => { if (activeId !== s.id) e.currentTarget.style.background = "#f0fdfa"; }}
                  onMouseLeave={e => { if (activeId !== s.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ color: activeId === s.id ? "rgba(255,255,255,0.65)" : "#94a3b8", fontSize: "0.625rem", paddingTop: 2, flexShrink: 0 }}>
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
                  marginBottom: 48,
                  paddingBottom: 40,
                  borderBottom: idx < sections.length - 1 ? "1px solid #e2e8f0" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ background: "#0d9488", color: "#fff", borderRadius: 8, padding: "2px 8px", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.12em", fontFamily: "monospace" }}>
                    {String(idx + 1).padStart(2, "0")}
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
            ))}

            {/* Footer notice */}
            <footer style={{ marginTop: 48, paddingTop: 24, borderTop: "2px solid #99f6e4", fontSize: "0.75rem", color: "#64748b", lineHeight: 1.7 }}>
              <p style={{ margin: 0 }}>
                {(() => { const t = {
                  ko: "이 문서는 대한민국 개인정보보호법(§28-8 포함), 의료법, 의료해외진출법, 카자흐스탄 94-V ЗРК, EU GDPR을 기반으로 작성되었습니다. 환자 민감정보는 AES-256-GCM 암호화 후 저장됩니다. 최종 법적 효력은 관할 법령 및 변호사의 검토에 따릅니다.",
                  en: "This document is drafted based on Korean PIPA (incl. §28-8), the Medical Service Act, the Medical Tourism Act, Kazakhstan Law 94-V ЗРК, and the EU GDPR. Patient sensitive data is stored with AES-256-GCM encryption. Final legal effect is subject to applicable laws and professional review.",
                  ru: "Этот документ составлен на основе закона Кореи PIPA (включая §28-8), закона о медицинском обслуживании, закона о медицинском туризме, закона Казахстана 94-V ЗРК и Регламента ЕС GDPR. Чувствительные персональные данные пациентов хранятся с шифрованием AES-256-GCM. Окончательная юридическая сила определяется применимым законодательством и профессиональной проверкой.",
                  kz: "Бұл құжат Корея PIPA заңы (§28-8 қоса алғанда), медициналық қызмет туралы заң, медициналық туризм туралы заң, Қазақстанның 94-V ЗРК заңы және ЕО GDPR негізінде жасалған. Пациенттің құпия деректері AES-256-GCM шифрлауымен сақталады. Түпкілікті заңды күші қолданыстағы заңнама мен кәсіби тексеруге байланысты.",
                  zh: "本文件依据韩国《个人信息保护法（PIPA）》（含§28-8）《医疗法》《医疗观光法》、哈萨克斯坦94-V ЗРК法及欧盟《通用数据保护条例（GDPR）》制定。患者敏感信息经 AES-256-GCM 加密后存储。最终法律效力以适用法律及专业审核为准。",
                  ja: "本書類は韓国の個人情報保護法（PIPA、§28-8を含む）、医療法、医療観光法、カザフスタン94-V ЗРК法、EU GDPRに基づいて作成されています。患者の機微情報はAES-256-GCM暗号化のうえ保存されます。最終的な法的効力は適用法令および専門家の確認に従います。",
                }; return t[langCode] || t.en; })()}
              </p>
            </footer>
          </article>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          :global(.healo-legal-legacy-grid) {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          :global(.healo-legal-legacy-grid aside) {
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
