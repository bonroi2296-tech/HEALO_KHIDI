/**
 * healwith 이용약관 (Terms of Service)
 *
 * 법적 근거:
 * - 대한민국 전자상거래법, 약관규제법
 * - 의료법, 의료 해외진출 및 외국인환자 유치 지원에 관한 법률
 * - 소비자기본법
 *
 * 📌 확정 기준: 1인 운영이라 외부 자문이 없다. 관할·소비자 권리·환자 권익 조항에 판단이 필요하면
 * 「전문가 검토 필요」로 미루지 말고 법령 원문·동종 서비스를 실조사해 근거와 함께 여기에 적고 닫아라.
 */

export const TERMS_EFFECTIVE_DATE = "2026-08-14";
export const TERMS_VERSION = "2.1.0";

const KO = {
  pageTitle: "이용약관",
  lastUpdated: "시행일",
  version: "버전",

  sections: [
    {
      id: "purpose",
      title: "제1조 (목적)",
      body: [
        "본 약관은 본로이(BONROI, 이하 '회사')가 제공하는 메디컬 컨시어지 서비스 'healwith'(이하 '서비스')의 이용과 관련하여 회사와 이용자 간의 권리·의무·책임사항, 기타 필요한 사항을 정함을 목적으로 합니다.",
      ],
    },
    {
      id: "definitions",
      title: "제2조 (용어의 정의)",
      body: [
        "1. '서비스'란 회사가 제공하는 의료기관 매칭, 예약 지원, 비자·체류 지원, 통역, 여행 편의, 사후 관리 등을 포함한 외국인환자 유치 관련 제반 서비스를 의미합니다.",
        "2. '이용자'란 본 약관에 동의하고 서비스를 이용하는 자로서, 회원과 비회원을 포함합니다.",
        "3. '환자'란 서비스를 통해 의료기관의 진료를 받고자 하는 자 또는 그 보호자를 의미합니다.",
        "4. '의료기관'이란 회사와 제휴된 대한민국 내 병원·의원·전문의료기관을 의미합니다.",
        "5. '유치업 등록'이란 「의료 해외진출 및 외국인환자 유치 지원에 관한 법률」 제6조에 따른 보건복지부 등록을 의미합니다.",
      ],
    },
    {
      id: "nature_of_service",
      title: "제3조 (서비스의 성격)",
      body: [
        "1. 회사는 의료기관이 아니며 진단, 치료, 처방을 제공하지 않습니다.",
        "2. 회사는 외국인환자 유치업자로 등록된 주체로서, 이용자와 의료기관 간의 매칭·정보 전달·편의 지원 역할을 수행합니다.",
        "3. 의료 상담·진료·처치는 전적으로 해당 의료기관의 의료진 판단과 책임 하에 이루어지며, 회사는 그 결과에 대한 의료적 책임을 지지 않습니다.",
        "4. 서비스에서 제공되는 AI 기반 정보(증상 안내, 매칭 추천 등)는 참고 자료이며, 의학적 진단 또는 권고가 아닙니다. 실제 의료적 판단은 반드시 의료진에게 문의하시기 바랍니다.",
      ],
    },
    {
      id: "registration",
      title: "제4조 (서비스 이용신청 및 계약 성립)",
      body: [
        "1. 서비스 이용을 원하는 자는 회사가 정한 양식에 따라 필요한 정보를 기재하고 본 약관 및 개인정보처리방침에 동의함으로써 이용계약을 신청합니다.",
        "2. 만 14세 미만의 아동이 서비스를 이용하는 경우, 법정대리인의 동의를 반드시 확인합니다. 보호자 동반 원칙이 적용되는 치료의 경우 회사는 보호자 정보를 별도 확인합니다.",
        "3. 회사는 다음 각 호에 해당하는 경우 이용신청을 거부할 수 있습니다.",
        "   가. 허위 정보 기재",
        "   나. 법령·공서양속 위반 목적의 이용",
        "   다. 기술적 제약으로 서비스 제공이 불가능한 경우",
      ],
    },
    {
      id: "treatment_fee_notice",
      title: "제5조 (진료비 등 사전 고지)",
      body: [
        "회사는 관계 법령에 따라 환자가 진료계약을 체결하기 전에 다음 사항을 서면(전자문서 포함)으로 이용자의 모국어 또는 영어로 고지합니다.",
        "",
        "1. 진료비 예상 금액 및 산정 근거",
        "2. 회사가 의료기관으로부터 받는 유치 수수료율 또는 금액",
        "3. 체류·통역 등 부대 비용",
        "4. 진료비 지급 방식 및 환불 조건",
        "5. 불만·분쟁 처리 절차 (의료분쟁조정중재원 안내 포함)",
        "",
        "위 사항은 견적서 형태로 제공되며, 이용자 확인 서명 후 서비스가 본격 개시됩니다.",
      ],
    },
    {
      id: "user_responsibilities",
      title: "제6조 (이용자의 의무)",
      body: [
        "1. 이용자는 정확하고 최신의 정보(의료기록 포함)를 제공해야 합니다. 허위 정보로 인한 의료 결과·비자 문제 등에 대한 책임은 이용자에게 있습니다.",
        "2. 이용자는 대한민국 법령, 의료기관의 내부 규정, 출입국 관련 규정을 준수해야 합니다.",
        "3. 이용자는 서비스 이용 중 알게 된 다른 이용자·의료기관의 정보를 비밀로 유지해야 합니다.",
        "4. 이용자는 다음 행위를 할 수 없습니다.",
        "   가. 회사·의료기관·타 이용자에 대한 명예훼손, 불법 녹음·녹화·유포",
        "   나. 시스템 부정 이용, 악성코드 삽입, 역공학",
        "   다. 타인의 여권·의료정보 무단 사용",
      ],
    },
    {
      id: "company_obligations",
      title: "제7조 (회사의 의무)",
      body: [
        "1. 회사는 서비스 제공에 관한 법령과 본 약관이 금지하는 행위를 하지 않으며, 안정적인 서비스 제공을 위해 최선을 다합니다.",
        "2. 회사는 이용자의 개인정보 보호를 위해 「개인정보처리방침」에 따른 안전조치를 시행합니다.",
        "3. 회사는 이용자의 불만·피해 구제를 위해 전담 창구를 운영합니다.",
      ],
    },
    {
      id: "payment",
      title: "제8조 (결제 및 환불)",
      body: [
        "1. 이용자는 회사에 어떠한 서비스 이용료나 수수료도 지급하지 않습니다. 회사의 보수는 제휴 의료기관이 지급하는 유치 수수료로 충당됩니다.",
        "2. 진료비는 사전 견적서(제5조)에 명시된 금액을 기준으로 하며, 이용자가 해당 의료기관에 직접 납부합니다(신용카드·계좌이체·국제송금 등). 회사는 이용자의 진료비를 대리 수납하지 않습니다.",
        "3. 이용자가 회사에 지급한 비용이 없으므로 회사가 환불할 금액은 발생하지 않습니다. 진료비의 환불은 다음에 따릅니다:",
        "   가. 의료기관의 사정으로 진료가 불가능해진 경우 — 해당 의료기관의 환불 정책에 따라 진료비를 환불합니다.",
        "   나. 이용자의 사정으로 계약을 해지하는 경우 — 진료비 환불은 각 의료기관의 환불 정책에 따릅니다.",
        "   다. 이미 이루어진 의료서비스(진료·수술 등)는 환불 불가.",
      ],
    },
    {
      id: "medical_disclaimer",
      title: "제9조 (의료 면책)",
      body: [
        "1. 모든 진단·치료·수술·처방·처치는 해당 의료기관과 소속 의료진의 판단·책임 하에 이루어집니다.",
        "2. 회사는 의료기관의 과실·부작용·의료사고·의료분쟁에 대해 의료적 책임을 지지 않습니다. 단, 회사는 제휴 의료기관 선정에 있어 합리적인 주의 의무를 다합니다.",
        "3. 의료사고 발생 시 이용자는 해당 의료기관에 직접 손해배상을 청구할 수 있으며, 회사는 한국 의료분쟁조정중재원(https://www.k-medi.or.kr) 안내 및 의사소통 지원을 제공합니다.",
        "4. 회사는 진료·시술의 성공이나 특정 치료 결과를 보장하지 않습니다. 진료 결과와 무관하게 회사의 중개·지원 역할과 그에 따른 정산은 유효합니다.",
        "5. 서비스 또는 코디네이터를 통해 전달된 의료 관련 정보·안내는 참고용이며, 그 정확성이나 그에 따른 치료 결과에 대해 회사는 책임지지 않습니다. 실제 의료적 판단은 반드시 담당 의료진에게 확인하십시오.",
      ],
    },
    {
      id: "limitation",
      title: "제10조 (책임의 제한)",
      body: [
        "1. 회사는 천재지변, 전쟁, 테러, 팬데믹, 출입국 정책 변경 등 불가항력 사유로 인한 서비스 중단에 대해 책임지지 않습니다.",
        "2. 회사는 이용자의 귀책 사유로 발생한 손해에 대해 책임지지 않습니다.",
        "3. 회사는 이용자와 의료기관 사이의 진료계약의 당사자가 아니며, 의료기관의 진료행위·의료결과 또는 회사의 합리적 통제를 벗어난 제3자의 행위로 인한 손해에 대해 책임지지 않습니다(제9조 참조). 회사의 책임은 회사가 직접 제공한 중개·코디네이션 서비스에 귀속되는 손해로 한정됩니다. 다만 회사의 고의 또는 중과실로 인한 손해에 대한 책임은 배제하지 않습니다.",
        "4. 이용자가 본 약관을 위반하거나 서비스를 부정하게 이용하여, 또는 법령이나 제3자의 권리를 침해하여 회사 또는 제3자에게 손해가 발생한 경우, 그에 대한 책임은 이용자에게 있으며, 이용자는 그로 인해 회사가 입은 손해(합리적 방어·대응 비용 포함)를 배상합니다.",
        "5. 본 조는 법령상 강행규정에 반하지 않는 범위 내에서 적용됩니다.",
      ],
    },
    {
      id: "intellectual_property",
      title: "제11조 (지적재산권)",
      body: [
        "1. 회사가 제공하는 서비스에 포함된 저작물(텍스트, 이미지, 소프트웨어, 상표 등)에 대한 권리는 회사 또는 정당한 권리자에게 귀속됩니다.",
        "2. 이용자는 회사의 사전 서면 동의 없이 저작물을 복제·배포·2차 창작할 수 없습니다.",
        "3. 이용자가 서비스를 통해 제공한 리뷰·후기 등 콘텐츠에 대해, 이용자는 회사에 해당 콘텐츠를 서비스 운영·홍보 목적으로 이용할 수 있는 비독점적 라이선스를 부여합니다.",
      ],
    },
    {
      id: "termination",
      title: "제12조 (서비스 이용 정지 및 계약 해지)",
      body: [
        "1. 회사는 이용자가 다음 각 호에 해당하는 경우 사전 통지 후 서비스 이용을 정지하거나 계약을 해지할 수 있습니다.",
        "   가. 본 약관 위반",
        "   나. 타인의 권리 침해",
        "   다. 법령 위반",
        "2. 이용자는 언제든지 계약을 해지할 수 있습니다. 단, 이미 진행된 서비스에 대해서는 제8조 환불 기준이 적용됩니다.",
      ],
    },
    {
      id: "dispute",
      title: "제13조 (분쟁 해결 및 준거법)",
      body: [
        "1. 본 약관은 대한민국 법률에 따릅니다.",
        "2. 회사와 이용자 간 분쟁은 우선 협의로 해결하며, 협의 불가 시 다음 기관의 중재를 거칠 수 있습니다.",
        "   가. 의료 관련 분쟁: 한국의료분쟁조정중재원 (https://www.k-medi.or.kr)",
        "   나. 소비자 분쟁: 한국소비자원 (https://www.kca.go.kr)",
        "   다. 개인정보 분쟁: 개인정보 분쟁조정위원회 (https://www.kopico.go.kr)",
        "3. 분쟁이 소송으로 진행되는 경우, 서울중앙지방법원을 제1심 관할 법원으로 합니다. 다만, 이용자의 주소지가 대한민국 외인 경우 이용자는 거주지 관할 법원을 선택할 수 있습니다.",
      ],
    },
    {
      id: "language",
      title: "제14조 (언어)",
      body: [
        "1. 본 약관은 한국어·영어·러시아어·카자흐어·중국어·일본어로 제공됩니다.",
        "2. 번역본 간 해석 차이가 있는 경우, 대한민국 내 법적 효력은 한국어판을 기준으로 합니다. 다만, 이용자의 국적 또는 거주지의 소비자 보호법이 강행규정으로 다른 기준을 요구하는 경우 해당 규정이 우선합니다.",
      ],
    },
    {
      id: "changes",
      title: "제15조 (약관의 변경)",
      body: [
        "1. 회사는 관련 법령을 위배하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 시행일로부터 최소 7일 전(이용자에게 불리한 변경은 30일 전) 서비스 내 공지 및 이메일로 통지합니다.",
        "2. 이용자가 변경된 약관에 동의하지 않는 경우 계약을 해지할 수 있습니다. 변경 약관의 시행일 이후에도 서비스를 계속 이용하는 경우 변경에 동의한 것으로 간주됩니다.",
      ],
    },
    {
      id: "telemedicine",
      title: "제16조 (원격협진·화상상담)",
      body: [
        "1. 회사는 이용자와 국내 의료진·통역 인력을 연결하는 화상상담(원격협진 지원) 기능을 제공합니다. 이는 의료기관에서의 진료를 대체하지 않으며, 회사는 상담 과정에서 의료행위를 하지 않습니다.",
        "2. 회사는 상담을 녹화·녹음하지 않습니다. 향후 녹화 기능을 도입하는 경우, 사전에 별도 동의를 받고 개인정보처리방침을 개정한 뒤에만 시행합니다.",
        "3. 상담 중 제공되는 자동 자막·번역은 기계 처리 결과로서 오역·누락이 있을 수 있으며 참고용입니다. 중요한 의료적 내용은 담당 의료진 또는 통역 인력을 통해 반드시 재확인하시기 바랍니다.",
        "4. 이용자는 상담 상대방의 동의 없이 화면·음성을 녹음·녹화하거나 외부에 공개할 수 없습니다.",
        "5. 통신 환경·기기 성능 등 회사의 합리적 통제를 벗어난 사유로 인한 상담 지연·중단에 대해 회사는 책임지지 않습니다.",
      ],
    },
    {
      id: "mobile_app",
      title: "제17조 (모바일 앱 및 알림)",
      body: [
        "1. 회사는 웹과 동일한 서비스를 모바일 앱으로 제공할 수 있으며, 앱 이용에도 본 약관이 동일하게 적용됩니다.",
        "2. 앱 푸시 알림은 이용자가 기기에서 허용한 경우에만 발송되며, 기기 설정에서 언제든지 해제할 수 있습니다. 알림을 해제하더라도 서비스 이용에 필요한 안내는 이메일로 발송될 수 있습니다.",
        "3. 이용자는 앱 또는 웹의 계정 삭제 화면에서 계정 삭제를 요청할 수 있으며, 회사는 관계 법령상 보관 의무가 있는 정보를 제외하고 30일 이내에 파기합니다.",
        "4. 앱의 카메라·마이크·사진·알림 접근권한은 모두 선택 사항이며, 허용하지 않아도 앱을 이용할 수 있습니다(해당 기능만 제한됩니다). 권한은 기기 설정에서 언제든지 변경할 수 있습니다.",
        "5. 앱의 설치·업데이트에는 각 앱 마켓(App Store·Google Play) 사업자의 약관이 함께 적용됩니다.",
      ],
    },
    {
      id: "contact",
      title: "제18조 (연락처)",
      body: [
        "· 상호: 본로이 (BONROI) — 서비스명: healwith",
        "· 사업 형태: 개인사업자",
        "· 대표자: 강주영 (JUYOUNG KANG)",
        "· 사업자등록번호: 463-35-00902",
        "· 외국인환자 유치업자 등록번호: A-2026-01-02-06761 (서울특별시장 등록, 유효기간 2026-03-11 ~ 2029-03-10)",
        "· 주소: 서울특별시 강서구 강서로 385, 613호 (마곡동, 우성에스비타워)",
        "· 이메일 (고객/법률/개인정보 통합): admin@healwith.co.kr",
        "· 전화: +82-10-4772-1075 (국제) · 070-7500-7795 (국내)",
        "· 운영 시간: 평일 09:00-18:00 KST",
      ],
    },
  ],
};

