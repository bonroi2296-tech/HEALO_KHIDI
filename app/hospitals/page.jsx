import { Suspense } from "react";
import HospitalsClient from "./HospitalsClient";

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

export default function HospitalsPage() {
  return (
    <Suspense>
      <HospitalsClient />
    </Suspense>
  );
}
