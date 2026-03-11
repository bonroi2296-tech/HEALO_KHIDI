export const SITE_INFO = {
  messenger: {
    whatsapp: process.env.NEXT_PUBLIC_MESSENGER_WHATSAPP_URL || "",
    line: process.env.NEXT_PUBLIC_MESSENGER_LINE_URL || "",
    wechat: process.env.NEXT_PUBLIC_MESSENGER_WECHAT_URL || "",
  },
  brand: {
    name: "HEALO",
    tagline: "AI Medical Concierge for Global Patients",
  },
  navigation: {
    company: [
      { labelKey: "nav.about", label: "About HEALO", href: "/about" },
      { labelKey: "nav.contact", label: "Contact Us", href: "/contact" },
    ],
    legal: [
      { labelKey: "nav.privacy", label: "Privacy Policy", href: "/privacy" },
      { labelKey: "nav.terms", label: "Terms of Service", href: "/terms" },
    ],
  },
  legal: {
    serviceName: "HEALO",
    operatedBy: "Bonroi",
    businessType: "Sole Proprietorship",
    representative: "Juyoung Kang",
    businessRegistrationNumber: "463-35-00902",
    foreignPatientAttractionRegistration:
      "Pending (Will be updated upon official issuance)",
    addressLine1: "Room 613, 385 Gangseo-ro, Gangseo-gu,",
    addressLine2: "Seoul, Republic of Korea",
    contactEmail: "contact@healo.com",
    privacyOfficer: "Juyoung Kang",
    copyright: "© HEALO. All rights reserved.",
  },
};
