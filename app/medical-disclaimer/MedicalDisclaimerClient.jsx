"use client";

import { getMedicalDisclaimer } from "@/lib/legal/medicalDisclaimer";
import { useLang } from "@/lib/i18n/LangContext";
import { Eyebrow, Rule, FilmGrain } from "../../components/healo/Primitives";

export default function MedicalDisclaimerClient() {
  const langCode = useLang();
  const disclaimer = getMedicalDisclaimer(langCode);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--cream-0)",
      }}
    >
      {/* DARK hero — makes the disclaimer feel serious */}
      <section
        style={{
          position: "relative",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          padding: "96px 24px 80px",
          overflow: "hidden",
        }}
      >
        <FilmGrain />
        <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto" }}>
          <Eyebrow>healwith · Medical Notice</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(40px, 5.5vw, 72px)",
              fontWeight: 400,
              lineHeight: 1.08,
              letterSpacing: "-0.01em",
              margin: "16px 0 24px",
              color: "var(--fg-on-dark-1)",
              maxWidth: 820,
            }}
          >
            {disclaimer.title}
          </h1>
          <Rule width={64} tone="gold" />
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "clamp(20px, 2.2vw, 28px)",
              lineHeight: 1.4,
              color: "var(--fg-on-dark-2)",
              marginTop: 32,
              maxWidth: 720,
            }}
          >
            {disclaimer.short}
          </p>
        </div>
      </section>

      {/* BODY — cream, editorial */}
      <section style={{ padding: "72px 24px 96px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {/* Main paragraphs */}
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 17,
              lineHeight: 1.8,
              color: "var(--fg-on-light-2)",
            }}
          >
            {disclaimer.full.map((paragraph, i) => {
              // Emergency numbers section is visually distinct
              const isEmergencyHeader = paragraph.match(/^[【[]/);
              if (isEmergencyHeader) {
                return (
                  <div key={i} style={{ marginTop: 48, marginBottom: 20 }}>
                    <Eyebrow>{paragraph.replace(/[【】[\]]/g, "")}</Eyebrow>
                    <div style={{ marginTop: 8 }}>
                      <Rule width={32} tone="gold" />
                    </div>
                  </div>
                );
              }
              if (paragraph.startsWith("·")) {
                // Emergency list item
                const [country, ...numberParts] = paragraph.slice(1).split(":");
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom: "1px solid var(--cream-2)",
                      fontSize: 14,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontWeight: 500,
                        color: "var(--fg-on-light-1)",
                      }}
                    >
                      {country.trim()}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        color: "var(--gold-2)",
                      }}
                    >
                      {numberParts.join(":").trim()}
                    </span>
                  </div>
                );
              }
              if (!paragraph.trim()) return null;
              return (
                <p key={i} style={{ margin: "0 0 20px", whiteSpace: "pre-line" }}>
                  {paragraph}
                </p>
              );
            })}
          </div>

          {/* AI notice */}
          <aside
            style={{
              marginTop: 64,
              padding: "24px 28px",
              background: "var(--paper)",
              borderLeft: "2px solid var(--gold-0)",
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <Eyebrow tone="muted">AI Notice</Eyebrow>
            </div>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--fg-on-light-2)",
                margin: 0,
              }}
            >
              {disclaimer.aiNote}
            </p>
          </aside>

          {/* Legal footer */}
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
                ko: "관련 법적 근거: 의료법 §27 (무면허 의료행위 금지), 의료기기법. 응급상황에서는 본 페이지의 응급 연락처 또는 각국의 응급 서비스에 즉시 연락하시기 바랍니다.",
                en: "Relevant legal basis: Medical Service Act §27 (prohibition of unlicensed medical practice), Medical Devices Act. In an emergency, contact the emergency numbers on this page or your country's emergency services immediately.",
                ru: "Правовая основа: Закон о медицинском обслуживании §27 (запрет медицинской практики без лицензии), Закон о медицинских изделиях. В экстренной ситуации немедленно обратитесь по экстренным номерам на этой странице или в службы экстренной помощи вашей страны.",
                kz: "Құқықтық негіз: Медициналық қызмет туралы заң §27 (лицензиясыз медициналық практикаға тыйым), Медициналық бұйымдар туралы заң. Төтенше жағдайда осы беттегі төтенше нөмірлерге немесе еліңіздің жедел қызметіне дереу хабарласыңыз.",
                zh: "相关法律依据：《医疗法》§27（禁止无照行医）、《医疗器械法》。紧急情况下，请立即拨打本页紧急联系电话或所在国的急救服务。",
                ja: "関連法的根拠：医療法 §27（無免許医療行為の禁止）、医療機器法。緊急時は本ページの緊急連絡先または各国の救急サービスに直ちにご連絡ください。",
              }; return t[langCode] || t.en; })()}
            </p>
          </footer>
        </div>
      </section>
    </div>
  );
}
