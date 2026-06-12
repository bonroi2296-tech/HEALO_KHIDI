/**
 * 시술 오퍼 초안 정제: name/short_description/price 정규화, 노이즈·병원명 제거.
 * admin/treatments 저장 품질을 위해 사용.
 */

import type { OfferEvidence, OfferItem, TreatmentOffer } from "./types";

const NAME_MIN = 6;
const NAME_MAX = 40;
const SHORT_DESC_MAX = 300;
const MAX_REJECTED_DEBUG = 5;

/** name 후보 부적합 */
const NOISE_NAME =
  /궁금하신\s*점|QR|검색해\s*주세요|로그인|이용약관|문의|개인정보|FAQ|진료일정|의료진소개|센터소개/i;

/** 대표 시술: 문장/질문형·슬로건·말줄임 제외 */
const SENTENCE_LIKE_NAME = /[?？]\s*$|\.{2,}\s*$|골든타임|72\s*시간|분명\s*처방/i;

/** 명사구 통과: 문장형 제목 즉시 reject (name_sentence_like) */
const WORD_COUNT_SENTENCE = 8;
const ENDING_PATTERN = /(았는데|했는데|인데|때문에|까요|되나요|있나요|합니다|입니다|됩니다|했어요|했죠|하고\s*있)/;
const ENDS_SENTENCE = /(다|요|까|죠)\s*$/;
const SENTENCE_PUNCT = /[?？！!…]{1,}/;

/** short_description에서 제거할 라인 */
const BOILERPLATE = NOISE_NAME;

/** 가격 패턴: ₩, 원, 만원, KRW, $ */
const PRICE_PATTERN = /₩|원\s*\)|만원|KRW|USD|\$\s*\d|\d[\d,]*\s*원|\d+\s*만\s*원/i;
const NUM_WON = /([\d,]+)\s*원/g;
const NUM_MAN_WON = /([\d,]+)\s*만\s*원/g;
const RANGE_SEP = /~|－|-\s*|\s*부터\s*|\s*~?\s*$/i;

export interface OfferDraft {
  name?: string | null;
  description?: string | null;
  text?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  currency?: string | null;
  evidence?: OfferEvidence;
}

export interface NormalizedOffer {
  name: string;
  short_description: string;
  price_min?: number | null;
  price_max?: number | null;
  currency?: string | null;
  price_note?: string | null;
  evidence?: OfferEvidence;
}

export interface RejectedDraftSample {
  raw_name: string | null;
  reason: string;
  source_url?: string;
}

const rejectedSamples: RejectedDraftSample[] = [];

/** NormalizedOffer → OfferItem (preview/apply payload용) */
export function normalizedToOfferItem(
  n: NormalizedOffer,
  confidence = 0.9
): OfferItem {
  const treatment: TreatmentOffer = {
    name: n.name,
    description: n.short_description || undefined,
    full_description: n.short_description || undefined,
    price_min: n.price_min ?? undefined,
    price_max: n.price_max ?? undefined,
    currency: n.price_note ? null : (n.currency ?? undefined),
    price_note: n.price_note ?? undefined,
  };
  return {
    treatment,
    evidence: n.evidence ?? {},
    confidence,
  };
}

function pushRejected(rawName: string | null, reason: string, sourceUrl?: string): void {
  if (rejectedSamples.length >= MAX_REJECTED_DEBUG) return;
  rejectedSamples.push({ raw_name: rawName, reason, source_url: sourceUrl });
}

export function getRejectedDraftSamples(): RejectedDraftSample[] {
  return [...rejectedSamples];
}

export function clearRejectedDraftSamples(): void {
  rejectedSamples.length = 0;
}

/** 병원명/센터명 등 공통 prefix 제거 */
function stripNamePrefix(name: string, hospitalName?: string): string {
  let s = name.trim();
  if (hospitalName) {
    const escaped = hospitalName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s.replace(new RegExp(`^${escaped}\\s*[|\\-:]?\\s*`, "i"), "").trim();
  }
  s = s.replace(/^센터소개\s*[|\-:]?\s*/i, "").trim();
  s = s.replace(/^통합면역치료\s*[|\-:]?\s*/i, "").trim();
  s = s.replace(/^면력한방병원\s*[|\-:]?\s*/i, "").trim();
  return s.trim();
}

function isSentenceLikeName(s: string): boolean {
  const words = s.trim().split(/\s+/).filter(Boolean);
  if (words.length >= WORD_COUNT_SENTENCE) return true;
  if (ENDING_PATTERN.test(s)) return true;
  if (ENDS_SENTENCE.test(s)) return true;
  if (SENTENCE_PUNCT.test(s)) return true;
  return false;
}

