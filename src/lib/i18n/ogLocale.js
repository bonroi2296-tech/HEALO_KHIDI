// og:locale 한 벌 — «순수» 모듈(server-only 없음)이라 단위시험에서 바로 부를 수 있다.
//
// 왜 따로 뒀나 (2026-09-06 실서비스 실측): 러시아어 홈(/ru)이 og:locale="en_US" 로 나가고,
// 암종 상세(/ru/treatments/digest)엔 og:locale 이 아예 없었다. 루트 layout 은 요청 언어로
// 채우는데 **페이지가 openGraph 를 직접 정의하는 순간 layout 값이 통째로 안 따라온다**
// (Next 의 metadata 병합은 필드 단위가 아니라 openGraph «객체 단위»다). 그래서 og 를 손으로
// 짓는 페이지마다 이 한 줄을 넣어야 한다 — `...ogLocaleFields(locale)`.
// 지키는 시험: src/lib/i18n/ogLocale.test.ts (openGraph 를 정의한 page/layout 전수 대조).
import { LOCALES, DEFAULT_LOCALE } from "./config";

// 내부코드(kz) → OpenGraph locale 표기. HREF_LANG(kz→kk)과 같은 결로 kk_KZ.
export const OG_LOCALE = { en: "en_US", ko: "ko_KR", ru: "ru_RU", kz: "kk_KZ", zh: "zh_CN", ja: "ja_JP" };

/**
 * openGraph 에 펼쳐 넣는 { locale, alternateLocale }.
 * 모르는 언어·null 은 기본 언어(en)로 — og:locale 은 «빈 값»보다 «틀리지 않은 기본값»이 낫다.
 */
export function ogLocaleFields(locale) {
  const lc = LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  return {
    locale: OG_LOCALE[lc],
    alternateLocale: LOCALES.filter((l) => l !== lc).map((l) => OG_LOCALE[l]),
  };
}
