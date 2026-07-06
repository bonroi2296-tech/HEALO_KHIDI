export const SITE_INFO = {
  messenger: {
    whatsapp: process.env.NEXT_PUBLIC_MESSENGER_WHATSAPP_URL || "https://wa.me/821047721075",
    telegram: process.env.NEXT_PUBLIC_MESSENGER_TELEGRAM_URL || "",
    line: process.env.NEXT_PUBLIC_MESSENGER_LINE_URL || "",
    wechat: process.env.NEXT_PUBLIC_MESSENGER_WECHAT_URL || "",
  },
  brand: {
    name: "healwith",
    tagline: "AI Medical Concierge for Global Patients",
  },
  navigation: {
    company: [
      { labelKey: "nav.about", label: "About healwith", href: "/about" },
      { labelKey: "nav.contact", label: "Contact Us", href: "/contact" },
    ],
    legal: [
      { labelKey: "nav.privacy", label: "Privacy Policy", href: "/privacy" },
      { labelKey: "nav.terms", label: "Terms of Service", href: "/terms" },
    ],
  },
  legal: {
    serviceName: "healwith",
    operatedBy: "Bonroi",
    businessType: "Sole Proprietorship",
    representative: "Juyoung Kang",
    businessRegistrationNumber: "463-35-00902",
    foreignPatientAttractionRegistration: "A-2026-01-02-06761",
    addressLine1: "Room 613, 385 Gangseo-ro, Gangseo-gu,",
    addressLine2: "Seoul, Republic of Korea",
    contactEmail: "admin@healwith.co.kr",
    privacyOfficer: "Juyoung Kang",
    // "힐위드" 병기: 네이버 검색은 본문에 실제 글자가 있어야 매칭됨 (전 페이지 푸터 노출)
    copyright: "© healwith(힐위드). All rights reserved.",
  },
};
