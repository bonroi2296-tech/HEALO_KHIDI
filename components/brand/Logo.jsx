// ─────────────────────────────────────────────────────────────
// healwith 중앙 로고 컴포넌트 (시안1 워드마크 — 벡터 이미지)
// 로고를 바꿀 일이 생기면 이 파일 "한 곳"만 고치면 사이트 전역에 반영됨.
// (헤더·모바일메뉴·포털바 등에서 이 컴포넌트를 import 해서 사용)
//
// - 워드마크 이미지: public/brand/wordmark.svg (글자를 path로 구운 벡터 — 폰트 의존 X)
//   · scripts/gen-wordmark.mjs 로 재생성 가능 (색/문구 바꿀 때)
// - tone: "light" → 밝은 배경(흰/민트)용 (heal=teal / with=slate)
//         "dark"  → 어두운/teal 배경용   (heal=mint / with=거의 흰)
// - lang="ko" → 한국어 화면: healwith 옆에 한글 「힐위드」 병기(상표 실사용 증빙, 2026-07-07 PO 확정).
//   그 외 언어(en·ru·kz·zh·ja)는 healwith 단독 — 영문 화면 한글누출 가드(i18n-no-korean-leak) 준수.
//   힐위드 워드마크는 Pretendard SemiBold(영문 ExtraBold보다 가벼워 덜 투박).
// ─────────────────────────────────────────────────────────────

const SIZES = {
  sm: "h-3",
  md: "h-5",
  lg: "h-5 md:h-6",
};

// 병기 로고 가운데 구분선 높이 — 각 로고보다 살짝 짧게(self-stretch가 flex에서 불안정해 고정값 사용).
const DIVIDER_SIZES = {
  sm: "h-2.5",
  md: "h-3.5",
  lg: "h-4 md:h-5",
};

export default function Logo({ tone = "light", size = "md", lang, className = "" }) {
  const src = tone === "dark" ? "/brand/wordmark-dark.svg" : "/brand/wordmark.svg";
  const koSrc = tone === "dark" ? "/brand/wordmark-ko-dark.svg" : "/brand/wordmark-ko.svg";
  const sizeCls = SIZES[size] || SIZES.md;
  const imgCls = `${sizeCls} w-auto object-contain notranslate`;

  if (lang === "ko") {
    // 색은 인라인 스타일로 고정(Tailwind JIT가 이 파일 클래스를 놓치는 경우 대비). teal-400/teal-300.
    const divColor = tone === "dark" ? "#5eead4" : "#2dd4bf";
    const divSize = DIVIDER_SIZES[size] || DIVIDER_SIZES.md;
    return (
      <span className={`inline-flex items-center gap-2 ${className}`}>
        <img src={src} alt="healwith" className={imgCls} draggable={false} />
        <span className={`w-px shrink-0 ${divSize}`} style={{ backgroundColor: divColor }} aria-hidden="true" />
        <img src={koSrc} alt="힐위드" className={imgCls} draggable={false} />
      </span>
    );
  }

  return <img src={src} alt="healwith" className={`${imgCls} ${className}`} draggable={false} />;
}
