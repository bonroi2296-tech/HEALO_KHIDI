import { Suspense } from "react";
import CareJourneyClient from "./CareJourneyClient";

export const metadata = {
  title: "치료 여정 | HEALO — 진단부터 회복까지 토탈 케어",
  description:
    "HEALO는 병원 하나를 고르는 매칭 서비스가 아닙니다. 온라인 상담 · 원격 진단 · 케어 경로 설계 · 체류 동행 · 귀국 후 관리까지, 암 치료의 전 과정을 함께 설계하는 토탈 케어 컨시어지입니다.",
  keywords: [
    "한국 암 치료 여정",
    "의료관광 케어 경로",
    "Korea cancer care journey",
    "medical concierge Korea",
    "маршрут лечения рака Корея",
  ],
  alternates: { canonical: "/care-journey" },
  openGraph: {
    title: "치료 여정 | HEALO",
    description:
      "진단부터 수술 연계, 면역·재활, 귀국 후 관리까지 — 끊김 없는 암 치료 여정을 함께 설계합니다.",
    type: "website",
  },
};

export default function CareJourneyPage() {
  return (
    <Suspense>
      <CareJourneyClient />
    </Suspense>
  );
}
