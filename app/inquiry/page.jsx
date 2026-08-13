import { Suspense } from "react";
import ReferralForm from "./referral/ReferralForm";
import { localizedMeta } from "@/lib/i18n/metadata";

// ⚠️ 이 작업방(worktree)에서만 새 의뢰서로 바꿔 끼웠다 — 개편 화면을 보려고 매번 주소를
//    따로 치는 게 오히려 사고를 냈다(PO 가 /inquiry 로 들어와 옛 폼을 보고 «아직 그대로인데?»).
//    옛 폼은 지우지 않고 /inquiry/old 에 그대로 살려뒀다(대조용).
//    실서비스 반영은 PO 확정 뒤에.
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
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ReferralForm />
    </Suspense>
  );
}
