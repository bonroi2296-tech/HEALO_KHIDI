import { Suspense } from "react";
import HospitalsClient from "./HospitalsClient";
import { localizedMeta } from "@/lib/i18n/metadata";

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.hospitals.title", "seo.hospitals.desc");
}

const baseMeta = {
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

export default function HospitalsPage() {
  return (
    <Suspense>
      <HospitalsClient />
    </Suspense>
  );
}
