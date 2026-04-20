import { Suspense } from "react";
import { cookies } from "next/headers";
import HospitalsClient from "./HospitalsClient";
import HospitalsClientPremium from "./HospitalsClientPremium";
import { getServerDesignMode } from "../../src/lib/designMode";

export const metadata = {
  title: "협력 병원 — HEALO 파트너 의료기관",
  description:
    "HEALO 컨소시엄 핵심 파트너 면력한방병원과 협진 암 전문 병원을 소개합니다. 한방 면역치료부터 암 수술·항암까지 원스톱 케어.",
  keywords: [
    "면력한방병원",
    "cancer hospital Korea",
    "oncology partner hospital",
    "Korean Medicine immune therapy",
    "한방 면역치료",
    "암 전문 병원 한국",
  ],
  alternates: { canonical: "/hospitals" },
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
