/**
 * HEALO: Medical Visa Guide (Static Data)
 *
 * 한국 의료비자 정보를 국적·치료기간별로 안내.
 * 법률 정보이므로 AI 생성이 아닌 정적 데이터 사용.
 *
 * 비자 유형:
 * - C-3-3: 단기 의료관광 (90일 이내)
 * - G-1-10: 장기 치료 (91일 이상)
 */

export type VisaType = 'C-3-3' | 'G-1-10';

export interface VisaInfo {
  visaType: VisaType;
  name: Record<string, string>;
  maxStay: string;
  description: Record<string, string>;
  requiredDocuments: VisaDocument[];
  processingTime: Record<string, string>;
  fee: string;
  notes: Record<string, string>;
}

export interface VisaDocument {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  required: boolean;
}

export interface VisaChecklist {
  visaType: VisaType;
  visaName: string;
  maxStay: string;
  description: string;
  processingTime: string;
  fee: string;
  notes: string;
  documents: Array<{
    id: string;
    name: string;
    description: string;
    required: boolean;
    checked: boolean;
  }>;
}

// ========================================
// Static Visa Data
// ========================================

const COMMON_DOCUMENTS: VisaDocument[] = [
  {
    id: 'passport',
    name: {
      ko: '여권', en: 'Passport', ru: 'Паспорт',
      zh: '护照', ja: 'パスポート', kz: 'Паспорт',
    },
    description: {
      ko: '유효기간 6개월 이상 남은 여권 원본',
      en: 'Original passport with at least 6 months validity',
      ru: 'Оригинал паспорта со сроком действия не менее 6 месяцев',
      zh: '有效期超过6个月的护照原件',
      ja: '残存有効期間6ヶ月以上のパスポート原本',
      kz: 'Жарамдылық мерзімі 6 айдан кем емес паспорт түпнұсқасы',
    },
    required: true,
  },
  {
    id: 'photo',
    name: {
      ko: '증명사진', en: 'Photo', ru: 'Фотография',
      zh: '证件照', ja: '証明写真', kz: 'Фотосурет',
    },
    description: {
      ko: '3.5×4.5cm 컬러 사진 1매',
      en: '1 color photo (3.5×4.5cm)',
      ru: '1 цветная фотография (3,5×4,5 см)',
      zh: '1张彩色照片（3.5×4.5厘米）',
      ja: 'カラー写真1枚（3.5×4.5cm）',
      kz: '1 түрлі-түсті фотосурет (3,5×4,5 см)',
    },
    required: true,
  },
  {
    id: 'application',
    name: {
      ko: '비자 신청서', en: 'Visa Application Form', ru: 'Заявление на визу',
      zh: '签证申请表', ja: 'ビザ申請書', kz: 'Виза өтінімі',
    },
    description: {
      ko: '대한민국 비자 신청서 (소정 양식)',
      en: 'Korea visa application form (standard form)',
      ru: 'Заявление на визу в Республику Корея (стандартная форма)',
      zh: '韩国签证申请表（标准格式）',
      ja: '大韓民国ビザ申請書（所定書式）',
      kz: 'Корея Республикасына виза өтінімі (стандартты нысан)',
    },
    required: true,
  },
  {
    id: 'medical_confirmation',
    name: {
      ko: '의료기관 확인서', en: 'Medical Institution Confirmation',
      ru: 'Подтверждение медицинского учреждения',
      zh: '医疗机构确认书', ja: '医療機関確認書',
      kz: 'Медициналық мекеме растамасы',
    },
    description: {
      ko: '한국 의료기관에서 발급한 진료 예약 확인서 또는 초청장',
      en: 'Appointment confirmation or invitation letter from Korean medical institution',
      ru: 'Подтверждение записи или приглашение от корейского медицинского учреждения',
      zh: '韩国医疗机构出具的预约确认书或邀请函',
      ja: '韓国医療機関発行の診療予約確認書または招待状',
      kz: 'Корей медициналық мекемесінен жазылу растамасы немесе шақыру хаты',
    },
    required: true,
  },
  {
    id: 'financial_proof',
    name: {
      ko: '재정 증명', en: 'Financial Proof', ru: 'Финансовое подтверждение',
      zh: '财务证明', ja: '財政証明', kz: 'Қаржылық растау',
    },
    description: {
      ko: '은행 잔고 증명서 또는 치료비 납부 영수증',
      en: 'Bank statement or medical payment receipt',
      ru: 'Банковская выписка или квитанция об оплате лечения',
      zh: '银行存款证明或治疗费支付收据',
      ja: '銀行残高証明書または治療費支払い領収書',
      kz: 'Банк үзіндісі немесе емдеу ақысын төлеу түбіртегі',
    },
    required: true,
  },
];

