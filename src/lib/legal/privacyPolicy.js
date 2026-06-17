/**
 * healwith 개인정보처리방침 (Privacy Policy)
 *
 * 법적 근거 (Legal Basis):
 * - 대한민국 개인정보보호법 (PIPA) §15, §17, §22, §23, §26, §28-8, §31
 * - 의료법 §21 (환자 개인정보 보호)
 * - 의료 해외진출 및 외국인환자 유치 지원에 관한 법률 §16, §17
 * - 카자흐스탄 개인정보 및 보호에 관한 법률 (94-V ЗРК, 2013)
 * - EU General Data Protection Regulation (GDPR) Article 9, 44-49
 *
 * ⚠️ 중요: 본 초안은 법률 전문가(한국, 카자흐스탄 현지) 최종 검토 후 배포해야 함.
 * 특히 다음 항목은 사업 실사 후 확정 필요:
 * - 외국인환자 유치업자 등록번호 (보건복지부)
 * - 카자흐스탄 로컬라이제이션 요건 (2015년 개정법 적용 여부)
 * - DPO 지정 및 연락처
 * - SCC (Standard Contractual Clauses) 체결 여부
 * - 보관기간 세부 (의료법 §22 진료기록 10년 vs 마케팅 정보)
 */

export const PRIVACY_EFFECTIVE_DATE = "2026-04-20";
export const PRIVACY_VERSION = "2.0.0";

/**
 * 동의 항목 구조 (필수/선택 분리)
 * PIPA §22에 따라 각 항목 개별 동의 수집해야 함
 */
export const CONSENT_ITEMS = {
  // 필수 동의 (서비스 이용 필수)
  required: [
    { id: "collection", key: "consent.collection" },      // 개인정보 수집·이용
    { id: "sharing_hospital", key: "consent.sharingHospital" }, // 의료기관 제공
    { id: "cross_border", key: "consent.crossBorder" },   // 국외이전
  ],
  // 민감정보 (건강정보) - PIPA §23 별도 동의
  sensitive: [
    { id: "health_data", key: "consent.healthData" },
  ],
  // 선택 동의
  optional: [
    { id: "marketing", key: "consent.marketing" },
    { id: "analytics", key: "consent.analytics" },
    { id: "cookies_advertising", key: "consent.cookiesAd" },
  ],
};

/**
 * 섹션 구조
 * - id: 네비게이션용
 * - required: 법적으로 반드시 포함되어야 하는 섹션
 */
const SECTIONS_STRUCTURE = [
  { id: "introduction", required: true },
  { id: "controller", required: true },          // 개인정보처리자 정보
  { id: "collection_items", required: true },    // 수집 항목
  { id: "collection_purpose", required: true },  // 수집 목적
  { id: "sensitive_data", required: true },      // 민감정보 (PIPA §23)
  { id: "retention", required: true },           // 보관 기간
  { id: "third_party", required: true },         // 제3자 제공 (병원)
  { id: "cross_border", required: true },        // 국외이전 (PIPA §28-8)
  { id: "processors", required: true },          // 처리위탁 (PIPA §26)
  { id: "user_rights", required: true },         // 정보주체 권리
  { id: "children", required: true },            // 만 14세 미만
  { id: "security", required: true },            // 안전조치
  { id: "cookies", required: true },
  { id: "dpo", required: true },                 // 개인정보보호책임자
  { id: "jurisdiction_kz", required: true },     // 카자흐스탄 거주자
  { id: "automated_decisions", required: true }, // 자동화된 결정 (PIPA §37-2)
  { id: "jurisdiction_eu", required: true },     // EU 거주자 (GDPR)
  { id: "jurisdiction_ru", required: true },     // 러시아 거주자
  { id: "changes", required: true },
  { id: "contact", required: true },
];

/**
 * 한국어 (KO) - 법적 주용 버전
 * 한국 이용자 및 한국 감독기관 대상
 */
