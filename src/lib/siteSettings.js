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
    // SGI 서울보증 배상책임(의료관광) 1억 — 유치업 법정 요건 실물. 갱신형이라 만료일은 표기하지 않음(드리프트 방지).
    // 보험사명은 고유명사라 안 번역하고, 담보종류·금액은 설명이라 i18n(footer.biz.insuranceScope)으로 뺐다.
    guaranteeInsurer: "SGI Seoul Guarantee Insurance",
    guaranteeInsurerKo: "SGI 서울보증보험",
    addressLine1: "Room 613, 385 Gangseo-ro, Gangseo-gu,",
    addressLine2: "Seoul, Republic of Korea",
    // 한국어 화면 전용 한글 주소·성명. 외국어 5개 화면은 위 로마자를 쓴다 — 러시아·카자흐 환자에겐
    // 한글 주소가 읽히지도 않고 서류·택시에 쓸 수도 없어 로마자가 실제로 쓸모 있다(copyrightKo 와 같은 분기).
    addressKo: "서울특별시 강서구 강서로 385, 613호",
    contactEmail: "admin@healwith.co.kr",
    privacyOfficer: "Juyoung Kang",
    privacyOfficerKo: "강주영",
    representativeKo: "강주영",
    copyright: "© healwith. All rights reserved.",
    // "힐위드" 병기: 네이버 검색은 본문에 실제 글자가 있어야 매칭됨. 단 한국어 화면에서만
    // 노출(영어 화면 한글누출 가드 i18n-no-korean-leak 준수) — ClientShell 푸터에서 분기.
    copyrightKo: "© healwith(힐위드). All rights reserved.",
  },
};
