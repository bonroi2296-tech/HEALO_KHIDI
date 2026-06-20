import Script from "next/script";
import CostCalculatorClient from "./CostCalculatorClient";

// ─────────────────────────────────────────────────────────────
// Yandex/Google SEO — русскоязычный калькулятор стоимости лечения рака в Корее
// Целевые запросы (высокая конверсия — ценовой интент):
//   лечение рака в Корее цена / стоимость, лечение в Корее из Алматы, без визы
// ─────────────────────────────────────────────────────────────

export const metadata = {
  title: "Стоимость лечения рака в Корее — калькулятор | healwith",
  description:
    "Рассчитайте ориентировочную стоимость лечения онкологии в Южной Корее: программа, проживание, перелёт, диагностика. Бесплатный точный расчёт и консультация на русском языке.",
  keywords: [
    "лечение рака в Корее цена",
    "стоимость лечения рака в Корее",
    "лечение рака в Корее цены отзывы",
    "лечение в Корее из Казахстана",
    "лечение в Корее из Алматы",
    "лечение в Корее без визы",
    "онкология Южная Корея стоимость",
    "иммунотерапия Корея цена",
  ],
  alternates: {
    canonical: "/ru/cost-calculator",
    languages: {
      ru: "/ru/cost-calculator",
      kk: "/kk/for-kazakh-patients",
      "x-default": "/",
    },
  },
  openGraph: {
    title: "Калькулятор стоимости лечения рака в Корее — healwith",
    description:
      "Ориентировочная стоимость лечения онкологии в Южной Корее. Бесплатный точный расчёт на русском языке.",
    type: "website",
    locale: "ru_RU",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  name: "Стоимость лечения рака в Корее — калькулятор healwith",
  description:
    "Ориентировочный расчёт стоимости лечения онкологии в Южной Корее для пациентов из России, Казахстана и СНГ.",
  url: "https://khidi.healo.kr/ru/cost-calculator",
  inLanguage: "ru",
  about: { "@type": "MedicalCondition", name: "Онкология", alternateName: "Cancer" },
  provider: { "@type": "Organization", name: "healwith", url: "https://khidi.healo.kr" },
};

export default function CostCalculatorPage() {
  return (
    <>
      <Script
        id="jsonld-ru-cost-calc"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CostCalculatorClient />
    </>
  );
}
