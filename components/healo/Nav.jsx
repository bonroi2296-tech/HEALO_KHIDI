"use client";

import Link from "next/link";
import { useLang } from "../../src/lib/i18n/LangContext";

/**
 * HEALO Nav — cream background, sticky, hairline divider, backdrop blur.
 */

const NAV_ITEMS = [
  { id: "treatments", href: "/treatments", label: { en: "Treatments", ko: "치료", ru: "Лечение", kz: "Емдеу", zh: "治疗", ja: "治療" } },
  { id: "hospitals", href: "/hospitals", label: { en: "Hospitals", ko: "병원", ru: "Больницы", kz: "Клиникалар", zh: "医院", ja: "病院" } },
  { id: "education", href: "/education", label: { en: "Guides", ko: "가이드", ru: "Руководства", kz: "Нұсқаулықтар", zh: "指南", ja: "ガイド" } },
  { id: "about", href: "/about", label: { en: "About", ko: "소개", ru: "О нас", kz: "Біз туралы", zh: "关于", ja: "会社情報" } },
];

const LANGS = [
  { code: "en", label: "EN" },
  { code: "ko", label: "KO" },
  { code: "ru", label: "RU" },
  { code: "kz", label: "KZ" },
  { code: "zh", label: "ZH" },
  { code: "ja", label: "JA" },
];

export default function Nav({ current, onLangChange }) {
  const lang = useLang();

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(245,240,232,0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--cream-2)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 500,
            fontSize: 22,
            letterSpacing: "0.04em",
            color: "var(--ink-0)",
            textDecoration: "none",
          }}
        >
          HEALO
        </Link>

        {/* Nav items */}
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = current === item.id;
            const label = item.label[lang] || item.label.en;
            return (
              <Link
                key={item.id}
                href={item.href}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 500,
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: isActive ? "var(--gold-0)" : "var(--fg-on-light-2)",
                  textDecoration: "none",
                  borderBottom: `1px solid ${isActive ? "var(--gold-0)" : "transparent"}`,
                  paddingBottom: 2,
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right side: lang + CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 2 }}>
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => onLangChange && onLangChange(l.code)}
                style={{
                  padding: "4px 7px",
                  border: 0,
                  background: "transparent",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  color: lang === l.code ? "var(--ink-0)" : "var(--fg-on-light-4)",
                  fontWeight: lang === l.code ? 700 : 400,
                  borderBottom: lang === l.code ? "1px solid var(--gold-0)" : "none",
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
          <Link
            href="/intake"
            style={{
              background: "var(--ink-0)",
              color: "var(--cream-0)",
              border: 0,
              padding: "11px 20px",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 10,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            {lang === "ko" ? "상담 신청" : "Request"}
          </Link>
        </div>
      </div>
    </nav>
  );
}
