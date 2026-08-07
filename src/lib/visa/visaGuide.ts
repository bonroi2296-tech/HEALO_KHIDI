/**
 * healwith: Medical Visa Guide (Static Data)
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
      ko: '본국 의료기관의 진단서 또는 소견서 (국문 또는 영문 번역본 첨부)',
      en: 'Diagnosis or referral letter from home country (with Korean or English translation)',
      ru: 'Диагноз или направление из медучреждения родной страны (с переводом на корейский или английский)',
      zh: '本国医疗机构的诊断书或意见书（附韩语或英语译本）',
      ja: '母国医療機関の診断書または紹介状（韓国語または英語の翻訳文を添付）',
      kz: 'Туған еліндегі медициналық мекеменің диагнозы немесе жолдамасы (корей немесе ағылшын тіліндегі аудармасымен)',
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
      kz: '90 күнге дейінгі қысқа мерзімді емдеу, тексеру және медициналық тексеруге арналған виза',
    },
    requiredDocuments: [...COMMON_DOCUMENTS],
    processingTime: {
      ko: '공관마다 다름 (5영업일~3주)',
      en: 'Varies by mission (5 business days–3 weeks)',
      ru: 'Зависит от консульства (5 рабочих дней–3 недели)',
      zh: '因领馆而异（5个工作日～3周）',
      ja: '公館により異なる（5営業日〜3週間）',
      kz: 'Мекемеге байланысты (5 жұмыс күні–3 апта)',
    },
    fee: 'US$20~80',
    notes: {
      ko: '⚠️ 무비자(카자흐 30일·러시아 60일)로 입국한 뒤 치료가 길어져도 체류자격 변경은 원칙적으로 허용되지 않습니다. 장기 치료가 예상되면 처음부터 이 비자로 신청하세요. 수수료·처리기간·재정능력 기준은 관할 공관마다 다르니 아래 대사관 공지를 확인하세요.',
      en: '⚠️ If you enter visa-free (30 days for Kazakhstan, 60 for Russia), changing your status later is generally not permitted even if treatment runs long. If long treatment is expected, apply for this visa from the start. Fees, processing times, and financial requirements differ by mission — check the embassy notice below.',
      ru: '⚠️ При безвизовом въезде (Казахстан 30 дней, Россия 60 дней) смена статуса пребывания, как правило, не разрешается, даже если лечение затянулось. Если ожидается длительное лечение, оформляйте эту визу заранее. Сборы, сроки и финансовые требования различаются по консульствам — см. объявление посольства ниже.',
      zh: '⚠️ 以免签入境（哈萨克斯坦30天、俄罗斯60天）后，即使治疗延长，原则上也不允许变更停留资格。如预计长期治疗，请从一开始就申请此签证。费用、办理时间和财力要求因领馆而异，请查阅下方使馆公告。',
      ja: '⚠️ ビザ免除で入国した場合（カザフスタン30日・ロシア60日）、治療が長引いても在留資格の変更は原則認められません。長期治療が見込まれる場合は最初からこのビザで申請してください。手数料・処理期間・財政要件は公館ごとに異なります — 下記の大使館公示をご確認ください。',
      kz: '⚠️ Визасыз кірген жағдайда (Қазақстан 30 күн, Ресей 60 күн) емделу ұзарса да, болу мәртебесін өзгертуге негізінен рұқсат етілмейді. Ұзақ емделу күтілсе, осы визаны бастапқыда рәсімдеңіз. Алымдар, өңдеу мерзімі және қаржылық талаптар мекемеге қарай әртүрлі — төмендегі елшілік хабарландыруын қараңыз.',
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
      ko: '사증발급인정서 7~10일 + 공관 4영업일~3주',
      en: 'Certificate of eligibility 7–10 days + mission 4 business days–3 weeks',
      ru: 'Подтверждение на визу 7–10 дней + консульство 4 рабочих дня–3 недели',
      zh: '签证发放认定书7～10天 + 领馆4个工作日～3周',
      ja: '査証発給認定書7〜10日 + 公館4営業日〜3週間',
      kz: 'Виза беру туралы куәлік 7–10 күн + мекеме 4 жұмыс күні–3 апта',
    },
    fee: 'US$50~80',
    notes: {
      ko: '체류기간은 치료 기간에 따라 정해지며 국내에서 연장할 수 있습니다(일반 6개월·중증 1년 범위, 만료 4개월 전부터 신청). ⚠️ 다만 무비자로 입국한 뒤 이 자격으로 바꾸는 것은 심사 재량이라 보장되지 않습니다 — 장기 치료가 예상되면 처음부터 신청하세요.',
      en: 'Your stay is set by the length of treatment and can be extended in Korea (up to 6 months, or 1 year for severe cases; apply from 4 months before expiry). ⚠️ However, switching to this status after entering visa-free is discretionary and not guaranteed — apply from the start if long treatment is expected.',
      ru: 'Срок пребывания определяется длительностью лечения и может быть продлён в Корее (до 6 месяцев, для тяжёлых случаев — 1 год; подача за 4 месяца до окончания). ⚠️ Однако переход на этот статус после безвизового въезда — на усмотрение службы и не гарантирован: при длительном лечении оформляйте визу заранее.',
      zh: '停留期限根据治疗时长确定，可在韩国境内延长（一般6个月，重症1年；到期前4个月起可申请）。⚠️ 但免签入境后变更为该资格属审查裁量，并无保证 — 如预计长期治疗，请从一开始就申请。',
      ja: '滞在期間は治療期間に応じて決まり、韓国国内で延長できます（通常6か月・重症は1年、満了4か月前から申請可）。⚠️ ただしビザ免除で入国後にこの資格へ変更するのは審査の裁量であり保証されません — 長期治療が見込まれる場合は最初から申請してください。',
      kz: 'Болу мерзімі емдеу ұзақтығына қарай белгіленеді және Кореяда ұзартылады (әдетте 6 ай, ауыр жағдайда 1 жыл; мерзім бітуден 4 ай бұрын өтініш беруге болады). ⚠️ Алайда визасыз кіргеннен кейін осы мәртебеге ауысу — қарау құзыретінде, кепілдік берілмейді. Ұзақ емделу күтілсе, бастапқыда рәсімдеңіз.',
    },
  },
};

// ========================================
// Country-specific entry status (web-verified, 2026-07)
// ========================================
//
// 국적 선택이 "진짜로" 바뀌는 부분 = 비자 필요 여부 + K-ETA + 현지 대사관.
// 출입국 규정은 자주 바뀌므로 AI 생성이 아닌 정적 데이터로 관리하고,
// 화면에는 항상 "공식 사이트에서 최종 확인" 안내를 함께 노출한다.
// 출처: visa policy of South Korea(Wikipedia), K-ETA(k-eta.go.kr),
//       MOFA 재외공관, 여행신문/Korea Herald(중국 단체관광 무비자 12/31까지 연장, 2026-06).

// ── 프레시니스(freshness) 관리 ─────────────────────────────────────────────
// 왜: 비자·K-ETA는 외부 법령이라 "넣을 때 맞음 ≠ 계속 맞음". 날짜 박힌 규정은
//     시간만 지나도 저절로 틀려진다(예: 중국 "6월까지"가 7월에 거짓). 아래 두
//     장치를 CI(check:visa-freshness)가 검사해 "사람이 화면에서 찾기 전에" 잡는다.
//   1) VISA_DATA_LAST_VERIFIED: 이 데이터 전체를 마지막으로 실검증한 날.
//      180일 지나면 CI 실패 → 주기적 재검증 강제.
//   2) TIME_SENSITIVE_DEADLINES: 기한부 사실 목록. expiresOn이 지나면 CI 실패.
// 갱신 규칙: 데이터를 재검증하면 LAST_VERIFIED를 오늘로 올리고,
//            규정 기한이 바뀌면 해당 expiresOn과 아래 국가 문구를 함께 고친다.
export const VISA_DATA_LAST_VERIFIED = '2026-08-07';

export interface VisaDeadline {
  id: string;
  expiresOn: string; // ISO YYYY-MM-DD. 이 날짜가 지나면 규정 재확인 필요(CI 실패).
  what: string;      // 무엇이 만료되는지 (한국어 메모)
  affects: string;   // 어느 국가/항목 데이터에 영향
}

export const TIME_SENSITIVE_DEADLINES: VisaDeadline[] = [
  { id: 'china-group-visa-waiver', expiresOn: '2026-12-31', what: '중국 단체관광(지정여행사·3인+·15일) 한시 무비자 — 상호주의로 연장돼 옴, 만료 전 재확인', affects: 'zh.summary' },
  { id: 'keta-temp-exemption-22', expiresOn: '2026-12-31', what: 'K-ETA 한시면제 22개국(일본 등) — 2027-01-01 종료 예정. 종료 시 ja 면제문구·공통 K-ETA 서술 갱신', affects: 'ja.summary/ja.note' },
];

export type CountryShortStay = 'visa_free' | 'visa_required' | 'conditional';

export interface CountryEntry {
  nationality: string;
  shortStay: CountryShortStay;     // 단기(관광) 무비자 가능 여부
  visaFreeDays?: number;           // 무비자 가능 일수 (해당 시)
  summary: Record<string, string>; // 국가별 한 줄 입국 요약 (헤드라인)
  note: Record<string, string>;    // 실무 안내 (K-ETA·번역공증 등)
  embassy: { name: Record<string, string>; url: string };
}

export interface ResolvedCountryEntry {
  nationality: string;
  shortStay: CountryShortStay;
  visaFreeDays?: number;
  summary: string;
  note: string;
  embassyName: string;
  embassyUrl: string;
}

const COUNTRY_ENTRY: Record<string, CountryEntry> = {
  ru: {
    nationality: 'ru',
    shortStay: 'visa_free',
    visaFreeDays: 60,
    summary: {
      ko: '러시아 국민은 관광 목적 60일 무비자 입국이 가능합니다(180일 중 최대 90일). 다만 치료 목적이면 병원 초청장 기반 C-3-3 의료비자를 권장합니다.',
      en: 'Russian citizens may enter visa-free for up to 60 days (tourism; max 90 days within any 180-day period). For treatment, a C-3-3 medical visa with a hospital invitation is recommended.',
      ru: 'Граждане России могут въезжать без визы на срок до 60 дней (туризм; не более 90 дней в течение любого 180-дневного периода). Для лечения рекомендуется медицинская виза C-3-3 с приглашением больницы.',
      zh: '俄罗斯公民可免签入境最多60天（旅游；任何180天内最多90天）。如为治疗目的，建议持医院邀请函办理C-3-3医疗签证。',
      ja: 'ロシア国民は観光目的で最大60日間ビザ免除で入国できます（180日間で最大90日）。治療目的の場合は病院の招待状によるC-3-3医療ビザを推奨します。',
      kz: 'Ресей азаматтары туристік мақсатта 60 күнге дейін визасыз кіре алады (кез келген 180 күн ішінде ең көбі 90 күн). Емделу мақсатында аурухана шақыру хатымен C-3-3 медициналық визасын алу ұсынылады.',
    },
    note: {
      ko: 'K-ETA(전자여행허가)를 사전에 받아야 합니다(한시 면제 22개국에 해당 없음). 91일 이상 치료에는 G-1-10 비자가 필요합니다. ⚠️ 무비자 60일은 검진·2차 소견까지입니다 — 수술·항암처럼 60일을 넘는 치료는 입국 후 자격 변경이 원칙적으로 안 되니 처음부터 C-3-3으로 오세요.',
      en: 'You must obtain K-ETA in advance (Russia is not among the 22 temporarily exempted countries). For treatment over 91 days, the G-1-10 visa is required. ⚠️ The 60 visa-free days cover check-ups and second opinions — for treatment that runs longer (surgery, chemotherapy), changing status after entry is generally not permitted, so come on a C-3-3 from the start.',
      ru: 'Необходимо заранее получить K-ETA (Россия не входит в число 22 временно освобождённых стран). Для лечения свыше 91 дня нужна виза G-1-10. ⚠️ Безвизовые 60 дней рассчитаны на обследование и второе мнение — при более длительном лечении (операция, химиотерапия) смена статуса после въезда, как правило, не разрешается, поэтому приезжайте сразу по визе C-3-3.',
      zh: '须提前申请K-ETA（俄罗斯不在22个临时免除国之列）。治疗超过91天需办理G-1-10签证。⚠️ 免签60天仅够检查和第二诊疗意见 — 手术、化疗等超过60天的治疗，入境后原则上不能变更资格，请从一开始就持C-3-3签证入境。',
      ja: '事前にK-ETA（電子旅行許可）の取得が必要です（ロシアは一時免除の22か国に含まれません）。91日以上の治療にはG-1-10ビザが必要です。⚠️ ビザ免除の60日は検診・セカンドオピニオンまでです — 手術や抗がん剤治療など60日を超える治療は入国後の資格変更が原則できないため、最初からC-3-3でお越しください。',
      kz: 'Алдын ала K-ETA алу қажет (Ресей уақытша босатылған 22 елдің қатарына кірмейді). 91 күннен асатын емделуге G-1-10 визасы қажет. ⚠️ Визасыз 60 күн тексеру мен екінші пікірге жетеді — операция, химиотерапия сияқты 60 күннен асатын емделуде кіргеннен кейін мәртебені өзгертуге негізінен болмайды, сондықтан бастапқыда C-3-3 визасымен келіңіз.',
    },
    embassy: {
      name: {
        ko: '주러시아 대한민국 대사관 (모스크바)',
        en: 'Embassy of the Republic of Korea in Russia (Moscow)',
        ru: 'Посольство Республики Корея в России (Москва)',
        zh: '大韩民国驻俄罗斯大使馆（莫斯科）',
        ja: '駐ロシア大韓民国大使館（モスクワ）',
        kz: 'Ресейдегі Корея Республикасының елшілігі (Мәскеу)',
      },
      url: 'https://overseas.mofa.go.kr/ru-ko/index.do',
    },
  },
  kz: {
    nationality: 'kz',
    shortStay: 'visa_free',
    visaFreeDays: 30,
    summary: {
      ko: '카자흐스탄 국민은 관광 목적 30일 무비자 입국이 가능합니다(한-카자흐 무비자 협정; 180일 중 최대 60일). 다만 치료 목적이면 병원 초청장 기반 C-3-3 의료비자를 권장합니다.',
      en: 'Kazakhstani citizens may enter visa-free for up to 30 days (Korea–Kazakhstan visa-waiver agreement; max 60 days within any 180-day period). For treatment, a C-3-3 medical visa with a hospital invitation is recommended.',
      ru: 'Граждане Казахстана могут въезжать без визы на срок до 30 дней (соглашение о безвизовом режиме между Кореей и Казахстаном; не более 60 дней в течение любого 180-дневного периода). Для лечения рекомендуется медицинская виза C-3-3 с приглашением больницы.',
      zh: '哈萨克斯坦公民可免签入境最多30天（韩国-哈萨克斯坦免签协议；任何180天内最多60天）。如为治疗目的，建议持医院邀请函办理C-3-3医疗签证。',
      ja: 'カザフスタン国民は観光目的で最大30日間ビザ免除で入国できます（韓国・カザフスタン間のビザ免除協定；180日間で最大60日）。治療目的の場合は病院の招待状によるC-3-3医療ビザを推奨します。',
      kz: 'Қазақстан азаматтары туристік мақсатта 30 күнге дейін визасыз кіре алады (Корея–Қазақстан визасыз режим келісімі). Емделу мақсатында аурухана шақыру хатымен C-3-3 медициналық визасын алу ұсынылады.',
    },
    note: {
      ko: 'K-ETA(전자여행허가)를 사전에 받아야 합니다(한시 면제 대상국 아님). 91일 이상 치료에는 G-1-10 비자가 필요합니다. 한국어·영어가 아닌 서류는 국문 또는 영문 번역본이 필요합니다(공증 요구 여부는 관할 공관 확인). ⚠️ 무비자 30일은 검진·2차 소견까지입니다 — 수술·항암처럼 30일을 넘는 치료는 입국 후 자격 변경이 원칙적으로 안 되니 처음부터 C-3-3으로 오세요.',
      en: 'You must obtain K-ETA in advance (Kazakhstan is not on the temporary exemption list). For treatment over 91 days, the G-1-10 visa is required. Documents not in Korean or English require a Korean or English translation (whether notarization is required depends on the handling mission). ⚠️ The 30 visa-free days cover check-ups and second opinions — for treatment that runs longer (surgery, chemotherapy), changing status after entry is generally not permitted, so come on a C-3-3 from the start.',
      ru: 'Необходимо заранее получить K-ETA (Казахстан не входит в список временно освобождённых стран). Для лечения свыше 91 дня нужна виза G-1-10. Документы не на корейском или английском требуют перевода на корейский или английский (необходимость нотариального заверения уточняйте в консульстве по месту подачи). ⚠️ Безвизовые 30 дней рассчитаны на обследование и второе мнение — при более длительном лечении (операция, химиотерапия) смена статуса после въезда, как правило, не разрешается, поэтому приезжайте сразу по визе C-3-3.',
      zh: '须提前申请K-ETA（哈萨克斯坦不在临时免除名单内）。治疗超过91天需办理G-1-10签证。非韩语或英语的文件需附韩语或英语译本（是否需要公证请向受理领馆确认）。⚠️ 免签30天仅够检查和第二诊疗意见 — 手术、化疗等超过30天的治疗，入境后原则上不能变更资格，请从一开始就持C-3-3签证入境。',
      ja: '事前にK-ETA（電子旅行許可）の取得が必要です（一時免除の対象国ではありません）。91日以上の治療にはG-1-10ビザが必要です。韓国語・英語以外の書類は韓国語または英語の翻訳文が必要です（公証の要否は申請先公館にご確認ください）。⚠️ ビザ免除の30日は検診・セカンドオピニオンまでです — 手術や抗がん剤治療など30日を超える治療は入国後の資格変更が原則できないため、最初からC-3-3でお越しください。',
      kz: 'Алдын ала K-ETA (электрондық саяхат рұқсаты) алу қажет (Қазақстан уақытша босатылған елдер тізімінде жоқ). 91 күннен асатын емделуге G-1-10 визасы қажет. Корей не ағылшын тілінде емес құжаттарға корей немесе ағылшын тіліндегі аударма қажет (нотариалды растау талап етіле ме — өтініш беретін мекемеден нақтылаңыз). ⚠️ Визасыз 30 күн тексеру мен екінші пікірге жетеді — операция, химиотерапия сияқты 30 күннен асатын емделуде кіргеннен кейін мәртебені өзгертуге негізінен болмайды, сондықтан бастапқыда C-3-3 визасымен келіңіз.',
    },
    embassy: {
      name: {
        ko: '주카자흐스탄 대한민국 대사관 (아스타나)',
        en: 'Embassy of the Republic of Korea in Kazakhstan (Astana)',
        ru: 'Посольство Республики Корея в Казахстане (Астана)',
        zh: '大韩民国驻哈萨克斯坦大使馆（阿斯塔纳）',
        ja: '駐カザフスタン大韓民国大使館（アスタナ）',
        kz: 'Қазақстандағы Корея Республикасының елшілігі (Астана)',
      },
      url: 'https://overseas.mofa.go.kr/kz-ko/index.do',
    },
  },
  mn: {
    nationality: 'mn',
    shortStay: 'visa_required',
    summary: {
      ko: '몽골 국민은 한국 입국에 비자가 필요합니다. 단기 치료는 C-3-3, 장기 치료는 G-1-10 의료비자를 신청하세요.',
      en: 'Mongolian citizens need a visa to enter Korea. Apply for the C-3-3 (short-term) or G-1-10 (long-term) medical visa.',
      ru: 'Гражданам Монголии нужна виза для въезда в Корею. Оформите медицинскую визу C-3-3 или G-1-10.',
      zh: '蒙古公民入境韩国需要签证。请申请C-3-3或G-1-10医疗签证。',
      ja: 'モンゴル国民は韓国入国にビザが必要です。短期はC-3-3、長期はG-1-10医療ビザを申請してください。',
      kz: 'Моңғолия азаматтарына Кореяға кіру үшін виза қажет. C-3-3 немесе G-1-10 медициналық визасын рәсімдеңіз.',
    },
    note: {
      ko: '병원 초청장(또는 진료예약 확인서)이 필수입니다. 한국어·영어가 아닌 서류는 국문 또는 영문 번역본이 필요합니다(공증 요구 여부는 관할 공관 확인).',
      en: 'A hospital invitation (or appointment confirmation) is required. Documents not in Korean or English require a Korean or English translation (whether notarization is required depends on the handling mission).',
      ru: 'Требуется приглашение больницы (или подтверждение записи). Документы не на корейском или английском требуют перевода на корейский или английский (необходимость нотариального заверения уточняйте в консульстве по месту подачи).',
      zh: '需要医院邀请函（或预约确认书）。非韩语或英语的文件需附韩语或英语译本（是否需要公证请向受理领馆确认）。',
      ja: '病院の招待状（または予約確認書）が必須です。韓国語・英語以外の書類は韓国語または英語の翻訳文が必要です（公証の要否は申請先公館にご確認ください）。',
      kz: 'Аурухана шақыруы (немесе жазылу растамасы) қажет. Корей не ағылшын тілінде емес құжаттарға корей немесе ағылшын тіліндегі аударма қажет (нотариалды растау талап етіле ме — өтініш беретін мекемеден нақтылаңыз).',
    },
    embassy: {
      name: {
        ko: '주몽골 대한민국 대사관 (울란바토르)',
        en: 'Embassy of the Republic of Korea in Mongolia (Ulaanbaatar)',
        ru: 'Посольство Республики Корея в Монголии (Улан-Батор)',
        zh: '大韩民国驻蒙古大使馆（乌兰巴托）',
        ja: '駐モンゴル大韓民国大使館（ウランバートル）',
        kz: 'Моңғолиядағы Корея Республикасының елшілігі (Улан-Батор)',
      },
      url: 'https://overseas.mofa.go.kr/mn-ko/index.do',
    },
  },
  uz: {
    nationality: 'uz',
    shortStay: 'visa_required',
    summary: {
      ko: '우즈베키스탄 국민은 한국 입국에 비자가 필요합니다. 단기 치료는 C-3-3, 장기 치료는 G-1-10 의료비자를 신청하세요.',
      en: 'Uzbekistani citizens need a visa to enter Korea. Apply for the C-3-3 (short-term) or G-1-10 (long-term) medical visa.',
      ru: 'Гражданам Узбекистана нужна виза для въезда в Корею. Оформите медицинскую визу C-3-3 или G-1-10.',
      zh: '乌兹别克斯坦公民入境韩国需要签证。请申请C-3-3或G-1-10医疗签证。',
      ja: 'ウズベキスタン国民は韓国入国にビザが必要です。短期はC-3-3、長期はG-1-10医療ビザを申請してください。',
      kz: 'Өзбекстан азаматтарына Кореяға кіру үшін виза қажет. C-3-3 немесе G-1-10 медициналық визасын рәсімдеңіз.',
    },
    note: {
      ko: '병원 초청장(또는 진료예약 확인서)이 필수입니다. 한국어·영어가 아닌 서류는 국문 또는 영문 번역본이 필요합니다(공증 요구 여부는 관할 공관 확인).',
      en: 'A hospital invitation (or appointment confirmation) is required. Documents not in Korean or English require a Korean or English translation (whether notarization is required depends on the handling mission).',
      ru: 'Требуется приглашение больницы (или подтверждение записи). Документы не на корейском или английском требуют перевода на корейский или английский (необходимость нотариального заверения уточняйте в консульстве по месту подачи).',
      zh: '需要医院邀请函（或预约确认书）。非韩语或英语的文件需附韩语或英语译本（是否需要公证请向受理领馆确认）。',
      ja: '病院の招待状（または予約確認書）が必須です。韓国語・英語以外の書類は韓国語または英語の翻訳文が必要です（公証の要否は申請先公館にご確認ください）。',
      kz: 'Аурухана шақыруы (немесе жазылу растамасы) қажет. Корей не ағылшын тілінде емес құжаттарға корей немесе ағылшын тіліндегі аударма қажет (нотариалды растау талап етіле ме — өтініш беретін мекемеден нақтылаңыз).',
    },
    embassy: {
      name: {
        ko: '주우즈베키스탄 대한민국 대사관 (타슈켄트)',
        en: 'Embassy of the Republic of Korea in Uzbekistan (Tashkent)',
        ru: 'Посольство Республики Корея в Узбекистане (Ташкент)',
        zh: '大韩民国驻乌兹别克斯坦大使馆（塔什干）',
        ja: '駐ウズベキスタン大韓民国大使館（タシケント）',
        kz: 'Өзбекстандағы Корея Республикасының елшілігі (Ташкент)',
      },
      url: 'https://overseas.mofa.go.kr/uz-ko/index.do',
    },
  },
  kg: {
    nationality: 'kg',
    shortStay: 'visa_required',
    summary: {
      ko: '키르기스스탄 국민은 한국 입국에 비자가 필요합니다. 단기 치료는 C-3-3, 장기 치료는 G-1-10 의료비자를 신청하세요.',
      en: 'Kyrgyzstani citizens need a visa to enter Korea. Apply for the C-3-3 (short-term) or G-1-10 (long-term) medical visa.',
      ru: 'Гражданам Кыргызстана нужна виза для въезда в Корею. Оформите медицинскую визу C-3-3 или G-1-10.',
      zh: '吉尔吉斯斯坦公民入境韩国需要签证。请申请C-3-3或G-1-10医疗签证。',
      ja: 'キルギス国民は韓国入国にビザが必要です。短期はC-3-3、長期はG-1-10医療ビザを申請してください。',
      kz: 'Қырғызстан азаматтарына Кореяға кіру үшін виза қажет. C-3-3 немесе G-1-10 медициналық визасын рәсімдеңіз.',
    },
    note: {
      ko: '병원 초청장(또는 진료예약 확인서)이 필수입니다. 한국어·영어가 아닌 서류는 국문 또는 영문 번역본이 필요합니다(공증 요구 여부는 관할 공관 확인).',
      en: 'A hospital invitation (or appointment confirmation) is required. Documents not in Korean or English require a Korean or English translation (whether notarization is required depends on the handling mission).',
      ru: 'Требуется приглашение больницы (или подтверждение записи). Документы не на корейском или английском требуют перевода на корейский или английский (необходимость нотариального заверения уточняйте в консульстве по месту подачи).',
      zh: '需要医院邀请函（或预约确认书）。非韩语或英语的文件需附韩语或英语译本（是否需要公证请向受理领馆确认）。',
      ja: '病院の招待状（または予約確認書）が必須です。韓国語・英語以外の書類は韓国語または英語の翻訳文が必要です（公証の要否は申請先公館にご確認ください）。',
      kz: 'Аурухана шақыруы (немесе жазылу растамасы) қажет. Корей не ағылшын тілінде емес құжаттарға корей немесе ағылшын тіліндегі аударма қажет (нотариалды растау талап етіле ме — өтініш беретін мекемеден нақтылаңыз).',
    },
    embassy: {
      name: {
        ko: '주키르기스스탄 대한민국 대사관 (비슈케크)',
        en: 'Embassy of the Republic of Korea in Kyrgyzstan (Bishkek)',
        ru: 'Посольство Республики Корея в Кыргызстане (Бишкек)',
        zh: '大韩民国驻吉尔吉斯斯坦大使馆（比什凯克）',
        ja: '駐キルギス大韓民国大使館（ビシュケク）',
        kz: 'Қырғызстандағы Корея Республикасының елшілігі (Бішкек)',
      },
      url: 'https://overseas.mofa.go.kr/kg-ko/index.do',
    },
  },
  tj: {
    nationality: 'tj',
    shortStay: 'visa_required',
    summary: {
      ko: '타지키스탄 국민은 한국 입국에 비자가 필요합니다. 단기 치료는 C-3-3, 장기 치료는 G-1-10 의료비자를 신청하세요.',
      en: 'Tajikistani citizens need a visa to enter Korea. Apply for the C-3-3 (short-term) or G-1-10 (long-term) medical visa.',
      ru: 'Гражданам Таджикистана нужна виза для въезда в Корею. Оформите медицинскую визу C-3-3 или G-1-10.',
      zh: '塔吉克斯坦公民入境韩国需要签证。请申请C-3-3或G-1-10医疗签证。',
      ja: 'タジキスタン国民は韓国入国にビザが必要です。短期はC-3-3、長期はG-1-10医療ビザを申請してください。',
      kz: 'Тәжікстан азаматтарына Кореяға кіру үшін виза қажет. C-3-3 немесе G-1-10 медициналық визасын рәсімдеңіз.',
    },
    note: {
      ko: '병원 초청장(또는 진료예약 확인서)이 필수입니다. 한국어·영어가 아닌 서류는 국문 또는 영문 번역본이 필요합니다(공증 요구 여부는 관할 공관 확인).',
      en: 'A hospital invitation (or appointment confirmation) is required. Documents not in Korean or English require a Korean or English translation (whether notarization is required depends on the handling mission).',
      ru: 'Требуется приглашение больницы (или подтверждение записи). Документы не на корейском или английском требуют перевода на корейский или английский (необходимость нотариального заверения уточняйте в консульстве по месту подачи).',
      zh: '需要医院邀请函（或预约确认书）。非韩语或英语的文件需附韩语或英语译本（是否需要公证请向受理领馆确认）。',
      ja: '病院の招待状（または予約確認書）が必須です。韓国語・英語以外の書類は韓国語または英語の翻訳文が必要です（公証の要否は申請先公館にご確認ください）。',
      kz: 'Аурухана шақыруы (немесе жазылу растамасы) қажет. Корей не ағылшын тілінде емес құжаттарға корей немесе ағылшын тіліндегі аударма қажет (нотариалды растау талап етіле ме — өтініш беретін мекемеден нақтылаңыз).',
    },
    embassy: {
      name: {
        ko: '주타지키스탄 대한민국 대사관 (두샨베)',
        en: 'Embassy of the Republic of Korea in Tajikistan (Dushanbe)',
        ru: 'Посольство Республики Корея в Таджикистане (Душанбе)',
        zh: '大韩民国驻塔吉克斯坦大使馆（杜尚别）',
        ja: '駐タジキスタン大韓民国大使館（ドゥシャンベ）',
        kz: 'Тәжікстандағы Корея Республикасының елшілігі (Душанбе)',
      },
      url: 'https://overseas.mofa.go.kr/tj-ko/index.do',
    },
  },
  az: {
    nationality: 'az',
    shortStay: 'visa_required',
    summary: {
      ko: '아제르바이잔 국민은 한국 입국에 비자가 필요합니다. 단기 치료는 C-3-3, 장기 치료는 G-1-10 의료비자를 신청하세요.',
      en: 'Azerbaijani citizens need a visa to enter Korea. Apply for the C-3-3 (short-term) or G-1-10 (long-term) medical visa.',
      ru: 'Гражданам Азербайджана нужна виза для въезда в Корею. Оформите медицинскую визу C-3-3 или G-1-10.',
      zh: '阿塞拜疆公民入境韩国需要签证。请申请C-3-3或G-1-10医疗签证。',
      ja: 'アゼルバイジャン国民は韓国入国にビザが必要です。短期はC-3-3、長期はG-1-10医療ビザを申請してください。',
      kz: 'Әзірбайжан азаматтарына Кореяға кіру үшін виза қажет. C-3-3 немесе G-1-10 медициналық визасын рәсімдеңіз.',
    },
    note: {
      ko: '병원 초청장(또는 진료예약 확인서)이 필수입니다. 한국어·영어가 아닌 서류는 국문 또는 영문 번역본이 필요합니다(공증 요구 여부는 관할 공관 확인).',
      en: 'A hospital invitation (or appointment confirmation) is required. Documents not in Korean or English require a Korean or English translation (whether notarization is required depends on the handling mission).',
      ru: 'Требуется приглашение больницы (или подтверждение записи). Документы не на корейском или английском требуют перевода на корейский или английский (необходимость нотариального заверения уточняйте в консульстве по месту подачи).',
      zh: '需要医院邀请函（或预约确认书）。非韩语或英语的文件需附韩语或英语译本（是否需要公证请向受理领馆确认）。',
      ja: '病院の招待状（または予約確認書）が必須です。韓国語・英語以外の書類は韓国語または英語の翻訳文が必要です（公証の要否は申請先公館にご確認ください）。',
      kz: 'Аурухана шақыруы (немесе жазылу растамасы) қажет. Корей не ағылшын тілінде емес құжаттарға корей немесе ағылшын тіліндегі аударма қажет (нотариалды растау талап етіле ме — өтініш беретін мекемеден нақтылаңыз).',
    },
    embassy: {
      name: {
        ko: '주아제르바이잔 대한민국 대사관 (바쿠)',
        en: 'Embassy of the Republic of Korea in Azerbaijan (Baku)',
        ru: 'Посольство Республики Корея в Азербайджане (Баку)',
        zh: '大韩民国驻阿塞拜疆大使馆（巴库）',
        ja: '駐アゼルバイジャン大韓民国大使館（バクー）',
        kz: 'Әзірбайжандағы Корея Республикасының елшілігі (Баку)',
      },
      url: 'https://overseas.mofa.go.kr/az-ko/index.do',
    },
  },
  zh: {
    nationality: 'zh',
    shortStay: 'conditional',
    summary: {
      ko: '중국 국민은 개인 입국 시 비자가 필요합니다. (지정 여행사를 통한 3인 이상 단체관광은 2026년 12월 31일까지 15일 한시 무비자 — 연장됨.) 치료는 C-3-3 의료비자를 신청하세요.',
      en: 'Chinese citizens need a visa for individual entry. (Group tours of 3+ booked via a designated travel agency have a temporary 15-day visa waiver, extended through 31 December 2026.) For treatment, apply for the C-3-3 medical visa.',
      ru: 'Гражданам Китая нужна виза для индивидуального въезда. (Для тургрупп от 3 человек через уполномоченное турагентство — безвизовый въезд на 15 дней, временно продлён до 31 декабря 2026 г.) Для лечения оформите визу C-3-3.',
      zh: '中国公民个人入境需要签证。（通过指定旅行社的3人以上团体旅游可享15天临时免签，已延长至2026年12月31日。）治疗请申请C-3-3医疗签证。',
      ja: '中国国民は個人入国にビザが必要です。（指定旅行会社を通じた3名以上の団体観光は15日間のビザ免除、2026年12月31日まで延長。）治療はC-3-3医療ビザを申請してください。',
      kz: 'Қытай азаматтарына жеке кіруге виза қажет. (Тағайындалған турагенттік арқылы 3 және одан көп адамнан тұратын топтық турларға 15 күн визасыз, 2026 жылдың 31 желтоқсанына дейін ұзартылды.) Емделуге C-3-3 визасын рәсімдеңіз.',
    },
    note: {
      ko: '병원 초청장(또는 진료예약 확인서)이 필수입니다. 한국어·영어가 아닌 서류는 국문 또는 영문 번역본이 필요합니다(공증 요구 여부는 관할 공관 확인).',
      en: 'A hospital invitation (or appointment confirmation) is required. Documents not in Korean or English require a Korean or English translation (whether notarization is required depends on the handling mission).',
      ru: 'Требуется приглашение больницы (или подтверждение записи). Документы не на корейском или английском требуют перевода на корейский или английский (необходимость нотариального заверения уточняйте в консульстве по месту подачи).',
      zh: '需要医院邀请函（或预约确认书）。非韩语或英语的文件需附韩语或英语译本（是否需要公证请向受理领馆确认）。',
      ja: '病院の招待状（または予約確認書）が必須です。韓国語・英語以外の書類は韓国語または英語の翻訳文が必要です（公証の要否は申請先公館にご確認ください）。',
      kz: 'Аурухана шақыруы (немесе жазылу растамасы) қажет. Корей не ағылшын тілінде емес құжаттарға корей немесе ағылшын тіліндегі аударма қажет (нотариалды растау талап етіле ме — өтініш беретін мекемеден нақтылаңыз).',
    },
    embassy: {
      name: {
        ko: '주중 대한민국 대사관 (베이징)',
        en: 'Embassy of the Republic of Korea in China (Beijing)',
        ru: 'Посольство Республики Корея в Китае (Пекин)',
        zh: '大韩民国驻华大使馆（北京）',
        ja: '駐中国大韓民国大使館（北京）',
        kz: 'Қытайдағы Корея Республикасының елшілігі (Бейжің)',
      },
      url: 'https://overseas.mofa.go.kr/cn-ko/index.do',
    },
  },
  ja: {
    nationality: 'ja',
    shortStay: 'visa_free',
    visaFreeDays: 90,
    summary: {
      ko: '일본 국민은 관광 목적 90일 무비자 입국이 가능합니다(K-ETA 면제). 치료 목적이면 C-3-3 의료비자를 권장합니다.',
      en: 'Japanese citizens may enter visa-free for up to 90 days (K-ETA exempt). For treatment, a C-3-3 medical visa is recommended.',
      ru: 'Граждане Японии могут въезжать без визы на срок до 90 дней (без K-ETA). Для лечения рекомендуется виза C-3-3.',
      zh: '日本公民可免签入境最多90天（免K-ETA）。如为治疗目的，建议办理C-3-3医疗签证。',
      ja: '日本国民は観光目的で最大90日間ビザ免除で入国できます（K-ETA免除）。治療目的の場合はC-3-3医療ビザを推奨します。',
      kz: 'Жапония азаматтары туристік мақсатта 90 күнге дейін визасыз кіре алады (K-ETA-дан босатылған). Емделу мақсатында C-3-3 визасын алу ұсынылады.',
    },
    note: {
      ko: '91일 이상 치료에는 G-1-10 비자가 필요합니다. 병원 초청장을 미리 준비하세요.',
      en: 'For treatment over 91 days, the G-1-10 visa is required. Prepare a hospital invitation in advance.',
      ru: 'Для лечения свыше 91 дня нужна виза G-1-10. Подготовьте приглашение больницы заранее.',
      zh: '治疗超过91天需办理G-1-10签证。请提前准备医院邀请函。',
      ja: '91日以上の治療にはG-1-10ビザが必要です。病院の招待状を事前にご準備ください。',
      kz: '91 күннен асатын емделуге G-1-10 визасы қажет. Аурухана шақыру хатын алдын ала дайындаңыз.',
    },
    embassy: {
      name: {
        ko: '주일 대한민국 대사관 (도쿄)',
        en: 'Embassy of the Republic of Korea in Japan (Tokyo)',
        ru: 'Посольство Республики Корея в Японии (Токио)',
        zh: '大韩民国驻日本大使馆（东京）',
        ja: '駐日本大韓民国大使館（東京）',
        kz: 'Жапониядағы Корея Республикасының елшілігі (Токио)',
      },
      url: 'https://overseas.mofa.go.kr/jp-ko/index.do',
    },
  },
  en: {
    nationality: 'en',
    shortStay: 'conditional',
    summary: {
      ko: '국적에 따라 비자 요건이 다릅니다. 본국이 한국과 무비자 협정이 있는지 확인하거나, C-3-3 의료비자를 신청하세요.',
      en: 'Visa requirements depend on your nationality. Check whether your country has a visa-waiver agreement with Korea, or apply for the C-3-3 medical visa.',
      ru: 'Визовые требования зависят от гражданства. Проверьте, есть ли у вашей страны безвизовое соглашение с Кореей, или оформите визу C-3-3.',
      zh: '签证要求因国籍而异。请确认贵国是否与韩国有免签协议，或申请C-3-3医疗签证。',
      ja: 'ビザ要件は国籍により異なります。母国が韓国とビザ免除協定を結んでいるか確認するか、C-3-3医療ビザを申請してください。',
      kz: 'Виза талаптары азаматтыққа байланысты. Еліңіздің Кореямен визасыз келісімі бар-жоғын тексеріңіз немесе C-3-3 визасын рәсімдеңіз.',
    },
    note: {
      ko: '공식 K-ETA 사이트와 가까운 대한민국 대사관·영사관에서 최신 요건을 확인하세요.',
      en: 'Check the latest requirements on the official K-ETA site and your nearest Korean embassy or consulate.',
      ru: 'Уточните актуальные требования на официальном сайте K-ETA и в ближайшем посольстве или консульстве Кореи.',
      zh: '请在官方K-ETA网站及最近的韩国大使馆或领事馆确认最新要求。',
      ja: '公式K-ETAサイトと最寄りの大韓民国大使館・領事館で最新要件をご確認ください。',
      kz: 'Соңғы талаптарды ресми K-ETA сайтынан және жақын маңдағы Корея елшілігі немесе консулдығынан тексеріңіз.',
    },
    embassy: {
      name: {
        ko: '대한민국 재외공관 안내 (외교부)',
        en: 'Korean Embassies & Consulates Worldwide (MOFA)',
        ru: 'Посольства и консульства Кореи по всему миру (МИД)',
        zh: '韩国驻外使领馆指南（外交部）',
        ja: '大韓民国の在外公館案内（外交部）',
        kz: 'Шетелдегі Корея елшіліктері (СІМ)',
      },
      url: 'https://www.mofa.go.kr/eng/index.do',
    },
  },
};

// ========================================
// Public API
// ========================================

/**
 * 국적 + 치료 기간으로 추천 비자 유형 결정
 * embassy: 하위호환을 위해 { url, ...localized name keys } 형태로 평탄화해 반환
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

  const entry = COUNTRY_ENTRY[nationality];
  const embassy = entry
    ? { ...entry.embassy.name, url: entry.embassy.url }
    : undefined;

  return { recommended, alternative, embassy };
}

/**
 * 국적별 입국 상태(비자 필요 여부·K-ETA·현지 대사관)를 언어별로 해석해 반환.
 * 국적 선택이 화면에서 "진짜로" 바뀌는 핵심 데이터.
 */
export function getCountryEntry(
  nationality: string,
  lang: string
): ResolvedCountryEntry | null {
  const entry = COUNTRY_ENTRY[nationality] || COUNTRY_ENTRY['en'];
  if (!entry) return null;
  const l = lang || 'en';

  return {
    nationality: entry.nationality,
    shortStay: entry.shortStay,
    visaFreeDays: entry.visaFreeDays,
    summary: entry.summary[l] || entry.summary['en'],
    note: entry.note[l] || entry.note['en'],
    embassyName: entry.embassy.name[l] || entry.embassy.name['en'],
    embassyUrl: entry.embassy.url,
  };
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
