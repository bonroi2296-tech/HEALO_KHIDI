import { getRequestLocale, localeAlternates, OG_LOCALE } from "@/lib/i18n/metadata";
import CostCalculatorClient from "./CostCalculatorClient";

// ─────────────────────────────────────────────────────────────
// 다국어 비용 계산기. 언어는 proxy 가 /{locale}/cost-calculator → /cost-calculator 로 rewrite.
// SEO: 가격 의도 키워드(가격/비용) 정조준. RU=Yandex, KZ=Google 주력.
// ─────────────────────────────────────────────────────────────

const META = {
  en: { title: "Cost of cancer treatment in Korea — calculator | healwith", desc: "Estimate the cost of cancer treatment in South Korea: program, lodging, flight, diagnostics. Free exact quote and consultation in your language." },
  ko: { title: "한국 암치료 비용 계산기 | healwith", desc: "한국 암치료 예상 비용을 계산하세요 — 프로그램·숙소·항공·진단. 정확한 견적과 상담은 무료." },
  ru: { title: "Стоимость лечения рака в Корее — калькулятор | healwith", desc: "Рассчитайте ориентировочную стоимость лечения онкологии в Южной Корее: программа, проживание, перелёт, диагностика. Бесплатный точный расчёт и консультация на русском." },
  kz: { title: "Кореяда қатерлі ісікті емдеу құны — калькулятор | healwith", desc: "Кореяда қатерлі ісікті емдеудің шамамен құнын есептеңіз: бағдарлама, тұру, ұшу, диагностика. Тегін нақты есеп пен кеңес." },
  zh: { title: "韩国癌症治疗费用计算器 | healwith", desc: "估算在韩国治疗癌症的费用：项目、住宿、机票、诊断。免费提供精确报价与母语咨询。" },
  ja: { title: "韓国のがん治療費用シミュレーター | healwith", desc: "韓国でのがん治療費用を概算：プログラム・宿泊・航空券・診断。正確な見積もりとご相談は無料。" },
};

const KEYWORDS = [
  "лечение рака в Корее цена", "стоимость лечения рака в Корее", "лечение в Корее из Алматы",
  "лечение в Корее без визы", "한국 암치료 비용", "cost of cancer treatment in Korea",
  "Кореяда қатерлі ісікті емдеу құны", "韩国癌症治疗费用", "韓国 がん治療 費用",
];

export async function generateMetadata() {
  const { locale } = await getRequestLocale();
  const lc = locale && META[locale] ? locale : "en";
  const m = META[lc];
  const alternates = await localeAlternates();
  return {
    title: { absolute: m.title },
    description: m.desc,
    keywords: KEYWORDS,
    ...(alternates ? { alternates } : {}),
    openGraph: {
      title: m.title,
      description: m.desc,
      type: "website",
      locale: OG_LOCALE[lc] || "en_US",
      ...(alternates ? { url: alternates.canonical } : {}),
    },
    // ⚠️ twitter 를 «반드시» openGraph 와 같이 채운다 (2026-08-31 실측으로 추가).
    //    openGraph 만 정의하면 twitter 는 루트 layout 것을 물려받는다 → 제목·og 는 러시아어인데
    //    twitter 카드만 "healwith | Korea Cancer Care…"(영어)로 나갔다.
    //    이 화면은 ru/kz 유료 광고의 주요 착지다 — 공유 카드가 영어면 그 클릭을 그대로 잃는다.
    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.desc,
    },
  };
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  name: "Cost of cancer treatment in Korea — healwith calculator",
  description: "Estimate the cost of cancer treatment in South Korea for patients from Russia, Kazakhstan and CIS.",
  url: "https://healwith.co.kr/cost-calculator",
  about: { "@type": "MedicalCondition", name: "Cancer", alternateName: "Онкология" },
  provider: { "@type": "Organization", name: "healwith", url: "https://healwith.co.kr" },
};

export default function CostCalculatorPage() {
  return (
    <>
      <script id="jsonld-cost-calc" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CostCalculatorClient />
    </>
  );
}
