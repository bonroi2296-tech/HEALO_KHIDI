/**
 * 후보 페이지 랭킹: LLM에 넣을 "상위 10개 시술/가격/프로그램 상세 페이지" 선별
 */

import type { FetchedPageForRanking, DomExtractPerPage } from "./types";

const MAX_RANKED = 10;
const MAX_REJECTED_DEBUG = 10;
const MIN_TEXT_LEN = 400;

/** A. URL path 키워드 (점수) */
const URL_GOOD = /\/treat|\/treatment|\/program|\/price|\/fee|\/clinic|\/service|\/procedure|\/cosmetic|\/center|\/진료|\/치료|\/시술|\/가격|\/비용|\/클리닉|\/센터|\/메뉴|\/menu/i;
const URL_GOOD_WEIGHT = 25;

/** 비의료/콘텐츠 페이지: 포함 시 무조건 제외, rejected_pages_top10에 url_content_page */
const URL_CONTENT_EXCLUDE =
  /\/board\/|\/blog\/|\/news\/|\/notice\/|\/member\/|\/login\/|\/terms\/|\/privacy\/|\/faq\/|\/search\/|\/event\/|\/promotion/i;

/** D. 저품질 URL (강한 감점) */
const URL_BAD =
  /\/board\/|\/list\.|\/login|\/signin|\/terms|\/privacy|\/개인정보|\/약관|\/공지|\/notice|\/blog\/|\/search\?|\.list\.php|board\.list/i;
const URL_BAD_PENALTY = 80;

/** B. 텍스트 키워드 */
const TEXT_GOOD =
  /가격|비용|원\s|만원|₩|KRW|USD|프로그램|패키지|시술|수술|클리닉|센터|진료|코스|횟수|부위|treatment|procedure|program|price|package|clinic/i;
const TEXT_GOOD_WEIGHT = 3;
const TEXT_GOOD_MAX = 50; // cap points from text keywords

/** C. 가격 패턴 */
const PRICE_PATTERN = /[₩$]\s*\d|[\d,]{3,}\s*원|\d+\s*만\s*원|KRW\s*\d|USD\s*\d|\d{1,3}(,\d{3})+/;
const PRICE_WEIGHT = 15;
const PRICE_MAX = 30;

/** E. text_len 너무 짧으면 감점 */
const SHORT_PENALTY_BELOW = 400;
const SHORT_PENALTY = 40;

export interface RankSignal {
  url_path: number;
  text_keywords: number;
  price_pattern: number;
  url_bad_penalty: number;
  short_penalty: number;
}

export interface RankedCandidate {
  url: string;
  text: string;
  text_len: number;
  score: number;
  signals: RankSignal;
  /** Playwright DOM 추출 결과 (있으면 LLM 입력 시 우선 사용) */
  dom_extract?: DomExtractPerPage;
}

export interface RejectedPage {
  url: string;
  reason: string;
  score: number;
}

export interface RankResult {
  ranked: RankedCandidate[];
  rejected: RejectedPage[];
  url_quality_breakdown: { good: number; neutral: number; bad: number };
}

function scoreUrlPath(url: string): number {
  return URL_GOOD.test(url) ? URL_GOOD_WEIGHT : 0;
}

function scoreTextKeywords(text: string): number {
  let count = 0;
  const re = new RegExp(TEXT_GOOD.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    count++;
    if (count >= 20) break;
  }
  return Math.min(count * TEXT_GOOD_WEIGHT, TEXT_GOOD_MAX);
}

function scorePricePattern(text: string): number {
  let count = 0;
  const re = new RegExp(PRICE_PATTERN.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    count++;
    if (count >= 3) break;
  }
  return Math.min(count * PRICE_WEIGHT, PRICE_MAX);
}

function scoreUrlBad(url: string): number {
  return URL_BAD.test(url) ? URL_BAD_PENALTY : 0;
}

function scoreShortText(textLen: number): number {
  return textLen < SHORT_PENALTY_BELOW ? SHORT_PENALTY : 0;
}

/**
 * 후보 페이지 랭킹
 * 입력: fetched_pages[] (url, text, text_len)
 * 출력: ranked_candidate_pages (최대 10개), rejected_pages_top10, url_quality_breakdown
 */