const KO = {
  pageTitle: "개인정보처리방침",
  lastUpdated: "최종 개정일",
  version: "버전",
  tableOfContents: "목차",

  introduction: {
    title: "1. 총칙",
    body: [
      "본로이(BONROI, 이하 '회사')는 해외 환자의 대한민국 내 의료기관 이용을 돕는 메디컬 컨시어지 서비스 'healwith'를 제공합니다. 회사는 의료기관이 아니며 진단·치료를 직접 제공하지 않습니다.",
      "본 방침은 대한민국 「개인정보보호법」, 「의료법」, 「의료 해외진출 및 외국인환자 유치 지원에 관한 법률」을 기본으로 하며, 이용자의 거주국 법제(예: EU GDPR, 카자흐스탄 94-V ЗРК, 러시아 152-ФЗ 등)의 관련 요구사항을 반영합니다. 각 관할별 상세 고지는 별도 섹션에 기술합니다.",
      "회사는 국적·거주지를 불문하고 모든 이용자의 개인정보를 소중히 다루며, 관련 법령을 준수하여 안전하게 처리합니다.",
    ],
  },

  controller: {
    title: "2. 개인정보처리자 정보",
    body: [
      "상호: 본로이 (BONROI) — 서비스명: healwith",
      "사업 형태: 개인사업자",
      "대표자: 강주영 (JUYOUNG KANG)",
      "사업자등록번호: 463-35-00902",
      "외국인환자 유치업자 등록번호: A-2026-01-02-06761 (유효기간 2026-03-11 ~ 2029-03-10, 서울특별시장 등록)",
      "사업장 주소: 서울특별시 강서구 강서로 385, 613호 (마곡동, 우성에스비타워)",
      "연락처: +82-10-4772-1075 (국제) · 070-7500-7795 (국내)",
      "이메일: admin@healwith.co.kr",
      "고객지원 운영시간: 평일 09:00-18:00 KST (공휴일 제외)",
    ],
  },

  collection_items: {
    title: "3. 수집하는 개인정보 항목",
    body: [
      "【필수 항목】",
      "· 이름, 생년월일, 성별, 국적, 여권번호(비자·병원 등록용)",
      "· 연락처(이메일, 전화번호, 메신저 ID)",
      "· 거주지 주소(체류 지원용)",
      "· 보호자/동반자 정보(환자가 미성년·고령자일 경우)",
      "",
      "【민감정보 - 별도 동의】",
      "· 진단명, 치료 이력, 현재 증상, 복용 약물",
      "· 진단서, 검사 결과, 영상 자료(X-ray, CT, MRI 등)",
      "· 건강보험·여행자보험 정보",
      "· 장애 여부(접근성 지원 시)",
      "",
      "【자동 수집】",
      "· IP 주소, 쿠키, 세션 로그, 서비스 이용 기록",
      "· 기기 정보(OS, 브라우저, 모델), 위치 정보(정확한 위치가 아닌 국가 단위, 이용자 동의 시 확장)",
      "",
      "【결제 관련】",
      "· 결제 수단 정보는 결제대행사(PG)를 통해 처리되며, 회사는 카드번호 전체를 저장하지 않습니다.",
    ],
  },

  collection_purpose: {
    title: "4. 개인정보의 수집 및 이용 목적",
    body: [
      "가. 회원 식별 및 본인 확인",
      "나. 의료기관 매칭, 진료 예약, 비자 및 체류 지원",
      "다. 의료기관으로의 진료 관련 정보 제공(환자 동의 기반)",
      "라. 통역·이동·숙박 등 부대 서비스 제공",
      "마. 결제 처리 및 영수증·세금계산서 발행",
      "바. 민원 및 불만 처리, 고객 상담",
      "사. 서비스 품질 개선, 통계 분석, 보안 사고 대응",
      "아. 법령상 의무 이행(의료법 §21, 국세청 신고 등)",
    ],
  },

  sensitive_data: {
    title: "5. 민감정보의 처리 (개인정보보호법 §23)",
    body: [
      "회사는 「개인정보보호법」 제23조에서 규정하는 민감정보 중 ‘건강에 관한 정보’를 처리합니다. 이는 일반 개인정보와 별도로 명시적 동의를 받은 경우에 한해 수집·이용합니다.",
      "수집되는 민감정보는 의료기관 매칭 및 적절한 진료 안내 목적에 한정하여 이용되며, 이용자가 동의한 범위 내에서만 의료기관에 제공됩니다.",
      "민감정보 처리에 동의하지 않을 권리가 있으며, 동의하지 않는 경우 의료 매칭 서비스 이용이 제한될 수 있습니다.",
    ],
  },

  retention: {
    title: "6. 개인정보 보관 및 이용 기간",
    body: [
      "회사는 개인정보를 수집·이용 목적 달성 시 지체 없이 파기합니다. 다만, 다음의 경우 명시된 기간 동안 보관합니다.",
      "",
      "【관계 법령에 따른 보관】",
      "· 계약 또는 청약철회 기록: 5년 (전자상거래법 §6)",
      "· 대금 결제 및 재화 공급 기록: 5년 (전자상거래법 §6)",
      "· 소비자 불만 및 분쟁 처리 기록: 3년 (전자상거래법 §6)",
      "· 로그인 기록: 3개월 (통신비밀보호법 §15-2)",
      "· 환자 진료 관련 기록(의료기관이 보유한 진료기록): 의료법 §22 및 시행규칙 §15에 따라 10년 — ※ 회사는 해당 기록의 사본을 보유하지 않으며, 의료기관이 원본을 관리합니다.",
      "",
      "【서비스 목적별 보관】",
      "· 회원 계정 정보: 탈퇴 시까지 (장기 미이용 시 1년 후 분리 보관)",
      "· 민감정보(건강정보): 컨시어지 서비스 완료 후 즉시 삭제, 단 이용자가 재이용을 위해 보관 요청 시 최대 3년",
      "· 마케팅 동의 정보: 동의 철회 시까지",
    ],
  },

  third_party: {
    title: "7. 개인정보의 제3자 제공",
    body: [
      "회사는 이용자의 동의에 근거하여 다음 항목을 제공합니다.",
      "",
      "【의료기관】",
      "· 제공 대상: 이용자가 선택·동의한 한국 내 의료기관",
      "· 제공 목적: 진료 상담, 예약, 치료 계획 수립",
      "· 제공 항목: 이름, 생년월일, 연락처, 여권번호, 진단명, 증상, 의료기록",
      "· 보유 기간: 각 의료기관의 의료법상 보관 의무에 따름 (일반적으로 10년)",
      "",
      "【비자 대행사 / 여권 관련 기관】",
      "· 제공 대상: 협력 비자 대행사 (동의 시)",
      "· 제공 항목: 여권 사본, 초청 사유서, 입국 일정",
      "· 제공 목적: 메디컬 비자(C-3-3, G-1) 신청 대행",
      "",
      "【보험사】",
      "· 제공 대상: 여행자보험·국제보험 협력사 (동의 시)",
      "· 제공 목적: 보험금 청구 지원",
      "",
      "이용자는 제3자 제공에 동의하지 않을 권리가 있으며, 이 경우 해당 서비스 이용이 제한될 수 있습니다.",
    ],
  },

  cross_border: {
    title: "8. 개인정보의 국외이전 (개인정보보호법 §28-8)",
    body: [
      "회사는 해외 환자의 한국 의료기관 이용을 돕는 특성상, 이용자 거주국에서 대한민국으로 개인정보를 이전합니다. 또한 서비스 운영상 일부 데이터를 제3국으로 이전할 수 있습니다.",
      "",
      "【이전 받는 자 및 국가】",
      "· 대한민국 내 협력 의료기관 (진료 목적)",
      "· 클라우드 서비스 제공자: Vercel Inc. (미국), Supabase Inc. (미국)",
      "· 분석 서비스: Google Ireland Ltd. (GA4, 아일랜드)",
      "· 고객 지원 도구: [확정 시 기입]",
      "",
      "【이전 목적 및 항목】",
      "· 의료기관: 제7조 ‘제3자 제공’과 동일",
      "· 클라우드/분석: 서비스 운영에 필요한 계정 정보, 로그, 쿠키 식별자",
      "",
      "【보유 기간】 각 수신자의 보관 정책 및 계약에 따름",
      "",
      "【이용자 권리】 이용자는 국외이전에 동의하지 않을 권리가 있으나, 서비스의 본질상 이전에 동의하지 않으면 서비스 이용이 불가합니다.",
      "",
      "【안전조치】",
      "· EU→한국 이전: 2021년 12월 EU 집행위원회의 한국 적정성 결정(Decision 2022/254)에 따라 별도의 SCC 없이 이전 가능. 단, 한국 내에서 PIPC 감독 하에 처리됨을 전제.",
      "· 기타 이전: Standard Contractual Clauses 또는 이에 준하는 계약·기술적 안전조치(암호화, 가명처리)를 통해 이전받는 자의 개인정보 보호 의무를 확보합니다.",
      "· 카자흐스탄 관련: 제15조의 현지화 의무 조항을 참고하시기 바랍니다.",
    ],
  },

  processors: {
    title: "9. 개인정보 처리의 위탁 (개인정보보호법 §26)",
    body: [
      "회사는 서비스 운영을 위해 다음 업체에 개인정보 처리 업무를 위탁합니다.",
      "",
      "· Supabase Inc. — 데이터베이스 호스팅 (미국)",
      "· Vercel Inc. — 웹 애플리케이션 호스팅 (미국)",
      "· Google LLC — 인증(OAuth), 분석, 지도 (미국/아일랜드)",
      "· [결제대행사 확정 시 기입] — 결제 처리",
      "· [이메일 발송 서비스 확정 시 기입] — 이메일 송신",
      "· [번역 서비스 확정 시 기입] — AI 번역 (이용자 동의 시)",
      "",
      "위탁 업체는 계약을 통해 개인정보 보호 의무, 목적 외 이용 금지, 기술적·관리적 보호조치를 준수하며, 회사는 정기적으로 감독합니다.",
    ],
  },

  user_rights: {
    title: "10. 정보주체의 권리",
    body: [
      "이용자는 다음 권리를 행사할 수 있습니다.",
      "· 개인정보 처리 현황 및 처리 정지 요구 (개인정보보호법 §35, §37)",
      "· 개인정보 열람 (§35)",
      "· 개인정보 정정·삭제 요구 (§36)",
      "· 동의 철회 (§37)",
      "· 자동화된 결정에 대한 거부권 (§37-2)",
      "· 손해배상 청구권 (§39)",
      "",
      "권리 행사는 admin@healwith.co.kr 또는 본 방침 제15조 개인정보보호책임자 연락처로 요청할 수 있으며, 회사는 10일 이내 조치합니다.",
      "",
      "이용자는 대한민국 개인정보보호위원회에 신고 및 분쟁조정을 신청할 수 있습니다:",
      "· 개인정보보호위원회: (국번없이) 182, www.privacy.go.kr",
      "· 개인정보 분쟁조정위원회: 1833-6972, www.kopico.go.kr",
    ],
  },

  children: {
    title: "11. 만 14세 미만 아동의 개인정보 (개인정보보호법 §22-2)",
    body: [
      "회사는 소아암 등 미성년 환자의 컨시어지 요청을 받을 수 있으며, 이 경우 법정대리인(부모·보호자)의 동의를 반드시 확인합니다.",
      "법정대리인은 언제든지 아동의 개인정보 열람·정정·삭제·처리정지를 요구할 수 있으며, 회사는 지체 없이 응합니다.",
    ],
  },

  security: {
    title: "12. 개인정보의 안전성 확보 조치",
    body: [
      "회사는 다음 보호조치를 시행합니다.",
      "· 관리적: 개인정보보호책임자 지정, 정기 교육, 접근권한 최소화",
      "· 기술적: 암호화(전송 TLS 1.3, 저장 AES-256), 침입차단 시스템, 보안 패치 관리",
      "· 물리적: 데이터 처리 구역 출입통제, 문서 보안",
      "· 사고 대응: 유출 발생 시 72시간 이내 감독기관 및 정보주체 통지",
    ],
  },

  cookies: {
    title: "13. 쿠키의 사용",
    body: [
      "회사는 세션 유지, 언어 설정, 보안, 이용 분석을 위해 쿠키를 사용합니다.",
      "이용자는 브라우저 설정을 통해 쿠키를 거부할 수 있으며, 상세는 별도의 「쿠키 정책」을 참고하시기 바랍니다.",
    ],
  },

  dpo: {
    title: "14. 개인정보보호책임자 (CPO / DPO)",
    body: [
      "성명: 강주영 (JUYOUNG KANG)",
      "직책: 대표 (겸임 — 개인정보보호법 §31, GDPR Art 37)",
      "이메일: admin@healwith.co.kr",
      "전화: +82-10-4772-1075 (국제) · 070-7500-7795 (국내)",
      "",
      "이용자는 개인정보 관련 문의·불만·피해 구제를 개인정보보호책임자에게 직접 연락할 수 있습니다. 회사는 이용자의 문의에 영업일 10일 이내에 응답합니다.",
    ],
  },

  jurisdiction_kz: {
    title: "15. 카자흐스탄 거주 이용자 추가 고지",
    body: [
      "본 조항은 카자흐스탄공화국 「개인정보 및 그 보호에 관한 법률」(94-V ЗРК, 2013, 2015·2022년 개정) 및 관련 시행규정에 따른 추가 고지입니다.",
      "",
      "【국외 이전에 대한 명시적 동의 (제16조)】",
      "본 서비스는 해외 환자의 한국 의료기관 이용을 돕는 성격상, 이용자의 개인정보를 대한민국으로 이전합니다. 카자흐스탄법 제16조는 정보주체의 명시적 서면 동의에 기반한 국외 이전을 허용하며, 이용자는 서비스 이용 신청 시 본 방침의 국외이전 조항 및 별도 동의 체크박스를 통해 다음에 명시적으로 동의합니다:",
      "· 이전 국가: 대한민국",
      "· 이전받는 자: 이용자가 선택한 한국 내 협력 의료기관, 클라우드 서비스 제공자(Vercel Inc., Supabase Inc.)",
      "· 이전 항목: 제3조 수집 항목 및 제5조 민감정보",
      "· 이전 목적: 의료 컨시어지 서비스 제공",
      "",
      "【현지 저장 (제12조)에 관한 안내】",
      "카자흐스탄법 제12조는 카자흐스탄 시민의 개인정보에 대한 카자흐 영토 내 1차 저장을 규정합니다. 현재 회사는 상기 제16조에 따른 명시적 동의 경로를 법적 근거로 서비스를 운영하고 있으며, 서비스 성장 단계에 따라 카자흐스탄 현지 클라우드 파트너(QazCloud, Yandex Cloud Kazakhstan 등)를 통한 현지 1차 저장 구조 도입을 검토합니다. 중요한 변경 시 본 방침 업데이트로 즉시 공지합니다.",
      "",
      "【민감정보(의료) 별도 동의 (제8조, 제9조)】",
      "카자흐스탄법상 민감정보는 서면 또는 전자서명(EDS, eGov 연동)으로 확인 가능한 방식의 동의를 요구합니다. 회사는 전자 체크박스 기반 동의를 타임스탬프·IP·사용자 식별자와 함께 기록하여 서면에 준하는 증거력을 확보합니다. 구두 동의는 수집하지 않습니다.",
      "",
      "【공용 언어】",
      "본 방침은 카자흐어(국어) 및 러시아어(공용어)로 동시 제공됩니다. 이용자는 선호 언어를 선택할 수 있으며, 번역본 간 해석 차이 시 대한민국 법적 효력은 한국어판을 기준으로 합니다.",
      "",
      "【감독기관】",
      "· 정보보안위원회 (Комитет по информационной безопасности, КНБ 산하)",
      "· 디지털개발·혁신·항공우주산업부 (Министерство цифрового развития, инноваций и аэрокосмической промышленности)",
      "",
      "【신고 및 분쟁】",
      "본 방침 제19조 연락처로 문의하거나, 거주지 법원 또는 감독기관에 제소할 수 있습니다.",
    ],
  },

  automated_decisions: {
    title: "15-2. 자동화된 결정 (개인정보보호법 §37-2)",
    body: [
      "회사는 이용자에게 적합한 의료기관을 추천하기 위해 AI 기반 매칭 알고리즘을 사용합니다. 이는 「개인정보보호법」 제37조의2에 따른 '자동화된 결정'에 해당할 수 있습니다.",
      "",
      "【자동화 처리 항목】",
      "· 증상·진단명을 기반으로 한 진료과 매칭",
      "· 과거 치료 사례·언어 지원 가능성을 바탕으로 한 병원 순위 추천",
      "· 체류 기간·예산에 맞는 패키지 자동 생성",
      "",
      "【이용자 권리】",
      "· 자동화된 결정 결과에 대한 설명 요구",
      "· 자동화된 결정 거부 및 사람에 의한 재검토 요청",
      "· 위 요청은 privacy@healwith.co.kr 또는 제14조 DPO 연락처로 신청",
      "",
      "최종 의료 결정은 반드시 의료진의 판단을 받으시기 바랍니다. AI 추천은 참고용이며 진단·치료가 아닙니다.",
    ],
  },

  jurisdiction_eu: {
    title: "16. EU·EEA 거주 이용자 추가 고지 (GDPR)",
    body: [
      "EU/EEA 거주자에게 GDPR이 적용되는 경우 다음 권리가 보장됩니다.",
      "· 정보 접근권 (Art. 15), 정정권 (Art. 16), 삭제권 (Art. 17), 처리제한권 (Art. 18), 이동권 (Art. 20), 반대권 (Art. 21), 자동화 결정 거부권 (Art. 22)",
      "· 특수 범주 데이터(건강정보, Art. 9)는 명시적 동의에 의해서만 처리됩니다.",
      "· 제3국 이전(Art. 44-49)은 Standard Contractual Clauses 등 적절한 안전장치를 통해 이루어집니다.",
      "· 감독기관 신고권: 거주국 개인정보보호 감독기관.",
      "· EU 대리인: [EU 내 사업 진출 시 GDPR Art. 27에 따라 대리인 지정]",
    ],
  },

  jurisdiction_ru: {
    title: "17. 러시아 거주 이용자 추가 고지",
    body: [
      "러시아연방 「개인정보보호법」(152-ФЗ)에 따라, 러시아 시민의 개인정보 초기 수집은 러시아 영토 내에서 이루어져야 한다는 로컬라이제이션 의무가 있습니다.",
      "회사는 러시아 시민의 데이터에 대해 해당 법적 요건 준수 방안을 별도로 검토 중이며, 러시아 거주 이용자는 서비스 이용 전 본 조항의 고지를 명시적으로 확인하고 동의합니다.",
      "감독기관: Roskomnadzor (Роскомнадзор).",
    ],
  },

  changes: {
    title: "18. 방침의 변경",
    body: [
      "본 방침의 중요한 변경 사항은 시행 최소 7일 전(불리한 변경은 30일 전)에 공지사항 및 이메일을 통해 통지합니다.",
      "현재 버전: 2.0.0 (시행일: 2026-04-20)",
    ],
  },

  contact: {
    title: "19. 연락처",
    body: [
      "개인정보·일반 문의: admin@healwith.co.kr",
      "주소: 서울특별시 강서구 강서로 385, 613호 (마곡동, 우성에스비타워)",
      "전화: +82-10-4772-1075 (국제) · 070-7500-7795 (국내)",
      "운영 시간: 평일 09:00-18:00 KST (공휴일 제외)",
    ],
  },
};

/**
 * 영어 (EN) - 국제 사용자 대상
 */
