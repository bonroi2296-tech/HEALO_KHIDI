import { Suspense } from "react";
import UnifiedInquiryFunnel from "./_components/UnifiedInquiryFunnel";
import { localizedMeta } from "@/lib/i18n/metadata";

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.inquiry.title", "seo.inquiry.desc");
}

const baseMeta = {
  title: "상담 신청 — 한국 암 치료 연결",
  description:
    "1분 안에 암 치료 상담을 신청하세요. 코디네이터가 선호하시는 언어로 영업일 1일 이내에 연락드립니다.",
};

export default function InquiryPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-3 md:py-8">
      <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>}>
        <UnifiedInquiryFunnel />
      </Suspense>
    </div>
  );
}
