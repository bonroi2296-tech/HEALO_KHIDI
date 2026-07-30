// 활성 콘텐츠 언어(라우팅·SEO 단일 목록). 언어 추가 = config.js LOCALES 한 곳.
import { LOCALES } from "./config";

// 서버에서는 21개 언어 전부가 들어 있는 진짜 사전.
// 클라이언트 빌드에서는 next.config.js 가 이걸 dictionary.client.js(빈 껍데기)로 바꿔치기한다
// → 브라우저 번들에 사전이 안 들어간다. 대신 브라우저는 아래 clientDict() 가 읽는
//   window.__I18N__ 을 쓰고, 그건 layout 이 넣은 `/i18n/<lang>.js` 한 개가 채운다.
import { DICTIONARY } from "./dictionary";

// 테넌트(이 사이트가 누구 것인지) 브랜드명 치환. healwith 기본이면 아무 일도 하지 않는다.
// 사전에 브랜드명이 545군데 박혀 있어 파일마다 고치는 대신 t() 한 곳에서 갈아끼운다.
import { applyTenantBrand } from "@/lib/tenant";

// ── 브라우저 쪽 사전 ────────────────────────────────────────────
// 왜 이렇게까지 하나: 전에는 러시아 환자가 한국어·중국어·일본어 사전까지 다 받았다
// (홈 첫 화면 JS 623KB 중 269KB). 이제 «자기 언어 1개»만 받는다.
// `/i18n/<lang>.js` 는 en 값으로 이미 빈칸을 메운 «완성본»이라, t() 의 en 폴백을
// 브라우저에서 따로 안 받아도 된다.
const IS_BROWSER = typeof window !== "undefined";

/** 그 언어의 사전. 브라우저에서 못 받은 언어면 이 페이지의 기본 언어 사전으로 폴백. */
function dictOf(lang) {
  if (IS_BROWSER) {
    const reg = window.__I18N__;
    if (!reg) return {};
    return reg[lang] || reg[reg.__primary] || {};
  }
  return DICTIONARY[lang] || DICTIONARY.en;
}

/** 최후 폴백 사전(서버=en 원본, 브라우저=이 페이지 언어의 완성본). */
function fallbackDict() {
  if (IS_BROWSER) {
    const reg = window.__I18N__;
    return (reg && (reg.en || reg[reg.__primary])) || {};
  }
  return DICTIONARY.en;
}

/** 고를 수 있는 언어 코드인가 (쿠키 값 검증용). 예전엔 `DICTIONARY[code]` 로 봤는데
 *  브라우저엔 사전이 없으므로 아래 LANG_OPTIONS 목록으로 판정한다(같은 목록이 SoR). */
const isKnownLangCode = (code) => LANG_OPTIONS.some((l) => l.code === code);


/** UI 언어 목록 (DICTIONARY 키와 일치). 활성 6 + 기타 — 단 km·my는 빈 사전(영어 폴백), ms·uz는 복사본(위 감사 주석 참고) */
export const LANG_OPTIONS = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "th", label: "ไทย" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "hi", label: "हिन्दी" },
  { code: "tl", label: "Tagalog" },
  { code: "mn", label: "Монгол" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "km", label: "ភាសាខ្មែរ" },
  { code: "my", label: "မြန်မာ" },
  { code: "uz", label: "O'zbek" },
  { code: "kz", label: "Қазақша" },
];

/** 상단 노출용 주요 언어 = 활성 콘텐츠 언어(LOCALES). 표시 순서 = PO 지정(러·카 우선) */
const PRIMARY_ORDER = ["ru", "kz", "en", "ja", "zh", "ko"];
export const LANG_OPTIONS_PRIMARY = PRIMARY_ORDER
  .filter(c => LOCALES.includes(c))
  .map(c => LANG_OPTIONS.find(l => l.code === c))
  .filter(Boolean);
/** 기타 언어 (접었을 때 스크롤 영역으로 제한) */
export const LANG_OPTIONS_OTHER = LANG_OPTIONS.filter(l => !LOCALES.includes(l.code));

