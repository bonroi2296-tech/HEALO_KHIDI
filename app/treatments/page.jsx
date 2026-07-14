import { Suspense } from "react";
import TreatmentsClient from "./TreatmentsClient";
import { localizedMeta } from "@/lib/i18n/metadata";

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.treatments.title", "seo.treatments.desc");
}

const baseMeta = {
  title: "암종별 치료 안내 — 한국 암 치료와 한방 통합 케어",
  description:
    "유방·자궁·난소암, 대장·위암, 간·담도·췌장암, 폐암, 갑상선암 등 6개 암종 전문 치료 안내. 면력한방병원 ITCRN 5축 통합 면역치료.",
  keywords: [
    "cancer treatment Korea",
    "위암 치료",
    "유방암 치료",
    "간암 치료",
    "Korean Medicine cancer care",
    "한방 면역치료",
    "oncology Korea",
    "면력한방병원",
    "ITCRN 면역치료",
    "싸이모신알파1",
    "암 치료 카자흐스탄",
    "암 치료 러시아",
  ],
  // alternates(hreflang/canonical)는 layout generateMetadata가 요청 언어별로 생성.
  openGraph: {
    title: "암종별 치료 안내 — 한국 암 치료와 한방 통합 케어 | healwith",
    description:
      "유방·자궁·난소암, 대장·위암, 간·담도·췌장암, 폐암, 갑상선암 등 6개 암종 전문 치료 안내.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Korea Cancer Treatment Guide | healwith",
    description:
      "6 cancer types, ITCRN 5-axis integrative immune therapy, Immune Hospital direct partner.",
  },
};

// 목록 스켈레톤 — 옛 app/treatments/loading.jsx 를 페이지 안 Suspense fallback 으로 이전.
// 라우트 레벨 loading.jsx 는 [slug] 상세의 notFound() 상태코드를 200으로 굳혀 금지(#87, §19).
// 페이지 내부 경계는 항상 존재하는 이 목록 페이지만 감싸므로 소프트 404와 무관.
function TreatmentsSkeleton() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ height: 32, background: '#f3f4f6', borderRadius: 8, width: '30%', marginBottom: 24, animation: 'pulse 1.5s infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ border: '1px solid #f3f4f6', borderRadius: 12, padding: 20, background: '#fff' }}>
            <div style={{ height: 18, background: '#f3f4f6', borderRadius: 6, width: '70%', marginBottom: 10, animation: 'pulse 1.5s infinite' }} />
            <div style={{ height: 14, background: '#f3f4f6', borderRadius: 6, width: '90%', marginBottom: 6, animation: 'pulse 1.5s infinite' }} />
            <div style={{ height: 14, background: '#f3f4f6', borderRadius: 6, width: '60%', animation: 'pulse 1.5s infinite' }} />
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

export default async function TreatmentsPage() {
  return (
    <Suspense fallback={<TreatmentsSkeleton />}>
      <TreatmentsClient />
    </Suspense>
  );
}
