/**
 * HIRA (건강보험심사평가원) 기반 암종별 한국인 기준 진료비 참고 범위
 *
 * 주의:
 * - 이 수치는 한국 건강보험 적용 기준으로 한국인 환자 평균 진료비입니다.
 * - 외국인 환자는 비급여 적용이 많아 실제 가격이 다를 수 있습니다.
 * - 정확한 견적은 상담 후 병원에서 개별 제공됩니다.
 *
 * 출처: 건강보험심사평가원 질병소분류별 진료비 통계 및 주요수술통계
 *       (대략적인 공개 통계 범위, 2024년 기준 참고)
 */

const CANCER_COSTS = {
  stomach: {
    id: 'stomach',
    name: { ko: '위암', en: 'Stomach Cancer', ru: 'Рак желудка', kz: 'Асқазан обыры', zh: '胃癌', ja: '胃がん' },
    surgery: { min: 8000000, max: 15000000 }, // 800만~1,500만원
    chemo: { min: 5000000, max: 20000000 },
    radiation: { min: 3000000, max: 8000000 },
    inpatientDays: { min: 7, max: 14 },
  },
  liver: {
    id: 'liver',
    name: { ko: '간암', en: 'Liver Cancer', ru: 'Рак печени', kz: 'Бауыр обыры', zh: '肝癌', ja: '肝がん' },
    surgery: { min: 10000000, max: 25000000 },
    chemo: { min: 6000000, max: 25000000 },
    radiation: { min: 4000000, max: 12000000 },
    inpatientDays: { min: 10, max: 20 },
  },
  lung: {
    id: 'lung',
    name: { ko: '폐암', en: 'Lung Cancer', ru: 'Рак лёгких', kz: 'Өкпе обыры', zh: '肺癌', ja: '肺がん' },
    surgery: { min: 9000000, max: 20000000 },
    chemo: { min: 7000000, max: 30000000 },
    radiation: { min: 4000000, max: 15000000 },
    inpatientDays: { min: 7, max: 14 },
  },
  breast: {
    id: 'breast',
    name: { ko: '유방암', en: 'Breast Cancer', ru: 'Рак молочной железы', kz: 'Сүт безі обыры', zh: '乳腺癌', ja: '乳がん' },
    surgery: { min: 6000000, max: 12000000 },
    chemo: { min: 6000000, max: 22000000 },
    radiation: { min: 3000000, max: 8000000 },
    inpatientDays: { min: 5, max: 10 },
  },
  thyroid: {
    id: 'thyroid',
    name: { ko: '갑상선암', en: 'Thyroid Cancer', ru: 'Рак щитовидной железы', kz: 'Қалқанша без обыры', zh: '甲状腺癌', ja: '甲状腺がん' },
    surgery: { min: 4000000, max: 9000000 },
    chemo: { min: 2000000, max: 8000000 },
    radiation: { min: 2000000, max: 6000000 },
    inpatientDays: { min: 3, max: 7 },
  },
};

const DISCLAIMERS = {
  ko: '※ 위 금액은 한국 건강보험 적용 기준 한국인 환자 평균 진료비 참고 범위입니다. 외국인 환자는 비급여 적용으로 실제 가격이 다를 수 있으며, 정확한 견적은 상담 후 병원에서 개별 제공됩니다.',
  en: '※ These figures are reference ranges for Korean patients under Korea\'s National Health Insurance. For international patients, non-covered items apply and actual prices may differ. A precise quote is provided by the hospital after consultation.',
  ru: '※ Указанные суммы — справочные диапазоны средней стоимости лечения для корейских пациентов с национальной медицинской страховкой. Для иностранных пациентов применяются коммерческие тарифы, и фактические цены могут отличаться. Точный расчёт предоставляет больница после консультации.',
  kz: '※ Бұл сомалар — Корея ұлттық медициналық сақтандыру бойынша корей пациенттерінің орташа емдеу құнының анықтамалық диапазондары. Шетелдік пациенттерге коммерциялық тарифтер қолданылады және нақты бағалар ерекшеленуі мүмкін. Дәл есепті аурухана кеңестен кейін береді.',
  zh: '※ 上述金额为韩国国民健康保险覆盖下韩国本地患者的平均医疗费用参考范围。外国患者适用非保险项目，实际价格可能不同。准确报价将在咨询后由医院提供。',
  ja: '※ 上記金額は韓国の国民健康保険適用下での韓国人患者の平均診療費参考範囲です。外国人患者は非保険項目が適用され、実際の価格が異なる場合があります。正確な見積もりは相談後に病院から提供されます。',
};

const SOURCE = {
  ko: '출처: 건강보험심사평가원 공개 통계 (대략적 범위)',
  en: 'Source: HIRA (Health Insurance Review & Assessment Service), Korea — approximate range',
  ru: 'Источник: HIRA (Служба оценки медицинского страхования Кореи) — ориентировочный диапазон',
  kz: 'Дереккөз: HIRA (Корей медициналық сақтандыру қызметі) — шамамен диапазон',
  zh: '来源: 韩国健康保险审查评价院 (HIRA) 公开统计 (大致范围)',
  ja: '出典: 韓国健康保険審査評価院 (HIRA) 公開統計 (概ねの範囲)',
};

export function getAllCancerCosts() {
  return Object.values(CANCER_COSTS);
}

export function getCancerCost(cancerId) {
  return CANCER_COSTS[cancerId] || null;
}

export function getDisclaimer(lang) {
  return DISCLAIMERS[lang] || DISCLAIMERS.en;
}

export function getSourceLabel(lang) {
  return SOURCE[lang] || SOURCE.en;
}

export function formatKRW(amount, lang = 'en') {
  if (lang === 'ko') {
    const 만 = Math.round(amount / 10000);
    return `${만.toLocaleString('ko-KR')}만원`;
  }
  if (lang === 'ja') {
    return `${Math.round(amount / 10000).toLocaleString('ja-JP')}万ウォン`;
  }
  if (lang === 'zh') {
    return `${Math.round(amount / 10000).toLocaleString('zh-CN')}万韩元`;
  }
  // en / ru / kz: USD approximation (≈1,400 KRW/USD)
  const usd = Math.round(amount / 1400);
  return `~$${usd.toLocaleString('en-US')}`;
}
