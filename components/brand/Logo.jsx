// ─────────────────────────────────────────────────────────────
// healwith 중앙 로고 컴포넌트 (시안1 워드마크 — 벡터 이미지)
// 로고를 바꿀 일이 생기면 이 파일 "한 곳"만 고치면 사이트 전역에 반영됨.
// (헤더·모바일메뉴·포털바 등에서 이 컴포넌트를 import 해서 사용)
//
// - 워드마크 이미지: public/brand/wordmark.svg (글자를 path로 구운 벡터 — 폰트 의존 X)
//   · scripts/gen-wordmark.mjs 로 재생성 가능 (색/문구 바꿀 때)
// - tone: "light" → 밝은 배경(흰/민트)용 (heal=teal / with=slate)
//         "dark"  → 어두운/teal 배경용   (heal=mint / with=거의 흰)
// ─────────────────────────────────────────────────────────────

const SIZES = {
  sm: "h-3.5",
  md: "h-4 md:h-5",
  lg: "h-6 md:h-7",
};

export default function Logo({ tone = "light", size = "md", className = "" }) {
  const src = tone === "dark" ? "/brand/wordmark-dark.svg" : "/brand/wordmark.svg";
  const sizeCls = SIZES[size] || SIZES.md;
  return (
    <img
      src={src}
      alt="healwith"
      className={`${sizeCls} w-auto object-contain notranslate ${className}`}
      draggable={false}
    />
  );
}
