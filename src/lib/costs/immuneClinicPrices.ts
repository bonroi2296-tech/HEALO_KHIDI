/**
 * 면력한방병원 암 통합·면역 치료 «확정» 비급여 가격표.
 *
 * 출처: 면력한방병원 「암 진료비 안내 자료」(2026-06-17) · 2026-08-20 PO 가 병원에 확인해 확정.
 *       홈페이지 법정 공개분(고주파 온열 25만, 상급병실 등)과도 일치한다.
 * 성격: 앞의 `surgeryRanges.ts`(대학병원 «추정» 범위)와 달리 이쪽은 «정해진 값»이다.
 *       면력이 직접 받는 가격이므로 견적서에 그대로 적을 수 있다.
 *
 * 쓰는 곳: 코디네이터 견적 작성 화면에서 골라 넣는다. 손으로 타이핑하면 오타·누락이 난다
 *         (2026-08-20 실측: 견적 6건 전부 항목이 비어 있었다).
 *
 * 언어: 견적서는 환자가 읽는 문서다. kz 는 ru 로 대체한다 — 카자흐 현지에서도 이 치료명들은
 *      러시아어를 쓰며, 내가 카자흐어 의학용어를 지어내는 것보다 안전하다.
 */

export type PriceItem = {
  code: string;
  krw: number;
  /** 범위가 있는 항목의 상한. 있으면 화면에 「~」로 보여준다. */
  krwMax?: number;
  label: { ko: string; en: string; ru: string };
  /** 권장 빈도·비고 (없을 수 있음) */
  note?: { ko: string; en: string; ru: string };
};

export type PriceGroup = {
  code: string;
  title: { ko: string; en: string; ru: string };
  items: PriceItem[];
};

export const PRICE_SOURCE_DATE = "2026-06";

