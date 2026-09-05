import "server-only";
import { headers, cookies } from "next/headers";
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE } from "./config";
import { t } from "./index";
import { ogLocaleFields } from "./ogLocale";

// 서버 메타데이터(hreflang·canonical·OG locale) 헬퍼.
// 미들웨어가 넘긴 x-locale(현재 언어)·x-pathname(언어 뗀 경로)을 읽어 생성한다.
// 공개 페이지 어디서나 generateMetadata에서 (await localeAlternates()) 펼쳐 쓰면 됨.

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "https://healwith.co.kr";

// BCP47 표기 (kz→kk) + OG locale 태그
// export: JSON-LD 의 inLanguage 도 같은 표기를 써야 한다(사본 금지 — 내부코드 kz 를 그대로 내보내면 잘못된 언어태그).
export const HREF_LANG = { en: "en", ko: "ko", ru: "ru", kz: "kk", zh: "zh", ja: "ja" };
// OG_LOCALE·ogLocaleFields 의 정본은 ./ogLocale.js(순수 모듈) — 여기서는 되내보내기만 한다.
export { OG_LOCALE, ogLocaleFields } from "./ogLocale";

// locale=null 이면 언어화 안 된 요청(내부도구·게스트 등) — 미들웨어가 x-locale 안 붙임.
export async function getRequestLocale() {
  const h = await headers();
  return {
    locale: h.get("x-locale") || null,
    path: h.get("x-pathname") || "/",
  };
}

// ── UI 언어(탭 제목·화면 글자)용 — getRequestLocale 과 «일부러» 다른 함수다 ──────────────
//
// 왜 나눴나 (2026-08-31): getRequestLocale 은 두 가지를 겸하고 있었다.
//   ① SEO 주소 언어(canonical·hreflang) — **주소가 진실**이라 x-locale 만 봐야 한다.
//      없으면 null → localeAlternates 가 alternates 자체를 안 내보낸다(그게 안전장치다).
//   ② UI 언어(<title>·본문) — **방문자가 진실**이라 x-locale 이 없어도 쿠키로 이어가야 한다.
// 이 둘의 폴백 규칙이 서로 반대라, 한 함수에 쿠키 폴백을 넣으면 ①이 같이 감염된다:
// x-locale 이 없는 비공개 경로 86개가 canonical+hreflang 을 새로 얻고, 게다가 그 경로엔
// x-pathname 도 안 붙어서(proxy.ts 게스트 분기) canonical 이 「그 언어 홈」으로 잘못 찍힌다.
// → 이득 6개 화면, 피해 86개 화면. 그래서 **함수를 나눴다. localeAlternates 는 손대지 마라.**
//
// ⚠️ 이게 필요한 진짜 이유(다음 세션이 「x-locale 쓰면 되잖아」로 되돌리기 쉽다):
//   /patient/* · /no-access 는 proxy.ts 의 PUBLIC_PREFIXES 밖이라 **x-locale 이 안 붙는다.**
//   거기서 getRequestLocale 을 쓰면 항상 DEFAULT_LOCALE(en) 으로 떨어져 «아무것도 안 고쳐진다».
//   (/claim·/survey 는 GUEST_LINK_PREFIXES 라 x-locale 이 붙어 첫 단계에서 끝난다.)
//
// 순서·검증 기준은 app/layout.jsx 의 본문 언어 결정과 **같은 한 벌이어야 한다** — 갈리면
// 「본문은 러시아어인데 탭 제목만 영어」가 그대로 되돌아온다. 그래서 layout 도 이 함수를 쓴다.
// ⚠️ 검증은 LOCALES(활성 6개)로. LANG_OPTIONS(21개)로 하면 옛 healo_lang=vi 쿠키를 든
//    방문자가 「본문 en · 탭 제목 vi」가 된다(KNOWN_ISSUES 의 그 함정).
// 🔸 캐시 주의: 지금은 루트 레이아웃이 cookies()·headers() 를 부르므로 전 라우트가 동적 렌더라
//    무해하다. 나중에 엣지 HTML 캐시를 켜면 <title> 도 쿠키 의존이 되므로 Vary: Cookie 가 필요하다.
export async function getUiLocale() {
  const fromHeader = (await headers()).get("x-locale");
  if (LOCALES.includes(fromHeader)) return fromHeader;
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  return LOCALES.includes(fromCookie) ? fromCookie : DEFAULT_LOCALE;
}

