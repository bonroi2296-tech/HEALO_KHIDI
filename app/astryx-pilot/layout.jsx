// gen-UI 파일럿 레이아웃 — 검색 색인 금지(비공개 검토용).
// (Astryx는 평가 후 미채택으로 제거됨 2026-07-07. 살아남은 건 우리 Tailwind 기반 gen-UI뿐.)
export const metadata = {
  title: "gen-UI 파일럿",
  robots: { index: false, follow: false },
};

export default function PilotLayout({ children }) {
  return children;
}