const EN = {
  pageTitle: "Privacy Policy",
  lastUpdated: "Last Updated",
  version: "Version",
  tableOfContents: "Contents",

  introduction: {
    title: "1. Introduction",
    body: [
      "BONROI (\"we\", \"us\") operates a medical concierge platform, healwith, that helps international patients access medical care in the Republic of Korea. healwith is not a medical institution and does not provide diagnosis or treatment.",
      "This Policy is primarily governed by the Korean Personal Information Protection Act (PIPA), the Medical Service Act, and the Act on Support for Overseas Expansion of Healthcare Systems and Attraction of International Patients. Where applicable, it also reflects the requirements of your country of residence (e.g., EU GDPR, Kazakhstan Law 94-V, Russian Federal Law 152-FZ, etc.). Jurisdiction-specific notices are provided in dedicated sections below.",
      "We treat the personal information of all users with care, regardless of nationality or residence, and handle it in accordance with applicable laws.",
    ],
  },

  controller: {
    title: "2. Data Controller",
    body: [
      "Trade name: BONROI (service: healwith)",
      "Entity type: Sole proprietorship",
      "Representative: JUYOUNG KANG",
      "Business Registration Number: 463-35-00902",
      "International Patient Facilitator Registration Number: A-2026-01-02-06761 (valid 2026-03-11 ~ 2029-03-10, issued by the Mayor of Seoul)",
      "Registered address: Room 613, 385 Gangseo-ro, Gangseo-gu, Seoul, Republic of Korea",
      "Contact: +82-10-4772-1075 (international) · 070-7500-7795 (domestic)",
      "Email: admin@healwith.co.kr",
      "Business hours: Mon-Fri 09:00-18:00 KST (excluding Korean public holidays)",
    ],
  },

  collection_items: {
    title: "3. Personal Data We Collect",
    body: [
      "【Mandatory】",
      "· Name, date of birth, gender, nationality, passport number (for visa and hospital registration)",
      "· Contact details (email, phone, messenger ID)",
      "· Residential address (stay-support purposes)",
      "· Guardian/companion information (for minor or elderly patients)",
      "",
      "【Sensitive Data — Separate Consent】",
      "· Diagnosis, medical history, current symptoms, medications",
      "· Medical certificates, test results, imaging (X-ray, CT, MRI, etc.)",
      "· Health insurance and travel insurance information",
      "· Disability status (for accessibility support)",
      "",
      "【Automatically Collected】",
      "· IP address, cookies, session logs, service usage records",
      "· Device information (OS, browser, model), approximate geolocation (country-level; precise location only with consent)",
      "",
      "【Payment-Related】",
      "· Payment details are processed by a Payment Gateway. We do not store full card numbers.",
    ],
  },

  collection_purpose: {
    title: "4. Purposes of Collection and Use",
    body: [
      "a. Member identification and authentication",
      "b. Hospital matching, appointment booking, visa and stay support",
      "c. Provision of consent-based medical information to healthcare providers",
      "d. Interpretation, transportation, and accommodation services",
      "e. Payment processing and issuance of receipts or tax invoices",
      "f. Customer support and dispute resolution",
      "g. Service quality improvement, statistical analysis, security incident response",
      "h. Compliance with legal obligations",
    ],
  },

  sensitive_data: {
    title: "5. Sensitive Data (PIPA §23 / GDPR Art. 9)",
    body: [
      "healwith processes \"health-related information\" which constitutes Sensitive Data under PIPA §23 and a Special Category of personal data under GDPR Article 9. Such data is collected and used only with your explicit, separate consent.",
      "Sensitive data is used solely for hospital matching and appropriate care coordination, and is shared with healthcare providers only within the scope of your consent.",
      "You have the right to withhold consent for processing of sensitive data; doing so may restrict your ability to use medical matching services.",
    ],
  },

  retention: {
    title: "6. Retention and Use Period",
    body: [
      "We delete personal data without delay once the purpose of collection has been fulfilled, except where required to be retained by law.",
      "",
      "【Statutory Retention】",
      "· Contract/withdrawal records: 5 years (Act on Consumer Protection in E-Commerce §6)",
      "· Payment and supply records: 5 years",
      "· Consumer complaints/dispute records: 3 years",
      "· Login records: 3 months (Protection of Communications Secrets Act §15-2)",
      "· Medical records held by hospitals: 10 years (Medical Service Act §22). Note: healwith does not retain copies of medical records; originals are maintained by the hospital.",
      "",
      "【Service-Based Retention】",
      "· Account information: until account closure (dormant accounts archived after 1 year)",
      "· Sensitive health data: deleted immediately after concierge service completion, unless retained up to 3 years at user's explicit request",
      "· Marketing consent data: until withdrawal",
    ],
  },

  third_party: {
    title: "7. Disclosure to Third Parties",
    body: [
      "Based on your consent, we share personal data with the following third parties:",
      "",
      "【Healthcare Providers】",
      "· Recipients: Korean hospitals and clinics selected and consented by you",
      "· Purpose: Medical consultation, appointment, treatment planning",
      "· Items: Name, date of birth, contact, passport number, diagnosis, symptoms, medical records",
      "· Retention: Per each provider's legal obligations (typically 10 years)",
      "",
      "【Visa Agencies】",
      "· Recipients: Partner visa agencies (with consent)",
      "· Items: Passport copy, invitation letter, travel schedule",
      "· Purpose: Medical visa application (C-3-3, G-1)",
      "",
      "【Insurance Companies】",
      "· Recipients: Travel/international insurance partners (with consent)",
      "· Purpose: Claims support",
      "",
      "You may refuse third-party disclosure, subject to service limitations.",
    ],
  },

  cross_border: {
    title: "8. International Transfers (PIPA §28-8 / GDPR Art. 44-49)",
    body: [
      "By the nature of our service — helping overseas patients access Korean healthcare — we transfer personal data from your country of residence to the Republic of Korea. Certain operational data may also be transferred to other jurisdictions.",
      "",
      "【Recipients & Jurisdictions】",
      "· Korean partner hospitals (for medical purposes)",
      "· Cloud infrastructure: Vercel Inc. (USA), Supabase Inc. (USA)",
      "· Analytics: Google Ireland Ltd. (GA4, Ireland)",
      "· Customer support tools: [To be confirmed]",
      "",
      "【Purposes & Items】",
      "· Hospitals: Same as Section 7",
      "· Cloud/Analytics: Account information, logs, cookie identifiers",
      "",
      "【Retention】 Per each recipient's policy and contractual terms.",
      "",
      "【Your Rights】 You may refuse the transfer, but as transfers are essential to the service, refusal will prevent use of the service.",
      "",
      "【Safeguards】 Where applicable, transfers from the EU/EEA rely on Standard Contractual Clauses (SCCs). For transfers to/from Korea, we implement contractual and technical safeguards.",
    ],
  },

  processors: {
    title: "9. Data Processors (PIPA §26)",
    body: [
      "We entrust the following processors with personal data processing under contract:",
      "",
      "· Supabase Inc. — Database hosting (USA)",
      "· Vercel Inc. — Web application hosting (USA)",
      "· Google LLC — Authentication (OAuth), analytics, maps (USA/Ireland)",
      "· [Payment Gateway — TBC] — Payment processing",
      "· [Email service — TBC] — Email delivery",
      "· [AI Translation — TBC] — Translation (with user consent)",
      "",
      "Contracts require processors to observe data protection obligations, prohibition on use beyond stated purposes, and technical/organizational safeguards. We audit processors regularly.",
    ],
  },

  user_rights: {
    title: "10. Your Rights",
    body: [
      "You may exercise the following rights:",
      "· Access to your data (PIPA §35 / GDPR Art. 15)",
      "· Correction and deletion (PIPA §36 / GDPR Art. 16-17)",
      "· Restriction of processing (GDPR Art. 18)",
      "· Withdrawal of consent (PIPA §37)",
      "· Data portability (GDPR Art. 20)",
      "· Objection to automated decision-making (PIPA §37-2 / GDPR Art. 22)",
      "· Right to compensation (PIPA §39)",
      "",
      "To exercise these rights, contact privacy@healwith.co.kr or our DPO (Section 14). We respond within 10 business days.",
      "",
      "You may lodge a complaint with a supervisory authority:",
      "· Korea: Personal Information Protection Commission (182, www.pipc.go.kr)",
      "· EU/EEA: Your national DPA",
      "· Kazakhstan: Committee on Information Security",
    ],
  },

  children: {
    title: "11. Children Under 14 (PIPA §22-2)",
    body: [
      "healwith may receive concierge requests involving minor patients (e.g., pediatric cancer). In such cases, we require verified consent from a legal guardian (parent/caretaker).",
      "Legal guardians may at any time request access, correction, deletion, or suspension of processing of the minor's personal data. We respond without delay.",
    ],
  },

  security: {
    title: "12. Security Measures",
    body: [
      "We implement the following safeguards:",
      "· Administrative: DPO appointment, periodic training, least-privilege access",
      "· Technical: Encryption (TLS 1.3 in transit, AES-256 at rest), intrusion prevention, security patch management",
      "· Physical: Access control to data processing areas",
      "· Incident response: Notification to authorities and data subjects within 72 hours of a breach",
    ],
  },

  cookies: {
    title: "13. Use of Cookies",
    body: [
      "We use cookies for session management, language preferences, security, and analytics.",
      "You may disable cookies via browser settings. See our Cookie Policy for details.",
    ],
  },

  dpo: {
    title: "14. Data Protection Officer (DPO / CPO)",
    body: [
      "Name: JUYOUNG KANG",
      "Title: Representative (concurrent — per Korean PIPA §31 and GDPR Art 37)",
      "Email: admin@healwith.co.kr",
      "Phone: +82-10-4772-1075 (international) · 070-7500-7795 (domestic)",
      "",
      "You may contact the DPO directly for any privacy-related inquiry, complaint, or remedy request. We respond within 10 business days.",
    ],
  },

  jurisdiction_kz: {
    title: "15. Additional Notice for Residents of Kazakhstan",
    body: [
      "This section provides additional disclosures required under the Kazakhstan Law on Personal Data and Its Protection (No. 94-V, 2013, as amended in 2015).",
      "",
      "· Storage/localization: By nature of our service, your personal data is transferred to the Republic of Korea and potentially to other jurisdictions. You provide explicit consent for such cross-border storage and transfer.",
      "· Sensitive (medical) data: Consent is collected in a manner verifiable in writing or by electronic signature.",
      "· Supervisory authority: Committee on Information Security (Комитет по информационной безопасности).",
      "· Complaints: Contact details in Section 19, or proceedings in courts of your place of residence.",
    ],
  },

  jurisdiction_eu: {
    title: "16. Additional Notice for Residents of EU/EEA (GDPR)",
    body: [
      "Where GDPR applies, the following rights are guaranteed:",
      "· Right of access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction (Art. 18), portability (Art. 20), objection (Art. 21), and regarding automated decision-making (Art. 22).",
      "· Special category data (health, Art. 9) is processed only based on explicit consent.",
      "· International transfers (Art. 44-49) rely on Standard Contractual Clauses where applicable.",
      "· You may lodge a complaint with your national DPA.",
      "· EU Representative: [To be designated under Art. 27 if targeting EU market]",
    ],
  },

  jurisdiction_ru: {
    title: "17. Additional Notice for Residents of Russia",
    body: [
      "Russian Federal Law 152-FZ requires initial collection of personal data of Russian citizens within Russian territory.",
      "healwith is separately evaluating compliance with this requirement. By using the service, Russian residents acknowledge and explicitly consent to these terms.",
      "Supervisory authority: Roskomnadzor (Роскомнадзор).",
    ],
  },

  changes: {
    title: "18. Changes to This Policy",
    body: [
      "Material changes will be notified via our service notice and email at least 7 days prior to effect (30 days for adverse changes).",
      "Current version: 2.0.0 (Effective 2026-04-20).",
    ],
  },

  contact: {
    title: "19. Contact",
    body: [
      "Privacy and general inquiries: admin@healwith.co.kr",
      "Address: Room 613, 385 Gangseo-ro, Gangseo-gu, Seoul, Republic of Korea",
      "Phone: +82-10-4772-1075 (international) · 070-7500-7795 (domestic)",
      "Business hours: Mon-Fri 09:00-18:00 KST",
    ],
  },
};

/**
 * 러시아어 (RU) - 주 사용자층
 * ⚠️ 이 번역은 초안입니다. 러시아어 법률 전문 번역가의 검수가 필요합니다.
 */
