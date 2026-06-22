import "server-only";
import { headers } from "next/headers";
import { LOCALES, DEFAULT_LOCALE } from "./config";
import { t } from "./index";

// 서버 메타데이터(hreflang·canonical·OG locale) 헬퍼.
// 미들웨어가 넘긴 x-locale(현재 언어)·x-pathname(언어 뗀 경로)을 읽어 생성한다.
// 공개 페이지 어디서나 generateMetadata에서 (await localeAlternates()) 펼쳐 쓰면 됨.

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "https://healwith.co.kr";

// BCP47 표기 (kz→kk) + OG locale 태그
const HREF_LANG = { en: "en", ko: "ko", ru: "ru", kz: "kk", zh: "zh", ja: "ja" };
export const OG_LOCALE = { en: "en_US", ko: "ko_KR", ru: "ru_RU", kz: "kk_KZ", zh: "zh_CN", ja: "ja_JP" };

// locale=null 이면 언어화 안 된 요청(내부도구·게스트 등) — 미들웨어가 x-locale 안 붙임.
export async function getRequestLocale() {
  const h = await headers();
  return {
    locale: h.get("x-locale") || null,
    path: h.get("x-pathname") || "/",
  };
}

// 정적 metadata(base)에 요청 언어별 제목/설명을 입혀 반환. 공개페이지 generateMetadata에서 사용.
// title은 absolute로 줘 루트 template "%s | healwith" 중복을 피한다. OG 제목/설명도 같이 언어화.
export async function localizedMeta(base, titleKey, descKey) {
  const { locale } = await getRequestLocale();
  const lc = locale || DEFAULT_LOCALE;
  const title = t(titleKey, lc);
  const description = t(descKey, lc);
  return {
    ...base,
    title: { absolute: title },
    description,
    openGraph: base.openGraph ? { ...base.openGraph, title, description } : base.openGraph,
  };
}

// hreflang(6언어 + x-default) + 현재 언어 canonical. 절대 URL.
// 언어화 안 된 요청이면 null 반환 → 호출부(layout)에서 alternates 생략.
export async function localeAlternates() {
  const { locale, path } = await getRequestLocale();
  if (!locale) return null;
  const base = siteUrl();
  const clean = !path || path === "/" ? "" : path;
  const languages = {};
  for (const l of LOCALES) languages[HREF_LANG[l]] = `${base}/${l}${clean}`;
  languages["x-default"] = `${base}/${DEFAULT_LOCALE}${clean}`;
  return {
    canonical: `${base}/${locale}${clean}`,
    languages,
  };
}
