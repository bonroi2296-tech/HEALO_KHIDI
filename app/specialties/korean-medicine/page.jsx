import KoreanMedicineClient from "./KoreanMedicineClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// ⚠️ title/description을 generateMetadata에서 요청 언어로 로컬라이즈한다.
// 이전엔 정적 영어 metadata라 ru/kz 등 모든 언어 사용자에게 영어 제목이 노출돼
// 타겟시장(러·카) 검색 노출에 불리했음. 다른 SEO 페이지들과 동일하게 6개어 반영.
// (문구는 기존 로컬라이즈 키 home.koreanMedicine* 재사용 — 새 번역 아님.)
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
  return localizedMeta(baseMeta, "home.koreanMedicine", "home.koreanMedicineDesc");
}

export default function KoreanMedicinePage() {
  return <KoreanMedicineClient />;
}
