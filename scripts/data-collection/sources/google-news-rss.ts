/**
 * Google News RSS 소스 — 다국어 시장/경쟁/평판 신호의 1순위.
 *
 * 왜 Google News RSS:
 *   - 인증·API키 불필요(공개 RSS), ToS 친화적, 전 세계 언어/지역 지원.
 *   - 우리 핵심 타겟(러시아어·카자흐어·중국어·영어)의 "한국 암치료/의료관광" 뉴스·블로그를
 *     한 번에 긁어, 경쟁 병원·에이전시 동향과 시장 화제를 본다.
 *   - hl(언어)·gl(국가)·ceid 로 지역화 → 현지 매체 결과를 받는다.
 *
 * 수집 원칙: 공개 뉴스 헤드라인·요약·링크만. 개인 식별정보·환자글 타겟 금지.
 */

import { fetchFeed, FeedItem } from "./rss-feed";

// 언어코드(우리 활성코드) → Google News hl/gl/ceid 매핑.
// kz(카자흐 활성코드)는 BCP47 'kk' + 카자흐스탄(KZ) 지역으로 정규화.
const LOCALE: Record<string, { hl: string; gl: string; ceid: string }> = {
  ru: { hl: "ru", gl: "RU", ceid: "RU:ru" },
  kk: { hl: "kk", gl: "KZ", ceid: "KZ:kk" },
  kz: { hl: "kk", gl: "KZ", ceid: "KZ:kk" },
  zh: { hl: "zh-CN", gl: "CN", ceid: "CN:zh-Hans" },
  en: { hl: "en-US", gl: "US", ceid: "US:en" },
  ko: { hl: "ko", gl: "KR", ceid: "KR:ko" },
  ja: { hl: "ja", gl: "JP", ceid: "JP:ja" },
};

/**
 * 한 언어 + 한 질의로 Google News RSS 를 조회한다.
 * @param query  검색어 (해당 언어로)
 * @param lang   활성 언어코드 (ru·kz·zh·en·ko·ja)
 * @param queryKey  주제 키(라벨용)
 */
export async function searchGoogleNews(
  query: string,
  lang: string,
  queryKey: string
): Promise<FeedItem[]> {
  const loc = LOCALE[lang] || LOCALE.en;
  const url =
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}` +
    `&hl=${loc.hl}&gl=${loc.gl}&ceid=${encodeURIComponent(loc.ceid)}`;
  return fetchFeed(url, {
    platform: "google_news",
    source: `Google News (${lang})`,
    lang,
    query: queryKey,
  });
}
