/**
 * 대표 시술 후보 추출: h1 → headings(h2/h3) → page_title/og_title, normalize·dedupe
 */

import type { FetchedPageForRanking } from "./types";
import type { ProgramRankedPage } from "./programCandidateRanking";
import { normalizeOfferDraft, clearRejectedDraftSamples } from "./normalizeOffer";

const MAX_CANDIDATES = 50;
const NOISE_TITLE =
  /궁금하신\s*점|QR|검색|로그인|이용약관|개인정보|FAQ|문의|진료일정|의료진소개|센터소개|공지/i;

export interface CandidateDraft {
  name: string;
  short_description_seed: string;
  source_url: string;
  page_section_hint: "h1" | "h2" | "h3" | "title" | "url";
  pageText: string;
}

/**
 * 페이지에서 제목 후보 수집: 1) h1, 2) headings_context 각 블록 첫 줄, 3) page_title/og_title
 */
function collectTitleCandidates(p: FetchedPageForRanking): Array<{ title: string; hint: CandidateDraft["page_section_hint"] }> {
  const out: Array<{ title: string; hint: CandidateDraft["page_section_hint"] }> = [];
  const d = p.dom_extract;

  const h1 = (d?.h1_text ?? "").trim();
  if (h1 && h1.length >= 2 && !NOISE_TITLE.test(h1)) {
    out.push({ title: h1, hint: "h1" });
  }

  const headings = (d?.headings_context ?? "").trim().split(/\n\n+/);
  for (const block of headings) {
    const firstLine = block.split(/\n/)[0]?.trim();
    if (!firstLine || firstLine.length < 2 || NOISE_TITLE.test(firstLine)) continue;
    if (out.some((x) => x.title === firstLine)) continue;
    out.push({ title: firstLine, hint: "h2" });
  }

  const pageTitle = (d?.page_title || d?.og_title || "").trim();
  if (pageTitle && pageTitle.length >= 2 && !NOISE_TITLE.test(pageTitle)) {
    if (!out.some((x) => x.title === pageTitle)) out.push({ title: pageTitle, hint: "title" });
  }

  return out;
}

/**
 * 대표 후보 추출: ranked pages에서 제목 후보 많이 만들고 normalize로 거름. 최대 50, dedupe.
 */
export function extractRepresentativeCandidates(
  rankedPages: ProgramRankedPage[],
  hospitalName?: string
): CandidateDraft[] {
  clearRejectedDraftSamples();
  const seenNormalized = new Set<string>();
  const candidates: CandidateDraft[] = [];

  for (const { page } of rankedPages) {
    if (candidates.length >= MAX_CANDIDATES) break;
    const titleCandidates = collectTitleCandidates(page);

    for (const { title, hint } of titleCandidates) {
      if (candidates.length >= MAX_CANDIDATES) break;
      const draft = { name: title, description: null, text: page.text.slice(0, 500), evidence: undefined };
      const normalized = normalizeOfferDraft(draft, hospitalName);
      if (!normalized) continue;
      const key = normalized.name.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
      if (seenNormalized.has(key)) continue;
      seenNormalized.add(key);

      const seed = page.text.trim().slice(0, 400).replace(/\s+/g, " ");
      candidates.push({
        name: normalized.name,
        short_description_seed: seed,
        source_url: page.url,
        page_section_hint: hint,
        pageText: page.text,
      });
    }
  }

  return candidates;
}
