import { Suspense } from "react";
import { cookies } from "next/headers";
import TreatmentsClient from "./TreatmentsClient";
import TreatmentsHubClient from "./TreatmentsHubClient";

export const metadata = {
  title: "암종별 치료 안내 — 한국 암 치료와 한방 통합 케어 | HEALO",
  description:
    "유방·자궁·난소암, 대장·위암, 간·담도·췌장암, 폐암, 갑상선암 등 6개 암종 전문 치료 안내. 면력한방병원 ITCRN 5축 통합 면역치료.",
  keywords: [
    "cancer treatment Korea",
    "위암 치료",
    "유방암 치료",
    "간암 치료",
    "Korean Medicine cancer care",
    "한방 면역치료",
    "oncology Korea",
    "면력한방병원",
    "ITCRN 면역치료",
    "싸이모신알파1",
    "암 치료 카자흐스탄",
    "암 치료 러시아",
  ],
  alternates: { canonical: "/treatments" },
  openGraph: {
    title: "암종별 치료 안내 — 한국 암 치료와 한방 통합 케어 | HEALO",
    description:
      "유방·자궁·난소암, 대장·위암, 간·담도·췌장암, 폐암, 갑상선암 등 6개 암종 전문 치료 안내.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Korea Cancer Treatment Guide | HEALO",
    description:
      "6 cancer types, ITCRN 5-axis integrative immune therapy, Immune Hospital direct partner.",
  },
};

export default async function TreatmentsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();

  // legacy 모드 폴백
  const isLegacy = sp?.mode === "legacy" || ck.get("design_mode")?.value === "legacy";
  const Client = isLegacy ? TreatmentsClient : TreatmentsHubClient;

  return (
    <Suspense>
      <Client />
    </Suspense>
  );
}