const RU = {
  pageTitle: "Политика конфиденциальности",
  lastUpdated: "Последнее обновление",
  version: "Версия",
  tableOfContents: "Содержание",

  introduction: {
    title: "1. Общие положения",
    body: [
      "BONROI («мы», «Компания») управляет платформой медицинского консьержа healwith, которая помогает иностранным пациентам получать медицинскую помощь в Республике Корея. healwith не является медицинским учреждением и не оказывает услуги по диагностике или лечению.",
      "Настоящая Политика регулируется прежде всего Законом Республики Корея о защите персональных данных (PIPA), Законом о медицинском обслуживании и Законом о поддержке зарубежного развития систем здравоохранения и привлечения иностранных пациентов. В применимых случаях она также учитывает требования законодательства страны вашего проживания (например, Общий регламент ЕС по защите данных (GDPR), Закон Республики Казахстан 94-V ЗРК, Федеральный закон Российской Федерации 152-ФЗ и др.). Уведомления, относящиеся к конкретным юрисдикциям, приведены в отдельных разделах ниже.",
      "Мы бережно относимся к персональным данным всех пользователей независимо от их гражданства или места проживания и обрабатываем их в соответствии с применимым законодательством.",
    ],
  },

  controller: {
    title: "2. Оператор персональных данных",
    body: [
      "Фирменное наименование: BONROI (сервис: healwith)",
      "Форма деятельности: индивидуальный предприниматель",
      "Представитель: JUYOUNG KANG",
      "Регистрационный номер предприятия: 463-35-00902",
      "Регистрационный номер организации по привлечению иностранных пациентов: A-2026-01-02-06761 (действителен с 2026-03-11 по 2029-03-10, выдан мэром города Сеул)",
      "Юридический адрес: Room 613, 385 Gangseo-ro, Gangseo-gu, Seoul, Republic of Korea",
      "Контакт: +82-10-4772-1075 (международный) · 070-7500-7795 (внутренний)",
      "Эл. почта: admin@healwith.co.kr",
      "Часы работы: Пн-Пт 09:00-18:00 KST (кроме государственных праздников Республики Корея)",
    ],
  },

  collection_items: {
    title: "3. Собираемые персональные данные",
    body: [
      "【Обязательные】",
      "· Имя, дата рождения, пол, гражданство, номер паспорта (для оформления визы и регистрации в больнице)",
      "· Контактные данные (эл. почта, телефон, ID мессенджера)",
      "· Адрес проживания (для поддержки пребывания)",
      "· Данные опекуна/сопровождающего (для несовершеннолетних или пожилых пациентов)",
      "",
      "【Чувствительные данные — отдельное согласие】",
      "· Диагноз, история болезни, текущие симптомы, принимаемые лекарства",
      "· Медицинские справки, результаты обследований, снимки (рентген, КТ, МРТ и др.)",
      "· Сведения о медицинском и туристическом страховании",
      "· Сведения об инвалидности (для поддержки доступности)",
      "",
      "【Автоматически собираемые】",
      "· IP-адрес, файлы cookie, журналы сессий, записи использования сервиса",
      "· Сведения об устройстве (ОС, браузер, модель), приблизительное геоположение (на уровне страны; точное местоположение — только с согласия)",
      "",
      "【Связанные с оплатой】",
      "· Платёжные данные обрабатываются через платёжного агента (PG). Компания не хранит полный номер карты.",
    ],
  },

  collection_purpose: {
    title: "4. Цели сбора и использования персональных данных",
    body: [
      "a. Идентификация и подтверждение личности пользователя",
      "b. Подбор медицинского учреждения, запись на приём, поддержка по визе и пребыванию",
      "c. Предоставление медицинским учреждениям информации о лечении на основании согласия пользователя",
      "d. Услуги перевода, транспорта и проживания",
      "e. Обработка платежей и выставление квитанций или налоговых счетов-фактур",
      "f. Обработка жалоб и обращений, поддержка клиентов",
      "g. Повышение качества сервиса, статистический анализ, реагирование на инциденты безопасности",
      "h. Исполнение установленных законом обязанностей",
    ],
  },

  sensitive_data: {
    title: "5. Обработка чувствительных данных (PIPA §23 / GDPR ст. 9)",
    body: [
      "healwith обрабатывает «информацию о состоянии здоровья», которая относится к чувствительным данным согласно PIPA §23 и к особой категории персональных данных согласно статье 9 GDPR. Такие данные собираются и используются только при наличии вашего явного, отдельного согласия.",
      "Чувствительные данные используются исключительно в целях подбора медицинского учреждения и надлежащей координации помощи и передаются медицинским учреждениям только в объёме вашего согласия.",
      "Вы вправе отказать в согласии на обработку чувствительных данных; такой отказ может ограничить возможность пользоваться услугами медицинского подбора.",
    ],
  },

  retention: {
    title: "6. Срок хранения и использования",
    body: [
      "Мы удаляем персональные данные без промедления после достижения цели их сбора, за исключением случаев, когда их хранение требуется по закону.",
      "",
      "【Хранение в силу закона】",
      "· Записи о договорах/отзыве: 5 лет (Закон о защите прав потребителей в электронной торговле §6)",
      "· Записи об оплате и поставке: 5 лет",
      "· Записи о жалобах потребителей и спорах: 3 года",
      "· Записи о входе в систему: 3 месяца (Закон о защите тайны связи §15-2)",
      "· Медицинские записи, хранимые больницами: 10 лет (Закон о медицинском обслуживании §22). Примечание: healwith не хранит копии медицинских записей; оригиналы ведутся больницей.",
      "",
      "【Хранение в зависимости от цели】",
      "· Данные учётной записи: до закрытия учётной записи (неактивные учётные записи архивируются через 1 год)",
      "· Чувствительные медицинские данные: удаляются сразу после завершения услуги консьержа, если только не сохраняются до 3 лет по явному запросу пользователя",
      "· Данные о согласии на маркетинг: до отзыва согласия",
    ],
  },

  third_party: {
    title: "7. Передача третьим лицам",
    body: [
      "На основании вашего согласия мы передаём персональные данные следующим третьим лицам:",
      "",
      "【Медицинские учреждения】",
      "· Получатели: корейские больницы и клиники, выбранные вами и согласованные с вами",
      "· Цель: медицинская консультация, запись на приём, планирование лечения",
      "· Состав данных: имя, дата рождения, контактные данные, номер паспорта, диагноз, симптомы, медицинские записи",
      "· Срок хранения: согласно установленным законом обязанностям каждого учреждения (как правило, 10 лет)",
      "",
      "【Визовые агентства】",
      "· Получатели: партнёрские визовые агентства (при наличии согласия)",
      "· Состав данных: копия паспорта, пригласительное письмо, график поездки",
      "· Цель: оформление медицинской визы (C-3-3, G-1)",
      "",
      "【Страховые компании】",
      "· Получатели: партнёры по туристическому/международному страхованию (при наличии согласия)",
      "· Цель: поддержка при подаче страховых требований",
      "",
      "Вы вправе отказаться от передачи третьим лицам с учётом ограничений в предоставлении услуг.",
    ],
  },

  cross_border: {
    title: "8. Трансграничная передача данных (PIPA §28-8 / GDPR ст. 44-49)",
    body: [
      "В силу характера нашего сервиса — помощи зарубежным пациентам в получении медицинской помощи в Корее — мы передаём персональные данные из страны вашего проживания в Республику Корея. Отдельные операционные данные также могут передаваться в другие юрисдикции.",
      "",
      "【Получатели и юрисдикции】",
      "· Партнёрские больницы в Корее (в медицинских целях)",
      "· Облачная инфраструктура: Vercel Inc. (США), Supabase Inc. (США)",
      "· Аналитика: Google Ireland Ltd. (GA4, Ирландия)",
      "· Инструменты поддержки клиентов: [подлежит уточнению]",
      "",
      "【Цели и состав данных】",
      "· Больницы: то же, что в разделе 7",
      "· Облако/аналитика: данные учётной записи, журналы, идентификаторы cookie",
      "",
      "【Срок хранения】 Согласно политике и договорным условиям каждого получателя.",
      "",
      "【Ваши права】 Вы вправе отказаться от передачи, однако, поскольку передача необходима для оказания услуги, отказ делает использование сервиса невозможным.",
      "",
      "【Меры защиты】 В применимых случаях передача из ЕС/ЕЭЗ осуществляется на основании Стандартных договорных положений (SCC). Для передачи в Корею и из Кореи мы применяем договорные и технические меры защиты.",
    ],
  },

  processors: {
    title: "9. Поручение обработки персональных данных (PIPA §26)",
    body: [
      "Мы поручаем обработку персональных данных следующим обработчикам на основании договора:",
      "",
      "· Supabase Inc. — хостинг базы данных (США)",
      "· Vercel Inc. — хостинг веб-приложения (США)",
      "· Google LLC — аутентификация (OAuth), аналитика, карты (США/Ирландия)",
      "· [Платёжный агент — подлежит уточнению] — обработка платежей",
      "· [Сервис рассылки — подлежит уточнению] — отправка электронной почты",
      "· [ИИ-перевод — подлежит уточнению] — перевод (при согласии пользователя)",
      "",
      "Договоры обязывают обработчиков соблюдать обязанности по защите данных, запрет на использование сверх заявленных целей, а также технические и организационные меры защиты. Мы регулярно осуществляем контроль за обработчиками.",
    ],
  },

  user_rights: {
    title: "10. Права субъекта данных",
    body: [
      "Вы можете осуществлять следующие права:",
      "· Доступ к вашим данным (PIPA §35 / GDPR ст. 15)",
      "· Исправление и удаление (PIPA §36 / GDPR ст. 16-17)",
      "· Ограничение обработки (GDPR ст. 18)",
      "· Отзыв согласия (PIPA §37)",
      "· Переносимость данных (GDPR ст. 20)",
      "· Возражение против автоматизированного принятия решений (PIPA §37-2 / GDPR ст. 22)",
      "· Право на возмещение вреда (PIPA §39)",
      "",
      "Для осуществления этих прав обращайтесь по адресу admin@healwith.co.kr или к нашему ответственному за защиту данных (раздел 14). Мы отвечаем в течение 10 рабочих дней.",
      "",
      "Вы можете подать жалобу в надзорный орган:",
      "· Корея: Комиссия по защите персональных данных (182, www.pipc.go.kr)",
      "· ЕС/ЕЭЗ: национальный орган по защите данных вашей страны",
      "· Казахстан: Комитет по информационной безопасности",
    ],
  },

  children: {
    title: "11. Персональные данные детей младше 14 лет (PIPA §22-2)",
    body: [
      "healwith может получать запросы консьержа, касающиеся несовершеннолетних пациентов (например, при детской онкологии). В таких случаях мы требуем подтверждённого согласия законного представителя (родителя/опекуна).",
      "Законные представители вправе в любое время потребовать доступа, исправления, удаления или приостановления обработки персональных данных несовершеннолетнего. Мы реагируем без промедления.",
    ],
  },

  security: {
    title: "12. Меры обеспечения безопасности персональных данных",
    body: [
      "Мы применяем следующие меры защиты:",
      "· Организационные: назначение ответственного за защиту данных, периодическое обучение, минимизация прав доступа",
      "· Технические: шифрование (TLS 1.3 при передаче, AES-256 при хранении), системы предотвращения вторжений, управление обновлениями безопасности",
      "· Физические: контроль доступа в зоны обработки данных",
      "· Реагирование на инциденты: уведомление надзорных органов и субъектов данных в течение 72 часов после утечки",
    ],
  },

  cookies: {
    title: "13. Использование файлов cookie",
    body: [
      "Мы используем файлы cookie для поддержания сессии, языковых настроек, безопасности и аналитики.",
      "Вы можете отключить файлы cookie в настройках браузера. Подробнее см. в нашей Политике использования файлов cookie.",
    ],
  },

  dpo: {
    title: "14. Ответственный за защиту персональных данных (DPO / CPO)",
    body: [
      "Имя: JUYOUNG KANG",
      "Должность: представитель (по совместительству — согласно PIPA §31 Республики Корея и ст. 37 GDPR)",
      "Эл. почта: admin@healwith.co.kr",
      "Телефон: +82-10-4772-1075 (международный) · 070-7500-7795 (внутренний)",
      "",
      "Вы можете напрямую обращаться к ответственному за защиту данных по любым вопросам, жалобам или требованиям о защите прав в сфере персональных данных. Мы отвечаем в течение 10 рабочих дней.",
    ],
  },

  jurisdiction_kz: {
    title: "15. Дополнительное уведомление для жителей Казахстана",
    body: [
      "Настоящий раздел содержит дополнительные сведения, требуемые Законом Республики Казахстан «О персональных данных и их защите» (№ 94-V ЗРК, 2013, с изменениями 2015 года).",
      "",
      "· Хранение/локализация: в силу характера нашего сервиса ваши персональные данные передаются в Республику Корея и потенциально в другие юрисдикции. Вы предоставляете явное согласие на такое трансграничное хранение и передачу.",
      "· Чувствительные (медицинские) данные: согласие собирается способом, поддающимся проверке в письменной форме или посредством электронной подписи.",
      "· Надзорный орган: Комитет по информационной безопасности.",
      "· Жалобы: контактные данные приведены в разделе 19, либо обращение в суды по месту вашего проживания.",
    ],
  },

  jurisdiction_eu: {
    title: "16. Дополнительное уведомление для жителей ЕС/ЕЭЗ (GDPR)",
    body: [
      "Если применяется GDPR, гарантируются следующие права:",
      "· Право на доступ (ст. 15), исправление (ст. 16), удаление (ст. 17), ограничение (ст. 18), переносимость (ст. 20), возражение (ст. 21), а также в отношении автоматизированного принятия решений (ст. 22).",
      "· Данные особой категории (о здоровье, ст. 9) обрабатываются только на основании явного согласия.",
      "· Трансграничная передача (ст. 44-49) осуществляется на основании Стандартных договорных положений в применимых случаях.",
      "· Вы можете подать жалобу в национальный орган по защите данных вашей страны.",
      "· Представитель в ЕС: [подлежит назначению согласно ст. 27 при ориентации на рынок ЕС]",
    ],
  },

  jurisdiction_ru: {
    title: "17. Дополнительное уведомление для жителей России",
    body: [
      "Федеральный закон Российской Федерации 152-ФЗ требует, чтобы первоначальный сбор персональных данных граждан России осуществлялся на территории Российской Федерации.",
      "healwith отдельно оценивает порядок соблюдения данного требования. Пользуясь сервисом, жители России подтверждают и явно выражают согласие с настоящими условиями.",
      "Надзорный орган: Роскомнадзор.",
    ],
  },

  changes: {
    title: "18. Изменения настоящей Политики",
    body: [
      "О существенных изменениях мы уведомляем через объявления сервиса и по электронной почте не менее чем за 7 дней до вступления в силу (за 30 дней — в случае неблагоприятных изменений).",
      "Текущая версия: 2.0.0 (вступила в силу 2026-04-20).",
    ],
  },

  contact: {
    title: "19. Контакты",
    body: [
      "Вопросы по защите персональных данных и общие вопросы: admin@healwith.co.kr",
      "Адрес: Room 613, 385 Gangseo-ro, Gangseo-gu, Seoul, Republic of Korea",
      "Телефон: +82-10-4772-1075 (международный) · 070-7500-7795 (внутренний)",
      "Часы работы: Пн-Пт 09:00-18:00 KST",
    ],
  },
};

