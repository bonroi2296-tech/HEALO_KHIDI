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
      "이메일: roiimmunelab@immunelab.co.kr",
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
      "이메일: roiimmunelab@immunelab.co.kr",
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
      "개인정보·일반 문의: roiimmunelab@immunelab.co.kr",
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
      "Email: roiimmunelab@immunelab.co.kr",
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
      "Email: roiimmunelab@immunelab.co.kr",
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
      "Privacy and general inquiries: roiimmunelab@immunelab.co.kr",
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
  // 전체 러시아어 번역은 전문 번역가 의뢰 필요 — 임시로 영어 버전과 동일한 구조로 핵심 조항만 제공
  // TODO: 러시아어 법률 번역 의뢰
  __translationPending: true,
  sections: EN,
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
  __translationPending: true,
  sections: EN,
};

/**
 * 중국어 (ZH) / 일본어 (JA) - 동일하게 번역 대기
 */
const ZH = {
  pageTitle: "隐私政策",
  lastUpdated: "最后更新",
  version: "版本",
  tableOfContents: "目录",
  __translationPending: true,
  sections: EN,
};

const JA = {
  pageTitle: "プライバシーポリシー",
  lastUpdated: "最終更新",
  version: "バージョン",
  tableOfContents: "目次",
  __translationPending: true,
  sections: EN,
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
