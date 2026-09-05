import CareJourneyClient from "./CareJourneyClient";
import { localizedMeta, getRequestLocale } from "@/lib/i18n/metadata";
import { careJourneyLd } from "@/lib/seo/structuredData";

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.careJourney.title", "seo.careJourney.desc");
}

const baseMeta = {
  title: "치료 여정 — 진단부터 회복까지 토탈 케어",
  description:
    "healwith는 병원 하나를 고르는 매칭 서비스가 아닙니다. 온라인 상담 · 원격 진단 · 케어 경로 설계 · 체류 동행 · 귀국 후 관리까지, 암 치료의 전 과정을 함께 설계하는 토탈 케어 컨시어지입니다.",
  keywords: [
    "한국 암 치료 여정",
    "의료관광 케어 경로",
    "Korea cancer care journey",
    "medical concierge Korea",
    "маршрут лечения рака Корея",
  ],
  openGraph: {
    title: "치료 여정 | healwith",
    description:
      "진단부터 수술 연계, 면역·재활, 귀국 후 관리까지 — 끊김 없는 암 치료 여정을 함께 설계합니다.",
    type: "website",
  },
};

// fallback 없는 Suspense 로 감싸지 않는다. 그렇게 하면 서버가 「머리말 + 빈 본문 + 꼬리말」을
// 먼저 보내고 본문을 나중에 끼워 넣어, 꼬리말이 화면에 그려졌다가 밀려난다(실서비스 실측 데스크톱 5회 중 4회 발생).
// 자세한 경위는 app/page.jsx 주석. 2026-08-20 실측.
export default async function CareJourneyPage() {
  const { locale } = await getRequestLocale();
  const jsonLd = careJourneyLd(locale);
  return (
    <>
      <script
        id="jsonld-care-journey"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CareJourneyClient />
    </>
  );
}
