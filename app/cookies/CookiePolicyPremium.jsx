"use client";

import { useState, useEffect } from "react";
import { getLangCodeFromCookie, t } from "@/lib/i18n";
import PageShell from "../../components/healo/PageShell";
import { Eyebrow, Rule } from "../../components/healo/Primitives";

export default function CookiePolicyPremium() {
  const [langCode, setLangCode] = useState("en");
  useEffect(() => setLangCode(getLangCodeFromCookie()), []);

  const sections = [
    { title: t("cookie.essentialTitle", langCode), body: t("cookie.essentialDesc", langCode) },
    { title: t("cookie.analyticsTitle", langCode), body: t("cookie.analyticsDesc", langCode) },
    { title: t("cookie.manageTitle", langCode), body: t("cookie.manageDesc", langCode) },
  ];

  return (
    <PageShell
      current="cookies"
      heroEyebrow="HEALO · Legal"
      heroTitle={t("cookie.title", langCode)}
    >
      <section style={{ padding: "72px 24px 96px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          {sections.map((s, i) => (
            <div key={i} style={{ marginBottom: 48 }}>
              <Eyebrow tone="muted">Section {String(i + 1).padStart(2, "0")}</Eyebrow>
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(24px, 3vw, 32px)",
                  fontWeight: 500,
                  lineHeight: 1.2,
                  color: "var(--fg-on-light-1)",
                  margin: "12px 0 20px",
                }}
              >
                {s.title}
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 15,
                  lineHeight: 1.75,
                  color: "var(--fg-on-light-2)",
                  margin: 0,
                }}
              >
                {s.body}
              </p>
            </div>
          ))}
          <Rule width={64} style={{ margin: "48px 0 16px" }} />
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--fg-on-light-4)",
              letterSpacing: "0.05em",
            }}
          >
            {t("cookie.updated", langCode)}
          </p>
        </div>
      </section>
    </PageShell>
  );
}
