// URL 언어화 단일 설정 (single source of truth).
// 미들웨어·[lang] 레이아웃·링크 헬퍼·sitemap이 전부 여기서 가져간다.
// 활성 콘텐츠 언어 6개 (DICTIONARY/LANG_OPTIONS_PRIMARY와 일치). 폴백: lang→en→ko.
// ponytail: 라우팅용 가벼운 상수만. 콘텐츠 사전(DICTIONARY)은 i18n/index.js 그대로.

export const LOCALES = ["en", "ko", "ru", "kz", "zh", "ja"];
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "healo_lang"; // i18n/index.js setLangCookie와 동일

export const isLocale = (x) => LOCALES.includes(x);

// 경로 앞에 현재 언어를 붙인다. 이미 붙어 있으면 그대로.
// 예: localeHref("/treatments", "ru") → "/ru/treatments"
export function localeHref(path, locale = DEFAULT_LOCALE) {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  if (!path || path[0] !== "/") return path; // 외부/상대 링크는 건드리지 않음
  const seg = path.split("/")[1];
  if (isLocale(seg)) return path; // 이미 언어 prefix 있음
  return `/${loc}${path === "/" ? "" : path}`;
}

// 경로에서 언어 prefix를 떼고 (locale, rest) 반환. 없으면 [null, path].
export function splitLocale(path) {
  const seg = (path || "/").split("/")[1];
  if (isLocale(seg)) return [seg, path.slice(seg.length + 1) || "/"];
  return [null, path];
}

// 언어 스위처용: 현재 URL에서 언어만 바꾼 목적지. prefix 있으면 교체해 반환,
// 없으면(언어화 안 된 내부 경로) null → 호출부에서 그냥 reload.
export function localeSwitchTarget(pathname, search, code) {
  const [loc] = splitLocale(pathname);
  if (!loc) return null;
  const [, rest] = splitLocale(pathname);
  return localeHref(rest, code) + (search || "");
}