// 다국어 객체({ko,en,ru,...})에서 요청 언어 → en 순으로 고른다. 값 없으면 null.
// generateMetadata·JSON-LD·breadcrumb 등 서버 쪽 언어 폴백의 단일 구현 (사본 금지 — #87 리뷰 게이트).
export function pickLocalized(obj, locale) {
  const lc = locale || DEFAULT_LOCALE;
  return obj?.[lc] || obj?.en || null;
}

// 정적 metadata(base)에 요청 언어별 제목/설명을 입혀 반환. 공개페이지 generateMetadata에서 사용.
// title은 absolute로 줘 루트 template "%s | healwith" 중복을 피한다. OG 제목/설명도 같이 언어화.
//
// 비공개 화면(/patient·/claim·/survey·/no-access)도 **이 함수를 그대로 쓴다.** 인자를 늘리거나
// 별도 헬퍼를 만들면 안 된다 — src/lib/i18n/seoMeta.test.ts 의 정규식이 「인자 정확히 3개」를
// 맞추므로, 모양이 달라지는 순간 그 화면들이 «ru/kz 키릴 검사»에서 경고 없이 빠진다.
// 비공개 화면은 base 에 `alternates: null` 을 넣어 부른다 → 아래 스프레드로 살아남아
// 루트 layout 이 물려주는 canonical/hreflang 을 «지운다»(noindex 화면의 SEO 오염 차단).
export async function localizedMeta(base, titleKey, descKey) {
  // ⚠️ 여기만 getUiLocale — x-locale 이 없는 비공개 화면(/patient·/no-access)에서도 쿠키 언어로
  //    제목이 나와야 본문과 언어가 안 갈린다. 아래 localeAlternates 는 계속 x-locale 전용이다.
  const locale = await getUiLocale();
  const title = t(titleKey, locale);
  const description = t(descKey, locale);
  // ⚠️ og·twitter 는 «항상» 언어화된 값으로 채운다 — base 에 없어도 마찬가지다.
  //   2026-08-31 에 이 자리를 두 번 틀렸고, 두 번 다 실측으로 잡혔다:
  //   ①`openGraph: undefined` 를 키로 내보냄 → Next 병합이 `for (const key in metadata)` 라
  //     값이 undefined 여도 키가 잡혀 루트 layout 것을 통째로 지웠다(/claim 이 og 0개).
  //   ②그래서 «키 자체를 안 쓰게» 바꿨더니 이번엔 루트 layout 의 **영어 마케팅 카드**를 그대로
  //     물려받았다 — 실측: og:title="healwith | Korea Cancer Care…"(영어), og:url=".../ru"(러시아어 홈).
  //     제목만 러시아어인데 메신저가 읽는 건 og 라, 카카오톡·왓츠앱엔 여전히 영어가 떴다.
  //   → 정답은 «지우기»도 «비우기»도 아니라 «언어화해서 채우기». 그래야 코디가 보내는
  //     /claim·/survey 링크의 미리보기 카드가 환자 언어로 뜬다.
  //   og:url 은 공개 화면(base.openGraph 있음)에만 넣는다. 비공개 화면은 x-pathname 이 없어
  //   canonical 이 «그 언어 홈»으로 잘못 찍히기 때문이다(2026-08-31 독립 리뷰 지적).
  const ogBase = base.openGraph ?? {};
  // og:locale 도 «항상» 요청 언어로 (2026-09-06 실측: 페이지 base 의 "en_US" 가 러시아어 홈까지 덮었다).
  const openGraph = { ...ogBase, title, description, ...ogLocaleFields(locale) };
  if (base.openGraph) openGraph.url = (await localeAlternates())?.canonical;
  // ⚠️ 미리보기 «썸네일»도 같이 챙긴다. Next 는 opengraph-image 파일을 «그 세그먼트»에만 자동으로
  //   붙이는데(루트에만 app/opengraph-image.js 가 있다), 페이지가 openGraph 를 정의하는 순간
  //   루트 것이 안 따라온다 → 이미지 없는 맨 카드가 된다. 수리 «전»에는 layout 을 통째로 상속해
  //   이미지가 있었으므로, 안 챙기면 그것도 회귀다(2026-08-31 실측: /claim og:image 0개).
  if (!openGraph.images) openGraph.images = [`${siteUrl()}/opengraph-image`];
  // twitter 도 같이 언어화 (2026-07-30): 예전엔 openGraph 만 갈아서, base.twitter 를 둔
  // 화면(홈·treatments·hospitals·immune)의 트위터/공유 카드만 영어로 남아 있었다.
  const twitter = { ...(base.twitter ?? {}), title, description };
  return {
    ...base,
    title: { absolute: title },
    description,
    openGraph,
    twitter,
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
