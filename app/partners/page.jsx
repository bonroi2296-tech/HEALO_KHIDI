import PartnersClient from "./PartnersClient";
import { getRequestLocale } from "@/lib/i18n/metadata";
import { COPY } from "./copy";

// B2B 랜딩이라 SEO 제목·설명을 i18n index 대신 로컬 카피에서 직접 읽는다(카피 단일 SoR 유지).
export async function generateMetadata() {
  const { locale } = await getRequestLocale();
  const c = COPY[locale] || COPY.en;
  return {
    title: { absolute: c.seoTitle },
    description: c.seoDesc,
    openGraph: { title: c.seoTitle, description: c.seoDesc, type: "website" },
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
