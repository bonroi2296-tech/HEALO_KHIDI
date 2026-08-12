import { Suspense } from "react";
import ReferralForm from "./ReferralForm";

// 만드는 중인 새 문의서. 지금 쓰는 폼(/inquiry)은 손대지 않았다 —
// 이 화면이 확정되면 그때 /inquiry 를 이걸로 갈아끼운다.
export const metadata = {
  title: "환자 의뢰서 (작업 중)",
  robots: { index: false, follow: false },
};

export default function ReferralPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ReferralForm />
    </Suspense>
  );
}
