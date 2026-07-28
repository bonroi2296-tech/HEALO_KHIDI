// /consult/start → /inquiry 영구 리디렉트
// 기존 컴포넌트: _archive/ConsultWrapper.jsx

import { permanentRedirect } from "next/navigation";
import { withQuery } from "@/lib/url/withQuery";

export const metadata = {
  title: "상담 신청",
  alternates: { canonical: "/inquiry" },
};

// 들어올 때 붙어 있던 꼬리표(?utm_source=… 등)를 그대로 넘긴다 —
// 안 넘기면 옛 주소로 들어온 광고 클릭의 «출처»가 조용히 증발한다(withQuery 주석 참고).
export default async function ConsultStartPage({ searchParams }) {
  permanentRedirect(withQuery("/inquiry", await searchParams));
}
