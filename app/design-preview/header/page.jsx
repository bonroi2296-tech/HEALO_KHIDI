"use client";

/**
 * Design Preview — Header variants (v2)
 * 1차 A/B/C 는 "호텔 럭셔리 클리셰" 피드백 받음.
 * 이번엔 빼는 방향으로 4개: D(거의없음) / E(플로팅필) / F(크림반전) / G(골드헤어라인)
 */

import { useState } from "react";

const NAV = [
  { id: "treatments", label: "Treatments" },
  { id: "hospitals",  label: "Hospitals" },
  { id: "guides",     label: "Guides" },
  { id: "stories",    label: "Stories" },
  { id: "about",      label: "About" },
];

// ============================================================
// CURRENT (baseline)
// ============================================================
function CurrentHeader() {
  return (
    <nav style={{ background: "#0B0B0A", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
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
// PROPOSAL D — "거의 없음 (Erased)"
//   HEALO + Menu + EN. 끝.
//   메뉴는 풀스크린 오버레이 (클릭 시 열림 — 여긴 정적)
//   Aesop / COS / Ace & Tate 계열
// ============================================================
function ProposalD() {
  return (
    <nav style={{ background: "#0B0B0A", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "22px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 20, letterSpacing: "0.16em", color: "#F5F0E8" }}>HEALO</div>
        <div style={{ display: "flex", alignItems: "center", gap: 28, fontFamily: "var(--font-sans)", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(245,240,232,0.85)" }}>
          <span style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            Menu
            <span aria-hidden style={{ fontSize: 14, lineHeight: 0, opacity: 0.6 }}>+</span>
          </span>
          <span style={{ width: 1, height: 12, background: "rgba(255,255,255,0.2)" }} />
          <span style={{ cursor: "pointer", opacity: 0.7 }}>EN</span>
        </div>
      </div>
    </nav>
  );
}

// ============================================================
// PROPOSAL E — "플로팅 필 (Linear / Apple)"
//   로고 좌측, 가운데에 둥근 pill 네비, 우측 작은 EN
//   스크롤 되어도 pill 이 정체성
// ============================================================
function ProposalE() {
  return (
    <nav style={{ background: "#0B0B0A", padding: "16px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
        <div style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 22, letterSpacing: "0.06em", color: "#F5F0E8" }}>HEALO</div>

        {/* Floating pill */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 999,
            padding: "6px 6px 6px 14px",
          }}
        >
          {NAV.slice(0, 4).map((n, i) => (
            <span
              key={n.id}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.02em",
                color: "rgba(245,240,232,0.82)",
                padding: "8px 14px",
                borderRadius: 999,
                cursor: "pointer",
                background: i === 0 ? "rgba(255,255,255,0.04)" : "transparent",
              }}
            >
              {n.label}
            </span>
          ))}
          <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)", marginLeft: 4, marginRight: 4 }} />
          <button style={{ background: "#F5F0E8", color: "#0B0B0A", border: 0, borderRadius: 999, padding: "8px 16px", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 12 }}>
            Request
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: "var(--font-sans)", fontSize: 12, color: "rgba(245,240,232,0.7)" }}>
          <span style={{ cursor: "pointer" }}>EN</span>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.06)", color: "#F5F0E8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", fontSize: 13 }}>B</div>
        </div>
      </div>
    </nav>
  );
}

// ============================================================
// PROPOSAL F — "크림 반전 (Editorial)"
//   bg 를 크림으로, 다크 텍스트
//   히어로(다크)로 진입 시 극적 대비
//   NYT / Dia / 예술지 계열
// ============================================================
function ProposalF() {
  return (
    <nav style={{ background: "#F5F0E8", borderBottom: "1px solid rgba(11,11,10,0.08)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
        <div style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 22, letterSpacing: "0.06em", color: "#0B0B0A" }}>HEALO</div>
        <div style={{ display: "flex", gap: 32 }}>
          {NAV.map((n) => (
            <span key={n.id} style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(11,11,10,0.7)" }}>
              {n.label}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: "var(--font-sans)", fontSize: 12, color: "#0B0B0A" }}>
          <span style={{ letterSpacing: "0.2em", fontWeight: 600 }}>EN</span>
          <span style={{ width: 1, height: 14, background: "rgba(11,11,10,0.2)" }} />
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontFamily: "var(--font-serif)", fontSize: 15, fontStyle: "italic",
            color: "#0B0B0A", borderBottom: "1px solid #C8A96A", paddingBottom: 2,
          }}>
            Request <span>→</span>
          </span>
        </div>
      </div>
    </nav>
  );
}

