import VisaClient from "../patient/visa/VisaClient";
import { localizedMeta, getRequestLocale } from "@/lib/i18n/metadata";
import {
  getVisaInfo,
  getVisaChecklist,
  getAllVisaTypes,
  getCountryEntry,
} from "@/lib/visa/visaGuide";

// 검색결과에 뜨는 제목·설명은 요청 언어로 (러·카 환자가 구글에서 보는 첫 줄).
export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.visa.title", "seo.visa.desc");
}

const baseMeta = {
  title: "Medical Visa Guide",
  description:
    "Complete guide to Korean medical visas (C-3-3, G-1-10). Required documents checklist, processing times, fees, and embassy information for international patients.",
  keywords: ["Korea medical visa", "C-3-3 visa", "G-1-10 visa", "medical tourism visa"],
  openGraph: {
    title: "Medical Visa Guide | healwith",
    description: "Complete guide to Korean medical visas with document checklists.",
  },
  twitter: {
    card: "summary",
    title: "Medical Visa Guide | healwith",
    description: "Korean medical visa guide with required documents and embassy info.",
  },
};

// 화면이 기본으로 고르는 값과 «똑같이» 맞춘다. 다르면 첫 그림이 어긋나 다시 그려진다.
const DEFAULT_NATIONALITY = "ru";
const DEFAULT_DURATION = 30;

// 서버에서 미리 계산해 넘긴다 — 안 넘기면 서버가 보내는 화면엔 국적 고르는 상자만 있고
// 정작 «어떤 비자·필요 서류»는 통째로 없다. JS 를 안 돌리는 검색·AI 로봇은 그 빈 화면만 읽고 간다.
// 값은 /api/khidi/visa 가 쓰는 것과 같은 함수에서 나오므로 두 곳이 갈릴 일이 없다.
function buildInitialGuide(lang) {
  try {
    const { recommended, alternative } = getVisaInfo(DEFAULT_NATIONALITY, DEFAULT_DURATION);
    return {
      ok: true,
      recommended: getVisaChecklist(recommended.visaType, lang),
      alternative: alternative ? getVisaChecklist(alternative.visaType, lang) : null,
      countryEntry: getCountryEntry(DEFAULT_NATIONALITY, lang),
      allVisaTypes: getAllVisaTypes(lang),
    };
  } catch {
    // 미리 그리기가 실패해도 화면은 예전처럼 브라우저에서 불러오면 된다.
    return null;
  }
}

export default async function PublicVisaPage() {
  const { locale } = await getRequestLocale();
  const lang = locale || "en";
  return <VisaClient initialGuide={buildInitialGuide(lang)} initialGuideLang={lang} />;
}
