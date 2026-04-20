// src/lib/language.js
// Language utility for multilingual content resolution (DB 콘텐츠 로케일)
// UI 언어와 동일 소스 사용: healo_lang 쿠키 → getLangCodeFromCookie (i18n)

import { getLangCodeFromCookie } from "./i18n";

export const SUPPORTED_LANGS = ["ko", "en", "zh", "ja", "ru", "kz"];

/** @deprecated UI는 i18n/LANG_OPTIONS 사용. DB 로케일은 getCurrentLangCode() 사용 */
export const getCurrentLanguage = () => {
  const code = getCurrentLangCode();
  if (code === 'ko') return 'KR';
  if (code === 'zh') return 'ZH';
  if (code === 'ja') return 'JPN';
  return 'ENG';
};

/** DB 콘텐츠·location 컬럼 선택에 사용. healo_lang(또는 googtrans)과 동기화 */
export const getCurrentLangCode = () => {
  if (typeof document === 'undefined') return 'en';
  return getLangCodeFromCookie();
};

/**
 * Resolve a localized field from a DB record's i18n JSONB.
 * Falls back: i18n[lang][field] -> i18n.en[field] -> record[field] -> fallback
 */
export const localize = (record, field, lang) => {
  if (!record) return '';
  const langCode = lang || getCurrentLangCode();

  // 1) 직접 컬럼: name_ko, name_en, name_ru, name_kz, name_zh, name_ja 등
  const directCol = record?.[`${field}_${langCode}`];
  if (directCol !== undefined && directCol !== null && directCol !== '') return directCol;

  // 2) JSONB i18n 필드: record.i18n[lang][field]
  const i18nVal = record?.i18n?.[langCode]?.[field];
  if (i18nVal !== undefined && i18nVal !== null && i18nVal !== '') return i18nVal;

  // 3) 한국어 요청 시: 기본 컬럼이 원본 한국어
  if (langCode === 'ko') return record?.[field] ?? '';

  // 4) 다른 언어 폴백: name_en 직접 컬럼 → i18n.en → 원본
  if (langCode !== 'en') {
    const enDirect = record?.[`${field}_en`];
    if (enDirect !== undefined && enDirect !== null && enDirect !== '') return enDirect;

    const enVal = record?.i18n?.en?.[field];
    if (enVal !== undefined && enVal !== null && enVal !== '') return enVal;
  }

  return record?.[field] ?? '';
};

/**
 * Resolve a localized array field (tags, specialties).
 * Falls back: i18n[lang][field] -> i18n.en[field] -> record[field] -> []
 */
export const localizeArray = (record, field, lang) => {
  if (!record) return [];
  const langCode = lang || getCurrentLangCode();
  
  const i18nVal = record?.i18n?.[langCode]?.[field];
  if (Array.isArray(i18nVal) && i18nVal.length > 0) return i18nVal;
  
  if (langCode === 'ko') {
    const direct = record?.[field];
    return Array.isArray(direct) ? direct : [];
  }
  
  if (langCode !== 'en') {
    const enVal = record?.i18n?.en?.[field];
    if (Array.isArray(enVal) && enVal.length > 0) return enVal;
  }
  
  const direct = record?.[field];
  return Array.isArray(direct) ? direct : [];
};

/**
 * Resolve localized location. Special handling for location_kr / location_en columns.
 */
export const localizeLocation = (record, lang) => {
  if (!record) return '';
  const langCode = lang || getCurrentLangCode();
  
  const i18nLoc = record?.i18n?.[langCode]?.location;
  if (i18nLoc) return i18nLoc;
  
  if (langCode === 'ko') return record?.location_kr || record?.location_en || record?.location || '';
  return record?.location_en || record?.location || record?.location_kr || '';
};
