/**
 * program 타입 병원용: h1 → page_title/og_title → headings → URL 순 제목 추출.
 * normalizeOfferDraft 통과분만 반환, short_description 1~2문장.
 */

import type { FetchedPageForRanking } from "./types";
import type { OfferItem } from "./types";
import { normalizeOfferDraft, normalizedToOfferItem, clearRejectedDraftSamples } from "./normalizeOffer";

const MAX_PROGRAM_OFFERS = 5;
const MAX_TITLE_SOURCES_DEBUG = 10;
const URL_PRIORITY = /cancer|neuro|rehab|herb|clinic|center/i;
const DESCRIPTION_MAX_CHARS = 1500;
const MIN_TITLE_LEN_NO_SPACE = 6;

/** 제목으로 쓰기 부적합한 공통 헤더/푸터 문구 */
const NOISE_TITLE =
  /궁금하신\s*점|QR|전화|로그인|이용약관|개인정보|FAQ|문의|진료일정|의료진소개|센터소개/i;

/** description에서 제거할 문단용 (제목과 동일 + 문단 필터) */
const NOISE_PARAGRAPH = NOISE_TITLE;

/** URL path 마지막 segment → 읽기 쉬운 라벨 (일부 매핑) */
const SLUG_TO_LABEL: Record<string, string> = {
  shingles: "대상포진",
  cancer: "암",
  neuro: "신경",
  rehab: "재활",
  herb: "한방",
  clinic: "클리닉",
  center: "센터",
};

export interface ProgramTitleSource {
  url: string;
  raw_title: string | null;
  chosen_title: string | null;
  reason_if_skipped?: string;
}

export interface ExtractProgramOffersResult {
  offers: OfferItem[];
  program_candidates_count: number;
  program_selected_count: number;
  program_title_sources?: ProgramTitleSource[];
}

function normalizeTitleForDedupe(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
}

function isNoiseTitle(title: string): boolean {
  if (!title || title.replace(/\s/g, "").length < MIN_TITLE_LEN_NO_SPACE) return true;
  return NOISE_TITLE.test(title);
}

/** headings_context에서 노이즈 라인 제거 후 첫 번째 의미 있는 heading */
function firstMeaningfulHeading(headingsContext: string | undefined): string | null {
  if (!headingsContext?.trim()) return null;
  const blocks = headingsContext.trim().split(/\n\n+/);
  for (const block of blocks) {
    const line = block.trim();
    if (!line) continue;
    if (isNoiseTitle(line)) continue;
    if (line.replace(/\s/g, "").length < MIN_TITLE_LEN_NO_SPACE) continue;
    return line;
  }
  return null;
}

/** URL path 마지막 segment를 사람이 읽기 좋게 변환 */
function titleFromUrlPath(url: string): string | null {
  try {
    const path = new URL(url).pathname.replace(/\/$/, "");
    const segments = path.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last) return null;
    let label = last
      .replace(/\.(php|html|htm|asp|aspx|jsp)$/i, "")
      .replace(/-(\d+)$/, "")
      .replace(/-/g, " ")
      .trim();
    const lower = label.toLowerCase();
    if (SLUG_TO_LABEL[lower]) label = SLUG_TO_LABEL[lower];
    if (label.replace(/\s/g, "").length < MIN_TITLE_LEN_NO_SPACE) return null;
    return label;
  } catch {
    return null;
  }
}

/** 우선순위: h1 → page_title/og_title → headings_context 첫 블록 → URL path */
function getTitleFromPage(p: FetchedPageForRanking): { title: string | null; raw: string | null } {
  const d = p.dom_extract;
  const rawCandidates: string[] = [];

  // a) h1 텍스트
  const h1 = (d?.h1_text ?? "").trim();
  if (h1) {
    rawCandidates.push(h1);
    if (!isNoiseTitle(h1)) return { title: h1, raw: h1 };
  }

  // b) page_title / og_title
  const pageTitle = (d?.page_title || d?.og_title || "").trim();
  if (pageTitle) {
    rawCandidates.push(pageTitle);
    if (!isNoiseTitle(pageTitle)) return { title: pageTitle, raw: pageTitle };
  }

  // c) headings_context 노이즈 제거 후 첫 heading
  const fromHeadings = firstMeaningfulHeading(d?.headings_context);
  if (fromHeadings) {
    rawCandidates.push(fromHeadings);
    if (!isNoiseTitle(fromHeadings)) return { title: fromHeadings, raw: fromHeadings };
  }

  // d) URL path 마지막 segment
  const fromUrl = titleFromUrlPath(p.url);
  if (fromUrl) {
    rawCandidates.push(fromUrl);
    return { title: fromUrl, raw: rawCandidates[0] || fromUrl };
  }

  const firstLine = p.text.trim().split(/\n/)[0]?.trim().slice(0, 200);
  if (firstLine) rawCandidates.push(firstLine);
  return { title: null, raw: rawCandidates[0] ?? null };
}