function normalizeName(
  raw: string | null | undefined,
  hospitalName?: string,
  sourceUrl?: string
): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const s = stripNamePrefix(raw, hospitalName);
  if (!s || s.length < NAME_MIN) {
    pushRejected(raw, s.length > 0 ? "name_too_short" : "name_empty", sourceUrl);
    return null;
  }
  if (NOISE_NAME.test(s)) {
    pushRejected(raw, "name_noise", sourceUrl);
    return null;
  }
  if (SENTENCE_LIKE_NAME.test(s)) {
    pushRejected(raw, "name_sentence_or_slogan", sourceUrl);
    return null;
  }
  if (isSentenceLikeName(s)) {
    pushRejected(raw, "name_sentence_like", sourceUrl);
    return null;
  }
  const noSpaces = s.replace(/\s/g, "");
  if (noSpaces.length < NAME_MIN) {
    pushRejected(raw, "name_too_short", sourceUrl);
    return null;
  }
  if (s.length > NAME_MAX) {
    pushRejected(raw, "name_too_long", sourceUrl);
    return null;
  }
  return s;
}

function normalizeShortDescription(raw: string | null | undefined): string {
  if (raw == null || typeof raw !== "string") return "";
  const lines = raw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l && !BOILERPLATE.test(l));
  const joined = lines.join(" ").replace(/\s+/g, " ").trim();
  return joined.slice(0, SHORT_DESC_MAX);
}

/** 텍스트에서 금액 추출: 만원*10000, 원 그대로. 범위면 min/max */
function parsePriceFromText(text: string): {
  price_min?: number;
  price_max?: number;
  currency?: string;
  price_note?: string;
} {
  if (!text || !PRICE_PATTERN.test(text)) {
    return { price_note: "문의" };
  }
  const numbers: number[] = [];
  let m: RegExpExecArray | null;
  const manWonRe = new RegExp(NUM_MAN_WON.source, "g");
  while ((m = manWonRe.exec(text)) !== null) {
    const n = parseInt(m[1].replace(/,/g, ""), 10);
    if (!Number.isNaN(n)) numbers.push(n * 10000);
  }
  const wonRe = new RegExp(/(\d{1,3}(?:,\d{3})*)\s*원/, "g");
  while ((m = wonRe.exec(text)) !== null) {
    const n = parseInt(m[1].replace(/,/g, ""), 10);
    if (!Number.isNaN(n) && n < 10000000) numbers.push(n);
  }
  if (numbers.length === 0) return { price_note: "문의" };
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  return {
    price_min: min,
    price_max: max === min ? undefined : max,
    currency: "KRW",
  };
}

/**
 * 초안을 정제해 저장용 오퍼로 변환. 부적합 시 null 반환하고 rejected 샘플에 기록(DEV).
 * 호출 측에서 요청 시작 시 clearRejectedDraftSamples() 호출 후 사용 권장.
 */
export function normalizeOfferDraft(
  draft: OfferDraft,
  hospitalName?: string
): NormalizedOffer | null {
  const sourceUrl =
    typeof draft.evidence?.name === "object" && draft.evidence?.name !== null
      ? (draft.evidence.name as { source_url?: string }).source_url
      : undefined;
  const name = normalizeName(draft.name ?? null, hospitalName, sourceUrl);
  if (name == null) return null;

  const textForPrice = [draft.description, draft.text].filter(Boolean).join(" ");
  const priceResult = draft.price_min != null || draft.price_max != null
    ? {
        price_min: draft.price_min ?? undefined,
        price_max: draft.price_max ?? undefined,
        currency: draft.currency ?? "KRW",
      }
    : parsePriceFromText(textForPrice);

  const short_description = normalizeShortDescription(
    draft.description ?? draft.text ?? ""
  );

  return {
    name,
    short_description: short_description || name,
    price_min: priceResult.price_min ?? null,
    price_max: priceResult.price_max ?? null,
    currency: priceResult.currency ?? null,
    price_note: priceResult.price_note ?? null,
    evidence: draft.evidence,
  };
}

/** normalizeOfferDraft를 호출한 뒤 수집된 rejected 샘플 반환 (호출 측에서 clear 후 1회만 사용 권장) */
export function collectRejectedAfterNormalize(): RejectedDraftSample[] {
  return getRejectedDraftSamples();
}
