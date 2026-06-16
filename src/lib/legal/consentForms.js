/**
 * healwith 동의 항목 (Consent Forms)
 *
 * PIPA §15, §17, §22, §23, §28-8에 따라 각 항목을 별도로 동의 수집해야 함.
 * 이 모듈은 인테이크 폼, 회원가입, 체크박스 UI에서 사용.
 *
 * 구조:
 * - REQUIRED: 서비스 이용 필수 동의 (거부 시 이용 제한)
 * - SENSITIVE: 민감정보(건강정보) 별도 동의 — PIPA §23
 * - CROSS_BORDER: 국외이전 동의 — PIPA §28-8
 * - OPTIONAL: 선택 동의 (마케팅, 분석 등)
 *
 * 각 동의 항목은 다음을 포함해야 함 (PIPA §15(2)):
 * - 수집·이용 목적
 * - 수집 항목
 * - 보유·이용 기간
 * - 동의 거부권 및 거부 시 불이익
 */

export const CONSENT_VERSION = "2.0.0";

/** 동의 카테고리 */
export const CATEGORY = {
  REQUIRED: "required",
  SENSITIVE: "sensitive",
  CROSS_BORDER: "cross_border",
  THIRD_PARTY: "third_party",
  OPTIONAL: "optional",
};

/** 개별 동의 항목 정의 */
export const CONSENT_ITEMS = [
  // ==== 필수 ====
  {
    id: "tos",
    category: CATEGORY.REQUIRED,
    mandatory: true,
    titleKey: "consent.tos.title",
    linkHref: "/terms",
  },
  {
    id: "pipa_collection",
    category: CATEGORY.REQUIRED,
    mandatory: true,
    titleKey: "consent.pipaCollection.title",
    descKey: "consent.pipaCollection.desc",
    // 수집 항목, 목적, 보유기간
    purpose: {
      ko: "회원 식별, 서비스 제공, 고객 지원",
      en: "Member identification, service provision, customer support",
    },
    items: {
      ko: "이름, 이메일, 연락처, 국적, 여권번호, 거주지",
      en: "Name, email, contact, nationality, passport number, address",
    },
    retention: {
      ko: "회원 탈퇴 시까지 (관련 법령에 따른 보관 기간 예외)",
      en: "Until account closure (except where law requires longer retention)",
    },
  },

  // ==== 민감정보 (별도 동의) ====
  {
    id: "sensitive_health",
    category: CATEGORY.SENSITIVE,
    mandatory: false, // 동의 안 하면 의료 매칭 서비스 불가, but 법적으로는 선택
    warnIfDeclined: true,
    titleKey: "consent.sensitiveHealth.title",
    legalBasis: "PIPA §23 (민감정보 별도 동의)",
    purpose: {
      ko: "의료기관 매칭, 적절한 진료과 안내",
      en: "Hospital matching, appropriate department guidance",
    },
    items: {
      ko: "진단명, 치료 이력, 현재 증상, 복용 약물, 진단서·영상자료",
      en: "Diagnosis, treatment history, current symptoms, medications, medical reports/images",
    },
    retention: {
      ko: "컨시어지 서비스 완료 후 즉시 삭제 (재이용 보관 요청 시 최대 3년)",
      en: "Deleted immediately after service completion (up to 3 years if retention requested)",
    },
  },

  // ==== 제3자 제공 (의료기관) ====
  {
    id: "third_party_hospital",
    category: CATEGORY.THIRD_PARTY,
    mandatory: false,
    warnIfDeclined: true,
    titleKey: "consent.thirdPartyHospital.title",
    legalBasis: "PIPA §17 (제3자 제공 동의)",
    recipients: {
      ko: "이용자가 선택한 대한민국 내 협력 의료기관",
      en: "Korean partner hospitals selected by the user",
    },
    purpose: {
      ko: "진료 상담, 예약, 치료 계획 수립",
      en: "Consultation, appointment, treatment planning",
    },
    items: {
      ko: "이름, 생년월일, 연락처, 여권번호, 진단명, 증상, 의료기록",
      en: "Name, DOB, contact, passport, diagnosis, symptoms, medical records",
    },
    retention: {
      ko: "각 의료기관의 의료법상 보관 의무에 따름 (일반적으로 10년)",
      en: "Per each provider's legal obligation (typically 10 years)",
    },
  },

  // ==== 국외 이전 ====
  {
    id: "cross_border_kr",
    category: CATEGORY.CROSS_BORDER,
    mandatory: false,
    warnIfDeclined: true,
    titleKey: "consent.crossBorderKr.title",
    legalBasis: "PIPA §28-8 (개인정보 국외이전)",
    // 이전 받는 자, 이전 국가, 이전 시기, 이전 방법, 목적, 보유기간, 거부권
    transferDetails: {
      country: { ko: "대한민국", en: "Republic of Korea" },
      recipients: {
        ko: "협력 의료기관, Vercel Inc.(미국, 호스팅), Supabase Inc.(미국, DB), Google Ireland(아일랜드, 분석)",
        en: "Korean partner hospitals, Vercel Inc. (USA, hosting), Supabase Inc. (USA, DB), Google Ireland (Ireland, analytics)",
      },
      timing: { ko: "서비스 이용 시점 즉시", en: "Immediately upon service use" },
      method: { ko: "HTTPS 암호화 전송(TLS 1.3)", en: "HTTPS encrypted transfer (TLS 1.3)" },
    },
    purpose: {
      ko: "한국 내 의료 컨시어지 서비스 제공",
      en: "Provision of medical concierge service in Korea",
    },
  },

  // ==== 선택 동의 ====
  {
    id: "marketing",
    category: CATEGORY.OPTIONAL,
    mandatory: false,
    titleKey: "consent.marketing.title",
    purpose: {
      ko: "신규 서비스·이벤트·건강 정보 뉴스레터 발송",
      en: "Marketing emails for new services, events, health newsletters",
    },
    retention: { ko: "동의 철회 시까지", en: "Until withdrawal of consent" },
    withdrawable: true,
  },
  {
    id: "analytics",
    category: CATEGORY.OPTIONAL,
    mandatory: false,
    titleKey: "consent.analytics.title",
    purpose: {
      ko: "서비스 개선을 위한 이용 패턴 분석",
      en: "Usage pattern analysis for service improvement",
    },
    withdrawable: true,
  },
];

/** 필수 동의 항목 필터 */
export function getRequiredConsents() {
  return CONSENT_ITEMS.filter((c) => c.mandatory);
}

/** 특정 카테고리 필터 */
export function getConsentsByCategory(category) {
  return CONSENT_ITEMS.filter((c) => c.category === category);
}

/** 동의 상태 유효성 검증 */
export function validateConsents(consents) {
  const required = getRequiredConsents();
  const missing = required.filter((r) => !consents[r.id]);
  return {
    valid: missing.length === 0,
    missing: missing.map((m) => m.id),
  };
}