// 직접 고른 언어(healo_lang 쿠키)는 항상 우선. 공개 페이지는 proxy가 URL 언어로 쿠키를 맞춰줌.
export const getLangCodeFromCookie = () => {
  if (typeof document === "undefined") return "en";
  const cookies = document.cookie.split(";");
  const healoLang = cookies.find((row) => row.trim().startsWith("healo_lang="));
  if (healoLang) {
    const code = healoLang.split("=")[1].trim();
    if (isKnownLangCode(code)) return code;
  }
  const langCookie = cookies.find((row) => row.trim().startsWith("googtrans="));
  if (!langCookie) return "en";
  const langCode = langCookie.split("=")[1].split("/").pop();
  if (langCode === "ko") return "ko";
  if (langCode === "zh-CN") return "zh";
  if (langCode === "ja") return "ja";
  return "en";
};

/** 언어 선택 시 쿠키 저장 (healo_lang). googtrans는 제거해 우리 번역만 사용
 *  ⚠️ 2026-07-29: 여기도 `DICTIONARY[code]` 로 검사하고 있었다 — 이 함수는 브라우저에서만 도는데
 *     브라우저 번들의 DICTIONARY 는 **빈 껍데기**다(위 4~8줄 주석 참고) → 검사가 항상 실패해
 *     쿠키를 **한 번도 저장하지 않았다.** 공개 화면이 멀쩡해 보인 건 주소가 `/ru` 로 옮겨가며
 *     서버가 쿠키를 심어 줬기 때문이지 이 함수 덕이 아니다(실측: 러시아어 선택 → 주소 /en→/ru).
 *     주소 이동이 없는 포털(에이전시·의료기관)에서는 이 함수가 유일한 저장 경로라 그쪽은
 *     안 먹었을 가능성이 높다 — 다만 그 계정으로 로그인해 **직접 재보지는 못했다**(반성문 #156). */
export const setLangCookie = (code) => {
  if (typeof document === "undefined") return;
  if (!isKnownLangCode(code)) return;
  document.cookie = `healo_lang=${code}; path=/; max-age=31536000`;
  document.cookie = "googtrans=; path=/; max-age=0";
};

// ── 백오피스(스태프 포털) 전용 언어 쿠키 ────────────────────────────────
// 왜 분리: 공개 사이트는 브라우저/URL 언어로 healo_lang 을 en 등으로 심는다(프록시·미들웨어).
// 스태프 화면(admin·coordinator)이 그 healo_lang 을 따르면 한국인 운영자·어드민이 영어로 떠 회귀한다.
// → 스태프는 이 healo_bo_lang 만 본다. 기본은 한국어, 포털 상단 스위처로 고른 값만 여기 저장.
// ⚠️ 2026-07-29 수리: 아래 두 함수가 `DICTIONARY[code]` 로 코드 유효성을 봤다. 그런데 이 함수들은
//    **브라우저에서만** 돌고(document 가 있어야 함), 브라우저 번들엔 거대 사전이 실려 있지 않다
//    → 검사가 **항상 실패** = 쿠키를 심어도 못 읽고, 스위처로 골라도 저장되지 않았다.
//    즉 스태프 포털(어드민·코디) 언어 전환이 통째로 죽어 있었다. 실측: 쿠키 healo_bo_lang=ru 를
//    직접 넣고 열어도 화면 전체가 한국어(왼쪽 메뉴 포함).
//    공개 사이트 쪽은 같은 함정을 이미 isKnownLangCode 로 고쳐 뒀는데 백오피스만 남아 있었다.
export const getBackofficeLangFromCookie = () => {
  if (typeof document === "undefined") return null;
  const row = document.cookie.split(";").find((r) => r.trim().startsWith("healo_bo_lang="));
  if (!row) return null;
  const code = row.split("=")[1].trim();
  return isKnownLangCode(code) ? code : null;
};

