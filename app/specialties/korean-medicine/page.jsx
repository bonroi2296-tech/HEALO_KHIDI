import KoreanMedicineClient from "./KoreanMedicineClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// ⚠️ title/description을 generateMetadata에서 요청 언어로 로컬라이즈한다.
// 이전엔 정적 영어 metadata라 ru/kz 등 모든 언어 사용자에게 영어 제목이 노출돼
// 타겟시장(러·카) 검색 노출에 불리했음. 다른 SEO 페이지들과 동일하게 6개어 반영.
//
// 2026-09-11: 문구를 home.koreanMedicine*(홈 카드의 한 줄 부제) 재사용에서 전용 seo.* 키로 옮겼다.
// 왜: 서치콘솔 28일 실측에서 이 화면이 «비브랜드 검색으로 순위가 잡히는 유일한 화면»인데
//     (корейская традиционная медицина 12.5위 · народная 16.0위 · 韓方医とは 6.0위,
//      /ru 27노출 15.9위 · /kz 4노출 2.8위로 그 28일 전체 클릭 7 중 2를 이 화면이 만들었다)
//     정작 설명이 40~50자짜리 홈 카드 부제였고("Ощутите уникальное традиционное лечение Кореи")
//     제목엔 브랜드도 없었다 — seo.* 키를 안 쓰는 유일한 공개 화면이었다.
//     40자 설명은 구글이 스니펫을 본문에서 임의로 짜 가게 만든다.
const baseMeta = {
  keywords: [
    "Korean Medicine",
    "Korean Traditional Medicine",
    "한방",
    "韩方治疗",
    "韓方病院",
    "韓国漢方治療",
    "acupuncture Korea",
    "herbal medicine Korea",
  ],
  // alternates(hreflang/canonical)는 layout generateMetadata가 요청 언어별로 생성.
  openGraph: {
    type: "website",
  },
};

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.koreanMedicine.title", "seo.koreanMedicine.desc");
}

export default function KoreanMedicinePage() {
  return <KoreanMedicineClient />;
}
