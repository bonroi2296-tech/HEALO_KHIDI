import InsuranceClient from "./InsuranceClient";
import { localizedMeta, getRequestLocale } from "@/lib/i18n/metadata";
import { insuranceGuideLd } from "@/lib/seo/structuredData";

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.insurance.title", "seo.insurance.desc");
}

const baseMeta = {
  title: "보험으로 받는 한국 암치료",
  description:
    "중증질환 보험으로 받는 한국 암치료. 치료비·항공·숙박까지 보험이 커버할 수 있고, healwith가 한국 측 병원·통역·케어를 조직합니다.",
  keywords: [
    "보험 한국 암치료",
    "лечение рака в Корее по страховке",
    "страхование критических заболеваний Корея",
    "cancer treatment Korea insurance coverage",
    "Здоровье без границ Корея",
  ],
  openGraph: {
    title: "보험으로 받는 한국 암치료 | healwith",
    description:
      "중증질환 보험 프로그램이 한국 치료를 커버합니다. 치료·항공·숙박·통역까지, 보험사가 병원에 직접 지불합니다.",
    type: "website",
  },
};

// fallback 없는 Suspense 로 감싸지 않는다. 그렇게 하면 서버가 「머리말 + 빈 본문 + 꼬리말」을
// 먼저 보내고 본문을 나중에 끼워 넣어, 꼬리말이 화면에 그려졌다가 밀려난다(실서비스 실측 데스크톱 5회 중 4회 발생).
// 자세한 경위는 app/page.jsx 주석. 2026-08-20 실측.
export default async function InsurancePage() {
  const { locale } = await getRequestLocale();
  const jsonLd = insuranceGuideLd({ description: baseMeta.description, locale });
  return (
    <>
      <script
        id="jsonld-insurance"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <InsuranceClient />
    </>
  );
}
