// ─────────────────────────────────────────────────────────────
// healwith 중앙 로고 컴포넌트
// 로고를 바꿀 일이 생기면 이 파일 "한 곳"만 고치면 사이트 전역에 반영됨.
// (헤더·푸터·메뉴 등에서 이 컴포넌트를 import 해서 사용)
//
// - 워드마크: heal(강조색) + with(보조색), 항상 소문자 (브랜드 규칙)
// - tone: "light"  → 밝은 배경(흰/민트)용: heal=teal-700, with=slate-700
//         "dark"   → 어두운/teal 배경용:   heal=white,     with=teal-200
// - 나중에 이미지 로고(SVG/PNG)로 교체하려면 아래 wordmark 자리만 <img>로 바꾸면 됨.
// ─────────────────────────────────────────────────────────────

const SIZES = {
  sm: "text-lg",
  md: "text-xl md:text-2xl",
  lg: "text-3xl md:text-4xl",
};

export default function Logo({ tone = "light", size = "md", className = "" }) {
  const heal = tone === "dark" ? "text-white" : "text-teal-700";
  const wth = tone === "dark" ? "text-teal-200" : "text-slate-700";
  const sizeCls = SIZES[size] || SIZES.md;
  return (
    <span className={`font-extrabold tracking-tight notranslate ${sizeCls} ${className}`}>
      <span className={heal}>heal</span><span className={wth}>with</span>
    </span>
  );
}