/** 1~2문장만: headings_context 또는 plainText 상위 문단 중 boilerplate 제거 후 앞 2문단 */
function oneTwoSentences(p: FetchedPageForRanking): string {
  const h = p.dom_extract?.headings_context?.trim();
  if (h) {
    const blocks = h.split(/\n\n+/).map((b) => b.trim()).filter((b) => b && !NOISE_PARAGRAPH.test(b));
    const taken = blocks.slice(0, 2).join(" ");
    if (taken) return taken.replace(/\s+/g, " ").slice(0, 300);
  }
  const paragraphs = p.text.trim().split(/\n\n+/).map((s) => s.trim()).filter((s) => s && !NOISE_PARAGRAPH.test(s));
  const taken = paragraphs.slice(0, 2).join(" ");
  return taken.replace(/\s+/g, " ").slice(0, 300) || "";
}

/**
 * program 타입: h1 우선 제목 → normalizeOfferDraft 통과분만 채택. short_description 1~2문장. 최대 5개.
 */
export function extractProgramOffers(
  pages: FetchedPageForRanking[],
  hospitalName?: string
): ExtractProgramOffersResult {
  clearRejectedDraftSamples();
  const sorted = [...pages].sort((a, b) => {
    const aMatch = URL_PRIORITY.test(a.url) ? 1 : 0;
    const bMatch = URL_PRIORITY.test(b.url) ? 1 : 0;
    return bMatch - aMatch;
  });

  const offers: OfferItem[] = [];
  const seenNormalized = new Set<string>();
  const titleSources: ProgramTitleSource[] = [];
  let program_candidates_count = 0;

  for (const p of sorted) {
    if (offers.length >= MAX_PROGRAM_OFFERS) break;

    const { title, raw } = getTitleFromPage(p);

    if (titleSources.length < MAX_TITLE_SOURCES_DEBUG) {
      titleSources.push({
        url: p.url,
        raw_title: raw ?? null,
        chosen_title: title ?? null,
        reason_if_skipped: title ? undefined : (raw ? "noise_or_too_short" : "no_title"),
      });
    }

    if (!title) continue;
    if (isNoiseTitle(title)) {
      const entry = titleSources.find((e) => e.url === p.url);
      if (entry) entry.reason_if_skipped = "noise_title";
      continue;
    }

    const normalizedKey = normalizeTitleForDedupe(title);
    if (seenNormalized.has(normalizedKey)) {
      const entry = titleSources.find((e) => e.url === p.url);
      if (entry) entry.reason_if_skipped = "duplicate_title";
      continue;
    }

    const shortDesc = oneTwoSentences(p);
    const draft = {
      name: title,
      description: shortDesc,
      text: p.text.trim().slice(0, 500),
      evidence: {
        name: { source_url: p.url, snippet_or_ocr_text: p.text.trim().slice(0, 200) },
      },
    };
    const normalized = normalizeOfferDraft(draft, hospitalName);
    if (!normalized) {
      const entry = titleSources.find((e) => e.url === p.url);
      if (entry) entry.reason_if_skipped = "normalize_rejected";
      continue;
    }
    seenNormalized.add(normalizedKey);
    program_candidates_count++;
    offers.push(normalizedToOfferItem(normalized, 0.8));
  }

  return {
    offers,
    program_candidates_count,
    program_selected_count: offers.length,
    program_title_sources: titleSources.length > 0 ? titleSources : undefined,
  };
}
