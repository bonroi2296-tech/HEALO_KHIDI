// /intake → /inquiry 영구 리디렉트
// 기존 컴포넌트: _archive/IntakePremium.jsx, _archive/IntakeLegacy.jsx

import { permanentRedirect } from "next/navigation";

export const metadata = {
  title: "상담 신청",
  alternates: { canonical: "/inquiry" },
};

export default function IntakePage() {
  permanentRedirect("/inquiry");
}
