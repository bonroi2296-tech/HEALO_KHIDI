"use client";

/**
 * Design Preview — Header variants
 * 현재 헤더 vs 새 제안안 나란히 비교용.
 * 공개되지 않는 내부 리뷰 페이지.
 */

import Link from "next/link";
import { useState } from "react";

const NAV = [
  { id: "treatments", label: "Treatments" },
  { id: "hospitals",  label: "Hospitals" },
  { id: "guides",     label: "Guides" },
  { id: "stories",    label: "Stories" },
  { id: "faq",        label: "FAQ" },
  { id: "about",      label: "About" },
];

// ============================================================
// CURRENT (baseline) — 현재 운영 중
// ============================================================
function CurrentHeader() {
  return (
    <nav
      style={{
        background: "#0B0B0A",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          maxWidth: 1280, margin: "0 auto", padding: "16px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
        }}
      >
        <div style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 22, letterSpacing: "0.04em", color: "#F5F0E8" }}>HEALO</div>
        <div style={{ display: "flex", gap: 28 }}>
          {NAV.map((n) => (
            <span key={n.id} style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,240,232,0.78)" }}>
              {n.label}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#F5F0E8", padding: "8px 12px", fontSize: 11, letterSpacing: "0.1em", fontFamily: "var(--font-sans)" }}>
            <span aria-hidden>🌐</span> English <span style={{ fontSize: 8 }}>▼</span>
          </button>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#9E9993", color: "#F5F0E8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", fontSize: 14 }}>B</div>
          <button style={{ background: "#F5F0E8", color: "#0B0B0A", border: 0, padding: "11px 18px", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase" }}>Request</button>
        </div>
      </div>
    </nav>
  );
}

// ============================================================
// PROPOSAL A — "조용한 정제"
//  · 🌐 제거, 언어는 2자(EN)만
//  · 로고 아래 tagline
//  · 우측 그룹 사이 hairline divider
//  · Telemedicine 을 NEW 뱃지와 함께 우측에 배치 (CTA 바로 옆)
//  · 골드 accent 강화 (CTA hover gold underline)
// ============================================================
function ProposalA() {
  return (
    <nav style={{ background: "#0B0B0A", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
        {/* Logo + tagline */}
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <div style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 20, letterSpacing: "0.06em", color: "#F5F0E8" }}>HEALO</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "#C8A96A", marginTop: 4 }}>
            Cancer Tourism · A-2026-01-02-06761
          </div>
        </div>

        {/* Nav */}
        <div style={{ display: "flex", gap: 28 }}>
          {NAV.map((n) => (
            <span key={n.id} style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,240,232,0.78)" }}>
              {n.label}
            </span>
          ))}
        </div>

        {/* Right — 3 group with hairline divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Group 1: lang — 2자 only */}
          <button style={{ background: "transparent", border: 0, color: "#F5F0E8", padding: "6px 4px", fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 600, letterSpacing: "0.24em", cursor: "pointer" }}>
            EN <span style={{ fontSize: 8, marginLeft: 2, opacity: 0.5 }}>▼</span>
          </button>

          {/* Divider */}
          <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.15)" }} />

          {/* Group 2: account */}
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#0B0B0A", border: "1px solid #C8A96A", color: "#C8A96A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", fontSize: 13 }}>B</div>

          {/* Divider */}
          <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.15)" }} />

          {/* Group 3: CTA + Telemedicine NEW */}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-sans)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#C8A96A" }}>
            <span style={{ width: 6, height: 6, background: "#C8A96A", borderRadius: "50%" }} />
            Telemedicine
            <span style={{ fontSize: 7, letterSpacing: "0.14em", color: "#0B0B0A", background: "#C8A96A", padding: "2px 5px", borderRadius: 2 }}>NEW</span>
          </span>

          <button style={{ background: "#F5F0E8", color: "#0B0B0A", border: 0, padding: "12px 20px", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase" }}>
            상담 · Request
          </button>
        </div>
      </div>
    </nav>
  );
}