export function rankCandidatePages(pages: FetchedPageForRanking[]): RankResult {
  const breakdown = { good: 0, neutral: 0, bad: 0 };
  const contentExcluded: Array<{ url: string; reason: string; score: number }> = [];
  const scored: Array<{
    url: string;
    text: string;
    text_len: number;
    score: number;
    signals: RankSignal;
    dom_extract?: DomExtractPerPage;
  }> = [];

  for (const p of pages) {
    if (URL_CONTENT_EXCLUDE.test(p.url)) {
      contentExcluded.push({ url: p.url, reason: "url_content_page", score: -1000 });
      continue;
    }

    const urlPath = scoreUrlPath(p.url);
    const textKw = scoreTextKeywords(p.text);
    const price = scorePricePattern(p.text);
    const badPenalty = scoreUrlBad(p.url);
    const shortPenalty = scoreShortText(p.text_len);

    const signals: RankSignal = {
      url_path: urlPath,
      text_keywords: textKw,
      price_pattern: price,
      url_bad_penalty: badPenalty,
      short_penalty: shortPenalty,
    };

    const score = urlPath + textKw + price - badPenalty - shortPenalty;

    if (URL_BAD.test(p.url)) breakdown.bad++;
    else if (URL_GOOD.test(p.url) || textKw > 0 || price > 0) breakdown.good++;
    else breakdown.neutral++;

    scored.push({
      url: p.url,
      text: p.text,
      text_len: p.text_len,
      score,
      signals,
      dom_extract: p.dom_extract,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const ranked = scored.slice(0, MAX_RANKED);
  const rejectedByScore = scored.slice(MAX_RANKED, MAX_RANKED + MAX_REJECTED_DEBUG).map((s) => ({
    url: s.url,
    reason: s.signals.url_bad_penalty > 0 ? "low_quality_url" : "score_below_top10",
    score: s.score,
  }));
  const rejected = [...contentExcluded.slice(0, 10), ...rejectedByScore].slice(0, MAX_REJECTED_DEBUG);

  return {
    ranked: ranked.map(({ url, text, text_len, score, signals, dom_extract }) => ({
      url,
      text,
      text_len,
      score,
      signals,
      dom_extract,
    })),
    rejected,
    url_quality_breakdown: breakdown,
  };
}

const DEFAULT_PER_PAGE_CHARS = 20_000;
const DEFAULT_TOTAL_CUTOFF = 120_000;

export interface LlmInputBuildResult {
  text: string;
  pages_used: number;
  chars_used: number;
  cutoff_chars: number;
}

/**
 * 페이지별 LLM용 텍스트: tables_text + price_blocks_text + headings_context + plainText 순
 */
function getPageTextForLlm(p: RankedCandidate): string {
  const d = p.dom_extract;
  const segs: string[] = [];
  if (d?.tables_text?.trim()) segs.push(d.tables_text.trim());
  if (d?.price_blocks_text?.trim()) segs.push(d.price_blocks_text.trim());
  if (d?.headings_context?.trim()) segs.push(d.headings_context.trim());
  if (p.text?.trim()) segs.push(p.text.trim());
  return segs.join("\n\n");
}

/**
 * 랭킹 상위 페이지들만으로 LLM 입력 텍스트 구성
 * 우선순위: tables + price_blocks + headings + plainText. 페이지당 perPageMax, 전체 totalCutoff.
 */
export function buildLlmInputFromRanked(
  ranked: RankedCandidate[],
  options?: { perPageMax?: number; totalCutoff?: number }
): LlmInputBuildResult {
  const perPageMax = options?.perPageMax ?? DEFAULT_PER_PAGE_CHARS;
  const totalCutoff = options?.totalCutoff ?? DEFAULT_TOTAL_CUTOFF;

  const parts: string[] = [];
  let charsUsed = 0;

  for (const p of ranked) {
    if (charsUsed >= totalCutoff) break;
    const fullText = getPageTextForLlm(p);
    const take = Math.min(fullText.length, perPageMax, totalCutoff - charsUsed);
    if (take <= 0) continue;
    parts.push(`[URL: ${p.url}]\n${fullText.slice(0, take)}`);
    charsUsed += take;
  }

  return {
    text: parts.join("\n\n"),
    pages_used: parts.length,
    chars_used: charsUsed,
    cutoff_chars: totalCutoff,
  };
}
