import { Suspense } from "react";
import { cookies } from "next/headers";
import TreatmentsClient from "./TreatmentsClient";
import TreatmentsClientPremium from "./TreatmentsClientPremium";
import { getServerDesignMode } from "../../src/lib/designMode";

export const metadata = {
  title: "암종별 치료 안내 — 한국 암 치료와 한방 통합 케어",
  description:
    "위암, 유방암, 간암, 폐암, 갑상선암, 대장암 등 주요 암종에 대한 한국의 치료 접근법과 한방 면역치료 통합 케어를 안내합니다.",
  keywords: [
    "cancer treatment Korea",
    "위암 치료",
    "유방암 치료",
    "간암 치료",
    "Korean Medicine cancer care",
    "한방 면역치료",
    "oncology Korea",
  ],
  alternates: { canonical: "/treatments" },
};

export default async function TreatmentsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  const Client = mode === "legacy" ? TreatmentsClient : TreatmentsClientPremium;
  return (
    <Suspense>
      <Client />
    </Suspense>
  );
}