export const setBackofficeLangCookie = (code) => {
  if (typeof document === "undefined") return;
  if (!isKnownLangCode(code)) return;
  document.cookie = `healo_bo_lang=${code}; path=/; max-age=31536000`;
};

export const getLangCodeFromLabel = (label) => {
  if (DICTIONARY[label]) return label;
  switch (label) {
    case "KOR":
      return "ko";
    case "CHN":
      return "zh";
    case "JPN":
      return "ja";
    case "ENG":
    default:
      return "en";
  }
};

// ── 코디 콘텐츠 오버라이드 (전역 — 모든 사용자 공통 콘텐츠) ──
// 서버: 렌더 전 applyI18nOverrides() 로 채움. 클라: provider 가 초기 1회 주입.
// 비어 있으면 t() 는 기존 사전 동작과 100% 동일(폴백 철저 — 사이트 안 깨짐).
let I18N_OVERRIDES = {}; // { [lang]: { [key]: value } }
export function applyI18nOverrides(map) {
  I18N_OVERRIDES = map && typeof map === "object" ? map : {};
}
export function getI18nOverrides() {
  return I18N_OVERRIDES;
}

export const t = (key, lang = "en") => {
  // 1) 코디 편집 오버라이드 우선
  const ov = I18N_OVERRIDES[lang] && I18N_OVERRIDES[lang][key];
  if (ov != null && ov !== "") return applyTenantBrand(ov, lang);
  // 2) 기존 사전 동작 (폴백) — 서버는 원본 사전, 브라우저는 받아온 자기 언어 사전
  const val = dictOf(lang)[key];
  if (val) return applyTenantBrand(val, lang);
  // dev 환경: 언어 폴백 발생 시 경고 (ru/kz 누락 키 조기 발견용)
  if (
    process.env.NODE_ENV === "development" &&
    lang !== "en" &&
    (lang === "ru" || lang === "kz")
  ) {
    console.warn(`[i18n] Missing key "${key}" for lang "${lang}" — falling back to en`);
  }
  return applyTenantBrand(fallbackDict()[key] || key, lang);
};

// ── 편집 백오피스용: 사전 키 검색·검증 ──
const EDIT_LANGS = ["ko", "en", "ru", "kz", "zh", "ja"];

// 검색 비교용 정규화: 소문자 + 모든 공백(줄바꿈 포함)을 한 칸으로.
// 화면에서 여러 줄로 보이는 문구를 복사해 검색해도(줄바꿈이 공백으로 바뀜) 찾히게.
export const normalizeForSearch = (s) =>
  String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

// key 또는 아무 언어 값에 query 가 포함된 사전 항목을 반환({ key, values:{lang:val} }).
export function searchI18nKeys(query, limit = 60) {
  const q = normalizeForSearch(query);
  if (!q) return [];
  const enDict = DICTIONARY.en || {};
  const out = [];
  for (const key of Object.keys(enDict)) {
    let matched = key.toLowerCase().includes(q);
    if (!matched) {
      for (const lang of EDIT_LANGS) {
        const v = DICTIONARY[lang] && DICTIONARY[lang][key];
        if (typeof v === "string" && normalizeForSearch(v).includes(q)) { matched = true; break; }
      }
    }
    if (matched) {
      const values = getI18nValues(key);
      out.push({ key, values });
      if (out.length >= limit) break;
    }
  }
  return out;
}

// 사전 키 하나의 6개어 기본값 조회(편집기 표시용).
export function getI18nValues(key) {
  if (!isValidI18nKey(key)) return null;
  const values = {};
  for (const lang of EDIT_LANGS) values[lang] = (DICTIONARY[lang] && DICTIONARY[lang][key]) || "";
  return values;
}

// 실재하는 사전 키인가(편집 저장 화이트리스트용).
export function isValidI18nKey(key) {
  return Boolean(DICTIONARY.en && Object.prototype.hasOwnProperty.call(DICTIONARY.en, key));
}
