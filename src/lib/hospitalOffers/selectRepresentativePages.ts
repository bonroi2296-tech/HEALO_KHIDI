/**
 * 대표 시술 후보 페이지 선택: LLM 없이 URL/타이틀/헤딩 기반 규칙 점수화.
 * 비급여 테이블은 가격 힌트로만 쓰고, 대표 시술은 "시술 소개·센터·클리닉·프로그램" 성격 페이지에서 추출.
 */

import type { FetchedPageForRanking } from "./types";

const DEFAULT_TOP_N = 5;

/** +60: URL에 시술/센터/클리닉/프로그램 등 */
const URL_GOOD =
  /\/treatment|\/clinic|\/center|\/program|\/service|\/진료|\/클리닉|\/센터|\/치료|\/검사|\/시술/i;
const URL_GOOD_SCORE = 60;

/** +40: page_title / og_title / h1 / headings에 의료 키워드 */
const TITLE_MEDICAL =
  /센터|클리닉|치료|시술|검사|프로그램|도수|주사|면역|재활/i;
const TITLE_GOOD_SCORE = 40;

/** -80: 로그인/회원/약관/게시판/문의/예약/후기/블로그 등 */
const URL_BAD =
  /login|member|privacy|terms|board|notice|faq|search|문의|예약|후기|블로그/i;
const URL_BAD_PENALTY = 80;

/** -60: 슬로건·서술형 비율 높은 페이지 (물음표/말줄임/입니다/골든타임/72시간 등) */
const SLOGAN_OR_SENTENCE =
  /입니다\s*\.?|물음표|말줄임|[?？！!…]{1,}|골든타임|72\s*시간|해결해\s*드립니다|안심하고/i;
const SLOGAN_PENALTY = 60;

export interface ScoredPage {
  url: string;
  score: number;
  signals: {
    url_good: number;
    title_good: number;
    url_bad: number;
    slogan_penalty: number;
  };
  page: FetchedPageForRanking;
}

/**
 * crawl.pages에서 "대표 시술 후보 페이지"만 규칙으로 점수화해 상위 N개 반환.
 */
export function selectRepresentativePages(
  pages: FetchedPageForRanking[],
  topN: number = DEFAULT_TOP_N
): ScoredPage[] {
  const scored: ScoredPage[] = [];

  for (const page of pages) {
    const url = (page.url || "").trim();
    const d = page.dom_extract;
    const titleParts: string[] = [];
    if (d?.page_title?.trim()) titleParts.push(d.page_title.trim());
    if (d?.og_title?.trim()) titleParts.push(d.og_title.trim());
    if (d?.h1_text?.trim()) titleParts.push(d.h1_text.trim());
    if (d?.headings_context?.trim()) {
      const firstLines = d.headings_context.trim().split(/\n/).slice(0, 5);
      titleParts.push(...firstLines.map((l) => l.trim()).filter(Boolean));
    }
    const titleText = titleParts.join(" ");
    const bodyText = (page.text || "").trim();

    let url_good = 0;
    if (URL_GOOD.test(url)) url_good = URL_GOOD_SCORE;

    let title_good = 0;
    if (TITLE_MEDICAL.test(titleText)) title_good = TITLE_GOOD_SCORE;

    let url_bad = 0;
    if (URL_BAD.test(url)) url_bad = URL_BAD_PENALTY;

    let slogan_penalty = 0;
    const sample = (titleText + "\n" + bodyText.slice(0, 2000));
    const sloganMatches = sample.match(new RegExp(SLOGAN_OR_SENTENCE.source, "gi"));
    if (sloganMatches && sample.length > 100) {
      const ratio = sloganMatches.length / (sample.length / 100);
      if (ratio > 0.5) slogan_penalty = SLOGAN_PENALTY;
    }

    const score = url_good + title_good - url_bad - slogan_penalty;
    scored.push({
      url,
      score,
      signals: { url_good, title_good, url_bad, slogan_penalty },
      page,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}
