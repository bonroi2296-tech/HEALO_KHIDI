// /consult/start → /inquiry 영구 리디렉트
// 기존 컴포넌트: _archive/ConsultWrapper.jsx

import { redirect } from "next/navigation";

export const metadata = {
  title: "상담 신청",
  alternates: { canonical: "/inquiry" },
};

export default function ConsultStartPage() {
  redirect("/inquiry");
}
