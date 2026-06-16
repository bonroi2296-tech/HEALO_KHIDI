import { ImageResponse } from "next/og";

// 소셜 공유(OG) 미리보기 이미지 — 빌드시 자동 생성(1200x630).
// Next App Router가 이 파일을 감지해 og:image / twitter:image 메타를 자동 주입.
// 브랜드: healwith (heal=teal / with=slate), 흰 배경 Legacy 톤.
export const alt = "healwith — Korea Cancer Care for International Patients";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "90px",
          background: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "#0d9488",
              color: "#fff",
              fontSize: 44,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 24,
            }}
          >
            h
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>
            <span style={{ color: "#0d9488" }}>heal</span>
            <span style={{ color: "#334155" }}>with</span>
          </div>
        </div>
        <div style={{ fontSize: 52, fontWeight: 800, color: "#0f172a", lineHeight: 1.2, maxWidth: 900 }}>
          Korea Cancer Care for International Patients
        </div>
        <div style={{ fontSize: 30, color: "#64748b", marginTop: 24, lineHeight: 1.4, maxWidth: 940 }}>
          Video pre-consultation with top oncologists · 6-language interpretation · full-journey concierge
        </div>
        <div style={{ display: "flex", marginTop: 40 }}>
          <div style={{ height: 8, width: 120, background: "#0d9488", borderRadius: 4 }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
