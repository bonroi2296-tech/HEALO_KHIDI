/**
 * 로그인 없는 «게스트 링크»(/claim·/survey·/consultation)의 언어 — 순수 함수만.
 *
 * 왜 (2026-08-31 실측 → 2026-09-05 고침): 코디가 왓츠앱·텔레그램에 링크를 붙여넣으면 뜨는 «미리보기 카드»는
 *   사람이 아니라 봇이 만든다. 봇은 쿠키도 Accept-Language 도 안 보내서 카드가 늘 영어였다(사람이 누르면 제 언어).
 *   언어를 알 방법이 «주소 안»에 있어야 한다 → 환자에게 보내는 링크에 ?lang= 을 붙이고, proxy 가 그걸 읽는다.
 *
 * 순서(pickGuestLocale): ①healo_lang 쿠키(본인이 고른 것) → ②?lang(보낸 사람이 아는 받는 사람 언어) → ③Accept-Language → ④en.
 *   ②가 ①보다 뒤인 이유: 한국인 코디가 환자 링크(?lang=ru)를 눌러 봤다고 코디 화면이 러시아어로 바뀌면 안 된다.
 *   ②가 ③보다 앞인 이유: 러시아어 브라우저를 쓰는 카자흐 환자에게 코디가 kz 로 보냈다면 그게 더 정확한 신호다.
 *
 * 붙이지 않는 링크: /opinion(한국 전문의가 받는다 — 환자 언어를 붙이면 «틀린다»).
 */
import { LOCALES, DEFAULT_LOCALE } from "./config";

/** "kk"(ISO) → "kz"(내부코드) 같은 정규화. 우리 6개 언어가 아니면 null. */
export function normalizeLocaleParam(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let v = raw.trim().toLowerCase().split("-")[0];
  if (v === "kk") v = "kz";
  return (LOCALES as string[]).includes(v) ? v : null;
}

/** 주소에 ?lang= 을 붙인다. 언어를 모르면(null·이상값) 주소를 그대로 돌려준다 — 잘못된 값을 붙이느니 안 붙인다. */
export function withLang(url: string, lang: unknown): string {
  const l = normalizeLocaleParam(lang);
  if (!l) return url;
  const [base, hash = ""] = url.split("#", 2);
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}lang=${l}${hash ? `#${hash}` : ""}`;
}

export interface GuestLocaleInput {
  cookie?: string | null;
  langParam?: string | null;
  acceptLanguage?: string | null;
}

export type GuestLocaleSource = "cookie" | "param" | "header" | "default";

/**
 * proxy.ts 의 detectLocale 이 쓰는 판정 + «어디서 왔나». 쿠키 → ?lang → Accept-Language(q 순서로 전부, kk→kz) → en.
 * source 가 "param" 이면 proxy 는 쿠키를 **세션 동안만** 심는다(1년 고정 금지) — 쿠키 없는 직원이 환자 링크를
 * 눌렀다고 다음 날까지 화면이 그 언어로 남으면 안 된다(독립 리뷰 2026-09-05). 환자는 다음에도 같은 링크로 온다.
 */
export function resolveGuestLocale(input: GuestLocaleInput): { locale: string; source: GuestLocaleSource } {
  const fromCookie = normalizeLocaleParam(input.cookie);
  if (fromCookie) return { locale: fromCookie, source: "cookie" };
  const fromParam = normalizeLocaleParam(input.langParam);
  if (fromParam) return { locale: fromParam, source: "param" };
  // 첫 항목만 보지 않는다 — «우크라이나어, 그다음 러시아어»(uk-UA,ru;q=0.5)처럼 첫 언어는 우리가 없고
  // 둘째가 있는 브라우저가 CIS 에 흔하다(우즈벡·키르기스·우크라이나 → 러시아어). 2026-09-06 로컬 실측:
  // 그 헤더가 영어(en)로 떨어졌다. q 값 순서대로 훑어 «우리가 가진 첫 언어»를 고른다.
  for (const tag of acceptLanguageCandidates(input.acceptLanguage)) {
    const fromHeader = normalizeLocaleParam(tag);
    if (fromHeader) return { locale: fromHeader, source: "header" };
  }
  return { locale: DEFAULT_LOCALE, source: "default" };
}

/** Accept-Language 를 q 값 내림차순(같으면 적힌 순서)으로 편 언어 태그 목록. q=0 은 «거부»라 뺀다. */
export function acceptLanguageCandidates(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const qp = params.map((x) => x.trim()).find((x) => x.startsWith("q="));
      const q = qp ? Number.parseFloat(qp.slice(2)) : 1;
      return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0, i };
    })
    .filter((x) => x.tag && x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i)
    .map((x) => x.tag);
}

/** 언어만 필요할 때. */
export function pickGuestLocale(input: GuestLocaleInput): string {
  return resolveGuestLocale(input).locale;
}
