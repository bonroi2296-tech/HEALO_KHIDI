import PartnersClient from "./PartnersClient";
import { getRequestLocale, localeAlternates } from "@/lib/i18n/metadata";
import { COPY } from "./copy";

// B2B 랜딩이라 SEO 제목·설명을 i18n index 대신 로컬 카피에서 직접 읽는다(카피 단일 SoR 유지).
export async function generateMetadata() {
  const { locale } = await getRequestLocale();
  const c = COPY[locale] || COPY.en;
  const alt = await localeAlternates();
  return {
    title: { absolute: c.seoTitle },
    description: c.seoDesc,
    ...(alt ? { alternates: alt } : {}),
    openGraph: {
      title: c.seoTitle,
      description: c.seoDesc,
      type: "website",
      ...(alt ? { url: alt.canonical } : {}),
    },
    // ⚠️ twitter 를 «반드시» openGraph 와 같이 채운다 (2026-08-31 실측으로 추가).
    //    openGraph 만 정의하면 twitter 는 루트 layout 의 «환자용 영어 문구»를 물려받는다.
    //    여기는 B2B 랜딩이라 문구가 아예 다른 얘기가 된다(파트너 제안이 환자 광고문으로 보인다).
    twitter: {
      card: "summary_large_image",
      title: c.seoTitle,
      description: c.seoDesc,
    },
  };
}

// fallback 없는 Suspense 로 감싸지 않는다. 그렇게 하면 서버가 「머리말 + 빈 본문 + 꼬리말」을
// 먼저 보내고 본문을 나중에 끼워 넣어, 꼬리말이 화면에 그려졌다가 밀려난다(실서비스 실측 데스크톱 5회 중 4회 발생).
// 자세한 경위는 app/page.jsx 주석. 2026-08-20 실측.
export default function PartnersPage() {
  return (
    <PartnersClient />
  );
}