// ============================================================
// PROPOSAL B — "2단 헤더 (Aman / Mandarin Oriental style)"
//  · 탑바: 연락처 + 언어 + 로그인 (얇고 저채도)
//  · 메인바: 로고 + 네비 + CTA (넓고 여유)
// ============================================================
function ProposalB() {
  return (
    <nav style={{ background: "#0B0B0A", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      {/* Top utility bar */}
      <div style={{ background: "#111110", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "6px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-sans)", color: "rgba(245,240,232,0.55)" }}>
          <div style={{ display: "flex", gap: 16 }}>
            <span>+82 10 4772 1075</span>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <span>24/7 Concierge</span>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ color: "#C8A96A", fontWeight: 600 }}>EN</span>
              <span>KO</span>
              <span>RU</span>
              <span>KZ</span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <span style={{ cursor: "pointer" }}>Sign in</span>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "22px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
        <div style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 22, letterSpacing: "0.06em", color: "#F5F0E8" }}>HEALO</div>
        <div style={{ display: "flex", gap: 32 }}>
          {NAV.map((n) => (
            <span key={n.id} style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,240,232,0.78)" }}>
              {n.label}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#0B0B0A", border: "1px solid #C8A96A", color: "#C8A96A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", fontSize: 13 }}>B</div>
          <button style={{ background: "#C8A96A", color: "#0B0B0A", border: 0, padding: "12px 22px", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase" }}>
            상담 · Request
          </button>
        </div>
      </div>
    </nav>
  );
}

// ============================================================
// PROPOSAL C — "Editorial (centered wordmark)"
//  · 로고를 가운데에 크게 배치
//  · 네비 둘로 분할 (왼쪽 3개 / 오른쪽 3개)
//  · 유틸리티는 가장 우측 끝
// ============================================================
function ProposalC() {
  return (
    <nav style={{ background: "#0B0B0A", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 24 }}>
        {/* Left nav */}
        <div style={{ display: "flex", gap: 28, justifyContent: "flex-start" }}>
          {NAV.slice(0, 3).map((n) => (
            <span key={n.id} style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(245,240,232,0.78)" }}>
              {n.label}
            </span>
          ))}
        </div>

        {/* Center wordmark */}
        <div style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 26, letterSpacing: "0.14em", color: "#F5F0E8", textAlign: "center" }}>HEALO</div>

        {/* Right nav + utilities */}
        <div style={{ display: "flex", gap: 28, justifyContent: "flex-end", alignItems: "center" }}>
          {NAV.slice(3).map((n) => (
            <span key={n.id} style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(245,240,232,0.78)" }}>
              {n.label}
            </span>
          ))}
          <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.15)", marginLeft: 6 }} />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.24em", color: "#F5F0E8" }}>EN</span>
          <button style={{ background: "transparent", color: "#C8A96A", border: "1px solid #C8A96A", padding: "10px 18px", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase" }}>
            Request
          </button>
        </div>
      </div>
    </nav>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function HeaderPreviewPage() {
  const [spotlight, setSpotlight] = useState(null);

  const items = [
    { id: "current", label: "현재 (Current)", note: "운영 중. 기준점.", node: <CurrentHeader /> },
    { id: "a",       label: "Proposal A — 조용한 정제", note: "🌐 제거 · tagline 추가 · 골드 accent · hairline divider · Telemedicine dot + NEW 를 CTA 옆으로", node: <ProposalA /> },
    { id: "b",       label: "Proposal B — 2단 헤더 (Aman 스타일)", note: "탑바: 연락처·언어·로그인 · 메인바: 로고·네비·골드 CTA. 고급 호텔·에디토리얼 브랜드 관습.", node: <ProposalB /> },
    { id: "c",       label: "Proposal C — Editorial (가운데 로고)", note: "가운데 큰 워드마크 + 네비 좌/우 분할. 매거진·갤러리 사이트 스타일.", node: <ProposalC /> },
  ];

  return (
    <div style={{ background: "#1a1a18", minHeight: "100vh", padding: "40px 20px" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <h1 style={{ color: "#F5F0E8", fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 400, letterSpacing: "0.02em", marginBottom: 4 }}>
          Header Redesign — Draft Preview
        </h1>
        <p style={{ color: "rgba(245,240,232,0.6)", fontFamily: "var(--font-sans)", fontSize: 13, marginBottom: 40 }}>
          현재 헤더 + 3가지 제안안. 각 변종을 클릭하면 확대해서 볼 수 있어요.
        </p>

        {items.map((it) => (
          <section
            key={it.id}
            onClick={() => setSpotlight(spotlight === it.id ? null : it.id)}
            style={{
              marginBottom: 40,
              border: spotlight === it.id ? "2px solid #C8A96A" : "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              transition: "all 150ms",
            }}
          >
            <div style={{ padding: "12px 20px", background: "#111110", color: "rgba(245,240,232,0.8)", fontFamily: "var(--font-sans)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", marginBottom: 4 }}>
                {it.label}
              </div>
              <div style={{ fontSize: 11, color: "rgba(245,240,232,0.55)", lineHeight: 1.5 }}>
                {it.note}
              </div>
            </div>
            {it.node}
          </section>
        ))}

        <div style={{ marginTop: 60, padding: 20, background: "rgba(200,169,106,0.08)", border: "1px solid rgba(200,169,106,0.3)", color: "#F5F0E8", fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.7 }}>
          <strong style={{ color: "#C8A96A", letterSpacing: "0.2em", textTransform: "uppercase", fontSize: 11 }}>Notes</strong>
          <ul style={{ marginTop: 10, paddingLeft: 20 }}>
            <li>색상은 현재 사이트 팔레트(cream <code>#F5F0E8</code> · ink <code>#0B0B0A</code> · gold <code>#C8A96A</code>) 기준.</li>
            <li>인터랙션(호버·드롭다운)은 정적. 실제 구현 시 추가.</li>
            <li>모바일 레이아웃은 데스크톱 확정 후 별도 작업.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
