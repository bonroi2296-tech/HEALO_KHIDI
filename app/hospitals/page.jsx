import { Suspense } from "react";
import HospitalsClient from "./HospitalsClient";
import { localizedMeta } from "@/lib/i18n/metadata";

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.hospitals.title", "seo.hospitals.desc");
}

const baseMeta = {
  title: "협력 병원 — healwith 파트너 의료기관",
  description:
    "healwith 컨소시엄 핵심 파트너 면력한방병원과 협진 암 전문 병원을 소개합니다. 한방 면역치료부터 암 수술·항암까지 원스톱 케어.",
  keywords: [
    "면력한방병원",
    "cancer hospital Korea",
    "oncology partner hospital",
    "Korean Medicine immune therapy",
    "한방 면역치료",
    "암 전문 병원 한국",
  ],
  openGraph: {
    title: "협력 병원 — healwith 파트너 의료기관",
    description: "healwith 컨소시엄 핵심 파트너 면력한방병원과 협진 암 전문 병원. 한방 면역치료부터 암 수술·항암까지 원스톱 케어.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "healwith Partner Hospitals in Korea",
    description: "healwith partner hospitals offering integrated cancer care — Korean Medicine immune therapy to oncology surgery.",
  },
};

// 목록 스켈레톤 — 옛 app/hospitals/loading.jsx 를 페이지 안 Suspense fallback 으로 이전.
// 라우트 레벨 loading.jsx 는 [slug] 상세의 notFound() 상태코드를 200으로 굳혀 금지(#86, §18).
// 페이지 내부 경계는 항상 존재하는 이 목록 페이지만 감싸므로 소프트 404와 무관.
function HospitalsSkeleton() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ height: 32, background: '#f3f4f6', borderRadius: 8, width: '30%', marginBottom: 24, animation: 'pulse 1.5s infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ border: '1px solid #f3f4f6', borderRadius: 12, padding: 20, background: '#fff' }}>
            <div style={{ height: 160, background: '#f3f4f6', borderRadius: 8, marginBottom: 12, animation: 'pulse 1.5s infinite' }} />
            <div style={{ height: 18, background: '#f3f4f6', borderRadius: 6, width: '70%', marginBottom: 8, animation: 'pulse 1.5s infinite' }} />
            <div style={{ height: 14, background: '#f3f4f6', borderRadius: 6, width: '50%', animation: 'pulse 1.5s infinite' }} />
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

export default function HospitalsPage() {
  return (
    <Suspense fallback={<HospitalsSkeleton />}>
      <HospitalsClient />
    </Suspense>
  );
}