/**
 * 카자흐어 (KZ)
 * ⚠️ 이 번역은 초안입니다. 카자흐어 법률 전문 번역가의 검수가 필요합니다.
 */
const KZ = {
  pageTitle: "Құпиялылық саясаты",
  lastUpdated: "Соңғы жаңарту",
  version: "Нұсқа",
  tableOfContents: "Мазмұны",

  introduction: {
    title: "1. Жалпы ережелер",
    body: [
      "BONROI («біз», «Компания») шетелдік пациенттерге Корея Республикасында медициналық көмек алуға көмектесетін healwith медициналық консьерж платформасын басқарады. healwith медициналық мекеме болып табылмайды және диагностика немесе емдеу қызметтерін тікелей көрсетпейді.",
      "Осы Саясат ең алдымен Корея Республикасының Дербес деректерді қорғау туралы заңымен (PIPA), Медициналық қызмет көрсету туралы заңмен және Денсаулық сақтау жүйелерін шетелде дамытуды және шетелдік пациенттерді тартуды қолдау туралы заңмен реттеледі. Қолданылатын жағдайларда ол сіздің тұрғылықты еліңіздің заңнамасының (мысалы, ЕО Деректерді қорғаудың жалпы регламенті (GDPR), Қазақстан Республикасының 94-V ЗРК заңы, Ресей Федерациясының 152-ФЗ Федералдық заңы және т.б.) талаптарын да ескереді. Нақты юрисдикцияларға қатысты хабарламалар төмендегі жеке бөлімдерде келтірілген.",
      "Біз барлық пайдаланушылардың дербес деректерін олардың азаматтығына немесе тұрғылықты жеріне қарамастан мұқият өңдейміз және оларды қолданыстағы заңнамаға сәйкес қорғаймыз.",
    ],
  },

  controller: {
    title: "2. Дербес деректерді өңдеуші туралы ақпарат",
    body: [
      "Фирмалық атауы: BONROI (сервис: healwith)",
      "Қызмет нысаны: жеке кәсіпкер",
      "Өкіл: JUYOUNG KANG",
      "Кәсіпорынды тіркеу нөмірі: 463-35-00902",
      "Шетелдік пациенттерді тарту жөніндегі ұйымды тіркеу нөмірі: A-2026-01-02-06761 (2026-03-11 — 2029-03-10 аралығында жарамды, Сеул қаласының әкімі берген)",
      "Заңды мекенжайы: Room 613, 385 Gangseo-ro, Gangseo-gu, Seoul, Republic of Korea",
      "Байланыс: +82-10-4772-1075 (халықаралық) · 070-7500-7795 (ішкі)",
      "Электрондық пошта: admin@healwith.co.kr",
      "Жұмыс уақыты: Дс-Жм 09:00-18:00 KST (Корея Республикасының мемлекеттік мерекелерінен басқа)",
    ],
  },

  collection_items: {
    title: "3. Жиналатын дербес деректер",
    body: [
      "【Міндетті】",
      "· Аты-жөні, туған күні, жынысы, азаматтығы, паспорт нөмірі (виза және ауруханаға тіркеу үшін)",
      "· Байланыс деректері (электрондық пошта, телефон, мессенджер ID)",
      "· Тұрғылықты мекенжайы (болуды қолдау мақсатында)",
      "· Қамқоршы/еріп жүруші туралы мәліметтер (кәмелетке толмаған немесе егде пациенттер үшін)",
      "",
      "【Сезімтал деректер — жеке келісім】",
      "· Диагноз, ауру тарихы, ағымдағы белгілер, қабылданатын дәрі-дәрмектер",
      "· Медициналық анықтамалар, тексеру нәтижелері, суреттер (рентген, КТ, МРТ және т.б.)",
      "· Медициналық және туристік сақтандыру туралы мәліметтер",
      "· Мүгедектік туралы мәліметтер (қолжетімділікті қолдау үшін)",
      "",
      "【Автоматты түрде жиналатын】",
      "· IP-мекенжай, cookie файлдары, сессия журналдары, сервисті пайдалану жазбалары",
      "· Құрылғы туралы мәліметтер (ОЖ, браузер, моделі), шамамен геолокация (ел деңгейінде; дәл орналасу тек келісіммен)",
      "",
      "【Төлемге қатысты】",
      "· Төлем деректері төлем агенті (PG) арқылы өңделеді. Компания карта нөмірін толық сақтамайды.",
    ],
  },

  collection_purpose: {
    title: "4. Дербес деректерді жинау және пайдалану мақсаттары",
    body: [
      "a. Пайдаланушыны сәйкестендіру және жеке басын растау",
      "b. Медициналық мекемені таңдау, қабылдауға жазылу, виза мен болуды қолдау",
      "c. Пайдаланушының келісімі негізінде медициналық мекемелерге емдеу туралы ақпаратты беру",
      "d. Аударма, көлік және тұру қызметтері",
      "e. Төлемдерді өңдеу және түбіртектер немесе салық шот-фактураларын беру",
      "f. Шағымдар мен өтініштерді өңдеу, клиенттерді қолдау",
      "g. Сервис сапасын арттыру, статистикалық талдау, қауіпсіздік оқиғаларына әрекет ету",
      "h. Заңда белгіленген міндеттерді орындау",
    ],
  },

  sensitive_data: {
    title: "5. Сезімтал деректерді өңдеу (PIPA §23 / GDPR 9-бап)",
    body: [
      "healwith «денсаулыққа қатысты ақпаратты» өңдейді, ол PIPA §23 бойынша сезімтал деректерге және GDPR 9-бабы бойынша дербес деректердің ерекше санатына жатады. Мұндай деректер тек сіздің нақты, жеке келісіміңіз болған жағдайда ғана жиналады және пайдаланылады.",
      "Сезімтал деректер тек медициналық мекемені таңдау және тиісті көмекті үйлестіру мақсатында пайдаланылады және медициналық мекемелерге тек сіздің келісіміңіз шегінде беріледі.",
      "Сіз сезімтал деректерді өңдеуге келісім бермеуге құқылысыз; мұндай бас тарту медициналық таңдау қызметтерін пайдалану мүмкіндігін шектеуі мүмкін.",
    ],
  },

  retention: {
    title: "6. Сақтау және пайдалану мерзімі",
    body: [
      "Біз дербес деректерді жинау мақсатына қол жеткізілгеннен кейін кідіріссіз жоямыз, оларды заң бойынша сақтау талап етілетін жағдайлардан басқа.",
      "",
      "【Заң бойынша сақтау】",
      "· Шарт/бас тарту туралы жазбалар: 5 жыл (Электрондық саудадағы тұтынушылардың құқықтарын қорғау туралы заң §6)",
      "· Төлем және жеткізу жазбалары: 5 жыл",
      "· Тұтынушылардың шағымдары мен дауларды реттеу жазбалары: 3 жыл",
      "· Жүйеге кіру жазбалары: 3 ай (Байланыс құпиясын қорғау туралы заң §15-2)",
      "· Ауруханалар сақтайтын медициналық жазбалар: 10 жыл (Медициналық қызмет көрсету туралы заң §22). Ескерту: healwith медициналық жазбалардың көшірмелерін сақтамайды; түпнұсқаларды аурухана жүргізеді.",
      "",
      "【Мақсатына қарай сақтау】",
      "· Тіркелгі деректері: тіркелгі жабылғанға дейін (белсенді емес тіркелгілер 1 жылдан кейін архивке жіберіледі)",
      "· Сезімтал медициналық деректер: консьерж қызметі аяқталғаннан кейін бірден жойылады, пайдаланушының нақты сұрауы бойынша 3 жылға дейін сақталмаса",
      "· Маркетингке келісім деректері: келісім кері қайтарылғанға дейін",
    ],
  },

  third_party: {
    title: "7. Үшінші тұлғаларға беру",
    body: [
      "Сіздің келісіміңіз негізінде біз дербес деректерді келесі үшінші тұлғаларға береміз:",
      "",
      "【Медициналық мекемелер】",
      "· Алушылар: сіз таңдаған және келіскен Кореядағы ауруханалар мен клиникалар",
      "· Мақсаты: медициналық кеңес, қабылдауға жазылу, емдеуді жоспарлау",
      "· Деректер құрамы: аты-жөні, туған күні, байланыс деректері, паспорт нөмірі, диагноз, белгілер, медициналық жазбалар",
      "· Сақтау мерзімі: әр мекеменің заңда белгіленген міндеттеріне сәйкес (әдетте 10 жыл)",
      "",
      "【Виза агенттіктері】",
      "· Алушылар: серіктес виза агенттіктері (келісім болған жағдайда)",
      "· Деректер құрамы: паспорт көшірмесі, шақыру хаты, сапар кестесі",
      "· Мақсаты: медициналық виза рәсімдеу (C-3-3, G-1)",
      "",
      "【Сақтандыру компаниялары】",
      "· Алушылар: туристік/халықаралық сақтандыру серіктестері (келісім болған жағдайда)",
      "· Мақсаты: сақтандыру талаптарын беруге қолдау көрсету",
      "",
      "Сіз сервис шектеулерін ескере отырып, үшінші тұлғаларға беруден бас тартуға құқылысыз.",
    ],
  },

  cross_border: {
    title: "8. Деректерді шекарадан тыс беру (PIPA §28-8 / GDPR 44-49-баптар)",
    body: [
      "Біздің сервисіміздің сипатына байланысты — шетелдік пациенттерге Кореяда медициналық көмек алуға көмектесу — біз дербес деректерді сіздің тұрғылықты еліңізден Корея Республикасына береміз. Кейбір операциялық деректер басқа юрисдикцияларға да берілуі мүмкін.",
      "",
      "【Алушылар мен юрисдикциялар】",
      "· Кореядағы серіктес ауруханалар (медициналық мақсатта)",
      "· Бұлттық инфрақұрылым: Vercel Inc. (АҚШ), Supabase Inc. (АҚШ)",
      "· Аналитика: Google Ireland Ltd. (GA4, Ирландия)",
      "· Клиенттерді қолдау құралдары: [нақтылануы тиіс]",
      "",
      "【Мақсаттар мен деректер құрамы】",
      "· Ауруханалар: 7-бөлімдегідей",
      "· Бұлт/аналитика: тіркелгі деректері, журналдар, cookie идентификаторлары",
      "",
      "【Сақтау мерзімі】 Әр алушының саясаты мен шарттық талаптарына сәйкес.",
      "",
      "【Сіздің құқықтарыңыз】 Сіз беруден бас тартуға құқылысыз, бірақ беру сервис үшін қажет болғандықтан, бас тарту сервисті пайдалануды мүмкін емес етеді.",
      "",
      "【Қорғау шаралары】 Қолданылатын жағдайларда ЕО/ЕЭА-дан беру Стандартты шарттық ережелер (SCC) негізінде жүзеге асырылады. Кореяға және Кореядан беру үшін біз шарттық және техникалық қорғау шараларын қолданамыз.",
    ],
  },

  processors: {
    title: "9. Дербес деректерді өңдеуді тапсыру (PIPA §26)",
    body: [
      "Біз дербес деректерді өңдеуді шарт негізінде келесі өңдеушілерге тапсырамыз:",
      "",
      "· Supabase Inc. — дерекқорды хостинг (АҚШ)",
      "· Vercel Inc. — веб-қосымшаны хостинг (АҚШ)",
      "· Google LLC — аутентификация (OAuth), аналитика, карталар (АҚШ/Ирландия)",
      "· [Төлем агенті — нақтылануы тиіс] — төлемдерді өңдеу",
      "· [Хабарлама жіберу сервисі — нақтылануы тиіс] — электрондық пошта жіберу",
      "· [ЖИ аудармасы — нақтылануы тиіс] — аударма (пайдаланушының келісімімен)",
      "",
      "Шарттар өңдеушілерден деректерді қорғау міндеттерін, мәлімделген мақсаттардан тыс пайдалануға тыйым салуды, сондай-ақ техникалық және ұйымдастырушылық қорғау шараларын сақтауды талап етеді. Біз өңдеушілерді тұрақты түрде бақылаймыз.",
    ],
  },

  user_rights: {
    title: "10. Дербес деректер субъектісінің құқықтары",
    body: [
      "Сіз келесі құқықтарды жүзеге асыра аласыз:",
      "· Деректеріңізге қол жеткізу (PIPA §35 / GDPR 15-бап)",
      "· Түзету және жою (PIPA §36 / GDPR 16-17-баптар)",
      "· Өңдеуді шектеу (GDPR 18-бап)",
      "· Келісімді кері қайтару (PIPA §37)",
      "· Деректердің тасымалдануы (GDPR 20-бап)",
      "· Автоматтандырылған шешім қабылдауға қарсылық білдіру (PIPA §37-2 / GDPR 22-бап)",
      "· Залалды өтеу құқығы (PIPA §39)",
      "",
      "Осы құқықтарды жүзеге асыру үшін admin@healwith.co.kr мекенжайына немесе біздің деректерді қорғау жөніндегі жауаптыға (14-бөлім) хабарласыңыз. Біз 10 жұмыс күні ішінде жауап береміз.",
      "",
      "Сіз қадағалаушы органға шағым бере аласыз:",
      "· Корея: Дербес деректерді қорғау комиссиясы (182, www.pipc.go.kr)",
      "· ЕО/ЕЭА: еліңіздің ұлттық деректерді қорғау органы",
      "· Қазақстан: Ақпараттық қауіпсіздік комитеті",
    ],
  },

  children: {
    title: "11. 14 жасқа толмаған балалардың дербес деректері (PIPA §22-2)",
    body: [
      "healwith кәмелетке толмаған пациенттерге (мысалы, балалардағы онкология) қатысты консьерж сұрауларын алуы мүмкін. Мұндай жағдайларда біз заңды өкілдің (ата-ананың/қамқоршының) расталған келісімін талап етеміз.",
      "Заңды өкілдер кез келген уақытта кәмелетке толмағанның дербес деректеріне қол жеткізуді, түзетуді, жоюды немесе өңдеуді тоқтатуды талап ете алады. Біз кідіріссіз әрекет етеміз.",
    ],
  },

  security: {
    title: "12. Дербес деректердің қауіпсіздігін қамтамасыз ету шаралары",
    body: [
      "Біз келесі қорғау шараларын қолданамыз:",
      "· Ұйымдастырушылық: деректерді қорғау жөніндегі жауаптыны тағайындау, мерзімді оқыту, қол жеткізу құқықтарын барынша азайту",
      "· Техникалық: шифрлау (беру кезінде TLS 1.3, сақтау кезінде AES-256), енуден қорғау жүйелері, қауіпсіздік жаңартуларын басқару",
      "· Физикалық: деректерді өңдеу аймақтарына кіруді бақылау",
      "· Оқиғаларға әрекет ету: дерек ағуы болған жағдайда 72 сағат ішінде қадағалаушы органдар мен дерек субъектілерін хабардар ету",
    ],
  },

  cookies: {
    title: "13. Cookie файлдарын пайдалану",
    body: [
      "Біз cookie файлдарын сессияны сақтау, тіл баптаулары, қауіпсіздік және аналитика үшін пайдаланамыз.",
      "Сіз браузер баптаулары арқылы cookie файлдарын өшіре аласыз. Толығырақ біздің Cookie саясатынан қараңыз.",
    ],
  },

  dpo: {
    title: "14. Дербес деректерді қорғау жөніндегі жауапты тұлға (DPO / CPO)",
    body: [
      "Аты-жөні: JUYOUNG KANG",
      "Лауазымы: өкіл (қоса атқарушы — Корея Республикасының PIPA §31 және GDPR 37-бабына сәйкес)",
      "Электрондық пошта: admin@healwith.co.kr",
      "Телефон: +82-10-4772-1075 (халықаралық) · 070-7500-7795 (ішкі)",
      "",
      "Сіз дербес деректерге қатысты кез келген сұрақ, шағым немесе құқықты қорғау туралы талаппен деректерді қорғау жөніндегі жауаптыға тікелей хабарласа аласыз. Біз 10 жұмыс күні ішінде жауап береміз.",
    ],
  },

  jurisdiction_kz: {
    title: "15. Қазақстан тұрғындарына арналған қосымша хабарлама",
    body: [
      "Осы бөлім Қазақстан Республикасының «Дербес деректер және оларды қорғау туралы» заңында (№ 94-V ЗРК, 2013, 2015 жылғы өзгерістермен) талап етілетін қосымша мәліметтерді қамтиды.",
      "",
      "· Сақтау/локализация: біздің сервисіміздің сипатына байланысты сіздің дербес деректеріңіз Корея Республикасына және ықтимал басқа юрисдикцияларға беріледі. Сіз мұндай шекарадан тыс сақтау мен беруге нақты келісім бересіз.",
      "· Сезімтал (медициналық) деректер: келісім жазбаша түрде немесе электрондық қолтаңба арқылы тексерілуі мүмкін тәсілмен жиналады.",
      "· Қадағалаушы орган: Ақпараттық қауіпсіздік комитеті.",
      "· Шағымдар: байланыс деректері 19-бөлімде келтірілген, немесе тұрғылықты жеріңіздегі соттарға жүгіну.",
    ],
  },

  jurisdiction_eu: {
    title: "16. ЕО/ЕЭА тұрғындарына арналған қосымша хабарлама (GDPR)",
    body: [
      "GDPR қолданылатын жағдайда келесі құқықтар кепілдендіріледі:",
      "· Қол жеткізу құқығы (15-бап), түзету (16-бап), жою (17-бап), шектеу (18-бап), тасымалдау (20-бап), қарсылық білдіру (21-бап) және автоматтандырылған шешім қабылдауға қатысты (22-бап).",
      "· Ерекше санаттағы деректер (денсаулық туралы, 9-бап) тек нақты келісім негізінде өңделеді.",
      "· Шекарадан тыс беру (44-49-баптар) қолданылатын жағдайларда Стандартты шарттық ережелер негізінде жүзеге асырылады.",
      "· Сіз еліңіздің ұлттық деректерді қорғау органына шағым бере аласыз.",
      "· ЕО-дағы өкіл: [ЕО нарығына бағдарланған жағдайда 27-бапқа сәйкес тағайындалуы тиіс]",
    ],
  },

  jurisdiction_ru: {
    title: "17. Ресей тұрғындарына арналған қосымша хабарлама",
    body: [
      "Ресей Федерациясының 152-ФЗ Федералдық заңы Ресей азаматтарының дербес деректерін бастапқы жинау Ресей Федерациясының аумағында жүзеге асырылуын талап етеді.",
      "healwith осы талаптың сақталу тәртібін жеке бағалап жатыр. Сервисті пайдалану арқылы Ресей тұрғындары осы шарттарды растайды және оларға нақты келісім береді.",
      "Қадағалаушы орган: Роскомнадзор.",
    ],
  },

  changes: {
    title: "18. Осы Саясатқа өзгерістер енгізу",
    body: [
      "Елеулі өзгерістер туралы біз сервис хабарландырулары арқылы және электрондық пошта арқылы күшіне енуден кемінде 7 күн бұрын (қолайсыз өзгерістер жағдайында 30 күн бұрын) хабарлаймыз.",
      "Ағымдағы нұсқа: 2.0.0 (2026-04-20 күшіне енген).",
    ],
  },

  contact: {
    title: "19. Байланыс",
    body: [
      "Дербес деректерді қорғау және жалпы сұрақтар: admin@healwith.co.kr",
      "Мекенжайы: Room 613, 385 Gangseo-ro, Gangseo-gu, Seoul, Republic of Korea",
      "Телефон: +82-10-4772-1075 (халықаралық) · 070-7500-7795 (ішкі)",
      "Жұмыс уақыты: Дс-Жм 09:00-18:00 KST",
    ],
  },
};