const EN = {
  pageTitle: "Terms of Service",
  lastUpdated: "Effective",
  version: "Version",
  sections: [
    {
      id: "purpose",
      title: "Article 1 (Purpose)",
      body: [
        "These Terms govern the rights, obligations, and responsibilities between BONROI (hereinafter the \"Company\") and users in connection with the use of the medical concierge service \"healwith\" (hereinafter the \"Service\") provided by the Company, as well as other necessary matters.",
      ],
    },
    {
      id: "definitions",
      title: "Article 2 (Definitions)",
      body: [
        "1. \"Service\" means all services related to the attraction of foreign patients provided by the Company, including medical institution matching, appointment support, visa and stay assistance, interpretation, travel convenience, and post-care.",
        "2. \"User\" means any person who agrees to these Terms and uses the Service, including both members and non-members.",
        "3. \"Patient\" means a person who wishes to receive medical care from a medical institution through the Service, or such person's guardian.",
        "4. \"Medical Institution\" means a hospital, clinic, or specialized medical facility located in the Republic of Korea that is partnered with the Company.",
        "5. \"Attraction Business Registration\" means the registration with the Ministry of Health and Welfare under Article 6 of the Act on Support for Overseas Expansion of Medical Services and Attraction of Foreign Patients of the Republic of Korea.",
      ],
    },
    {
      id: "nature_of_service",
      title: "Article 3 (Nature of the Service)",
      body: [
        "1. The Company is not a medical institution and does not provide diagnosis, treatment, or prescription.",
        "2. The Company is an entity registered as a foreign patient attraction business and performs the roles of matching, information delivery, and convenience support between users and medical institutions.",
        "3. Medical consultation, examination, and treatment are conducted entirely under the judgment and responsibility of the medical staff of the relevant medical institution, and the Company bears no medical liability for the outcomes thereof.",
        "4. AI-based information provided within the Service (such as symptom guidance and matching recommendations) is for reference only and does not constitute a medical diagnosis or recommendation. For any actual medical decision, please consult medical professionals.",
      ],
    },
    {
      id: "registration",
      title: "Article 4 (Application for Use and Formation of Contract)",
      body: [
        "1. A person wishing to use the Service applies for a use contract by entering the required information in the form prescribed by the Company and agreeing to these Terms and the Privacy Policy.",
        "2. Where a child under the age of 14 uses the Service, the consent of the legal guardian shall be verified without exception. For treatments to which the principle of guardian accompaniment applies, the Company shall separately verify the guardian's information.",
        "3. The Company may refuse an application for use in any of the following cases:",
        "   a. Entry of false information;",
        "   b. Use for the purpose of violating laws or public order and morals;",
        "   c. Where provision of the Service is impossible due to technical constraints.",
      ],
    },
    {
      id: "treatment_fee_notice",
      title: "Article 5 (Prior Notice of Treatment Costs, etc.)",
      body: [
        "In accordance with the relevant laws, the Company shall, before the patient enters into a treatment contract, give notice of the following matters in writing (including electronic documents) in the user's native language or in English:",
        "",
        "1. The estimated amount of treatment costs and the basis for their calculation;",
        "2. The rate or amount of the attraction commission the Company receives from the medical institution;",
        "3. Incidental costs such as stay and interpretation;",
        "4. The method of payment of treatment costs and the refund conditions;",
        "5. The procedure for handling complaints and disputes (including guidance on the Korea Medical Dispute Mediation and Arbitration Agency).",
        "",
        "The above matters shall be provided in the form of a quotation, and the Service shall commence in earnest after the user's confirming signature.",
      ],
    },
    {
      id: "user_responsibilities",
      title: "Article 6 (Obligations of the User)",
      body: [
        "1. The user shall provide accurate and up-to-date information (including medical records). The user is responsible for any medical outcomes or visa issues arising from false information.",
        "2. The user shall comply with the laws of the Republic of Korea, the internal rules of medical institutions, and immigration-related regulations.",
        "3. The user shall keep confidential any information regarding other users or medical institutions that the user comes to know while using the Service.",
        "4. The user shall not engage in any of the following acts:",
        "   a. Defamation of the Company, medical institutions, or other users, and unlawful recording, filming, or dissemination;",
        "   b. Fraudulent use of the system, insertion of malicious code, or reverse engineering;",
        "   c. Unauthorized use of another person's passport or medical information.",
      ],
    },
    {
      id: "company_obligations",
      title: "Article 7 (Obligations of the Company)",
      body: [
        "1. The Company shall not engage in any act prohibited by the laws governing the provision of the Service or by these Terms, and shall use its best efforts to provide a stable Service.",
        "2. The Company shall implement the safeguards set out in its Privacy Policy to protect users' personal information.",
        "3. The Company shall operate a dedicated channel for the relief of users' complaints and damages.",
      ],
    },
    {
      id: "payment",
      title: "Article 8 (Payment and Refunds)",
      body: [
        "1. The user pays the Company no service charge or fee of any kind. The Company's remuneration is covered by the attraction commission paid by the partner medical institution.",
        "2. Treatment costs shall be based on the amounts specified in the prior quotation (Article 5) and are paid by the user directly to the relevant medical institution (by credit card, bank transfer, international remittance, or other methods). The Company does not collect treatment payments on the user's behalf.",
        "3. As the user pays no amount to the Company, no refund is payable by the Company. Refunds of treatment costs are governed as follows:",
        "   a. Where treatment becomes impossible due to circumstances of the medical institution — treatment costs are refunded according to that medical institution's refund policy;",
        "   b. Where the user terminates the contract for the user's own reasons — refunds of treatment costs follow each medical institution's refund policy;",
        "   c. Medical services already rendered (such as examination or surgery) are non-refundable.",
      ],
    },
    {
      id: "medical_disclaimer",
      title: "Article 9 (Medical Disclaimer)",
      body: [
        "1. All diagnosis, treatment, surgery, prescription, and care are conducted under the judgment and responsibility of the relevant medical institution and its medical staff.",
        "2. The Company bears no medical liability for the negligence, side effects, medical accidents, or medical disputes of medical institutions. However, the Company shall exercise reasonable due care in the selection of partner medical institutions.",
        "3. In the event of a medical accident, the user may claim damages directly against the relevant medical institution, and the Company shall provide guidance regarding the Korea Medical Dispute Mediation and Arbitration Agency (https://www.k-medi.or.kr) and communication support.",
        "4. The Company does not guarantee the success of any treatment or procedure, or any particular medical outcome. The Company's facilitation and support role, and the corresponding settlement, apply regardless of the treatment outcome.",
        "5. Any medical information or guidance conveyed through the Service or by a coordinator is for reference only; the Company is not responsible for its accuracy or for any resulting treatment outcome. Always confirm actual medical decisions with the attending medical staff.",
      ],
    },
    {
      id: "limitation",
      title: "Article 10 (Limitation of Liability)",
      body: [
        "1. The Company shall not be liable for any interruption of the Service due to force majeure events such as natural disasters, war, terrorism, pandemics, or changes in immigration policy.",
        "2. The Company shall not be liable for damages arising from causes attributable to the user.",
        "3. The Company is not a party to the treatment contract between the user and the medical institution, and is not liable for damages arising from the medical institution's medical acts or outcomes, or from acts of third parties beyond the Company's reasonable control (see Article 9). The Company's liability is limited to damages attributable to the coordination services the Company itself provides. Nothing in this Article excludes liability for the Company's willful misconduct or gross negligence.",
        "4. If the user causes damage to the Company or a third party by breaching these Terms, using the Service improperly, or infringing any law or third-party right, the user is responsible for such damage and shall indemnify the Company for the loss it incurs (including reasonable costs of defense and response).",
        "5. This Article shall apply to the extent that it does not contravene mandatory provisions of law.",
      ],
    },
    {
      id: "intellectual_property",
      title: "Article 11 (Intellectual Property)",
      body: [
        "1. The rights to the works (text, images, software, trademarks, etc.) included in the Service provided by the Company belong to the Company or the legitimate rights holder.",
        "2. The user may not reproduce, distribute, or create derivative works from such works without the prior written consent of the Company.",
        "3. With respect to content such as reviews and testimonials that the user provides through the Service, the user grants the Company a non-exclusive license to use such content for the purposes of operating and promoting the Service.",
      ],
    },
    {
      id: "termination",
      title: "Article 12 (Suspension of Use and Termination of Contract)",
      body: [
        "1. The Company may, after prior notice, suspend the user's use of the Service or terminate the contract where the user falls under any of the following:",
        "   a. Violation of these Terms;",
        "   b. Infringement of the rights of others;",
        "   c. Violation of law.",
        "2. The user may terminate the contract at any time. However, the refund standards of Article 8 shall apply to services already rendered.",
      ],
    },
    {
      id: "dispute",
      title: "Article 13 (Dispute Resolution and Governing Law)",
      body: [
        "1. These Terms shall be governed by the laws of the Republic of Korea.",
        "2. Disputes between the Company and the user shall first be resolved through consultation, and where consultation is not possible, the parties may undergo mediation by the following organizations:",
        "   a. Medical disputes: Korea Medical Dispute Mediation and Arbitration Agency (https://www.k-medi.or.kr);",
        "   b. Consumer disputes: Korea Consumer Agency (https://www.kca.go.kr);",
        "   c. Personal information disputes: Personal Information Dispute Mediation Committee (https://www.kopico.go.kr).",
        "3. Where a dispute proceeds to litigation, the Seoul Central District Court shall be the court of first instance having jurisdiction. However, where the user's address is outside the Republic of Korea, the user may choose the court having jurisdiction over the user's place of residence.",
      ],
    },
    {
      id: "language",
      title: "Article 14 (Language)",
      body: [
        "1. These Terms are provided in Korean, English, Russian, Kazakh, Chinese, and Japanese.",
        "2. In the event of any discrepancy in interpretation among the translated versions, the Korean version shall prevail for legal effect within the Republic of Korea. However, where the consumer protection law of the user's nationality or place of residence requires a different standard as a mandatory provision, such provision shall prevail.",
      ],
    },
    {
      id: "changes",
      title: "Article 15 (Amendment of the Terms)",
      body: [
        "1. The Company may amend these Terms to the extent that it does not violate the relevant laws, and shall give notice within the Service and by email at least 7 days before the effective date of the amendment (30 days in advance for amendments unfavorable to users).",
        "2. If the user does not agree to the amended Terms, the user may terminate the contract. If the user continues to use the Service after the effective date of the amended Terms, the user shall be deemed to have agreed to the amendment.",
      ],
    },
    {
      id: "telemedicine",
      title: "Article 16 (Telemedicine and Video Consultation)",
      body: [
        "1. The Company provides a video consultation feature connecting users with Korean medical staff and interpreters. It does not replace treatment at a medical institution, and the Company performs no medical practice during such consultations.",
        "2. The Company does not record consultations (audio or video). Should a recording feature be introduced in the future, it will be enabled only after separate prior consent is obtained and the Privacy Policy is amended.",
        "3. Automatic captions and translations provided during a consultation are machine-generated, may contain errors or omissions, and are for reference only. Always reconfirm important medical content with the attending medical staff or an interpreter.",
        "4. Users may not record or publish the screen or audio of a consultation without the consent of the other participants.",
        "5. The Company is not liable for delays or interruptions of consultations caused by network conditions, device performance, or other causes beyond the Company's reasonable control.",
      ],
    },
    {
      id: "mobile_app",
      title: "Article 17 (Mobile App and Notifications)",
      body: [
        "1. The Company may provide the same Service through a mobile app, and these Terms apply equally to use of the app.",
        "2. App push notifications are sent only if the user has enabled them on the device and may be turned off at any time in the device settings. Even if notifications are turned off, essential service information may still be sent by email.",
        "3. Users may request deletion of their account from the account deletion screen in the app or on the web; the Company deletes the account within 30 days, excluding information it is required by law to retain.",
        "4. The app's camera, microphone, photo, and notification permissions are all optional; you may use the app without granting them (only the related feature is limited). Permissions can be changed at any time in your device settings.",
        "5. Installation and updates of the app are additionally subject to the terms of the respective app marketplace (App Store, Google Play).",
      ],
    },
    {
      id: "contact",
      title: "Article 18 (Contact)",
      body: [
        "· Trade name: BONROI — Service name: healwith",
        "· Business type: Sole proprietorship",
        "· Representative: JUYOUNG KANG",
        "· Business Registration Number: 463-35-00902",
        "· Foreign Patient Attraction Business Registration Number: A-2026-01-02-06761 (registered with the Mayor of Seoul; valid 2026-03-11 to 2029-03-10)",
        "· Address: Room 613, 385 Gangseo-ro, Gangseo-gu, Seoul, Republic of Korea (Magok-dong, Woosung SB Tower)",
        "· Email (integrated for customer / legal / privacy): admin@healwith.co.kr",
        "· Phone: +82-10-4772-1075 (international) · 070-7500-7795 (domestic)",
        "· Business hours: Weekdays 09:00-18:00 KST",
      ],
    },
  ],
};