const G1_ADDITIONAL_DOCUMENTS: VisaDocument[] = [
  {
    id: 'treatment_plan',
    name: {
      ko: '치료 계획서', en: 'Treatment Plan', ru: 'План лечения',
      zh: '治疗计划', ja: '治療計画書', kz: 'Емдеу жоспары',
    },
    description: {
      ko: '의료기관에서 발급한 상세 치료 계획서 (예상 치료 기간 포함)',
      en: 'Detailed treatment plan from medical institution (including expected duration)',
      ru: 'Подробный план лечения от медицинского учреждения (включая ожидаемый срок)',
      zh: '医疗机构出具的详细治疗计划（包括预计治疗时间）',
      ja: '医療機関発行の詳細治療計画書（予想治療期間含む）',
      kz: 'Медициналық мекемеден алынған егжей-тегжейлі емдеу жоспары (болжалды мерзімін қоса)',
    },
    required: true,
  },
  {
    id: 'medical_records',
    name: {
      ko: '의무 기록', en: 'Medical Records', ru: 'Медицинские записи',
      zh: '病历', ja: '診療記録', kz: 'Медициналық жазбалар',
    },
    description: {
      ko: '본국 의료기관의 진단서 또는 소견서 (번역 공증 필요)',
      en: 'Diagnosis or referral letter from home country (notarized translation required)',
      ru: 'Диагноз или направление из медучреждения родной страны (нотариальный перевод)',
      zh: '本国医疗机构的诊断书或意见书（需公证翻译）',
      ja: '母国医療機関の診断書または紹介状（翻訳公証必要）',
      kz: 'Ата-мекендегі медмекеменің диагнозы немесе жолдамасы (нотариалды аударма)',
    },
    required: true,
  },
];

const VISA_DATA: Record<VisaType, VisaInfo> = {
  'C-3-3': {
    visaType: 'C-3-3',
    name: {
      ko: '단기 의료관광 비자 (C-3-3)',
      en: 'Short-term Medical Tourism Visa (C-3-3)',
      ru: 'Краткосрочная медицинская виза (C-3-3)',
      zh: '短期医疗旅游签证 (C-3-3)',
      ja: '短期医療観光ビザ (C-3-3)',
      kz: 'Қысқа мерзімді медициналық виза (C-3-3)',
    },
    maxStay: '90',
    description: {
      ko: '90일 이내 단기 치료, 검진, 건강검진 등을 위한 비자',
      en: 'Visa for short-term treatment, checkups, or health screenings within 90 days',
      ru: 'Виза для краткосрочного лечения, обследования или медосмотра до 90 дней',
      zh: '90天以内短期治疗、检查或体检签证',
      ja: '90日以内の短期治療・検診・健康診断のためのビザ',
      kz: '90 күнге дейінгі қысқа мерзімді емдеу, тексеру үшін виза',
    },
    requiredDocuments: [...COMMON_DOCUMENTS],
    processingTime: {
      ko: '약 5~7 영업일', en: 'Approx. 5-7 business days',
      ru: 'Примерно 5-7 рабочих дней', zh: '约5-7个工作日',
      ja: '約5〜7営業日', kz: 'Шамамен 5-7 жұмыс күні',
    },
    fee: 'USD 40',
    notes: {
      ko: '무비자 입국 가능 국가 국민은 별도 비자 없이 입국 후 의료 서비스 이용 가능',
      en: 'Citizens of visa-free countries can receive medical services without a separate visa',
      ru: 'Граждане стран с безвизовым режимом могут получать медицинские услуги без отдельной визы',
      zh: '免签国家公民可在入境后无需额外签证即可享受医疗服务',
      ja: 'ビザ免除国の国民は別途ビザなしで入国後医療サービスの利用が可能',
      kz: 'Визасыз елдердің азаматтары бөлек визасыз медициналық қызметтерді ала алады',
    },
  },
  'G-1-10': {
    visaType: 'G-1-10',
    name: {
      ko: '장기 치료 비자 (G-1-10)',
      en: 'Long-term Treatment Visa (G-1-10)',
      ru: 'Долгосрочная лечебная виза (G-1-10)',
      zh: '长期治疗签证 (G-1-10)',
      ja: '長期治療ビザ (G-1-10)',
      kz: 'Ұзақ мерзімді емдеу визасы (G-1-10)',
    },
    maxStay: '365',
    description: {
      ko: '91일 이상 장기 치료가 필요한 환자를 위한 비자 (연장 가능)',
      en: 'Visa for patients requiring treatment over 91 days (extendable)',
      ru: 'Виза для пациентов, нуждающихся в лечении более 91 дня (с возможностью продления)',
      zh: '适用于需要91天以上治疗的患者签证（可延期）',
      ja: '91日以上の長期治療が必要な患者のためのビザ（延長可能）',
      kz: '91 күннен астам емделуді қажет ететін науқастарға арналған виза (ұзартуға болады)',
    },
    requiredDocuments: [...COMMON_DOCUMENTS, ...G1_ADDITIONAL_DOCUMENTS],
    processingTime: {
      ko: '약 7~14 영업일', en: 'Approx. 7-14 business days',
      ru: 'Примерно 7-14 рабочих дней', zh: '约7-14个工作日',
      ja: '約7〜14営業日', kz: 'Шамамен 7-14 жұмыс күні',
    },
    fee: 'USD 60',
    notes: {
      ko: '치료 기간 연장 시 출입국관리사무소에서 체류기간 연장 신청 가능',
      en: 'Stay extension can be applied for at the Immigration Office if treatment is extended',
      ru: 'При продлении лечения можно подать заявление на продление пребывания в Иммиграционной службе',
      zh: '治疗延期时可在出入境管理处申请延长停留期限',
      ja: '治療期間延長時に出入国管理事務所で滞在期間延長申請が可能',
      kz: 'Емдеу мерзімі ұзартылған жағдайда Иммиграция кеңсесінде тұру мерзімін ұзарту өтінімін беруге болады',
    },
  },
};