/**
 * 중국어 (ZH) / 일본어 (JA) - 동일하게 번역 대기
 */
const ZH = {
  pageTitle: "隐私政策",
  lastUpdated: "最后更新",
  version: "版本",
  tableOfContents: "目录",

  introduction: {
    title: "1. 总则",
    body: [
      "BONROI（以下简称“我们”或“公司”）运营医疗管家平台 healwith，协助国际患者在大韩民国获得医疗服务。healwith 并非医疗机构，不直接提供诊断或治疗服务。",
      "本政策主要受大韩民国《个人信息保护法》（PIPA）、《医疗法》以及《关于支持医疗海外拓展及吸引外国患者的法律》管辖。在适用情形下，本政策亦遵循您居住国法律的相关要求（例如欧盟《通用数据保护条例》（GDPR）、哈萨克斯坦第94-V ЗРК号法律、俄罗斯联邦第152-ФЗ号法律等）。针对各司法管辖区的具体告知载于下文专门章节。",
      "无论用户的国籍或居住地为何，我们均审慎对待所有用户的个人信息，并依照适用法律予以安全处理。",
    ],
  },

  controller: {
    title: "2. 个人信息处理者信息",
    body: [
      "商号：BONROI（服务名称：healwith）",
      "经营形态：个人经营者",
      "代表人：JUYOUNG KANG",
      "营业执照号：463-35-00902",
      "外国患者招揽机构登记号：A-2026-01-02-06761（有效期 2026-03-11 ~ 2029-03-10，由首尔特别市市长登记）",
      "注册地址：Room 613, 385 Gangseo-ro, Gangseo-gu, Seoul, Republic of Korea",
      "联系方式：+82-10-4772-1075（国际）· 070-7500-7795（韩国境内）",
      "电子邮箱：admin@healwith.co.kr",
      "营业时间：周一至周五 09:00-18:00 KST（韩国法定节假日除外）",
    ],
  },

  collection_items: {
    title: "3. 收集的个人信息项目",
    body: [
      "【必填项目】",
      "· 姓名、出生日期、性别、国籍、护照号码（用于签证及医院登记）",
      "· 联系方式（电子邮箱、电话、即时通讯账号）",
      "· 居住地址（用于停留支持）",
      "· 监护人/陪同人信息（患者为未成年人或老年人时）",
      "",
      "【敏感信息 — 单独同意】",
      "· 诊断名称、治疗史、当前症状、服用药物",
      "· 诊断书、检查结果、影像资料（X 光、CT、MRI 等）",
      "· 医疗保险及旅行保险信息",
      "· 残疾情况（用于无障碍支持）",
      "",
      "【自动收集】",
      "· IP 地址、Cookie、会话日志、服务使用记录",
      "· 设备信息（操作系统、浏览器、型号）、大致地理位置（国家级别；精确位置仅在同意时收集）",
      "",
      "【支付相关】",
      "· 支付信息通过支付代理（PG）处理，公司不存储完整的卡号。",
    ],
  },

  collection_purpose: {
    title: "4. 个人信息的收集及使用目的",
    body: [
      "a. 用户识别及本人确认",
      "b. 医疗机构匹配、就诊预约、签证及停留支持",
      "c. 基于用户同意向医疗机构提供就诊相关信息",
      "d. 口译、交通、住宿等附加服务",
      "e. 支付处理及收据或税务发票的开具",
      "f. 投诉及咨询处理、客户支持",
      "g. 服务质量改进、统计分析、安全事件应对",
      "h. 履行法定义务",
    ],
  },

  sensitive_data: {
    title: "5. 敏感信息的处理（PIPA §23 / GDPR 第9条）",
    body: [
      "healwith 处理“与健康有关的信息”，该等信息依据 PIPA §23 构成敏感信息，并依据 GDPR 第9条构成特殊类别个人数据。该等数据仅在获得您明确的单独同意后方予收集和使用。",
      "敏感信息仅用于医疗机构匹配及适当的诊疗协调，并仅在您同意的范围内提供给医疗机构。",
      "您有权拒绝同意敏感信息的处理；如不同意，可能会限制您使用医疗匹配服务。",
    ],
  },

  retention: {
    title: "6. 个人信息的保存及使用期限",
    body: [
      "在收集目的达成后，我们将立即删除个人信息，但法律要求保存的情形除外。",
      "",
      "【依法定保存】",
      "· 合同/撤回记录：5 年（《电子商务消费者保护法》§6）",
      "· 支付及货物供应记录：5 年",
      "· 消费者投诉及纠纷处理记录：3 年",
      "· 登录记录：3 个月（《通信秘密保护法》§15-2）",
      "· 医院保存的诊疗记录：10 年（《医疗法》§22）。注：healwith 不保存诊疗记录的副本，原件由医院管理。",
      "",
      "【按服务目的保存】",
      "· 账户信息：至账户注销为止（长期未使用的账户于 1 年后分离保存）",
      "· 敏感健康信息：管家服务完成后立即删除，除非应用户的明确请求最长保存 3 年",
      "· 营销同意信息：至撤回同意为止",
    ],
  },

  third_party: {
    title: "7. 个人信息向第三方提供",
    body: [
      "基于您的同意，我们向以下第三方提供个人信息：",
      "",
      "【医疗机构】",
      "· 提供对象：经您选择并同意的韩国境内医院及诊所",
      "· 目的：诊疗咨询、预约、治疗方案制定",
      "· 提供项目：姓名、出生日期、联系方式、护照号码、诊断名称、症状、医疗记录",
      "· 保存期限：依各机构在医疗法下的保存义务（通常为 10 年）",
      "",
      "【签证代办机构】",
      "· 提供对象：合作签证代办机构（经同意）",
      "· 提供项目：护照复印件、邀请函、出行日程",
      "· 目的：医疗签证（C-3-3、G-1）申请代办",
      "",
      "【保险公司】",
      "· 提供对象：旅行/国际保险合作伙伴（经同意）",
      "· 目的：理赔支持",
      "",
      "您有权拒绝向第三方提供信息，但相应服务可能因此受限。",
    ],
  },

  cross_border: {
    title: "8. 个人信息的跨境转移（PIPA §28-8 / GDPR 第44-49条）",
    body: [
      "鉴于本服务的性质——协助海外患者在韩国获得医疗服务——我们将个人信息从您的居住国转移至大韩民国。部分运营数据亦可能转移至其他司法管辖区。",
      "",
      "【接收方及司法管辖区】",
      "· 韩国合作医院（用于医疗目的）",
      "· 云基础设施：Vercel Inc.（美国）、Supabase Inc.（美国）",
      "· 分析服务：Google Ireland Ltd.（GA4，爱尔兰）",
      "· 客户支持工具：[确定后填写]",
      "",
      "【目的及项目】",
      "· 医院：与第7条相同",
      "· 云/分析：账户信息、日志、Cookie 标识符",
      "",
      "【保存期限】 依各接收方的政策及合同条款。",
      "",
      "【您的权利】 您有权拒绝转移，但由于转移对本服务而言不可或缺，拒绝将导致无法使用本服务。",
      "",
      "【安全措施】 在适用情形下，自欧盟/欧洲经济区的转移依据标准合同条款（SCC）进行。对于向韩国及自韩国的转移，我们采取合同及技术安全措施。",
    ],
  },

  processors: {
    title: "9. 个人信息处理的委托（PIPA §26）",
    body: [
      "我们依合同将个人信息处理业务委托给以下处理者：",
      "",
      "· Supabase Inc. — 数据库托管（美国）",
      "· Vercel Inc. — 网络应用托管（美国）",
      "· Google LLC — 身份验证（OAuth）、分析、地图（美国/爱尔兰）",
      "· [支付代理 — 待定] — 支付处理",
      "· [邮件发送服务 — 待定] — 电子邮件发送",
      "· [AI 翻译 — 待定] — 翻译（经用户同意）",
      "",
      "合同要求处理者遵守个人信息保护义务、禁止超出既定目的使用，并采取技术及管理保护措施。我们定期对处理者进行监督。",
    ],
  },

  user_rights: {
    title: "10. 信息主体的权利",
    body: [
      "您可以行使以下权利：",
      "· 访问您的数据（PIPA §35 / GDPR 第15条）",
      "· 更正及删除（PIPA §36 / GDPR 第16-17条）",
      "· 限制处理（GDPR 第18条）",
      "· 撤回同意（PIPA §37）",
      "· 数据可携权（GDPR 第20条）",
      "· 反对自动化决策（PIPA §37-2 / GDPR 第22条）",
      "· 损害赔偿请求权（PIPA §39）",
      "",
      "如需行使上述权利，请联系 admin@healwith.co.kr 或我们的个人信息保护负责人（第14条）。我们将在 10 个工作日内予以处理。",
      "",
      "您可向监管机构提出投诉：",
      "· 韩国：个人信息保护委员会（182，www.pipc.go.kr）",
      "· 欧盟/欧洲经济区：您所在国的数据保护机构",
      "· 哈萨克斯坦：信息安全委员会",
    ],
  },

  children: {
    title: "11. 未满 14 周岁儿童的个人信息（PIPA §22-2）",
    body: [
      "healwith 可能收到涉及未成年患者（如儿童肿瘤）的管家请求。在此类情形下，我们要求核实法定代理人（父母/监护人）的同意。",
      "法定代理人可随时要求查阅、更正、删除或停止处理未成年人的个人信息，我们将立即予以响应。",
    ],
  },

  security: {
    title: "12. 个人信息的安全保障措施",
    body: [
      "我们实施以下保护措施：",
      "· 管理方面：指定个人信息保护负责人、定期培训、最小化访问权限",
      "· 技术方面：加密（传输采用 TLS 1.3，存储采用 AES-256）、入侵防御系统、安全补丁管理",
      "· 物理方面：数据处理区域的出入控制",
      "· 事件应对：发生泄露时，于 72 小时内通知监管机构及信息主体",
    ],
  },

  cookies: {
    title: "13. Cookie 的使用",
    body: [
      "我们使用 Cookie 用于保持会话、语言设置、安全及使用分析。",
      "您可通过浏览器设置拒绝 Cookie。详情请参阅我们的《Cookie 政策》。",
    ],
  },

  dpo: {
    title: "14. 个人信息保护负责人（DPO / CPO）",
    body: [
      "姓名：JUYOUNG KANG",
      "职务：代表人（兼任 — 依据韩国 PIPA §31 及 GDPR 第37条）",
      "电子邮箱：admin@healwith.co.kr",
      "电话：+82-10-4772-1075（国际）· 070-7500-7795（韩国境内）",
      "",
      "您可就个人信息相关的咨询、投诉或权利救济请求直接联系个人信息保护负责人。我们将在 10 个工作日内予以答复。",
    ],
  },

  jurisdiction_kz: {
    title: "15. 致哈萨克斯坦居民的补充告知",
    body: [
      "本节提供哈萨克斯坦《个人数据及其保护法》（第94-V号，2013年，经2015年修订）所要求的补充披露。",
      "",
      "· 存储/本地化：鉴于本服务的性质，您的个人数据将被转移至大韩民国，并可能转移至其他司法管辖区。您对该等跨境存储及转移作出明确同意。",
      "· 敏感（医疗）数据：以可通过书面或电子签名核实的方式收集同意。",
      "· 监管机构：信息安全委员会（Комитет по информационной безопасности）。",
      "· 投诉：联系方式见第19条，或向您居住地的法院提起诉讼。",
    ],
  },

  jurisdiction_eu: {
    title: "16. 致欧盟/欧洲经济区居民的补充告知（GDPR）",
    body: [
      "在适用 GDPR 的情形下，保障以下权利：",
      "· 访问权（第15条）、更正权（第16条）、删除权（第17条）、限制权（第18条）、可携权（第20条）、反对权（第21条）及关于自动化决策的权利（第22条）。",
      "· 特殊类别数据（健康，第9条）仅基于明确同意进行处理。",
      "· 跨境转移（第44-49条）在适用情形下依据标准合同条款进行。",
      "· 您可向您所在国的数据保护机构提出投诉。",
      "· 欧盟代表：[如面向欧盟市场，将依据第27条指定]",
    ],
  },

  jurisdiction_ru: {
    title: "17. 致俄罗斯居民的补充告知",
    body: [
      "俄罗斯联邦第152-ФЗ号法律要求俄罗斯公民个人数据的初始收集应在俄罗斯境内进行。",
      "healwith 正在另行评估对该要求的合规方案。通过使用本服务，俄罗斯居民确认并明确同意上述条款。",
      "监管机构：Roskomnadzor（Роскомнадзор）。",
    ],
  },

  changes: {
    title: "18. 本政策的变更",
    body: [
      "重大变更将于生效至少 7 日前（不利变更则为 30 日前）通过服务公告及电子邮件予以通知。",
      "当前版本：2.0.0（生效日 2026-04-20）。",
    ],
  },

  contact: {
    title: "19. 联系方式",
    body: [
      "个人信息及一般咨询：admin@healwith.co.kr",
      "地址：Room 613, 385 Gangseo-ro, Gangseo-gu, Seoul, Republic of Korea",
      "电话：+82-10-4772-1075（国际）· 070-7500-7795（韩国境内）",
      "营业时间：周一至周五 09:00-18:00 KST",
    ],
  },
};

