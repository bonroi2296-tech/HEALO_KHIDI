"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useLang } from "../../src/lib/i18n/LangContext";
import { setLangCookie } from "../../src/lib/i18n";
import NotificationCenter from "./NotificationCenter";
import { createSupabaseBrowserClient } from "../../src/lib/supabase/browser";

/**
 * HEALO Nav — cream background, sticky, hairline divider, backdrop blur.
 * D. Premium 디자인의 네비게이션. 기존 ClientShell의 Header를 대체합니다.
 */

const NAV_ITEMS = [
  {
    id: "telemedicine",
    href: "/telemedicine",
    label: {
      en: "Telemedicine",
      ko: "원격협진",
      ru: "Телемедицина",
      kz: "Телемедицина",
      zh: "远程诊疗",
      ja: "遠隔診療",
    },
    highlight: true, // 골드 뱃지 표시
  },
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
    id: "stories",
    href: "/stories",
    label: { en: "Stories", ko: "후기", ru: "Истории", kz: "Оқиғалар", zh: "故事", ja: "ストーリー" },
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
  const [user, setUser] = useState(null);
  const [acctOpen, setAcctOpen] = useState(false);
  const langRef = useRef(null);
  const acctRef = useRef(null);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!langOpen && !acctOpen) return;
    const handler = (e) => {
      if (langOpen && langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
      if (acctOpen && acctRef.current && !acctRef.current.contains(e.target)) {
        setAcctOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [langOpen, acctOpen]);

  // 세션 확인
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => data?.subscription?.unsubscribe?.();
  }, []);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setAcctOpen(false);
    // 로그아웃 시 게스트 채팅 쿠키도 정리 (의료 대화 PIPA 보호)
    if (typeof document !== "undefined") {
      document.cookie = "healo_chat_token=; path=/; max-age=0; SameSite=Lax";
      document.cookie = "healo_browser_session=; path=/; max-age=0; SameSite=Lax";
    }
    if (typeof window !== "undefined") window.location.href = "/";
  }

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
          translate="no"
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
                  fontWeight: item.highlight ? 600 : 500,
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: item.highlight
                    ? "var(--gold-2)"
                    : isActive
                    ? "var(--gold-0)"
                    : "var(--fg-on-light-2)",
                  textDecoration: "none",
                  borderBottom: `1px solid ${isActive ? "var(--gold-0)" : "transparent"}`,
                  paddingBottom: 2,
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {label}
                {item.highlight && (
                  <span
                    style={{
                      fontSize: 7,
                      letterSpacing: "0.1em",
                      color: "var(--gold-2)",
                      background: "var(--gold-tint, rgba(200,169,106,0.15))",
                      border: "1px solid var(--gold-0)",
                      borderRadius: 2,
                      padding: "2px 5px",
                      textTransform: "uppercase",
                    }}
                  >
                    NEW
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Right: notification + lang dropdown + CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <NotificationCenter />
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

          {/* Account — 로그인 상태에 따라 다르게 */}
          {user ? (
            <div ref={acctRef} style={{ position: "relative" }}>
              <button
                onClick={() => setAcctOpen(!acctOpen)}
                aria-expanded={acctOpen}
                aria-haspopup="true"
                aria-label="My account"
                className="healo-acct-btn"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 36,
                  background: "var(--ink-0)",
                  color: "var(--gold-0)",
                  border: 0,
                  cursor: "pointer",
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {(user.email || "?").charAt(0).toUpperCase()}
              </button>
              {acctOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    minWidth: 220,
                    background: "var(--paper)",
                    border: "1px solid var(--cream-2)",
                    boxShadow: "var(--shadow-md)",
                    zIndex: 100,
                  }}
                >
                  <div
                    style={{
                      padding: "12px 14px",
                      borderBottom: "1px solid var(--cream-2)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--fg-on-light-3)",
                      wordBreak: "break-all",
                    }}
                  >
                    {user.email}
                  </div>
                  {[
                    { href: "/patient", label: lang === "ko" ? "내 치료 대시보드" : "My dashboard" },
                    { href: "/patient/messages", label: lang === "ko" ? "메시지" : "Messages" },
                    { href: "/patient/calendar", label: lang === "ko" ? "캘린더" : "Calendar" },
                    { href: "/patient/documents", label: lang === "ko" ? "의료 문서" : "Documents" },
                  ].map((it) => (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setAcctOpen(false)}
                      style={{
                        display: "block",
                        padding: "10px 14px",
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        color: "var(--fg-on-light-1)",
                        textDecoration: "none",
                        borderBottom: "1px solid var(--cream-2)",
                      }}
                    >
                      {it.label}
                    </Link>
                  ))}
                  <button
                    onClick={handleLogout}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 14px",
                      background: "transparent",
                      border: 0,
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "#8c3a2e",
                    }}
                  >
                    {lang === "ko" ? "로그아웃" : "Sign out"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="healo-nav-login"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--fg-on-light-2)",
                textDecoration: "none",
                borderBottom: "1px solid var(--fg-on-light-4)",
                paddingBottom: 2,
                whiteSpace: "nowrap",
              }}
            >
              {lang === "ko" ? "로그인" : "Sign in"}
            </Link>
          )}

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

          {/* Mobile: account section */}
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid var(--gold-tint)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {user ? (
              <>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--fg-on-light-3)",
                    marginBottom: 8,
                  }}
                >
                  {user.email}
                </div>
                <Link
                  href="/patient"
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
                  {lang === "ko" ? "내 대시보드" : "My dashboard"}
                </Link>
                <button
                  onClick={() => { setMobileOpen(false); handleLogout(); }}
                  style={{
                    padding: "14px 0",
                    background: "transparent",
                    border: 0,
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#8c3a2e",
                  }}
                >
                  {lang === "ko" ? "로그아웃" : "Sign out"}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: "14px 0",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--gold-2)",
                  textDecoration: "none",
                }}
              >
                {lang === "ko" ? "로그인 →" : "Sign in →"}
              </Link>
            )}
          </div>
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
          /* 모바일에서는 데스크톱 로그인 텍스트·계정 드롭다운 숨김 (드로어에서 보임) */
          :global(.healo-nav-login),
          :global(.healo-acct-btn) {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
}
