import { Suspense } from "react";
import ReferralForm from "./ReferralForm";
import { localizedMeta } from "@/lib/i18n/metadata";

// 「무료 사전 상담 신청 → 문의서」의 실제 폼. 채널 선택(/inquiry)에서 여기로 온다.
// 제목·설명은 /inquiry 와 같은 사전 키(seo.inquiry.*)를 쓴다 — 같은 «상담 신청»이다.
const baseMeta = {
  title: "상담 신청 — 한국 암 치료 연결",
  description: "1분 안에 암 치료 상담을 신청하세요. 코디네이터가 선호하시는 언어로 영업일 1일 이내에 연락드립니다.",
};
export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.inquiry.title", "seo.inquiry.desc");
}

export default function ReferralPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ReferralForm />
    </Suspense>
  );
}
