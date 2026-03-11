/**
 * 대표 시술 파이프라인: 후보 → 설명 문맥 → 가격 매칭 → 스코어·다양성 → 최종 3~10개
 */

import type { OfferItem } from "./types";
import type { CandidateDraft } from "./representativeCandidates";
import type { ProgramRankedPage } from "./programCandidateRanking";
import type { PriceIndex, MatchPriceResult } from "./priceIndex";
import { buildDescriptionContext, fallbackShortDescription } from "./descriptionContext";
import { matchPrice } from "./priceIndex";
import { normalizeOfferDraft } from "./normalizeOffer";

const MIN_OFFERS = 3;
const MAX_OFFERS = 10;
const NOISE_DESC = /궁금하신\s*점|QR|검색|로그인|이용약관|전화\s*번호|\d{2,3}-\d{3,4}-\d{4}/i;

/** 너무 일반적인 이름 감점 */
const GENERIC_NAMES = /^상담$|^진료$|^치료$|^검사$|^예약$/i;

export interface RepresentativeOfferResult {
  offers: OfferItem[];
  representative_candidates_count: number;
  selected_count: number;
  price_index_size: number;
  price_match_stats: { exact_count: number; fuzzy_count: number; none_count: number };
  sample_offers?: Array<{ name: string; description: string; price: string }>;
}

function scoreRepresentativeOffer(
  offer: OfferItem,
  hasDescription: boolean,
  hasPrice: boolean,
  programScore: number
): number {
  let s = programScore * 0.3;
  if (GENERIC_NAMES.test(offer.treatment.name)) s -= 20;
  if (hasDescription) s += 15;
  if (hasPrice) s += 10;
  return s;
}

/**
 * 대표 후보 + 가격 인덱스 → 설명 생성, 가격 매칭, 스코어·다양성 적용 후 3~10개 반환
 */
export function buildRepresentativeOffers(
  candidates: CandidateDraft[],
  programRankedPages: ProgramRankedPage[],
  priceIndex: PriceIndex,
  hospitalName?: string
): RepresentativeOfferResult {
  const priceMatchStats = { exact_count: 0, fuzzy_count: 0, none_count: 0 };
  const urlToScore = new Map(programRankedPages.map((r) => [r.page.url, r.score]));
  const scored: Array<{ offer: OfferItem; score: number }> = [];

  for (const c of candidates) {
    const context = buildDescriptionContext(
      c.pageText,
      c.name,
      programRankedPages.find((r) => r.page.url === c.source_url)?.page.dom_extract?.headings_context
    );
    let shortDesc = fallbackShortDescription(context, 200);
    if (NOISE_DESC.test(shortDesc)) {
      shortDesc = shortDesc.replace(new RegExp(NOISE_DESC.source, "gi"), "").trim().slice(0, 200);
    }
    if (!shortDesc) shortDesc = c.name;

    const priceResult = matchPrice(c.name, priceIndex);
    if (priceResult.match_type === "exact") priceMatchStats.exact_count++;
    else if (priceResult.match_type === "fuzzy") priceMatchStats.fuzzy_count++;
    else priceMatchStats.none_count++;

    const draft = {
      name: c.name,
      description: shortDesc,
      text: c.short_description_seed,
      price_min: priceResult.price_min ?? undefined,
      price_max: priceResult.price_max ?? undefined,
      currency: priceResult.currency ?? undefined,
      evidence: {
        name: { source_url: c.source_url, snippet_or_ocr_text: c.short_description_seed.slice(0, 200) },
      },
    };
    const norm = normalizeOfferDraft(draft, hospitalName);
    if (!norm) continue;

    const treatment = {
      name: norm.name,
      description: norm.short_description,
      full_description: norm.short_description,
      price_min: norm.price_min ?? undefined,
      price_max: norm.price_max ?? undefined,
      currency: norm.price_note ? null : (norm.currency ?? undefined),
      price_note: norm.price_note ?? undefined,
    };
    const offer: OfferItem = {
      treatment,
      evidence: norm.evidence ?? {
        name: { source_url: c.source_url, snippet_or_ocr_text: c.short_description_seed.slice(0, 200) },
      },
      confidence: 0.85,
    };

    const programScore = urlToScore.get(c.source_url) ?? 0;
    const hasDescription = (norm.short_description || "").length >= 20;
    const hasPrice = norm.price_min != null;
    const score = scoreRepresentativeOffer(offer, hasDescription, hasPrice, programScore);
    scored.push({ offer, score });
  }

  scored.sort((a, b) => b.score - a.score);

  const selected: OfferItem[] = [];
  const usedHints = new Set<string>();
  for (const { offer } of scored) {
    if (selected.length >= MAX_OFFERS) break;
    const hint = offer.treatment.name.slice(0, 10);
    if (usedHints.has(hint) && selected.length >= MIN_OFFERS) continue;
    usedHints.add(hint);
    selected.push(offer);
  }

  if (selected.length < MIN_OFFERS) {
    for (const { offer } of scored) {
      if (selected.length >= MIN_OFFERS) break;
      if (selected.some((o) => o.treatment.name === offer.treatment.name)) continue;
      selected.push(offer);
    }
  }

  const sample_offers = selected.slice(0, 5).map((o) => ({
    name: o.treatment.name,
    description: (o.treatment.description ?? "").slice(0, 100),
    price:
      o.treatment.price_min != null
        ? `${o.treatment.price_min}${o.treatment.price_max != null ? `~${o.treatment.price_max}` : ""} ${o.treatment.currency ?? "KRW"}`
        : (o.treatment.price_note ?? "문의"),
  }));

  return {
    offers: selected,
    representative_candidates_count: candidates.length,
    selected_count: selected.length,
    price_index_size: priceIndex.size,
    price_match_stats: priceMatchStats,
    sample_offers,
  };
}