const RU = {
  pageTitle: "Условия использования",
  lastUpdated: "Дата вступления в силу",
  version: "Версия",
  sections: [
    {
      id: "purpose",
      title: "Статья 1 (Цель)",
      body: [
        "Настоящие Условия регулируют права, обязанности и ответственность компании BONROI (далее — «Компания») и пользователей в связи с использованием сервиса медицинского консьержа «healwith» (далее — «Сервис»), предоставляемого Компанией, а также иные необходимые вопросы.",
      ],
    },
    {
      id: "definitions",
      title: "Статья 2 (Определения)",
      body: [
        "1. «Сервис» — все услуги, связанные с привлечением иностранных пациентов, предоставляемые Компанией, включая подбор медицинских учреждений, помощь в записи на приём, визовую поддержку и поддержку при пребывании, перевод, организацию поездки и последующее сопровождение.",
        "2. «Пользователь» — лицо, которое приняло настоящие Условия и пользуется Сервисом, включая как зарегистрированных, так и незарегистрированных лиц.",
        "3. «Пациент» — лицо, желающее получить медицинскую помощь в медицинском учреждении через Сервис, либо его законный представитель.",
        "4. «Медицинское учреждение» — больница, клиника или специализированное медицинское учреждение на территории Республики Корея, являющееся партнёром Компании.",
        "5. «Регистрация деятельности по привлечению пациентов» — регистрация в Министерстве здравоохранения и социального обеспечения в соответствии со статьёй 6 Закона Республики Корея о поддержке зарубежного развития медицинских услуг и привлечения иностранных пациентов.",
      ],
    },
    {
      id: "nature_of_service",
      title: "Статья 3 (Характер Сервиса)",
      body: [
        "1. Компания не является медицинским учреждением и не осуществляет диагностику, лечение или назначение препаратов.",
        "2. Компания зарегистрирована в качестве оператора по привлечению иностранных пациентов и выполняет функции подбора, передачи информации и организационной поддержки между пользователями и медицинскими учреждениями.",
        "3. Медицинские консультации, обследование и лечебные процедуры осуществляются исключительно по решению и под ответственность медицинского персонала соответствующего медицинского учреждения, и Компания не несёт медицинской ответственности за их результаты.",
        "4. Информация на основе искусственного интеллекта, предоставляемая в рамках Сервиса (разъяснения о симптомах, рекомендации по подбору и т. п.), носит справочный характер и не является медицинским диагнозом или предписанием. По вопросам фактических медицинских решений обязательно обращайтесь к медицинскому персоналу.",
      ],
    },
    {
      id: "registration",
      title: "Статья 4 (Заявка на использование и заключение договора)",
      body: [
        "1. Лицо, желающее воспользоваться Сервисом, подаёт заявку на заключение договора об использовании, указав необходимые сведения по форме, установленной Компанией, и приняв настоящие Условия и Политику конфиденциальности.",
        "2. В случае использования Сервиса ребёнком, не достигшим 14 лет, в обязательном порядке проверяется согласие законного представителя. При лечении, к которому применяется принцип сопровождения опекуном, Компания дополнительно проверяет сведения об опекуне.",
        "3. Компания вправе отказать в заявке на использование в любом из следующих случаев:",
        "   a. указание ложных сведений;",
        "   b. использование в целях нарушения законодательства, общественного порядка или нравственности;",
        "   c. невозможность предоставления Сервиса вследствие технических ограничений.",
      ],
    },
    {
      id: "treatment_fee_notice",
      title: "Статья 5 (Предварительное уведомление о стоимости лечения и иных расходах)",
      body: [
        "В соответствии с применимым законодательством Компания до заключения пациентом договора на лечение уведомляет о следующих сведениях в письменной форме (включая электронные документы) на родном языке пользователя или на английском языке:",
        "",
        "1. предполагаемая сумма расходов на лечение и основания её расчёта;",
        "2. ставка или сумма комиссии за привлечение, получаемой Компанией от медицинского учреждения;",
        "3. сопутствующие расходы, такие как пребывание и перевод;",
        "4. порядок оплаты расходов на лечение и условия возврата средств;",
        "5. порядок рассмотрения жалоб и споров (включая информацию об Агентстве по медиации и арбитражу медицинских споров Кореи).",
        "",
        "Указанные сведения предоставляются в форме сметы, и Сервис начинается в полном объёме после подтверждающей подписи пользователя.",
      ],
    },
    {
      id: "user_responsibilities",
      title: "Статья 6 (Обязанности пользователя)",
      body: [
        "1. Пользователь обязан предоставлять точную и актуальную информацию (включая медицинские записи). Ответственность за результаты лечения, визовые проблемы и т. п., возникшие вследствие предоставления ложной информации, несёт пользователь.",
        "2. Пользователь обязан соблюдать законодательство Республики Корея, внутренние правила медицинских учреждений и иммиграционные нормы.",
        "3. Пользователь обязан сохранять конфиденциальность информации о других пользователях и медицинских учреждениях, ставшей ему известной в ходе использования Сервиса.",
        "4. Пользователю запрещается совершать следующие действия:",
        "   a. клевета в отношении Компании, медицинских учреждений или других пользователей, а также незаконная аудио- или видеозапись и её распространение;",
        "   b. недобросовестное использование системы, внедрение вредоносного кода, обратное проектирование;",
        "   c. несанкционированное использование паспорта или медицинской информации другого лица.",
      ],
    },
    {
      id: "company_obligations",
      title: "Статья 7 (Обязанности Компании)",
      body: [
        "1. Компания не совершает действий, запрещённых законодательством о предоставлении Сервиса и настоящими Условиями, и прилагает все усилия для стабильного предоставления Сервиса.",
        "2. Компания применяет меры защиты, предусмотренные Политикой конфиденциальности, в целях защиты персональных данных пользователей.",
        "3. Компания обеспечивает работу специального канала для рассмотрения жалоб пользователей и возмещения ущерба.",
      ],
    },
    {
      id: "payment",
      title: "Статья 8 (Оплата и возврат средств)",
      body: [
        "1. Пользователь не уплачивает Компании никаких сервисных сборов или комиссий. Вознаграждение Компании покрывается за счёт комиссии за привлечение, выплачиваемой партнёрским медицинским учреждением.",
        "2. Расходы на лечение определяются на основании сумм, указанных в предварительной смете (Статья 5), и оплачиваются пользователем напрямую соответствующему медицинскому учреждению (кредитными картами, банковскими или международными переводами и иными способами). Компания не принимает оплату лечения от имени пользователя.",
        "3. Поскольку пользователь не уплачивает Компании никаких сумм, возврат средств со стороны Компании не производится. Возврат расходов на лечение регулируется следующим образом:",
        "   a. если лечение стало невозможным по обстоятельствам медицинского учреждения — расходы на лечение возвращаются в соответствии с политикой возврата этого медицинского учреждения;",
        "   b. если пользователь расторгает договор по собственным причинам — возврат расходов на лечение осуществляется в соответствии с политикой возврата каждого медицинского учреждения;",
        "   c. уже оказанные медицинские услуги (обследование, операция и т. п.) возврату не подлежат.",
      ],
    },
    {
      id: "medical_disclaimer",
      title: "Статья 9 (Медицинский отказ от ответственности)",
      body: [
        "1. Любая диагностика, лечение, операции, назначения и процедуры осуществляются по решению и под ответственность соответствующего медицинского учреждения и его медицинского персонала.",
        "2. Компания не несёт медицинской ответственности за халатность, побочные эффекты, врачебные ошибки или медицинские споры медицинских учреждений. При этом Компания проявляет разумную осмотрительность при выборе партнёрских медицинских учреждений.",
        "3. В случае медицинского инцидента пользователь вправе предъявить требование о возмещении ущерба непосредственно соответствующему медицинскому учреждению, а Компания предоставляет информацию об Агентстве по медиации и арбитражу медицинских споров Кореи (https://www.k-medi.or.kr) и поддержку в коммуникации.",
        "4. Компания не гарантирует успех лечения или процедуры, а также какой-либо конкретный медицинский результат. Посредническая и вспомогательная роль Компании и соответствующие расчёты действуют независимо от результата лечения.",
        "5. Любая медицинская информация или разъяснения, переданные через Сервис или координатором, носят справочный характер; Компания не несёт ответственности за их точность или за связанный с этим результат лечения. Всегда уточняйте фактические медицинские решения у лечащего медицинского персонала.",
      ],
    },
    {
      id: "limitation",
      title: "Статья 10 (Ограничение ответственности)",
      body: [
        "1. Компания не несёт ответственности за приостановление Сервиса вследствие обстоятельств непреодолимой силы, таких как стихийные бедствия, война, терроризм, пандемии или изменения иммиграционной политики.",
        "2. Компания не несёт ответственности за ущерб, возникший по причинам, относящимся к пользователю.",
        "3. Компания не является стороной договора о лечении между пользователем и медицинским учреждением и не несёт ответственности за ущерб, возникший вследствие медицинских действий или результатов лечения медицинского учреждения либо действий третьих лиц вне разумного контроля Компании (см. Статью 9). Ответственность Компании ограничивается ущербом, относящимся к посредническим и координационным услугам, которые оказывает сама Компания. Ответственность за ущерб, причинённый умыслом или грубой неосторожностью Компании, при этом не исключается.",
        "4. Если пользователь причиняет ущерб Компании или третьему лицу вследствие нарушения настоящих Условий, ненадлежащего использования Сервиса либо нарушения закона или прав третьих лиц, ответственность за такой ущерб несёт пользователь, и пользователь возмещает Компании понесённые убытки (включая разумные расходы на защиту и урегулирование).",
        "5. Настоящая статья применяется в той мере, в какой она не противоречит императивным нормам законодательства.",
      ],
    },
    {
      id: "intellectual_property",
      title: "Статья 11 (Интеллектуальная собственность)",
      body: [
        "1. Права на объекты (текст, изображения, программное обеспечение, товарные знаки и т. п.), входящие в Сервис, предоставляемый Компанией, принадлежат Компании или законному правообладателю.",
        "2. Пользователь не вправе воспроизводить, распространять или создавать производные произведения на основе таких объектов без предварительного письменного согласия Компании.",
        "3. В отношении контента, такого как отзывы и рекомендации, предоставленного пользователем через Сервис, пользователь предоставляет Компании неисключительную лицензию на использование такого контента в целях эксплуатации и продвижения Сервиса.",
      ],
    },
    {
      id: "termination",
      title: "Статья 12 (Приостановление использования и расторжение договора)",
      body: [
        "1. Компания вправе после предварительного уведомления приостановить использование Сервиса пользователем или расторгнуть договор в любом из следующих случаев:",
        "   a. нарушение настоящих Условий;",
        "   b. нарушение прав других лиц;",
        "   c. нарушение законодательства.",
        "2. Пользователь вправе расторгнуть договор в любое время. При этом к уже оказанным услугам применяются условия возврата средств, предусмотренные Статьёй 8.",
      ],
    },
    {
      id: "dispute",
      title: "Статья 13 (Разрешение споров и применимое право)",
      body: [
        "1. Настоящие Условия регулируются законодательством Республики Корея.",
        "2. Споры между Компанией и пользователем разрешаются прежде всего путём переговоров, а при невозможности достижения согласия стороны могут обратиться к медиации следующих организаций:",
        "   a. медицинские споры: Агентство по медиации и арбитражу медицинских споров Кореи (https://www.k-medi.or.kr);",
        "   b. потребительские споры: Корейское агентство по защите прав потребителей (https://www.kca.go.kr);",
        "   c. споры о персональных данных: Комитет по медиации споров о персональных данных (https://www.kopico.go.kr).",
        "3. Если спор переходит в судебное разбирательство, судом первой инстанции является Центральный окружной суд Сеула. Однако, если адрес пользователя находится за пределами Республики Корея, пользователь вправе выбрать суд по месту своего жительства.",
      ],
    },
    {
      id: "language",
      title: "Статья 14 (Язык)",
      body: [
        "1. Настоящие Условия предоставляются на корейском, английском, русском, казахском, китайском и японском языках.",
        "2. В случае расхождений в толковании между переведёнными версиями для юридической силы на территории Республики Корея определяющей является корейская версия. Однако, если законодательство о защите прав потребителей по гражданству или месту жительства пользователя требует иного стандарта в качестве императивной нормы, преимущественную силу имеет такая норма.",
      ],
    },
    {
      id: "changes",
      title: "Статья 15 (Изменение Условий)",
      body: [
        "1. Компания вправе изменять настоящие Условия в той мере, в какой это не нарушает применимое законодательство, и при изменении уведомляет об этом в Сервисе и по электронной почте не менее чем за 7 дней до даты вступления изменений в силу (за 30 дней — при изменениях, неблагоприятных для пользователей).",
        "2. Если пользователь не согласен с изменёнными Условиями, он вправе расторгнуть договор. Если пользователь продолжает пользоваться Сервисом после даты вступления изменённых Условий в силу, считается, что он согласился с изменениями.",
      ],
    },
    {
      id: "telemedicine",
      title: "Статья 16 (Дистанционные консультации и видеосвязь)",
      body: [
        "1. Компания предоставляет функцию видеоконсультации, соединяющую пользователей с корейскими медицинскими специалистами и переводчиками. Она не заменяет лечение в медицинском учреждении, и Компания не осуществляет медицинскую деятельность в ходе таких консультаций.",
        "2. Компания не ведёт аудио- и видеозапись консультаций. Если функция записи будет введена в будущем, она будет включена только после получения отдельного предварительного согласия и внесения изменений в Политику конфиденциальности.",
        "3. Автоматические субтитры и перевод, предоставляемые во время консультации, создаются машинным способом, могут содержать ошибки и пропуски и носят справочный характер. Важные медицинские сведения обязательно уточняйте у лечащего врача или через переводчика.",
        "4. Пользователь не вправе записывать или публиковать изображение и звук консультации без согласия других участников.",
        "5. Компания не несёт ответственности за задержки или прерывания консультаций, вызванные состоянием сети, характеристиками устройства или иными причинами вне разумного контроля Компании.",
      ],
    },
    {
      id: "mobile_app",
      title: "Статья 17 (Мобильное приложение и уведомления)",
      body: [
        "1. Компания может предоставлять тот же Сервис через мобильное приложение; настоящие Условия в равной мере применяются к использованию приложения.",
        "2. Push-уведомления приложения отправляются только если пользователь включил их на устройстве, и могут быть отключены в настройках устройства в любое время. Даже при отключённых уведомлениях необходимая сервисная информация может направляться по электронной почте.",
        "3. Пользователь может запросить удаление учётной записи на экране удаления учётной записи в приложении или на сайте; Компания удаляет её в течение 30 дней, за исключением сведений, которые обязана хранить по закону.",
        "4. Разрешения приложения на камеру, микрофон, фотографии и уведомления являются необязательными; приложением можно пользоваться, не предоставляя их (ограничивается только соответствующая функция). Разрешения можно изменить в настройках устройства в любое время.",
        "5. К установке и обновлению приложения дополнительно применяются условия соответствующего магазина приложений (App Store, Google Play).",
      ],
    },
    {
      id: "contact",
      title: "Статья 18 (Контактная информация)",
      body: [
        "· Фирменное наименование: BONROI — название сервиса: healwith",
        "· Форма деятельности: индивидуальный предприниматель",
        "· Представитель: JUYOUNG KANG",
        "· Регистрационный номер предприятия: 463-35-00902",
        "· Регистрационный номер оператора по привлечению иностранных пациентов: A-2026-01-02-06761 (зарегистрирован мэром города Сеула, срок действия 2026-03-11 — 2029-03-10)",
        "· Адрес: Республика Корея, Сеул, Кансо-гу, Кансо-ро 385, офис 613 (Магок-тон, Woosung SB Tower)",
        "· Электронная почта (единая для клиентских / юридических вопросов / персональных данных): admin@healwith.co.kr",
        "· Телефон: +82-10-4772-1075 (международный) · 070-7500-7795 (внутри страны)",
        "· Часы работы: будние дни 09:00-18:00 KST",
      ],
    },
  ],
};