// ============================================================
// PROPOSAL G — "골드 헤어라인 (절제된 모던)"
//   모든 아이콘 / 버튼 박스 / 배지 제거
//   네비는 간격으로만 구분
//   우측에 Request 하나 + ··· (더보기)
//   헤더 바닥 1px 골드 선 = 정체성
//   Balenciaga / Issey Miyake 계열
// ============================================================
function ProposalG() {
  return (
    <nav style={{ background: "#0B0B0A", borderBottom: "1px solid #C8A96A" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "22px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40 }}>
        <div style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 20, letterSpacing: "0.2em", color: "#F5F0E8" }}>
          HEALO
        </div>

        <div style={{ display: "flex", gap: 40, flex: 1, justifyContent: "center" }}>
          {NAV.map((n) => (
            <span
              key={n.id}
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 400,
                fontSize: 13,
                letterSpacing: "0.02em",
                color: "rgba(245,240,232,0.85)",
                cursor: "pointer",
              }}
            >
              {n.label}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{
            fontFamily: "var(--font-sans)", fontSize: 13, color: "#F5F0E8",
            borderBottom: "1px solid rgba(200,169,106,0.4)", paddingBottom: 2, cursor: "pointer",
          }}>
            Request
          </span>
          <span aria-hidden style={{ color: "rgba(245,240,232,0.5)", fontSize: 18, letterSpacing: 2, cursor: "pointer" }}>···</span>
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
    {
      id: "current",
      label: "Current (기준점)",
      note: "현재 운영 중.",
      node: <CurrentHeader />,
    },
    {
      id: "d",
      label: "D — 거의 없음 (Erased)",
      note: "HEALO + Menu + EN. 끝. 메뉴는 풀스크린 오버레이. · Aesop / COS / Ace & Tate 계열",
      node: <ProposalD />,
    },
    {
      id: "e",
      label: "E — 플로팅 필 (Floating Pill)",
      note: "로고 좌측, 가운데 둥근 pill 네비(반투명 블러), 우측 EN·계정. 스크롤 시 pill 이 작아지며 따라옴. · Linear / Apple.com 계열",
      node: <ProposalE />,
    },
    {
      id: "f",
      label: "F — 크림 반전 (Editorial)",
      note: "bg 를 크림색으로, 다크 텍스트. 히어로(다크)로 진입 시 극적 대비. Request 는 italic serif + 골드 밑줄. · NYT / 예술지 계열",
      node: <ProposalF />,
    },
    {
      id: "g",
      label: "G — 골드 헤어라인 (Refined)",
      note: "아이콘·버튼 박스 없음. 간격만으로 네비 구분. 우측에 Request 하나 + ··· 더보기. 바닥에 1px 골드선. · Balenciaga / Issey Miyake 계열",
      node: <ProposalG />,
    },
  ];

  return (
    <div style={{ background: "#1a1a18", minHeight: "100vh", padding: "40px 20px" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <h1 style={{ color: "#F5F0E8", fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 400, letterSpacing: "0.02em", marginBottom: 4 }}>
          Header Redesign — Draft v2
        </h1>
        <p style={{ color: "rgba(245,240,232,0.6)", fontFamily: "var(--font-sans)", fontSize: 13, marginBottom: 8 }}>
          v1 (A/B/C) 는 "호텔 럭셔리 클리셰" 피드백. 이번엔 <strong style={{ color: "#C8A96A" }}>빼는 방향</strong> 으로 4개.
        </p>
        <p style={{ color: "rgba(245,240,232,0.4)", fontFamily: "var(--font-sans)", fontSize: 11, marginBottom: 40 }}>
          박스 클릭 = 하이라이트 (비교 포커스용)
        </p>

        {items.map((it) => (
          <section
            key={it.id}
            onClick={() => setSpotlight(spotlight === it.id ? null : it.id)}
            style={{
              marginBottom: 36,
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

        <div style={{ marginTop: 50, padding: 22, background: "rgba(200,169,106,0.08)", border: "1px solid rgba(200,169,106,0.3)", color: "#F5F0E8", fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.7 }}>
          <strong style={{ color: "#C8A96A", letterSpacing: "0.2em", textTransform: "uppercase", fontSize: 11 }}>변화 요약</strong>
          <ul style={{ marginTop: 10, paddingLeft: 20 }}>
            <li><strong>D</strong>: 네비 전부 숨김 → 메뉴 텍스트 하나 뒤로. 가장 미니멀, 가장 과감.</li>
            <li><strong>E</strong>: 네비가 floating pill 로 분리 → "헤더" 라는 관습 자체를 벗어남.</li>
            <li><strong>F</strong>: 색 완전 반전 → 다크 사이트 안에서 헤더만 빛남. Request 가 serif italic.</li>
            <li><strong>G</strong>: 박스·아이콘 제거 + 1px 골드 하단선. 가장 보수적 동시에 가장 다듬어진.</li>
          </ul>
          <p style={{ marginTop: 12, marginBottom: 0, fontSize: 12, color: "rgba(245,240,232,0.6)" }}>
            히어로(대형 serif italic "guided end to end") 랑 궁합 — <strong>D·G 가 양념 역할</strong>로 가장 조화.
            <strong> E</strong> 는 테크 느낌 강함. <strong>F</strong> 는 히어로 직전에서 다크로 떨어지는 장면 연출 가능.
          </p>
        </div>
      </div>
    </div>
  );
}
