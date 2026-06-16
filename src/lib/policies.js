export const EFFECTIVE_DATE = "2026-01-24";

export const PRIVACY_SECTIONS = [
  {
    title: "Introduction",
    content: [
      "healwith is an AI medical concierge platform that helps global patients find and connect with medical providers in Korea. We are not a medical institution and do not provide diagnosis or treatment.",
      "This Privacy Policy explains what information we collect, how we use it, and the choices you have.",
    ],
  },
  {
    title: "Information We Collect",
    content: [
      "We collect information you provide directly, such as your name, email, and contact details.",
      "If you choose to request concierge support, we may collect health-related information you voluntarily provide (e.g., symptoms, desired procedures, or records) for matching purposes.",
      "We may collect technical information such as device and usage data to improve service reliability.",
    ],
  },
  {
    title: "How We Use Information",
    content: [
      "To deliver concierge services, respond to inquiries, and match you with suitable medical providers.",
      "To communicate with you about your requests and service updates.",
      "To improve platform performance, safety, and user experience.",
    ],
  },
  {
    title: "Sharing of Information",
    content: [
      "We share personal and medical information only with your consent and only with medical providers relevant to your request.",
      "We do not sell personal information to third parties.",
      "We may share information with service providers that help us operate the platform (e.g., hosting or email delivery), under confidentiality obligations.",
    ],
  },
  {
    title: "Data Retention",
    content: [
      "We retain information only as long as necessary to provide services or meet legal obligations.",
      "You may request deletion of your account and related data, subject to legal requirements.",
    ],
  },
  {
    title: "Data Security",
    content: [
      "We apply industry-standard safeguards to protect data against unauthorized access, loss, or misuse.",
      "No system is completely secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    title: "User Rights",
    content: [
      "You may request access to, correction of, or deletion of your personal information.",
      "You may withdraw consent for data sharing at any time, which may limit our ability to provide concierge services.",
    ],
  },
  {
    title: "Contact Information",
    content: [
      "If you have any questions about this Privacy Policy or your data, contact us at admin@healwith.co.kr.",
    ],
  },
];

export const TERMS_SECTIONS = [
  {
    title: "Service Description",
    content: [
      "healwith provides an AI medical concierge service that helps users explore medical options and connect with medical providers. healwith is not a medical institution.",
      "We do not provide medical diagnosis, treatment, or medical advice.",
    ],
  },
  {
    title: "User Responsibilities",
    content: [
      "You agree to provide accurate and up-to-date information when submitting inquiries.",
      "You are responsible for any decisions made based on information provided by medical providers.",
      "You must comply with applicable laws and hospital policies.",
    ],
  },
  {
    title: "Medical Disclaimer",
    content: [
      "healwith is a platform that facilitates communication between users and medical providers.",
      "Any medical care, diagnosis, or treatment is provided solely by the medical providers, not by healwith.",
      "You acknowledge that medical outcomes may vary and are not guaranteed by healwith.",
    ],
  },
  {
    title: "Limitation of Liability",
    content: [
      "healwith is not responsible for medical outcomes, side effects, or malpractice by medical providers.",
      "healwith is not liable for disputes between users and medical providers.",
      "To the maximum extent permitted by law, healwith disclaims liability for indirect or consequential damages.",
    ],
  },
  {
    title: "Intellectual Property",
    content: [
      "All content, branding, and software on the healwith platform are owned by healwith or its licensors.",
      "You may not copy, modify, or distribute our content without permission.",
    ],
  },
  {
    title: "Termination",
    content: [
      "We may suspend or terminate access to the platform if you violate these terms or misuse the service.",
      "You may discontinue use of the platform at any time.",
    ],
  },
  {
    title: "Governing Law",
    content: [
      "These terms are governed by the laws of the Republic of Korea.",
      "Any disputes shall be resolved in the Seoul Central District Court.",
    ],
  },
  {
    title: "Contact Information",
    content: [
      "If you have questions about these Terms, contact us at admin@healwith.co.kr.",
    ],
  },
];

const buildPolicyText = (sections) => {
  const lines = [`Last Updated: ${EFFECTIVE_DATE}`, ""];

  sections.forEach((section) => {
    lines.push(section.title);
    section.content.forEach((paragraph) => {
      lines.push(paragraph);
    });
    lines.push("");
  });

  return lines.join("\n").trim();
};

export const PRIVACY_POLICY = buildPolicyText(PRIVACY_SECTIONS);
export const TERMS_OF_SERVICE = buildPolicyText(TERMS_SECTIONS);

/** 한국어 개인정보처리방침 (동일 구조) */
export const PRIVACY_SECTIONS_KO = [
  { title: "소개", content: ["healwith는 해외 환자가 한국 의료기관을 찾고 연결할 수 있도록 돕는 AI 메디컬 컨시어지 플랫폼입니다. healwith는 의료기관이 아니며 진단·치료를 제공하지 않습니다.", "본 개인정보처리방침은 수집하는 정보, 이용 방법, 이용자 선택에 대해 설명합니다."] },
  { title: "수집하는 정보", content: ["이름, 이메일, 연락처 등 이용자가 직접 입력한 정보를 수집합니다.", "컨시어지 지원을 요청하신 경우, 매칭 목적으로 증상·희망 시술·기록 등 본인이 제공한 건강 관련 정보를 수집할 수 있습니다.", "서비스 안정성 향상을 위해 기기·이용 데이터 등 기술 정보를 수집할 수 있습니다."] },
  { title: "정보 이용", content: ["컨시어지 서비스 제공, 문의 응대, 적합한 의료기관 매칭.", "요청 및 서비스 업데이트에 대한 안내.", "플랫폼 성능·안전·이용자 경험 개선."] },
  { title: "정보 공유", content: ["개인·건강 정보는 이용자 동의 하에, 해당 요청과 관련된 의료기관에만 공유합니다.", "개인정보를 제3자에게 판매하지 않습니다.", "호스팅·이메일 등 서비스 운영을 돕는 업체와 비밀유지 의무 하에 공유할 수 있습니다."] },
  { title: "보관 기간", content: ["서비스 제공 또는 법적 의무에 필요한 기간만 보관합니다.", "법적 요건에 따라 계정 및 관련 데이터 삭제를 요청하실 수 있습니다."] },
  { title: "보안", content: ["무단 접근·유출·오용 방지를 위해 업계 표준 수준의 보안 조치를 적용합니다.", "완벽한 보안을 보장할 수 없습니다."] },
  { title: "이용자 권리", content: ["개인정보 열람·정정·삭제를 요청할 수 있습니다.", "데이터 공유 동의를 언제든 철회할 수 있으며, 이 경우 컨시어지 서비스 제공이 제한될 수 있습니다."] },
  { title: "문의", content: ["개인정보처리방침 또는 데이터 관련 문의: admin@healwith.co.kr."] },
];

/** 한국어 이용약관 (동일 구조) */
export const TERMS_SECTIONS_KO = [
  { title: "서비스 내용", content: ["healwith는 이용자가 의료 옵션을 탐색하고 의료기관과 연결할 수 있도록 돕는 AI 메디컬 컨시어지 서비스를 제공합니다. healwith는 의료기관이 아닙니다.", "진단·치료·의료 상담을 제공하지 않습니다."] },
  { title: "이용자 책임", content: ["문의 시 정확하고 최신 정보를 제공하는 것에 동의합니다.", "의료기관이 제공한 정보를 바탕으로 한 결정에 대한 책임은 이용자에게 있습니다.", "관련 법령 및 병원 정책을 준수해야 합니다."] },
  { title: "의료 면책", content: ["healwith는 이용자와 의료기관 간 소통을 중개하는 플랫폼입니다.", "진료·진단·치료는 전적으로 의료기관이 제공하며 healwith가 제공하지 않습니다.", "의료 결과는 개인에 따라 다를 수 있으며 healwith가 보장하지 않습니다."] },
  { title: "책임 제한", content: ["healwith는 의료 결과, 부작용, 의료기관의 과실에 대해 책임지지 않습니다.", "이용자와 의료기관 간 분쟁에 대해 healwith는 책임지지 않습니다.", "법이 허용하는 최대 범위 내에서 간접·파생 손해에 대한 책임을 부인합니다."] },
  { title: "지적재산권", content: ["healwith 플랫폼의 콘텐츠·브랜드·소프트웨어는 healwith 또는 라이선스 제공자에게 귀속됩니다.", "허가 없이 복제·수정·배포할 수 없습니다."] },
  { title: "해지", content: ["이용약관 위반 또는 서비스 오용 시 이용을 정지하거나 종료할 수 있습니다.", "이용자는 언제든 서비스 이용을 중단할 수 있습니다."] },
  { title: "준거법", content: ["본 약관은 대한민국 법률에 따릅니다.", "분쟁은 서울중앙지방법원에서 해결합니다."] },
  { title: "문의", content: ["이용약관 관련 문의: admin@healwith.co.kr."] },
];

export function getPrivacySections(lang) {
  return lang === "ko" ? PRIVACY_SECTIONS_KO : PRIVACY_SECTIONS;
}

export function getTermsSections(lang) {
  return lang === "ko" ? TERMS_SECTIONS_KO : TERMS_SECTIONS;
}

export function getPrivacyPolicyText(lang) {
  return buildPolicyText(getPrivacySections(lang));
}

export function getTermsPolicyText(lang) {
  return buildPolicyText(getTermsSections(lang));
}
