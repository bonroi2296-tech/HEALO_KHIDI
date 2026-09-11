import { Suspense } from "react";
import HospitalsClient from "./HospitalsClient";
import { localizedMeta, getUiLocale } from "@/lib/i18n/metadata";
import { getFeaturedHospitals } from "@/lib/data/hospitals";

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
// 라우트 레벨 loading.jsx 는 [slug] 상세의 notFound() 상태코드를 200으로 굳혀 금지(#87, §19).
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

// ⚠️ 파트너 병원 칸을 «서버에서» 미리 채워 넘긴다 (2026-09-11).
// 왜: HospitalsClient 가 useEffect 안에서만 목록을 가져와, 서버 HTML 에 병원 상세 링크가
//   `/hospitals/immune` 하나뿐이었다. 사이트맵엔 5개인데 «사이트맵으로만 닿는 섬»이 된 것이다.
//   실측(2026-09-11): 얀덱스는 JS 를 거의 안 돌려 이 링크들을 못 봤고, 구글에서도
//   /ru·/ja 의 세브란스 상세가 「발견됐는데 한 번도 크롤 안 됨」으로 남아 있었다.
// 클라이언트 useEffect 는 «그대로 둔다» — 쿠키 언어로 최신값을 덮어쓰는 기존 동작을 바꾸지 않는다.
//   여기 값은 첫 화면(봇이 읽는 것)만 책임진다.
export default async function HospitalsPage() {
  const lang = await getUiLocale();
  // DB 에서 넉넉히 받아 JS 로 거른다 — 클라이언트 쿼리와 같은 조건(면력 지점 제외 후 6개)을 맞추려면
  // 자르기가 «거르기 뒤»여야 한다. 병원 행은 10개 안팎이라 비용 차이가 없다.
  const rows = await getFeaturedHospitals(20, lang);
  const initialPartners = rows
    .filter((h) => !String(h.slug ?? '').startsWith('immunehospital'))
    .slice(0, 6);
  return (
    <Suspense fallback={<HospitalsSkeleton />}>
      <HospitalsClient initialPartners={initialPartners} />
    </Suspense>
  );
}
