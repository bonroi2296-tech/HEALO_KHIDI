import { t } from "@/lib/i18n";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getRequestLocale, HREF_LANG, localizedMeta } from "@/lib/i18n/metadata";
import { FAQS } from "@/lib/faq/faqData";
import FAQClient from "./FAQClient";

// 검색결과에 뜨는 제목·설명은 요청 언어로 (러·카 환자가 구글에서 보는 첫 줄).
export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.faq.title", "seo.faq.desc");
}

const baseMeta = {
  title: "FAQ — Frequently Asked Questions",
  description:
    "Common questions about healwith's medical concierge service for international cancer patients — consultation, treatment, visa, payment, and privacy.",
  keywords: ["healwith FAQ", "Korea medical tourism FAQ", "cancer treatment Korea questions", "medical concierge FAQ"],
  openGraph: {
    title: "Frequently Asked Questions | healwith",
    description: "Everything international patients ask about treatment in Korea — consultation, visa, payment, and privacy.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ | healwith — Frequently Asked Questions",
    description: "Everything international patients ask about cancer treatment in Korea.",
  },
};

/**
 * FAQPage JSON-LD — 화면에 실제로 뜨는 Q&A(FAQS + i18n)를 그대로 직렬화한다.
 *
 * 왜 하드코딩을 버렸나: 예전엔 영어 4문항이 이 파일에 박혀 있어 ①화면의 17문항과 다르고
 * ②러시아어·카자흐어 요청에도 영어만 나갔다. 구조화데이터가 화면과 다르면 구글은 리치결과를
 * 안 주고, AI 답변엔 애초에 우리 문장이 안 실린다(AEO). 이제 화면과 같은 소스 = 항상 일치.
 * 문구 수정은 i18n 사전(faqData.*)에서 — 여기 손댈 일 없음.
 */
function faqJsonLd(lang) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: HREF_LANG[lang] || lang,
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: t(f.qKey, lang),
      acceptedAnswer: { "@type": "Answer", text: t(f.aKey, lang) },
    })),
  };
}

export default async function FAQPage() {
  // layout 이 요청 언어의 코디 오버라이드까지 적용한 뒤 자식이 렌더되므로 t() 는 화면과 같은 값을 준다.
  const { locale } = await getRequestLocale();
  const lang = locale || DEFAULT_LOCALE;

  return (
    <>
      <script
        id="jsonld-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(lang)) }}
      />
      <FAQClient />
    </>
  );
}
