import { Suspense } from "react";
import UnifiedInquiryFunnel from "../_components/UnifiedInquiryFunnel";

// 개편 «전» 폼 — 대조용으로만 남겨둔 자리. 실서비스 주소는 여전히 /inquiry 다.
// 새 의뢰서가 확정되면 이 자리와 UnifiedInquiryFunnel.jsx 를 같이 지운다.
export const metadata = {
  title: "상담 신청 (개편 전 화면)",
  robots: { index: false, follow: false },
};

export default function OldInquiryPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-3 md:py-8">
      <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" /></div>}>
        <UnifiedInquiryFunnel />
      </Suspense>
    </div>
  );
}