const KZ = {
  pageTitle: "Пайдалану шарттары",
  lastUpdated: "Күшіне ену күні",
  version: "Нұсқа",
  sections: [
    {
      id: "purpose",
      title: "1-бап (Мақсаты)",
      body: [
        "Осы Шарттар BONROI компаниясы (бұдан әрі — «Компания») ұсынатын «healwith» медициналық консьерж қызметін (бұдан әрі — «Қызмет») пайдалануға байланысты Компания мен пайдаланушылар арасындағы құқықтарды, міндеттерді және жауапкершілікті, сондай-ақ өзге де қажетті мәселелерді белгілейді.",
      ],
    },
    {
      id: "definitions",
      title: "2-бап (Терминдердің анықтамасы)",
      body: [
        "1. «Қызмет» — Компания ұсынатын, шетелдік пациенттерді тартуға байланысты барлық қызметтерді білдіреді, оның ішінде медициналық мекемелерді таңдау, жазылуға көмек көрсету, виза мен болуға қолдау, аударма, сапар ыңғайлылығы және кейінгі сүйемелдеу.",
        "2. «Пайдаланушы» — осы Шарттарды қабылдап, Қызметті пайдаланатын тұлға, оған тіркелген және тіркелмеген тұлғалар да кіреді.",
        "3. «Пациент» — Қызмет арқылы медициналық мекемеде ем алуды қалайтын тұлға немесе оның заңды өкілі.",
        "4. «Медициналық мекеме» — Компаниямен серіктес болып табылатын Корея Республикасы аумағындағы аурухана, емхана немесе мамандандырылған медициналық мекеме.",
        "5. «Тарту қызметін тіркеу» — Корея Республикасының «Медициналық қызметтерді шетелде дамыту және шетелдік пациенттерді тартуды қолдау туралы» Заңының 6-бабына сәйкес Денсаулық сақтау және әл-ауқат министрлігінде тіркелуді білдіреді.",
      ],
    },
    {
      id: "nature_of_service",
      title: "3-бап (Қызметтің сипаты)",
      body: [
        "1. Компания медициналық мекеме болып табылмайды және диагностика, ем немесе дәрі тағайындау қызметтерін көрсетпейді.",
        "2. Компания шетелдік пациенттерді тарту операторы ретінде тіркелген және пайдаланушылар мен медициналық мекемелер арасында таңдау, ақпарат жеткізу және ұйымдастырушылық қолдау рөлдерін атқарады.",
        "3. Медициналық кеңес беру, тексеру және емдеу шаралары толығымен тиісті медициналық мекеме медицина қызметкерлерінің шешімі мен жауапкершілігі негізінде жүзеге асырылады, ал Компания олардың нәтижелері үшін медициналық жауапкершілік көтермейді.",
        "4. Қызмет шеңберінде ұсынылатын жасанды интеллект негізіндегі ақпарат (симптомдар туралы түсініктеме, таңдау бойынша ұсыныстар және т. б.) анықтамалық сипатта болады әрі медициналық диагноз немесе нұсқау болып табылмайды. Нақты медициналық шешімдер бойынша міндетті түрде медицина қызметкерлеріне жүгініңіз.",
      ],
    },
    {
      id: "registration",
      title: "4-бап (Пайдалануға өтінім беру және шарттың жасалуы)",
      body: [
        "1. Қызметті пайдаланғысы келетін тұлға Компания белгілеген нысан бойынша қажетті мәліметтерді көрсетіп, осы Шарттар мен Құпиялылық саясатын қабылдау арқылы пайдалану шартын жасасуға өтінім береді.",
        "2. Қызметті 14 жасқа толмаған бала пайдаланған жағдайда, заңды өкілдің келісімі міндетті түрде тексеріледі. Қамқоршының алып жүру қағидаты қолданылатын емдеу кезінде Компания қамқоршы туралы мәліметтерді бөлек тексереді.",
        "3. Компания мынадай жағдайлардың кез келгенінде пайдалануға берілген өтінімнен бас тарта алады:",
        "   a. жалған мәліметтерді көрсету;",
        "   b. заңнаманы, қоғамдық тәртіп пен имандылықты бұзу мақсатында пайдалану;",
        "   c. техникалық шектеулерге байланысты Қызметті ұсыну мүмкін болмаған жағдайда.",
      ],
    },
    {
      id: "treatment_fee_notice",
      title: "5-бап (Емдеу құны және өзге де шығындар туралы алдын ала хабарлау)",
      body: [
        "Тиісті заңнамаға сәйкес Компания пациент емдеу шартын жасасқанға дейін мынадай мәліметтерді жазбаша түрде (электрондық құжаттарды қоса алғанда) пайдаланушының ана тілінде немесе ағылшын тілінде хабарлайды:",
        "",
        "1. емдеудің болжамды құны және оны есептеу негіздері;",
        "2. Компанияның медициналық мекемеден алатын тарту комиссиясының мөлшерлемесі немесе сомасы;",
        "3. болу, аударма сияқты қосымша шығындар;",
        "4. емдеу шығындарын төлеу тәсілі және қаражатты қайтару шарттары;",
        "5. шағымдар мен дауларды қарау тәртібі (Корея медициналық дауларды медиациялау және төрелік агенттігі туралы ақпаратты қоса алғанда).",
        "",
        "Жоғарыда көрсетілген мәліметтер смета түрінде ұсынылады, ал Қызмет пайдаланушының растайтын қолы қойылғаннан кейін толық көлемде басталады.",
      ],
    },
    {
      id: "user_responsibilities",
      title: "6-бап (Пайдаланушының міндеттері)",
      body: [
        "1. Пайдаланушы дәл әрі өзекті ақпаратты (медициналық жазбаларды қоса алғанда) ұсынуға міндетті. Жалған ақпарат салдарынан туындаған емдеу нәтижелері, виза мәселелері және т. б. үшін жауапкершілік пайдаланушыға жүктеледі.",
        "2. Пайдаланушы Корея Республикасының заңнамасын, медициналық мекемелердің ішкі ережелерін және көші-қон нормаларын сақтауға міндетті.",
        "3. Пайдаланушы Қызметті пайдалану барысында өзіне белгілі болған басқа пайдаланушылар мен медициналық мекемелер туралы ақпараттың құпиялылығын сақтауға міндетті.",
        "4. Пайдаланушыға мынадай әрекеттерді жасауға тыйым салынады:",
        "   a. Компанияға, медициналық мекемелерге немесе басқа пайдаланушыларға жала жабу, сондай-ақ заңсыз дыбыс- немесе бейнежазба жасап тарату;",
        "   b. жүйені теріс пайдалану, зиянды кодты енгізу, кері инженерия;",
        "   c. өзге тұлғаның төлқұжатын немесе медициналық ақпаратын рұқсатсыз пайдалану.",
      ],
    },
    {
      id: "company_obligations",
      title: "7-бап (Компанияның міндеттері)",
      body: [
        "1. Компания Қызметті ұсынуға қатысты заңнама мен осы Шарттарда тыйым салынған әрекеттерді жасамайды әрі Қызметті тұрақты ұсыну үшін барынша күш салады.",
        "2. Компания пайдаланушылардың дербес деректерін қорғау мақсатында Құпиялылық саясатында көзделген қорғау шараларын жүзеге асырады.",
        "3. Компания пайдаланушылардың шағымдарын қарау және залалды өтеу үшін арнайы арнаның жұмысын қамтамасыз етеді.",
      ],
    },
    {
      id: "payment",
      title: "8-бап (Төлем және қаражатты қайтару)",
      body: [
        "1. Пайдаланушы Компанияға ешқандай қызмет ақысын немесе комиссия төлемейді. Компанияның сыйақысы серіктес медициналық мекеме төлейтін тарту комиссиясы есебінен жабылады.",
        "2. Емдеу шығындары алдын ала сметада (5-бап) көрсетілген сомалар негізінде белгіленеді және пайдаланушы оны тиісті медициналық мекемеге тікелей төлейді (несие карталары, банктік немесе халықаралық аударымдар және өзге де тәсілдермен). Компания пайдаланушының атынан емделу ақысын қабылдамайды.",
        "3. Пайдаланушы Компанияға ешқандай сома төлемегендіктен, Компания тарапынан қаражат қайтарылмайды. Емдеу шығындарын қайтару мына тәртіппен реттеледі:",
        "   a. емдеу медициналық мекеменің жағдайына байланысты мүмкін болмаған жағдайда — емдеу шығындары сол медициналық мекеменің қайтару саясатына сәйкес қайтарылады;",
        "   b. пайдаланушы шартты өз себептерімен бұзған жағдайда — емдеу шығындарын қайтару әр медициналық мекеменің қайтару саясатына сәйкес жүзеге асырылады;",
        "   c. бұрын көрсетілген медициналық қызметтер (тексеру, ота және т. б.) қайтаруға жатпайды.",
      ],
    },
    {
      id: "medical_disclaimer",
      title: "9-бап (Медициналық жауапкершіліктен бас тарту)",
      body: [
        "1. Кез келген диагностика, ем, ота, дәрі тағайындау және емшаралар тиісті медициналық мекеме мен оның медицина қызметкерлерінің шешімі мен жауапкершілігі негізінде жүзеге асырылады.",
        "2. Компания медициналық мекемелердің салғырттығы, жанама әсерлері, медициналық қателіктері немесе медициналық даулары үшін медициналық жауапкершілік көтермейді. Бұл ретте Компания серіктес медициналық мекемелерді таңдауда негізделген сақтық танытады.",
        "3. Медициналық оқиға орын алған жағдайда пайдаланушы залалды өтеу туралы талапты тікелей тиісті медициналық мекемеге қоя алады, ал Компания Корея медициналық дауларды медиациялау және төрелік агенттігі (https://www.k-medi.or.kr) туралы ақпарат пен қарым-қатынас бойынша қолдау көрсетеді.",
        "4. Компания емдеудің немесе процедураның сәттілігіне, не белгілі бір медициналық нәтижеге кепілдік бермейді. Компанияның делдалдық және қолдау рөлі мен тиісті есеп айырысу емдеу нәтижесіне қарамастан күшінде болады.",
        "5. Сервис арқылы немесе координатор арқылы берілген кез келген медициналық ақпарат немесе түсініктеме анықтамалық сипатта болады; Компания оның дәлдігі немесе осыған байланысты емдеу нәтижесі үшін жауап бермейді. Нақты медициналық шешімдерді әрқашан емдеуші медицина қызметкерінен нақтылаңыз.",
      ],
    },
    {
      id: "limitation",
      title: "10-бап (Жауапкершілікті шектеу)",
      body: [
        "1. Компания дүлей зілзала, соғыс, терроризм, пандемия немесе көші-қон саясатының өзгеруі сияқты еңсерілмейтін күш мән-жайлары салдарынан Қызметтің тоқтатылуы үшін жауап бермейді.",
        "2. Компания пайдаланушыға қатысты себептер бойынша туындаған залал үшін жауап бермейді.",
        "3. Компания пайдаланушы мен медициналық мекеме арасындағы емдеу шартының тарапы емес және медициналық мекеменің емдеу әрекеттері мен нәтижелерінен немесе Компанияның ақылға қонымды бақылауынан тыс үшінші тұлғалардың әрекеттерінен туындаған залал үшін жауап бермейді (9-бапты қараңыз). Компанияның жауапкершілігі Компания өзі көрсететін делдалдық және координациялық қызметтерге қатысты залалмен шектеледі. Компанияның қасақаналығы немесе өрескел абайсыздығы салдарынан келтірілген залал үшін жауапкершілік бұған кірмейді.",
        "4. Егер пайдаланушы осы Шарттарды бұзу, Сервисті дұрыс пайдаланбау немесе заңды не үшінші тұлғалардың құқықтарын бұзу салдарынан Компанияға немесе үшінші тұлғаға зиян келтірсе, ол зиян үшін жауапкершілік пайдаланушыға жүктеледі және пайдаланушы Компания шеккен залалды (қорғану мен реттеудің ақылға қонымды шығындарын қоса) өтейді.",
        "5. Осы бап заңнаманың императивтік нормаларына қайшы келмейтін шамада қолданылады.",
      ],
    },
    {
      id: "intellectual_property",
      title: "11-бап (Зияткерлік меншік)",
      body: [
        "1. Компания ұсынатын Қызметке кіретін объектілерге (мәтін, кескіндер, бағдарламалық қамтамасыз ету, тауар белгілері және т. б.) құқықтар Компанияға немесе заңды құқық иеленушіге тиесілі.",
        "2. Пайдаланушы Компанияның алдын ала жазбаша келісімінсіз мұндай объектілерді көшіруге, таратуға немесе солардың негізінде туынды шығармалар жасауға құқылы емес.",
        "3. Пайдаланушы Қызмет арқылы ұсынған пікірлер мен ұсынымдар сияқты мазмұнға қатысты пайдаланушы Компанияға мұндай мазмұнды Қызметті пайдалану және жарнамалау мақсатында пайдалануға айрықша емес лицензия береді.",
      ],
    },
    {
      id: "termination",
      title: "12-бап (Пайдалануды тоқтата тұру және шартты бұзу)",
      body: [
        "1. Компания пайдаланушы мынадай жағдайлардың кез келгеніне жатқанда алдын ала хабарлағаннан кейін Қызметті пайдалануды тоқтата тұра алады немесе шартты бұза алады:",
        "   a. осы Шарттарды бұзу;",
        "   b. өзге тұлғалардың құқықтарын бұзу;",
        "   c. заңнаманы бұзу.",
        "2. Пайдаланушы шартты кез келген уақытта бұза алады. Бұл ретте бұрын көрсетілген қызметтерге 8-бапта көзделген қаражатты қайтару шарттары қолданылады.",
      ],
    },
    {
      id: "dispute",
      title: "13-бап (Дауларды шешу және қолданылатын құқық)",
      body: [
        "1. Осы Шарттар Корея Республикасының заңнамасымен реттеледі.",
        "2. Компания мен пайдаланушы арасындағы даулар ең алдымен келіссөздер арқылы шешіледі, ал келісімге қол жеткізу мүмкін болмаған жағдайда тараптар мынадай ұйымдардың медиациясына жүгіне алады:",
        "   a. медициналық даулар: Корея медициналық дауларды медиациялау және төрелік агенттігі (https://www.k-medi.or.kr);",
        "   b. тұтынушылық даулар: Корея тұтынушылар агенттігі (https://www.kca.go.kr);",
        "   c. дербес деректерге қатысты даулар: Дербес деректер бойынша дауларды медиациялау комитеті (https://www.kopico.go.kr).",
        "3. Дау сот талқылауына өткен жағдайда бірінші сатыдағы сот Сеулдің Орталық округтік соты болып табылады. Алайда пайдаланушының мекенжайы Корея Республикасынан тыс болса, пайдаланушы өзінің тұрғылықты жері бойынша сотты таңдай алады.",
      ],
    },
    {
      id: "language",
      title: "14-бап (Тіл)",
      body: [
        "1. Осы Шарттар корей, ағылшын, орыс, қазақ, қытай және жапон тілдерінде ұсынылады.",
        "2. Аударылған нұсқалар арасында түсіндіруде сәйкессіздіктер болған жағдайда, Корея Республикасы аумағындағы заңды күш үшін корей тіліндегі нұсқа басым болады. Алайда пайдаланушының азаматтығы немесе тұрғылықты жері бойынша тұтынушылардың құқықтарын қорғау туралы заңнама императивтік норма ретінде өзге стандартты талап еткен жағдайда, осындай норма басым күшке ие болады.",
      ],
    },
    {
      id: "changes",
      title: "15-бап (Шарттарды өзгерту)",
      body: [
        "1. Компания осы Шарттарды қолданылатын заңнаманы бұзбайтын шамада өзгерте алады әрі өзгерту кезінде ол туралы Қызмет ішінде және электрондық пошта арқылы өзгерістердің күшіне ену күніне дейін кемінде 7 күн бұрын (пайдаланушылар үшін қолайсыз өзгерістер кезінде — 30 күн бұрын) хабарлайды.",
        "2. Пайдаланушы өзгертілген Шарттармен келіспеген жағдайда шартты бұза алады. Пайдаланушы өзгертілген Шарттар күшіне енген күннен кейін Қызметті пайдалануды жалғастырса, ол өзгерістермен келіскен деп есептеледі.",
      ],
    },
    {
      id: "telemedicine",
      title: "16-бап (Қашықтан кеңес беру және бейнеқоңырау)",
      body: [
        "1. Компания пайдаланушыларды кореялық медицина мамандары мен аудармашылармен байланыстыратын бейнекеңес беру функциясын ұсынады. Бұл медициналық мекемедегі емдеуді алмастырмайды және Компания мұндай кеңес беру барысында медициналық қызмет көрсетпейді.",
        "2. Компания кеңестерді жазып алмайды (дыбыс та, бейне де). Болашақта жазу функциясы енгізілсе, ол тек алдын ала жеке келісім алынып, Құпиялылық саясаты өзгертілгеннен кейін ғана қосылады.",
        "3. Кеңес беру кезінде ұсынылатын автоматты субтитрлер мен аударма машиналық жолмен жасалады, қателер мен түсіп қалулар болуы мүмкін және тек анықтамалық сипатта болады. Маңызды медициналық мәліметтерді емдеуші дәрігерден немесе аудармашы арқылы міндетті түрде қайта нақтылаңыз.",
        "4. Пайдаланушы басқа қатысушылардың келісімінсіз кеңестің бейнесі мен дыбысын жазуға немесе жариялауға құқылы емес.",
        "5. Компания желі жағдайына, құрылғы өнімділігіне немесе Компанияның ақылға қонымды бақылауынан тыс өзге де себептерге байланысты кеңестің кешігуі немесе үзілуі үшін жауап бермейді.",
      ],
    },
    {
      id: "mobile_app",
      title: "17-бап (Мобильді қосымша және хабарламалар)",
      body: [
        "1. Компания дәл сол Қызметті мобильді қосымша арқылы ұсына алады; осы Шарттар қосымшаны пайдалануға да бірдей қолданылады.",
        "2. Қосымшаның push-хабарламалары пайдаланушы құрылғыда рұқсат берген жағдайда ғана жіберіледі және құрылғы параметрлерінде кез келген уақытта өшірілуі мүмкін. Хабарламалар өшірілген күнде де қызмет көрсетуге қажетті ақпарат электрондық поштаға жіберілуі мүмкін.",
        "3. Пайдаланушы қосымшадағы немесе сайттағы тіркелгіні жою экранында тіркелгіні жоюды сұрай алады; Компания заң бойынша сақтауға міндетті мәліметтерді қоспағанда, оны 30 күн ішінде жояды.",
        "4. Қосымшаның камераға, микрофонға, фотосуреттерге және хабарламаларға рұқсаттары міндетті емес; оларды бермей-ақ қосымшаны пайдалануға болады (тек тиісті функция шектеледі). Рұқсаттарды құрылғы параметрлерінде кез келген уақытта өзгертуге болады.",
        "5. Қосымшаны орнату мен жаңартуға тиісті қосымшалар дүкенінің (App Store, Google Play) шарттары қосымша қолданылады.",
      ],
    },
    {
      id: "contact",
      title: "18-бап (Байланыс деректері)",
      body: [
        "· Фирмалық атауы: BONROI — қызмет атауы: healwith",
        "· Қызмет нысаны: жеке кәсіпкер",
        "· Өкілі: JUYOUNG KANG",
        "· Кәсіпорынды тіркеу нөмірі: 463-35-00902",
        "· Шетелдік пациенттерді тарту операторын тіркеу нөмірі: A-2026-01-02-06761 (Сеул қаласының әкімі тіркеген, қолданылу мерзімі 2026-03-11 — 2029-03-10)",
        "· Мекенжайы: Корея Республикасы, Сеул, Кансо-гу, Кансо-ро 385, 613-кеңсе (Магок-дон, Woosung SB Tower)",
        "· Электрондық пошта (клиенттік / құқықтық / дербес деректер мәселелері бойынша бірыңғай): admin@healwith.co.kr",
        "· Телефон: +82-10-4772-1075 (халықаралық) · 070-7500-7795 (ел ішінде)",
        "· Жұмыс уақыты: жұмыс күндері 09:00-18:00 KST",
      ],
    },
  ],
};