// Embassy/Consulate info by nationality
const EMBASSY_INFO: Record<string, Record<string, string>> = {
  ru: {
    ko: '주러시아 대한민국 대사관 (모스크바)',
    en: 'Embassy of the Republic of Korea in Russia (Moscow)',
    url: 'https://overseas.mofa.go.kr/ru-ko/index.do',
  },
  kz: {
    ko: '주카자흐스탄 대한민국 대사관 (아스타나)',
    en: 'Embassy of the Republic of Korea in Kazakhstan (Astana)',
    url: 'https://overseas.mofa.go.kr/kz-ko/index.do',
  },
  mn: {
    ko: '주몽골 대한민국 대사관 (울란바토르)',
    en: 'Embassy of the Republic of Korea in Mongolia (Ulaanbaatar)',
    url: 'https://overseas.mofa.go.kr/mn-ko/index.do',
  },
  zh: {
    ko: '주중 대한민국 대사관 (베이징)',
    en: 'Embassy of the Republic of Korea in China (Beijing)',
    url: 'https://overseas.mofa.go.kr/cn-ko/index.do',
  },
  ja: {
    ko: '주일 대한민국 대사관 (도쿄)',
    en: 'Embassy of the Republic of Korea in Japan (Tokyo)',
    url: 'https://overseas.mofa.go.kr/jp-ko/index.do',
  },
};

// ========================================
// Public API
// ========================================

/**
 * 국적 + 치료 기간으로 추천 비자 유형 결정
 */
export function getVisaInfo(
  nationality: string,
  treatmentDurationDays: number
): { recommended: VisaInfo; alternative?: VisaInfo; embassy?: Record<string, string> } {
  const recommended = treatmentDurationDays > 90
    ? VISA_DATA['G-1-10']
    : VISA_DATA['C-3-3'];

  const alternative = treatmentDurationDays > 90
    ? undefined
    : VISA_DATA['G-1-10']; // Show G-1-10 as alternative for short stays

  const embassy = EMBASSY_INFO[nationality];

  return { recommended, alternative, embassy };
}

/**
 * 비자 체크리스트 반환 (다국어)
 */
export function getVisaChecklist(visaType: VisaType, lang: string): VisaChecklist {
  const visa = VISA_DATA[visaType];
  const l = lang || 'en';

  return {
    visaType: visa.visaType,
    visaName: visa.name[l] || visa.name['en'],
    maxStay: visa.maxStay,
    description: visa.description[l] || visa.description['en'],
    processingTime: visa.processingTime[l] || visa.processingTime['en'],
    fee: visa.fee,
    notes: visa.notes[l] || visa.notes['en'],
    documents: visa.requiredDocuments.map(doc => ({
      id: doc.id,
      name: doc.name[l] || doc.name['en'],
      description: doc.description[l] || doc.description['en'],
      required: doc.required,
      checked: false,
    })),
  };
}

/**
 * 모든 비자 유형 목록 반환
 */
export function getAllVisaTypes(lang: string): Array<{ type: VisaType; name: string; maxStay: string }> {
  return Object.values(VISA_DATA).map(v => ({
    type: v.visaType,
    name: v.name[lang] || v.name['en'],
    maxStay: v.maxStay,
  }));
}
