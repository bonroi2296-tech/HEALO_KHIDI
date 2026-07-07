import "./astryx-theme.css";

// 파일럿 페이지 — 검색엔진 색인 금지(비공개 검토용, 아무 데도 링크 안 함).
export const metadata = {
  title: "Astryx 파일럿 — 디자인 시스템 검토",
  robots: { index: false, follow: false },
};

// data-astryx-theme 스코프 안에서만 Astryx 토큰이 적용된다.
// 배경도 테마 토큰을 써서 "Astryx가 그린 화면"이 어떤지 그대로 보이게 함.
export default function AstryxPilotLayout({ children }) {
  return (
    <div
      data-astryx-theme="neutral"
      style={{ minHeight: "100vh", background: "var(--color-background-body)" }}
    >
      {children}
    </div>
  );
}
