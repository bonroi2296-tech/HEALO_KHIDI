/**
 * healwith FAQ — 외국인 암환자가 가장 자주 묻는 Q&A
 * 카테고리: 서비스·상담·치료·비자·체류·결제·응급
 *
 * ⚠️ 표시 문구(질문·답변·카테고리 라벨)는 전부 중앙 i18n 사전으로 이관됨.
 *    이 파일은 구조(순서·카테고리 코드·항목 id)와 i18n 키 참조만 보유한다.
 *    문구 수정은 `src/lib/i18n/index.js`의 `faqData.*` 키(또는 코디 편집 오버라이드)에서.
 *    - 카테고리 라벨: faqData.category.<카테고리코드>
 *    - 질문/답변:     faqData.<항목id>.q / faqData.<항목id>.a
 *    id·카테고리 코드는 필터·앵커에 쓰이므로 변경 금지.
 */

export const FAQ_CATEGORIES = [
  { id: "service", labelKey: "faqData.category.service" },
  { id: "consultation", labelKey: "faqData.category.consultation" },
  { id: "treatment", labelKey: "faqData.category.treatment" },
  { id: "recovery", labelKey: "faqData.category.recovery" },
  { id: "visa", labelKey: "faqData.category.visa" },
  { id: "payment", labelKey: "faqData.category.payment" },
  { id: "privacy", labelKey: "faqData.category.privacy" },
];

export const FAQS = [
  // === About healwith ===
  { id: "service1", category: "service", qKey: "faqData.service1.q", aKey: "faqData.service1.a" },
  { id: "service2", category: "service", qKey: "faqData.service2.q", aKey: "faqData.service2.a" },
  { id: "service3", category: "service", qKey: "faqData.service3.q", aKey: "faqData.service3.a" },

  // === Consultation ===
  { id: "consultation1", category: "consultation", qKey: "faqData.consultation1.q", aKey: "faqData.consultation1.a" },
  { id: "consultation2", category: "consultation", qKey: "faqData.consultation2.q", aKey: "faqData.consultation2.a" },

  // === Treatment ===
  { id: "treatment1", category: "treatment", qKey: "faqData.treatment1.q", aKey: "faqData.treatment1.a" },
  { id: "treatment2", category: "treatment", qKey: "faqData.treatment2.q", aKey: "faqData.treatment2.a" },

  // === Recovery & immune care (수술 후 면역·재활 회복) ===
  { id: "recovery1", category: "recovery", qKey: "faqData.recovery1.q", aKey: "faqData.recovery1.a" },
  { id: "recovery2", category: "recovery", qKey: "faqData.recovery2.q", aKey: "faqData.recovery2.a" },
  { id: "recovery3", category: "recovery", qKey: "faqData.recovery3.q", aKey: "faqData.recovery3.a" },
  { id: "recovery4", category: "recovery", qKey: "faqData.recovery4.q", aKey: "faqData.recovery4.a" },

  // === Visa ===
  { id: "visa1", category: "visa", qKey: "faqData.visa1.q", aKey: "faqData.visa1.a" },
  { id: "visa2", category: "visa", qKey: "faqData.visa2.q", aKey: "faqData.visa2.a" },

  // === Payment ===
  { id: "payment1", category: "payment", qKey: "faqData.payment1.q", aKey: "faqData.payment1.a" },
  { id: "payment2", category: "payment", qKey: "faqData.payment2.q", aKey: "faqData.payment2.a" },

  // === Privacy ===
  { id: "privacy1", category: "privacy", qKey: "faqData.privacy1.q", aKey: "faqData.privacy1.a" },
  { id: "privacy2", category: "privacy", qKey: "faqData.privacy2.q", aKey: "faqData.privacy2.a" },
];
