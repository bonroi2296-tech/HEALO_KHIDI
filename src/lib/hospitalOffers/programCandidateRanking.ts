/**
 * 대표 시술 후보용 페이지 스코어링: 프로그램/센터/클리닉 페이지 우선, 가격 페이지는 price-evidence로만 분리
 */

import type { FetchedPageForRanking } from "./types";

const TOP_N = 15;
const REJECTED_DEBUG = 10;
const URL_EXCLUDED_DEBUG = 5;

/** 비의료/콘텐츠 페이지 URL: 포함 시 무조건 제외 (대표 시술 후보에서 제거) */
const URL_CONTENT_EXCLUDE =
  /\/board\/|\/blog\/|\/news\/|\/notice\/|\/member\/|\/login\/|\/terms\/|\/privacy\/|\/faq\/|\/search\/|\/event\/|\/promotion/i;

/** URL: 센터/클리닉/프로그램/치료 등 → 대표 후보 추출용 가산 */
const URL_PROGRAM =
  /\/center\/|\/clinic\/|\/program\/|\/treatment\/|\/rehab\/|\/cancer\/|\/neuro\/|\/herb\/|\/immune\/|센터|클리닉|프로그램|치료|재활|면역|한방/i;
const URL_PROGRAM_WEIGHT = 30;

/** 가격/비급여 URL → price-evidence 라벨용 (가산은 하지 않음, 별도 분리) */
const URL_PRICE_EVIDENCE = /비급여|nonpayment|fee|price|가격|비용/i;

/** 저품질 URL 강한 감점 */
const URL_BAD =
  /\/board\/|\/list\.|\/login|\/signin|\/terms|\/privacy|\/개인정보|\/약관|\/공지|\/notice|\/blog\/|\/search\?|\.list\.php|board\.list/i;
const URL_BAD_PENALTY = 90;

/** 텍스트: 센터/클리닉/프로그램/치료 등 존재 시 +점 */
const TEXT_PROGRAM =
  /센터|클리닉|프로그램|치료|검사|입원|재활|면역|한방|통합|통증/i;
const TEXT_PROGRAM_WEIGHT = 4;
const TEXT_PROGRAM_MAX = 40;

/** 텍스트 노이즈 → 감점 */
const TEXT_NOISE = /로그인|약관|개인정보|공지사항|게시판|FAQ|검색\s*해\s*주세요|QR/i;
const TEXT_NOISE_PENALTY = 25;

const MIN_TEXT_LEN = 300;
const SHORT_PENALTY = 35;

export interface ProgramRankSignals {
  url_program: number;
  text_program: number;
  text_noise_penalty: number;
  url_bad_penalty: number;
  short_penalty: number;
}

export interface ProgramRankedPage {
  page: FetchedPageForRanking;
  score: number;
  signals: ProgramRankSignals;
  is_price_evidence_only: boolean;
}

export interface ProgramRankResult {
  topPages: ProgramRankedPage[];
  rejected: Array<{ url: string; score: number; reason: string }>;
  program_rank_top10: Array<{ url: string; score: number; signals: ProgramRankSignals }>;
  program_rejected_top10: Array<{ url: string; score: number; reason: string }>;
  /** URL 콘텐츠 페이지로 제외된 샘플 (최대 5개, DEV) */
  url_excluded_samples: Array<{ url: string; reason: string }>;
}

function scoreUrlProgram(url: string): number {
  return URL_PROGRAM.test(url) ? URL_PROGRAM_WEIGHT : 0;
}

function scoreTextProgram(text: string): number {
  let count = 0;
  const re = new RegExp(TEXT_PROGRAM.source, "gi");
  let _m: RegExpExecArray | null;
  while ((_m = re.exec(text)) !== null) {
    count++;
    if (count >= 15) break;
  }
  return Math.min(count * TEXT_PROGRAM_WEIGHT, TEXT_PROGRAM_MAX);
}

function scoreTextNoise(text: string): number {
  return TEXT_NOISE.test(text) ? TEXT_NOISE_PENALTY : 0;
}

function scoreUrlBad(url: string): number {
  return URL_BAD.test(url) ? URL_BAD_PENALTY : 0;
}

/**
 * 대표 시술 후보 추출용 페이지 랭킹. 상위 10~15페이지 반환, 가격 페이지는 is_price_evidence_only로 표시.
 */
export function programCandidateRanking(
  pages: FetchedPageForRanking[]
): ProgramRankResult {
  const urlExcludedSamples: Array<{ url: string; reason: string }> = [];
  const pagesToScore: FetchedPageForRanking[] = [];

  for (const p of pages) {
    if (URL_CONTENT_EXCLUDE.test(p.url)) {
      if (urlExcludedSamples.length < URL_EXCLUDED_DEBUG) {
        urlExcludedSamples.push({ url: p.url, reason: "url_content_page" });
      }
      continue;
    }
    pagesToScore.push(p);
  }

  const scored: ProgramRankedPage[] = [];

  for (const p of pagesToScore) {
    const urlProgram = scoreUrlProgram(p.url);
    const textProgram = scoreTextProgram(p.text);
    const textNoise = scoreTextNoise(p.text);
    const urlBad = scoreUrlBad(p.url);
    const shortPenalty = p.text_len < MIN_TEXT_LEN ? SHORT_PENALTY : 0;

    const signals: ProgramRankSignals = {
      url_program: urlProgram,
      text_program: textProgram,
      text_noise_penalty: textNoise,
      url_bad_penalty: urlBad,
      short_penalty: shortPenalty,
    };

    const score = urlProgram + textProgram - textNoise - urlBad - shortPenalty;
    const is_price_evidence_only =
      URL_PRICE_EVIDENCE.test(p.url) && urlProgram === 0 && textProgram < 10;

    scored.push({
      page: p,
      score,
      signals,
      is_price_evidence_only,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const topPages = scored.slice(0, TOP_N);
  const rejected = scored.slice(TOP_N, TOP_N + REJECTED_DEBUG).map((s) => ({
    url: s.page.url,
    score: s.score,
    reason: s.signals.url_bad_penalty > 0 ? "low_quality_url" : "score_below_top",
  }));

  return {
    topPages,
    rejected,
    program_rank_top10: topPages.slice(0, 10).map((s) => ({
      url: s.page.url,
      score: s.score,
      signals: s.signals,
    })),
    program_rejected_top10: rejected.slice(0, 10),
    url_excluded_samples: urlExcludedSamples,
  };
}