const ZH = {
  pageTitle: "使用条款",
  lastUpdated: "生效日",
  version: "版本",
  sections: [
    {
      id: "purpose",
      title: "第1条（目的）",
      body: [
        "本条款旨在就使用本罗伊（BONROI，以下简称“公司”）所提供的医疗礼宾服务“healwith”（以下简称“服务”）相关事宜，规定公司与用户之间的权利、义务、责任及其他必要事项。",
      ],
    },
    {
      id: "definitions",
      title: "第2条（用语定义）",
      body: [
        "1. “服务”是指公司提供的与吸引外国患者相关的各项服务，包括医疗机构匹配、预约支持、签证及停留支持、口译、旅行便利及后续管理等。",
        "2. “用户”是指同意本条款并使用服务的人，包括会员和非会员。",
        "3. “患者”是指希望通过服务接受医疗机构诊疗的人或其监护人。",
        "4. “医疗机构”是指与公司合作、位于大韩民国境内的医院、诊所或专业医疗机构。",
        "5. “招揽业登记”是指依据大韩民国《医疗海外拓展及外国患者招揽支援法》第6条向保健福祉部进行的登记。",
      ],
    },
    {
      id: "nature_of_service",
      title: "第3条（服务的性质）",
      body: [
        "1. 公司并非医疗机构，不提供诊断、治疗或处方。",
        "2. 公司系登记的外国患者招揽业经营主体，承担用户与医疗机构之间的匹配、信息传递及便利支持等职能。",
        "3. 医疗咨询、诊疗及处置完全由相关医疗机构的医务人员判断并负责进行，公司对其结果不承担医疗责任。",
        "4. 服务中提供的基于人工智能的信息（症状指引、匹配推荐等）仅供参考，并非医学诊断或建议。实际医疗判断请务必咨询医务人员。",
      ],
    },
    {
      id: "registration",
      title: "第4条（服务使用申请及合同成立）",
      body: [
        "1. 希望使用服务者，应按照公司规定的格式填写必要信息，并同意本条款及隐私政策，以此申请使用合同。",
        "2. 未满14周岁的儿童使用服务时，须确认法定代理人的同意。对于适用监护人陪同原则的治疗，公司将另行确认监护人信息。",
        "3. 公司在符合下列任一情形时，可拒绝使用申请：",
        "   一、填写虚假信息；",
        "   二、以违反法令或公序良俗为目的的使用；",
        "   三、因技术限制无法提供服务的情形。",
      ],
    },
    {
      id: "treatment_fee_notice",
      title: "第5条（诊疗费等事前告知）",
      body: [
        "公司依据相关法令，在患者签订诊疗合同前，以书面（含电子文档）形式，以用户母语或英语告知下列事项：",
        "",
        "1. 诊疗费预估金额及核算依据；",
        "2. 公司向医疗机构收取的招揽手续费率或金额；",
        "3. 停留、口译等附带费用；",
        "4. 诊疗费支付方式及退款条件；",
        "5. 投诉及纠纷处理程序（含韩国医疗纠纷调解仲裁院的指引）。",
        "",
        "上述事项以报价单形式提供，经用户确认签字后，服务正式开始。",
      ],
    },
    {
      id: "user_responsibilities",
      title: "第6条（用户的义务）",
      body: [
        "1. 用户应提供准确且最新的信息（含病历）。因虚假信息导致的医疗结果、签证问题等由用户承担责任。",
        "2. 用户应遵守大韩民国法令、医疗机构的内部规定以及出入境相关规定。",
        "3. 用户应对在使用服务过程中知悉的其他用户、医疗机构的信息予以保密。",
        "4. 用户不得实施下列行为：",
        "   一、对公司、医疗机构或其他用户进行名誉损害，以及非法录音、录像或散布；",
        "   二、非法使用系统、植入恶意代码、逆向工程；",
        "   三、擅自使用他人的护照或医疗信息。",
      ],
    },
    {
      id: "company_obligations",
      title: "第7条（公司的义务）",
      body: [
        "1. 公司不实施有关服务提供的法令及本条款所禁止的行为，并尽最大努力稳定地提供服务。",
        "2. 公司为保护用户的个人信息，实施依据《隐私政策》的安全措施。",
        "3. 公司为救济用户的投诉及损害，设立专门窗口。",
      ],
    },
    {
      id: "payment",
      title: "第8条（结算与退款）",
      body: [
        "1. 用户无需向公司支付任何服务费或手续费。公司的报酬由合作医疗机构支付的招揽佣金承担。",
        "2. 诊疗费用以事前报价单（第5条）中载明的金额为准，由用户直接支付给相关医疗机构（信用卡、银行转账、国际汇款等）。公司不代为收取用户的诊疗费用。",
        "3. 因用户未向公司支付任何费用，公司不产生退款。诊疗费用的退款按以下办理：",
        "   一、因医疗机构原因导致无法诊疗的——诊疗费按该医疗机构的退款政策退还；",
        "   二、因用户自身原因解除合同的——诊疗费退款按各医疗机构的退款政策办理；",
        "   三、已实施的医疗服务（诊疗、手术等）不予退款。",
      ],
    },
    {
      id: "medical_disclaimer",
      title: "第9条（医疗免责）",
      body: [
        "1. 一切诊断、治疗、手术、处方及处置均由相关医疗机构及其所属医务人员判断并负责进行。",
        "2. 公司对医疗机构的过失、副作用、医疗事故或医疗纠纷不承担医疗责任。但公司在选定合作医疗机构时应尽合理的注意义务。",
        "3. 发生医疗事故时，用户可直接向相关医疗机构请求损害赔偿，公司将提供韩国医疗纠纷调解仲裁院（https://www.k-medi.or.kr）的指引及沟通支持。",
        "4. 公司不保证任何诊疗或手术的成功，也不保证特定的治疗结果。无论治疗结果如何，公司的中介与支持角色及相应结算均有效。",
        "5. 通过服务或协调员传达的任何医疗相关信息或说明仅供参考，公司对其准确性或由此产生的治疗结果不承担责任。实际医疗判断请务必向主治医疗人员确认。",
      ],
    },
    {
      id: "limitation",
      title: "第10条（责任限制）",
      body: [
        "1. 公司对因自然灾害、战争、恐怖袭击、流行病、出入境政策变更等不可抗力事由导致的服务中断不承担责任。",
        "2. 公司对因用户责任事由所产生的损害不承担责任。",
        "3. 公司并非用户与医疗机构之间诊疗合同的当事方，对医疗机构的诊疗行为及医疗结果，或超出公司合理控制范围的第三方行为所致的损害，不承担责任（参见第9条）。公司的责任仅限于公司自身提供的中介及协调服务所对应的损害。因公司故意或重大过失造成的损害，不在免责之列。",
        "4. 用户因违反本条款、不当使用服务，或侵犯法律或第三方权利而对公司或第三方造成损害的，责任由用户承担，用户应赔偿公司因此遭受的损失（包括合理的抗辩与应对费用）。",
        "5. 本条在不违反法令强制性规定的范围内适用。",
      ],
    },
    {
      id: "intellectual_property",
      title: "第11条（知识产权）",
      body: [
        "1. 公司所提供的服务中所含作品（文本、图像、软件、商标等）的权利归属于公司或合法权利人。",
        "2. 未经公司事先书面同意，用户不得复制、发布或二次创作上述作品。",
        "3. 对于用户通过服务提供的评价、评论等内容，用户授予公司可将该内容用于服务运营及宣传目的的非独占性许可。",
      ],
    },
    {
      id: "termination",
      title: "第12条（服务使用停止及合同解除）",
      body: [
        "1. 用户符合下列任一情形时，公司可在事先通知后停止其服务使用或解除合同：",
        "   一、违反本条款；",
        "   二、侵害他人权利；",
        "   三、违反法令。",
        "2. 用户可随时解除合同。但对于已进行的服务，适用第8条的退款标准。",
      ],
    },
    {
      id: "dispute",
      title: "第13条（纠纷解决及准据法）",
      body: [
        "1. 本条款适用大韩民国法律。",
        "2. 公司与用户之间的纠纷优先通过协商解决，协商不成时，可经下列机构调解：",
        "   一、医疗相关纠纷：韩国医疗纠纷调解仲裁院（https://www.k-medi.or.kr）；",
        "   二、消费者纠纷：韩国消费者院（https://www.kca.go.kr）；",
        "   三、个人信息纠纷：个人信息纠纷调解委员会（https://www.kopico.go.kr）。",
        "3. 纠纷进入诉讼程序时，以首尔中央地方法院为第一审管辖法院。但用户的住所地位于大韩民国境外的，用户可选择其居住地管辖法院。",
      ],
    },
    {
      id: "language",
      title: "第14条（语言）",
      body: [
        "1. 本条款以韩语、英语、俄语、哈萨克语、中文及日语提供。",
        "2. 各译本之间在解释上存在差异时，在大韩民国境内的法律效力以韩语版为准。但用户的国籍或居住地的消费者保护法以强制性规定要求适用其他标准的，以该规定优先。",
      ],
    },
    {
      id: "changes",
      title: "第15条（条款的变更）",
      body: [
        "1. 公司可在不违反相关法令的范围内变更条款，变更时将自生效日起至少提前7日（对用户不利的变更则提前30日）在服务内公告并通过电子邮件通知。",
        "2. 用户不同意变更后的条款时，可解除合同。在变更条款生效日之后仍继续使用服务的，视为同意该变更。",
      ],
    },
    {
      id: "telemedicine",
      title: "第16条（远程协诊·视频咨询）",
      body: [
        "1. 公司提供将用户与韩国医疗人员及口译人员连接的视频咨询功能。该功能不替代医疗机构的诊疗，公司在咨询过程中不进行医疗行为。",
        "2. 公司不对咨询进行录音或录像。今后如引入录制功能，将在事先取得单独同意并修订隐私政策后方可启用。",
        "3. 咨询过程中提供的自动字幕与翻译系机器处理结果，可能存在误译或遗漏，仅供参考。重要医疗内容请务必通过主治医疗人员或口译人员再次确认。",
        "4. 未经其他参与者同意，用户不得录制或公开咨询的画面与声音。",
        "5. 因网络环境、设备性能等超出公司合理控制范围的原因导致咨询延迟或中断的，公司不承担责任。",
      ],
    },
    {
      id: "mobile_app",
      title: "第17条（移动应用及通知）",
      body: [
        "1. 公司可通过移动应用提供与网页相同的服务，本条款同样适用于应用的使用。",
        "2. 应用推送通知仅在用户于设备上允许时发送，并可随时在设备设置中关闭。即使关闭通知，服务所必需的告知仍可能通过电子邮件发送。",
        "3. 用户可在应用或网页的账户删除页面申请删除账户；除法律要求保存的信息外，公司将在 30 日内销毁。",
        "4. 应用的相机、麦克风、照片及通知权限均为可选，即使不授予也可使用本应用（仅相关功能受限）。权限可随时在设备设置中更改。",
        "5. 应用的安装及更新还适用相应应用市场（App Store、Google Play）经营者的条款。",
      ],
    },
    {
      id: "contact",
      title: "第18条（联系方式）",
      body: [
        "· 商号：本罗伊（BONROI）——服务名称：healwith",
        "· 经营形态：个人经营者",
        "· 代表人：JUYOUNG KANG（姜周映）",
        "· 营业执照号：463-35-00902",
        "· 外国患者招揽业经营者登记号：A-2026-01-02-06761（首尔特别市市长登记，有效期 2026-03-11 至 2029-03-10）",
        "· 地址：大韩民国首尔特别市江西区江西路385号613室（麻谷洞，禹城SB大厦）",
        "· 电子邮箱（客户／法律／个人信息统一）：admin@healwith.co.kr",
        "· 电话：+82-10-4772-1075（国际）· 070-7500-7795（国内）",
        "· 运营时间：工作日 09:00-18:00 KST",
      ],
    },
  ],
};