const JA = {
  pageTitle: "プライバシーポリシー",
  lastUpdated: "最終更新",
  version: "バージョン",
  tableOfContents: "目次",

  introduction: {
    title: "1. 総則",
    body: [
      "BONROI（以下「当社」といいます）は、外国人患者の大韓民国における医療機関の利用を支援するメディカルコンシェルジュサービス「healwith」を運営しています。healwith は医療機関ではなく、診断・治療を直接提供するものではありません。",
      "本ポリシーは、主として大韓民国「個人情報保護法」（PIPA）、「医療法」および「医療の海外進出および外国人患者誘致支援に関する法律」に準拠します。該当する場合には、利用者の居住国の法令（例：EU 一般データ保護規則（GDPR）、カザフスタン第94-V ЗРК号法、ロシア連邦第152-ФЗ号法など）の関連要件も反映します。各管轄区域に固有の告知は、以下の個別の条項に記載します。",
      "当社は、国籍・居住地を問わず、すべての利用者の個人情報を大切に取り扱い、関連法令を遵守して安全に処理します。",
    ],
  },

  controller: {
    title: "2. 個人情報取扱事業者の情報",
    body: [
      "商号：BONROI（サービス名：healwith）",
      "事業形態：個人事業主",
      "代表者：JUYOUNG KANG",
      "事業者登録番号：463-35-00902",
      "外国人患者誘致事業者登録番号：A-2026-01-02-06761（有効期間 2026-03-11 ～ 2029-03-10、ソウル特別市長登録）",
      "所在地：Room 613, 385 Gangseo-ro, Gangseo-gu, Seoul, Republic of Korea",
      "連絡先：+82-10-4772-1075（国際）· 070-7500-7795（韓国国内）",
      "メール：admin@healwith.co.kr",
      "営業時間：平日 09:00-18:00 KST（韓国の祝祭日を除く）",
    ],
  },

  collection_items: {
    title: "3. 収集する個人情報の項目",
    body: [
      "【必須項目】",
      "· 氏名、生年月日、性別、国籍、パスポート番号（ビザおよび病院登録用）",
      "· 連絡先（メール、電話番号、メッセンジャー ID）",
      "· 居住地住所（滞在支援のため）",
      "· 保護者・同伴者情報（患者が未成年者・高齢者の場合）",
      "",
      "【機微情報 — 個別同意】",
      "· 診断名、治療歴、現在の症状、服用中の薬剤",
      "· 診断書、検査結果、画像資料（X 線、CT、MRI など）",
      "· 健康保険・旅行保険情報",
      "· 障害の有無（アクセシビリティ支援のため）",
      "",
      "【自動収集】",
      "· IP アドレス、Cookie、セッションログ、サービス利用記録",
      "· 端末情報（OS、ブラウザ、機種）、おおよその位置情報（国単位。正確な位置情報は同意がある場合のみ）",
      "",
      "【決済関連】",
      "· 決済情報は決済代行会社（PG）を通じて処理され、当社はカード番号の全体を保存しません。",
    ],
  },

  collection_purpose: {
    title: "4. 個人情報の収集および利用目的",
    body: [
      "a. 利用者の識別および本人確認",
      "b. 医療機関のマッチング、診療予約、ビザおよび滞在支援",
      "c. 利用者の同意に基づく医療機関への診療関連情報の提供",
      "d. 通訳・移動・宿泊などの付帯サービスの提供",
      "e. 決済処理および領収書・税務インボイスの発行",
      "f. 苦情・相談対応、カスタマーサポート",
      "g. サービス品質の改善、統計分析、セキュリティインシデント対応",
      "h. 法令上の義務の履行",
    ],
  },

  sensitive_data: {
    title: "5. 機微情報の処理（PIPA §23 / GDPR 第9条）",
    body: [
      "healwith は「健康に関する情報」を処理します。これは PIPA §23 に基づく機微情報に該当し、GDPR 第9条に基づく特別な種類の個人データに該当します。当該データは、利用者の明示的な個別同意がある場合に限り、収集・利用します。",
      "機微情報は、医療機関のマッチングおよび適切な診療調整の目的に限定して利用され、利用者が同意した範囲内でのみ医療機関に提供されます。",
      "利用者は、機微情報の処理に同意しない権利を有しますが、同意しない場合、医療マッチングサービスの利用が制限されることがあります。",
    ],
  },

  retention: {
    title: "6. 個人情報の保管および利用期間",
    body: [
      "当社は、収集目的を達成した個人情報を遅滞なく削除します。ただし、法令により保管が義務付けられている場合を除きます。",
      "",
      "【関係法令に基づく保管】",
      "· 契約・申込撤回の記録：5 年（電子商取引消費者保護法 §6）",
      "· 代金決済および財貨供給の記録：5 年",
      "· 消費者の苦情および紛争処理の記録：3 年",
      "· ログイン記録：3 か月（通信秘密保護法 §15-2）",
      "· 病院が保有する診療記録：10 年（医療法 §22）。※ healwith は診療記録の写しを保有せず、原本は医療機関が管理します。",
      "",
      "【サービス目的別の保管】",
      "· アカウント情報：退会まで（長期未利用の場合は 1 年経過後に分離保管）",
      "· 機微（健康）情報：コンシェルジュサービス完了後ただちに削除。ただし、利用者の明示的な請求により最長 3 年保管する場合があります。",
      "· マーケティング同意情報：同意撤回まで",
    ],
  },

  third_party: {
    title: "7. 個人情報の第三者提供",
    body: [
      "当社は、利用者の同意に基づき、以下の第三者に個人情報を提供します。",
      "",
      "【医療機関】",
      "· 提供先：利用者が選択・同意した韓国国内の病院・クリニック",
      "· 目的：診療相談、予約、治療計画の策定",
      "· 提供項目：氏名、生年月日、連絡先、パスポート番号、診断名、症状、医療記録",
      "· 保管期間：各機関の医療法上の保管義務に従う（通常 10 年）",
      "",
      "【ビザ代行機関】",
      "· 提供先：提携ビザ代行機関（同意がある場合）",
      "· 提供項目：パスポートの写し、招請理由書、入国日程",
      "· 目的：医療ビザ（C-3-3、G-1）申請の代行",
      "",
      "【保険会社】",
      "· 提供先：旅行・国際保険の提携先（同意がある場合）",
      "· 目的：保険金請求の支援",
      "",
      "利用者は第三者提供に同意しない権利を有しますが、その場合、該当サービスの利用が制限されることがあります。",
    ],
  },

  cross_border: {
    title: "8. 個人情報の国外移転（PIPA §28-8 / GDPR 第44-49条）",
    body: [
      "当社のサービスの性質上 — 外国人患者の韓国医療機関の利用を支援するため — 当社は利用者の居住国から大韓民国へ個人情報を移転します。また、運営上、一部のデータを他の管轄区域へ移転することがあります。",
      "",
      "【移転先および国・地域】",
      "· 韓国国内の提携病院（医療目的）",
      "· クラウドインフラ：Vercel Inc.（米国）、Supabase Inc.（米国）",
      "· 分析サービス：Google Ireland Ltd.（GA4、アイルランド）",
      "· カスタマーサポートツール：[確定後に記載]",
      "",
      "【目的および項目】",
      "· 病院：第7条と同じ",
      "· クラウド・分析：アカウント情報、ログ、Cookie 識別子",
      "",
      "【保管期間】 各移転先のポリシーおよび契約条件に従う。",
      "",
      "【利用者の権利】 利用者は移転に同意しない権利を有しますが、移転はサービスに不可欠であるため、同意しない場合はサービスを利用できません。",
      "",
      "【安全措置】 該当する場合、EU/EEA からの移転は標準契約条項（SCC）に基づいて行われます。韓国への移転および韓国からの移転については、契約上および技術上の安全措置を講じます。",
    ],
  },

  processors: {
    title: "9. 個人情報の処理委託（PIPA §26）",
    body: [
      "当社は、サービス運営のため、以下の受託者に契約に基づき個人情報の処理を委託します。",
      "",
      "· Supabase Inc. — データベースホスティング（米国）",
      "· Vercel Inc. — ウェブアプリケーションホスティング（米国）",
      "· Google LLC — 認証（OAuth）、分析、地図（米国/アイルランド）",
      "· [決済代行会社 — 未定] — 決済処理",
      "· [メール送信サービス — 未定] — メール送信",
      "· [AI 翻訳 — 未定] — 翻訳（利用者の同意がある場合）",
      "",
      "契約により、受託者は個人情報保護義務、目的外利用の禁止、ならびに技術的・管理的保護措置を遵守し、当社は定期的にこれを監督します。",
    ],
  },

  user_rights: {
    title: "10. 情報主体の権利",
    body: [
      "利用者は、以下の権利を行使することができます。",
      "· データへのアクセス（PIPA §35 / GDPR 第15条）",
      "· 訂正および削除（PIPA §36 / GDPR 第16-17条）",
      "· 処理の制限（GDPR 第18条）",
      "· 同意の撤回（PIPA §37）",
      "· データポータビリティ（GDPR 第20条）",
      "· 自動化された意思決定への異議（PIPA §37-2 / GDPR 第22条）",
      "· 損害賠償請求権（PIPA §39）",
      "",
      "これらの権利を行使するには、admin@healwith.co.kr または当社の個人情報保護責任者（第14条）にご連絡ください。当社は 10 営業日以内に対応します。",
      "",
      "利用者は、監督機関に苦情を申し立てることができます。",
      "· 韓国：個人情報保護委員会（182、www.pipc.go.kr）",
      "· EU/EEA：居住国のデータ保護機関",
      "· カザフスタン：情報セキュリティ委員会",
    ],
  },

  children: {
    title: "11. 満14歳未満の児童の個人情報（PIPA §22-2）",
    body: [
      "healwith は、未成年患者（小児がん等）に関するコンシェルジュの依頼を受けることがあります。その場合、法定代理人（親権者・保護者）の同意を確認します。",
      "法定代理人は、いつでも未成年者の個人情報の閲覧、訂正、削除、処理停止を請求することができ、当社は遅滞なく対応します。",
    ],
  },

  security: {
    title: "12. 個人情報の安全性確保措置",
    body: [
      "当社は、以下の保護措置を実施します。",
      "· 管理的措置：個人情報保護責任者の指定、定期的な教育、アクセス権限の最小化",
      "· 技術的措置：暗号化（通信時 TLS 1.3、保存時 AES-256）、侵入防止システム、セキュリティパッチ管理",
      "· 物理的措置：データ処理区域への入退室管理",
      "· インシデント対応：漏えい発生時、72 時間以内に監督機関および情報主体へ通知",
    ],
  },

  cookies: {
    title: "13. Cookie の使用",
    body: [
      "当社は、セッションの維持、言語設定、セキュリティおよび利用分析のために Cookie を使用します。",
      "利用者はブラウザの設定により Cookie を拒否することができます。詳細は別途の「Cookie ポリシー」をご参照ください。",
    ],
  },

  dpo: {
    title: "14. 個人情報保護責任者（DPO / CPO）",
    body: [
      "氏名：JUYOUNG KANG",
      "役職：代表（兼任 — 韓国 PIPA §31 および GDPR 第37条に基づく）",
      "メール：admin@healwith.co.kr",
      "電話：+82-10-4772-1075（国際）· 070-7500-7795（韓国国内）",
      "",
      "利用者は、個人情報に関する問い合わせ、苦情、または救済の請求について、個人情報保護責任者に直接ご連絡いただけます。当社は 10 営業日以内に回答します。",
    ],
  },

  jurisdiction_kz: {
    title: "15. カザフスタン居住者向けの追加告知",
    body: [
      "本条は、カザフスタン共和国「個人データおよびその保護に関する法律」（第94-V号、2013年、2015年改正）が要求する追加の開示事項を提供します。",
      "",
      "· 保存・ローカライゼーション：当社のサービスの性質上、利用者の個人データは大韓民国へ、また場合により他の管轄区域へ移転されます。利用者は、かかる国外保存および移転について明示的に同意します。",
      "· 機微（医療）データ：同意は、書面または電子署名により確認可能な方法で取得します。",
      "· 監督機関：情報セキュリティ委員会（Комитет по информационной безопасности）。",
      "· 苦情：連絡先は第19条に記載のとおり、または居住地の裁判所への提訴。",
    ],
  },

  jurisdiction_eu: {
    title: "16. EU/EEA 居住者向けの追加告知（GDPR）",
    body: [
      "GDPR が適用される場合、以下の権利が保障されます。",
      "· アクセス権（第15条）、訂正権（第16条）、削除権（第17条）、制限権（第18条）、ポータビリティ権（第20条）、異議権（第21条）、および自動化された意思決定に関する権利（第22条）。",
      "· 特別な種類のデータ（健康、第9条）は、明示的な同意に基づいてのみ処理されます。",
      "· 国外移転（第44-49条）は、該当する場合、標準契約条項に基づいて行われます。",
      "· 利用者は居住国のデータ保護機関に苦情を申し立てることができます。",
      "· EU 代理人：[EU 市場を対象とする場合、第27条に基づき指定]",
    ],
  },

  jurisdiction_ru: {
    title: "17. ロシア居住者向けの追加告知",
    body: [
      "ロシア連邦第152-ФЗ号法は、ロシア国民の個人データの初回収集をロシア領域内で行うことを求めています。",
      "healwith は、本要件の遵守方法について別途検討中です。本サービスを利用することにより、ロシア居住者は本条項を確認し、明示的に同意するものとします。",
      "監督機関：Roskomnadzor（Роскомнадзор）。",
    ],
  },

  changes: {
    title: "18. 本ポリシーの変更",
    body: [
      "重要な変更は、施行の少なくとも 7 日前（不利な変更の場合は 30 日前）に、サービス内のお知らせおよびメールにより通知します。",
      "現在のバージョン：2.0.0（施行日 2026-04-20）。",
    ],
  },

  contact: {
    title: "19. 連絡先",
    body: [
      "個人情報・一般のお問い合わせ：admin@healwith.co.kr",
      "住所：Room 613, 385 Gangseo-ro, Gangseo-gu, Seoul, Republic of Korea",
      "電話：+82-10-4772-1075（国際）· 070-7500-7795（韓国国内）",
      "営業時間：平日 09:00-18:00 KST",
    ],
  },
};

const LANGUAGES = { ko: KO, en: EN, ru: RU, kz: KZ, zh: ZH, ja: JA };

export function getPrivacyPolicy(lang = "en") {
  const source = LANGUAGES[lang] || EN;
  if (source.__translationPending) {
    // 번역 대기 언어의 경우 영어로 fallback하되 UI에 고지
    return { ...EN, _translationPending: true, _labels: { pageTitle: source.pageTitle, lastUpdated: source.lastUpdated, version: source.version } };
  }
  return source;
}

export function getPrivacySectionsList(lang = "en") {
  const p = getPrivacyPolicy(lang);
  // __translationPending 으로 fallback 된 경우 대비
  const actual = p._translationPending ? EN : p;
  return SECTIONS_STRUCTURE
    .filter((s) => actual[s.id])
    .map((s) => ({ id: s.id, ...actual[s.id] }));
}

export { SECTIONS_STRUCTURE };