export const IMMUNE_CLINIC_PRICES: PriceGroup[] = [
  {
    code: "injection",
    title: { ko: "주사·온열 치료", en: "Injection & hyperthermia", ru: "Инъекции и гипертермия" },
    items: [
      { code: "hyperthermia", krw: 250_000,
        label: { ko: "고주파 온열암치료", en: "RF hyperthermia", ru: "РЧ-гипертермия" },
        note: { ko: "주 3회 · 50분", en: "3×/week · 50 min", ru: "3 раза в неделю · 50 мин" } },
      { code: "hyperthermia35", krw: 350_000,
        label: { ko: "고주파35", en: "RF hyperthermia 35", ru: "РЧ-гипертермия 35" },
        note: { ko: "주 3회 · 60분", en: "3×/week · 60 min", ru: "3 раза в неделю · 60 мин" } },
      { code: "mistletoe", krw: 100_000,
        label: { ko: "미슬토 (이스카도·압노바)", en: "Mistletoe (Iscador/Abnoba)", ru: "Омела (Iscador/Abnoba)" },
        note: { ko: "주 3회 · 피하주사", en: "3×/week · subcutaneous", ru: "3 раза в неделю · подкожно" } },
      { code: "thymosin", krw: 210_000,
        label: { ko: "싸이모신 (싸이원주)", en: "Thymosin α1", ru: "Тимозин α1" },
        note: { ko: "주 3~4회 · NK·T세포 면역 증강", en: "3-4×/week · NK/T-cell boost", ru: "3-4 раза в неделю · NK/T-клетки" } },
      { code: "immucothel", krw: 420_000,
        label: { ko: "이뮤코텔", en: "Immucothel (KLH)", ru: "Иммукотел (KLH)" },
        note: { ko: "주 1회 · 면역 활성화", en: "1×/week", ru: "1 раз в неделю" } },
      { code: "vitaminc", krw: 15_000,
        label: { ko: "고용량 비타민C", en: "High-dose vitamin C", ru: "Высокодозный витамин C" },
        note: { ko: "주 2~3회 · 20~80g (용량에 따라 가산)", en: "2-3×/week · 20-80g (dose-dependent)", ru: "2-3 раза в неделю · 20-80 г (зависит от дозы)" } },
      { code: "glutathione", krw: 30_000, krwMax: 60_000,
        label: { ko: "글루타치온", en: "Glutathione", ru: "Глутатион" },
        note: { ko: "항산화·해독", en: "Antioxidant / detox", ru: "Антиоксидант / детокс" } },
      { code: "selenium", krw: 60_000,
        label: { ko: "셀레늄 (500u)", en: "Selenium (500u)", ru: "Селен (500u)" } },
      { code: "dipeptiven", krw: 90_000,
        label: { ko: "디펩티벤 (글루타민)", en: "Dipeptiven (glutamine)", ru: "Дипептивен (глутамин)" },
        note: { ko: "주 3~5회 · 점막면역·항암독성 완화", en: "3-5×/week", ru: "3-5 раз в неделю" } },
      { code: "immuncell", krw: 5_000_000,
        label: { ko: "이뮨셀 (면역세포치료)", en: "Immuncell-LC (T-cell therapy)", ru: "Immuncell-LC (Т-клеточная терапия)" },
        note: { ko: "1~2회 · T세포 배양 항암면역치료", en: "1-2 sessions", ru: "1-2 сеанса" } },
    ],
  },
  {
    code: "stemcell",
    title: { ko: "혈액 줄기세포 (재생·면역)", en: "Blood stem cell", ru: "Стволовые клетки крови" },
    items: [
      { code: "stem100", krw: 1_000_000,
        label: { ko: "혈액줄기세포 100cc", en: "Blood stem cell 100cc", ru: "Стволовые клетки 100 куб.см" },
        note: { ko: "1회 기준 · 3회 210만 / 6회 390만", en: "per session · 3× ₩2.1M / 6× ₩3.9M", ru: "за сеанс · 3 раза ₩2,1 млн / 6 раз ₩3,9 млн" } },
      { code: "stem200", krw: 2_000_000,
        label: { ko: "혈액줄기세포 200cc", en: "Blood stem cell 200cc", ru: "Стволовые клетки 200 куб.см" },
        note: { ko: "1회 기준 · 3회 420만 / 6회 780만", en: "per session · 3× ₩4.2M / 6× ₩7.8M", ru: "за сеанс · 3 раза ₩4,2 млн / 6 раз ₩7,8 млн" } },
    ],
  },
  {
    code: "herbal",
    title: { ko: "한방 항암·면역 처방", en: "Herbal oncology formulas", ru: "Фитотерапия" },
    items: [
      { code: "hangamdan", krw: 40_000, krwMax: 60_000,
        label: { ko: "항암단 / 유암단", en: "Hangamdan / Yuamdan", ru: "Хангамдан / Юамдан" } },
      { code: "immuneplus", krw: 8_000,
        label: { ko: "면역플러스", en: "Immune Plus", ru: "Иммун Плюс" } },
      { code: "chungganplus", krw: 4_000,
        label: { ko: "청간플러스", en: "Chunggan Plus", ru: "Чунган Плюс" },
        note: { ko: "간기능 개선", en: "Liver function", ru: "Функция печени" } },
      { code: "mesima", krw: 20_000,
        label: { ko: "메시마F", en: "Mesima F", ru: "Месима F" },
        note: { ko: "1박스 60만", en: "1 box ₩600,000", ru: "1 упаковка ₩600 000" } },
      { code: "sansam", krw: 100_000,
        label: { ko: "산삼약침", en: "Wild ginseng pharmacopuncture", ru: "Фармакопунктура (дикий женьшень)" } },
      { code: "amygdalin", krw: 100_000,
        label: { ko: "행인약침 (아미그달린)", en: "Amygdalin pharmacopuncture", ru: "Фармакопунктура (амигдалин)" } },
      { code: "customherb", krw: 500_000, krwMax: 740_000,
        label: { ko: "개인 맞춤 첩약 (1개월)", en: "Custom herbal decoction (1 month)", ru: "Индивидуальный отвар (1 месяц)" } },
    ],
  },
  {
    code: "exam_stay",
    title: { ko: "검사 및 입원", en: "Tests & inpatient", ru: "Обследование и стационар" },
    items: [
      { code: "nk", krw: 100_000,
        label: { ko: "NK 활성도 검사", en: "NK cell activity test", ru: "Тест активности NK-клеток" },
        note: { ko: "결과 1주 소요", en: "1 week for results", ru: "результат через 1 неделю" } },
      { code: "room_rehab", krw: 200_000,
        label: { ko: "상급병실 · 재활병동 1인실", en: "Private room (rehab ward)", ru: "Одноместная палата (реабилитация)" },
        note: { ko: "1박", en: "per night", ru: "за ночь" } },
      { code: "room_immune", krw: 400_000, krwMax: 500_000,
        label: { ko: "상급병실 · 면역병동 1인실", en: "Private room (immunotherapy ward)", ru: "Одноместная палата (иммунотерапия)" },
        note: { ko: "1박", en: "per night", ru: "за ночь" } },
      { code: "room_vip", krw: 700_000,
        label: { ko: "VIP실", en: "VIP room", ru: "VIP-палата" },
        note: { ko: "1박", en: "per night", ru: "за ночь" } },
    ],
  },
  {
    code: "screening",
    title: { ko: "암건강검진 패키지", en: "Cancer screening package", ru: "Пакет онкоскрининга" },
    items: [
      { code: "screen_basic", krw: 450_000,
        label: { ko: "암건강검진 베이직", en: "Cancer screening - Basic", ru: "Онкоскрининг - Базовый" },
        note: { ko: "종양표지자 8종 + NK 활성도 + 기본 혈액검사", en: "8 tumor markers + NK activity + blood panel", ru: "8 онкомаркеров + NK + анализ крови" } },
      { code: "screen_premium", krw: 990_000,
        label: { ko: "암건강검진 프리미엄", en: "Cancer screening - Premium", ru: "Онкоскрининг - Премиум" },
        note: { ko: "베이직 + 암 유전자 검사 + 모발미네랄 + 항산화", en: "Basic + cancer gene panel + hair mineral + antioxidant", ru: "Базовый + генетика + волосы + антиоксиданты" } },
    ],
  },
];

/** 코디 포털 언어 → 가격표 언어. kz 는 ru 로 대체한다(위 주석 참고). */
export function priceLang(lang: string): "ko" | "en" | "ru" {
  if (lang === "ko") return "ko";
  if (lang === "ru" || lang === "kz") return "ru";
  return "en";
}
