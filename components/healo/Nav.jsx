"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useLang } from "../../src/lib/i18n/LangContext";
import { setLangCookie } from "../../src/lib/i18n";
import NotificationBadge from "./NotificationBadge";

/**
 * HEALO Nav — cream background, sticky, hairline divider, backdrop blur.
 * D. Premium 디자인의 네비게이션. 기존 ClientShell의 Header를 대체합니다.
 */

const NAV_ITEMS = [
  {
    id: "treatments",
    href: "/treatments",
    label: { en: "Treatments", ko: "치료", ru: "Лечение", kz: "Емдеу", zh: "治疗", ja: "治療" },
  },
  {
    id: "hospitals",
    href: "/hospitals",
    label: { en: "Hospitals", ko: "병원", ru: "Больницы", kz: "Клиникалар", zh: "医院", ja: "病院" },
  },
  {
    id: "education",
    href: "/education",
    label: { en: "Guides", ko: "가이드", ru: "Руководства", kz: "Нұсқаулықтар", zh: "指南", ja: "ガイド" },
  },
  {
    id: "faq",
    href: "/faq",
    label: { en: "FAQ", ko: "FAQ", ru: "FAQ", kz: "Сұрақтар", zh: "问答", ja: "FAQ" },
  },
  {
    id: "about",
    href: "/about",
    label: { en: "About", ko: "소개", ru: "О нас", kz: "Біз туралы", zh: "关于", ja: "会社情報" },
  },
];

const LANGS = [
  { code: "ko", label: "한국어", short: "KO" },
  { code: "en", label: "English", short: "EN" },
  { code: "ru", label: "Русский", short: "RU" },
  { code: "kz", label: "Қазақша", short: "KZ" },
  { code: "zh", label: "中文", short: "ZH" },
  { code: "ja", label: "日本語", short: "JA" },
];

export default function Nav({ current }) {
  const lang = useLang();
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const langRef = useRef(null);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!langOpen) return;
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [langOpen]);

  const changeLang = (code) => {
    if (code === lang) {
      setLangOpen(false);
      return;
    }
    setLangCookie(code);
    setLangOpen(false);
    window.location.reload();
  };

  const currentLangLabel = LANGS.find((l) => l.code === lang)?.label || "English";
  const ctaLabel =
    { ko: "상담 신청", en: "Request", ru: "Запрос", kz: "Сұрау", zh: "申请", ja: "相談申込" }[lang] || "Request";

  return (
    <nav
      className="healo-safe-top"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(245,240,232,0.92)",
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
          gap: 20,
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
            flexShrink: 0,
          }}
        >
          HEALO
        </Link>

        {/* Nav items — desktop */}
        <div
          className="healo-nav-desktop"
          style={{
            display: "flex",
            gap: 28,
            flex: 1,
            justifyContent: "center",
          }}
        >
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
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right: notification + lang dropdown + CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <NotificationBadge />
          {/* Language dropdown */}
          <div ref={langRef} style={{ position: "relative" }}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              aria-expanded={langOpen}
              aria-haspopup="true"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "1px solid var(--cream-2)",
                borderRadius: 2,
                padding: "8px 12px",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.1em",
                color: "var(--fg-on-light-1)",
              }}
            >
              <span aria-hidden>🌐</span>
              <span>{currentLangLabel}</span>
              <span
                style={{
                  fontSize: 8,
                  marginLeft: 4,
                  transform: langOpen ? "rotate(180deg)" : "none",
                  transition: "transform 150ms",
                }}
              >
                ▼
              </span>
            </button>
            {langOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  minWidth: 160,
                  background: "var(--paper)",
                  border: "1px solid var(--cream-2)",
                  borderRadius: 2,
                  boxShadow: "var(--shadow-md)",
                  padding: 4,
                  zIndex: 100,
                }}
              >
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => changeLang(l.code)}
                    role="menuitem"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                      background: l.code === lang ? "var(--gold-wash)" : "transparent",
                      border: 0,
                      padding: "10px 14px",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: l.code === lang ? "var(--gold-2)" : "var(--fg-on-light-1)",
                      fontWeight: l.code === lang ? 600 : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (l.code !== lang)
                        e.currentTarget.style.background = "var(--cream-0)";
                    }}
                    onMouseLeave={(e) => {
                      if (l.code !== lang)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span>{l.label}</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--fg-on-light-3)",
                      }}
                    >
                      {l.short}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          <Link
            href="/intake"
            style={{
              background: "var(--ink-0)",
              color: "var(--cream-0)",
              border: 0,
              padding: "11px 18px",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 10,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {ctaLabel}
          </Link>

          {/* Mobile menu button */}
          <button
            className="healo-nav-mobile-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
            style={{
              display: "none",
              background: "transparent",
              border: 0,
              cursor: "pointer",
              padding: 6,
              color: "var(--ink-0)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {mobileOpen ? (
                <path d="M6 6 L18 18 M18 6 L6 18" />
              ) : (
                <path d="M3 6 L21 6 M3 12 L21 12 M3 18 L21 18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          style={{
            borderTop: "1px solid var(--cream-2)",
            background: "var(--paper)",
            padding: "12px 24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const label = item.label[lang] || item.label.en;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid var(--cream-2)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  letterSpacing: "0.08em",
                  color: "var(--fg-on-light-1)",
                  textDecoration: "none",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.healo-nav-desktop) {
            display: none !important;
          }
          :global(.healo-nav-mobile-btn) {
            display: inline-flex !important;
          }
        }
      `}</style>
    </nav>
  );
}
