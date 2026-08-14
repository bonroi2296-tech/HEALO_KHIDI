import { Suspense } from "react";
import UnifiedInquiryFunnel from "./_components/UnifiedInquiryFunnel";
import { localizedMeta } from "@/lib/i18n/metadata";

// 「무료 사전 상담 신청」을 누르면 여기로 온다.
// 이 화면은 «채널 선택»이다 — AI 상담사 / 사람 상담사 / 문의서 세 갈래.
// 그중 「문의서」를 고르면 새 의뢰서(/inquiry/referral)로 넘어간다.
//
// 🛑 이 자리를 새 폼으로 «갈아끼우지» 마라. 2026-08-14 에 그렇게 했다가 세 갈래 화면이
//    통째로 사라졌다(PO 지적). AI 챗·메신저 갈래는 여기서만 들어갈 수 있다.
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
      <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" /></div>}>
        <UnifiedInquiryFunnel />
      </Suspense>
    </div>
  );
}
