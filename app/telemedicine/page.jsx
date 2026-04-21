import { Suspense } from "react";
import TelemedicineClient from "./TelemedicineClient";

export const metadata = {
  title: "원격협진 | HEALO — 한국 전문의 실시간 영상 상담",
  description:
    "카자흐스탄 · 러시아에서도 한국 암 전문의와 실시간 영상 상담. 6개 국어 실시간 통역, 계정 없이 링크만으로 입장, 의료 등급 암호화.",
  keywords: [
    "telemedicine Korea",
    "원격협진",
    "한국 암 전문의 원격 상담",
    "Korean cancer telemedicine",
    "video consultation",
    "онлайн консультация",
    "дистанционная консультация",
  ],
  openGraph: {
    title: "HEALO Telemedicine · 한국 전문의 원격 영상 상담",
    description:
      "비행기 타기 전에, 한국 전문의와 먼저 영상 상담하세요. 실시간 통역 + 의료 등급 보안.",
    type: "website",
  },
  alternates: { canonical: "/telemedicine" },
};

export default function TelemedicinePage() {
  return (
    <Suspense>
      <TelemedicineClient />
    </Suspense>
  );
}
