import AboutClient from "./_client/AboutClient";

export const metadata = {
  // absolute = 루트 layout 의 title.template("%s | healwith") 미적용.
  // 제목에 이미 브랜드가 있어("About healwith"), 템플릿이 붙으면 "… | healwith | healwith" 중복(실측 확인).
  title: { absolute: "About healwith | AI Medical Concierge" },
  description:
    "healwith connects global patients with trusted hospitals and clinics in Korea through AI-powered medical concierge and matching services.",
  keywords: ["about healwith", "healwith medical concierge", "Korea medical tourism platform", "KHIDI"],
  openGraph: {
    title: "About healwith | AI Medical Concierge",
    description: "healwith connects global cancer patients with trusted Korean hospitals through AI-powered concierge and real-time 6-language interpretation.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About healwith | AI Medical Concierge",
    description: "healwith connects global patients with trusted hospitals in Korea through AI-powered medical concierge.",
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