const JA = {
  pageTitle: "利用規約",
  lastUpdated: "施行日",
  version: "バージョン",
  sections: [
    {
      id: "purpose",
      title: "第1条（目的）",
      body: [
        "本規約は、ボンロイ（BONROI、以下「当社」といいます）が提供するメディカルコンシェルジュサービス「healwith」（以下「本サービス」といいます）の利用に関し、当社と利用者との間の権利・義務・責任事項その他必要な事項を定めることを目的とします。",
      ],
    },
    {
      id: "definitions",
      title: "第2条（用語の定義）",
      body: [
        "1. 「本サービス」とは、当社が提供する医療機関のマッチング、予約支援、ビザ・滞在支援、通訳、旅行サポート、アフターケア等を含む外国人患者誘致に関する一切のサービスをいいます。",
        "2. 「利用者」とは、本規約に同意し本サービスを利用する者をいい、会員および非会員を含みます。",
        "3. 「患者」とは、本サービスを通じて医療機関の診療を受けようとする者またはその保護者をいいます。",
        "4. 「医療機関」とは、当社と提携した大韓民国内の病院・医院・専門医療機関をいいます。",
        "5. 「誘致業登録」とは、大韓民国「医療の海外進出および外国人患者誘致支援に関する法律」第6条に基づく保健福祉部への登録をいいます。",
      ],
    },
    {
      id: "nature_of_service",
      title: "第3条（本サービスの性格）",
      body: [
        "1. 当社は医療機関ではなく、診断、治療、処方を提供しません。",
        "2. 当社は外国人患者誘致業者として登録された主体であり、利用者と医療機関との間のマッチング・情報伝達・便宜支援の役割を担います。",
        "3. 医療相談・診療・処置は、すべて当該医療機関の医療従事者の判断および責任のもとで行われ、当社はその結果について医療上の責任を負いません。",
        "4. 本サービスで提供されるAIに基づく情報（症状案内、マッチング推薦等）は参考資料であり、医学的診断または勧告ではありません。実際の医療的判断については必ず医療従事者にお問い合わせください。",
      ],
    },
    {
      id: "registration",
      title: "第4条（利用申込みおよび契約の成立）",
      body: [
        "1. 本サービスの利用を希望する者は、当社が定める様式に従い必要な情報を記載し、本規約および個人情報取扱方針に同意することにより利用契約を申し込みます。",
        "2. 満14歳未満の児童が本サービスを利用する場合、法定代理人の同意を必ず確認します。保護者同伴の原則が適用される治療の場合、当社は保護者情報を別途確認します。",
        "3. 当社は、次の各号のいずれかに該当する場合、利用申込みを拒否することができます。",
        "   イ．虚偽の情報の記載",
        "   ロ．法令・公序良俗に違反する目的での利用",
        "   ハ．技術的制約によりサービスの提供が不可能な場合",
      ],
    },
    {
      id: "treatment_fee_notice",
      title: "第5条（診療費等の事前告知）",
      body: [
        "当社は、関係法令に従い、患者が診療契約を締結する前に、次の事項を書面（電子文書を含む）により利用者の母国語または英語で告知します。",
        "",
        "1. 診療費の予想金額および算定根拠",
        "2. 当社が医療機関から受け取る誘致手数料率または金額",
        "3. 滞在・通訳等の付帯費用",
        "4. 診療費の支払方法および返金条件",
        "5. 苦情・紛争処理手続（医療紛争調停仲裁院の案内を含む）",
        "",
        "上記の事項は見積書の形で提供され、利用者の確認署名の後に本サービスが本格的に開始されます。",
      ],
    },
    {
      id: "user_responsibilities",
      title: "第6条（利用者の義務）",
      body: [
        "1. 利用者は、正確かつ最新の情報（医療記録を含む）を提供しなければなりません。虚偽の情報による医療結果・ビザ問題等についての責任は利用者が負います。",
        "2. 利用者は、大韓民国の法令、医療機関の内部規定、出入国関連規定を遵守しなければなりません。",
        "3. 利用者は、本サービスの利用中に知り得た他の利用者・医療機関の情報を秘密に保持しなければなりません。",
        "4. 利用者は、次の行為を行うことができません。",
        "   イ．当社・医療機関・他の利用者に対する名誉毀損、違法な録音・録画・流布",
        "   ロ．システムの不正利用、悪意あるコードの挿入、リバースエンジニアリング",
        "   ハ．他人の旅券・医療情報の無断使用",
      ],
    },
    {
      id: "company_obligations",
      title: "第7条（当社の義務）",
      body: [
        "1. 当社は、本サービスの提供に関する法令および本規約が禁止する行為を行わず、安定したサービスの提供のために最善を尽くします。",
        "2. 当社は、利用者の個人情報保護のため、「個人情報取扱方針」に基づく安全措置を実施します。",
        "3. 当社は、利用者の苦情・被害の救済のため、専用窓口を運営します。",
      ],
    },
    {
      id: "payment",
      title: "第8条（決済および返金）",
      body: [
        "1. 利用者は当社にサービス利用料や手数料を一切支払いません。当社の報酬は、提携医療機関が支払う誘致手数料により賄われます。",
        "2. 治療費は事前見積書（第5条）に明示された金額を基準とし、利用者が当該医療機関へ直接お支払いいただきます（クレジットカード・口座振込・国際送金等）。当社は利用者の治療費を代理受領しません。",
        "3. 利用者は当社に何ら支払いを行わないため、当社による返金は発生しません。治療費の返金は以下によります：",
        "   イ．医療機関の事情により診療が不可能となった場合 — 治療費は当該医療機関の返金方針に従い返金されます。",
        "   ロ．利用者の事情により契約を解除する場合 — 治療費の返金は各医療機関の返金方針に従います。",
        "   ハ．既に行われた医療サービス（診療・手術等）は返金不可。",
      ],
    },
    {
      id: "medical_disclaimer",
      title: "第9条（医療免責）",
      body: [
        "1. すべての診断・治療・手術・処方・処置は、当該医療機関およびその所属医療従事者の判断・責任のもとで行われます。",
        "2. 当社は、医療機関の過失・副作用・医療事故・医療紛争について医療上の責任を負いません。ただし、当社は提携医療機関の選定にあたり合理的な注意義務を尽くします。",
        "3. 医療事故が発生した場合、利用者は当該医療機関に対して直接損害賠償を請求することができ、当社は韓国医療紛争調停仲裁院（https://www.k-medi.or.kr）の案内および意思疎通の支援を提供します。",
        "4. 当社は、診療・施術の成功や特定の治療結果を保証しません。治療結果にかかわらず、当社の仲介・支援の役割および対応する精算は有効です。",
        "5. サービスまたはコーディネーターを通じて伝えられた医療関連の情報・案内は参考用であり、その正確性やそれに伴う治療結果について当社は責任を負いません。実際の医療判断は必ず担当医療陣にご確認ください。",
      ],
    },
    {
      id: "limitation",
      title: "第10条（責任の制限）",
      body: [
        "1. 当社は、天災地変、戦争、テロ、パンデミック、出入国政策の変更等の不可抗力事由によるサービスの中断について責任を負いません。",
        "2. 当社は、利用者の責めに帰すべき事由により生じた損害について責任を負いません。",
        "3. 当社は、利用者と医療機関との間の診療契約の当事者ではなく、医療機関の診療行為・医療結果、または当社の合理的な支配を超える第三者の行為に起因する損害について責任を負いません（第9条参照）。当社の責任は、当社自身が提供する仲介・コーディネーションサービスに帰属する損害に限られます。ただし、当社の故意または重過失による損害についての責任は排除されません。",
        "4. 利用者が本規約に違反し、サービスを不正に利用し、または法令や第三者の権利を侵害して当社もしくは第三者に損害を与えた場合、その責任は利用者が負い、利用者は当社が被った損害（合理的な防御・対応費用を含む）を賠償します。",
        "5. 本条は、法令上の強行規定に反しない範囲内で適用されます。",
      ],
    },
    {
      id: "intellectual_property",
      title: "第11条（知的財産権）",
      body: [
        "1. 当社が提供する本サービスに含まれる著作物（テキスト、画像、ソフトウェア、商標等）に対する権利は、当社または正当な権利者に帰属します。",
        "2. 利用者は、当社の事前の書面による同意なく、著作物を複製・配布・二次創作することはできません。",
        "3. 利用者が本サービスを通じて提供したレビュー・口コミ等のコンテンツについて、利用者は当社に対し、当該コンテンツを本サービスの運営・宣伝の目的で利用することができる非独占的ライセンスを付与します。",
      ],
    },
    {
      id: "termination",
      title: "第12条（サービス利用の停止および契約の解除）",
      body: [
        "1. 当社は、利用者が次の各号のいずれかに該当する場合、事前通知の上、サービスの利用を停止し、または契約を解除することができます。",
        "   イ．本規約の違反",
        "   ロ．他人の権利の侵害",
        "   ハ．法令の違反",
        "2. 利用者は、いつでも契約を解除することができます。ただし、既に行われたサービスについては第8条の返金基準が適用されます。",
      ],
    },
    {
      id: "dispute",
      title: "第13条（紛争解決および準拠法）",
      body: [
        "1. 本規約は、大韓民国の法律に従います。",
        "2. 当社と利用者との間の紛争は、まず協議により解決し、協議が不可能な場合は、次の機関の調停を経ることができます。",
        "   イ．医療関連の紛争：韓国医療紛争調停仲裁院（https://www.k-medi.or.kr）",
        "   ロ．消費者紛争：韓国消費者院（https://www.kca.go.kr）",
        "   ハ．個人情報紛争：個人情報紛争調停委員会（https://www.kopico.go.kr）",
        "3. 紛争が訴訟に進む場合、ソウル中央地方法院を第一審の管轄裁判所とします。ただし、利用者の住所地が大韓民国外である場合、利用者は居住地の管轄裁判所を選択することができます。",
      ],
    },
    {
      id: "language",
      title: "第14条（言語）",
      body: [
        "1. 本規約は、韓国語・英語・ロシア語・カザフ語・中国語・日本語で提供されます。",
        "2. 翻訳版間で解釈の相違がある場合、大韓民国内における法的効力は韓国語版を基準とします。ただし、利用者の国籍または居住地の消費者保護法が強行規定として異なる基準を要求する場合は、当該規定が優先します。",
      ],
    },
    {
      id: "changes",
      title: "第15条（規約の変更）",
      body: [
        "1. 当社は、関連法令に違反しない範囲で規約を変更することができ、変更する場合は施行日の少なくとも7日前（利用者に不利な変更の場合は30日前）に、サービス内の告知および電子メールにより通知します。",
        "2. 利用者が変更後の規約に同意しない場合は、契約を解除することができます。変更後の規約の施行日以降も本サービスを引き続き利用する場合は、変更に同意したものとみなされます。",
      ],
    },
    {
      id: "telemedicine",
      title: "第16条（遠隔協診・ビデオ相談）",
      body: [
        "1. 当社は、利用者と韓国の医療スタッフ・通訳者をつなぐビデオ相談機能を提供します。これは医療機関での診療に代わるものではなく、当社は相談の過程で医療行為を行いません。",
        "2. 当社は相談の録画・録音を行いません。将来、録画機能を導入する場合は、事前に個別の同意を取得し、プライバシーポリシーを改定したうえでのみ実施します。",
        "3. 相談中に提供される自動字幕・翻訳は機械処理の結果であり、誤訳や欠落が生じることがあるため参考用です。重要な医療内容は、必ず担当の医療スタッフまたは通訳者を通じて再確認してください。",
        "4. 利用者は、他の参加者の同意なく相談の画面・音声を録音・録画し、または外部に公開することはできません。",
        "5. 通信環境・端末性能など、当社の合理的な支配を超える事由による相談の遅延・中断について、当社は責任を負いません。",
      ],
    },
    {
      id: "mobile_app",
      title: "第17条（モバイルアプリおよび通知）",
      body: [
        "1. 当社はウェブと同一のサービスをモバイルアプリで提供することがあり、アプリの利用にも本規約が同様に適用されます。",
        "2. アプリのプッシュ通知は、利用者が端末で許可した場合にのみ送信され、端末の設定からいつでも解除できます。通知を解除した場合でも、サービス利用に必要な案内はメールで送信されることがあります。",
        "3. 利用者は、アプリまたはウェブのアカウント削除画面からアカウントの削除を請求でき、当社は法令上の保存義務がある情報を除き 30 日以内に破棄します。",
        "4. アプリのカメラ・マイク・写真・通知の権限はいずれも任意であり、許可しなくてもアプリをご利用いただけます（該当機能のみ制限されます）。権限は端末の設定からいつでも変更できます。",
        "5. アプリのインストールおよび更新には、各アプリマーケット（App Store・Google Play）事業者の規約も併せて適用されます。",
      ],
    },
    {
      id: "contact",
      title: "第18条（連絡先）",
      body: [
        "・商号：ボンロイ（BONROI）— サービス名：healwith",
        "・事業形態：個人事業主",
        "・代表者：JUYOUNG KANG（姜周映）",
        "・事業者登録番号：463-35-00902",
        "・外国人患者誘致業者登録番号：A-2026-01-02-06761（ソウル特別市長登録、有効期間 2026-03-11 ～ 2029-03-10）",
        "・住所：大韓民国ソウル特別市江西区江西路385、613号（麻谷洞、ウソンSBタワー）",
        "・電子メール（顧客／法律／個人情報の統合）：admin@healwith.co.kr",
        "・電話：+82-10-4772-1075（国際）・070-7500-7795（国内）",
        "・営業時間：平日 09:00-18:00 KST",
      ],
    },
  ],
};

const LANGUAGES = { ko: KO, en: EN, ru: RU, kz: KZ, zh: ZH, ja: JA };

export function getTermsOfService(lang = "ko") {
  return LANGUAGES[lang] || KO;
}
