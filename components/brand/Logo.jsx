// ─────────────────────────────────────────────────────────────
// healwith 중앙 로고 컴포넌트 (시안1 워드마크 — 벡터 이미지)
// 로고를 바꿀 일이 생기면 이 파일 "한 곳"만 고치면 사이트 전역에 반영됨.
// (헤더·모바일메뉴·포털바 등에서 이 컴포넌트를 import 해서 사용)
//
// - 워드마크 이미지: public/brand/wordmark.svg (글자를 path로 구운 벡터 — 폰트 의존 X)
//   · scripts/gen-wordmark.mjs 로 재생성 가능 (색/문구 바꿀 때)
// - tone: "light" → 밝은 배경(흰/민트)용 (heal=teal / with=slate)
//         "dark"  → 어두운/teal 배경용   (heal=mint / with=거의 흰)
// - lang="ko" → 한국어 화면: healwith 대신 한글 「힐위드」 로고를 "같은 자리·같은 높이"로 노출
//   (상표 「힐위드」 실사용 증빙, 2026-07-07 PO 확정 = 병기 아닌 단독). 그 외 언어(en·ru·kz·zh·ja)는
//   healwith — 영문화면 한글누출 가드(i18n-no-korean-leak) 준수. 힐위드는 Pretendard SemiBold(덜 투박).
// ─────────────────────────────────────────────────────────────

const SIZES = {
  sm: "h-3",
  md: "h-5",
  lg: "h-5 md:h-6",
};

export default function Logo({ tone = "light", size = "md", lang, className = "" }) {
  const isKo = lang === "ko";
  const enSrc = tone === "dark" ? "/brand/wordmark-dark.svg" : "/brand/wordmark.svg";
  const koSrc = tone === "dark" ? "/brand/wordmark-ko-dark.svg" : "/brand/wordmark-ko.svg";
  const sizeCls = SIZES[size] || SIZES.md;

  return (
    <img
      src={isKo ? koSrc : enSrc}
      alt={isKo ? "힐위드" : "healwith"}
      className={`${sizeCls} w-auto object-contain notranslate ${className}`}
      draggable={false}
    />
  );
}
