import { Suspense } from "react";
import { cookies } from "next/headers";
import HospitalsClient from "./HospitalsClient";
import HospitalsClientPremium from "./HospitalsClientPremium";
import { getServerDesignMode } from "@/lib/designMode";

export const metadata = {
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
  alternates: { canonical: "/hospitals" },
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

export default async function HospitalsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  const Client = mode === "legacy" ? HospitalsClient : HospitalsClientPremium;
  return (
    <Suspense>
      <Client />
    </Suspense>
  );
}
