/**
 * 비급여/가격 테이블 → PriceIndex (대표 후보에 가격 매칭용)
 */

import type { FetchedPageForRanking } from "./types";

const PRICE_URL = /nonpayment|비급여|price|fee|가격|비용/i;
const ROW_SPLIT = /\t|\|/;
const SUFFIXES = /검사|치료|클리닉|프로그램|센터|시술|주사|상담|진료$/i;

export interface PriceEntry {
  min: number;
  max: number;
  currency: string;
  source_url: string;
  snippet: string;
}

export type PriceIndex = Map<string, PriceEntry[]>;

function parseTableRow(row: string): { name: string; priceNum?: number } | null {
  const cells = row.split(ROW_SPLIT).map((c) => c.trim()).filter(Boolean);
  if (cells.length < 2) return null;
  const name = cells[0];
  if (name.length < 2 || name.length > 80) return null;
  let priceNum: number | undefined;
  for (let i = cells.length - 1; i >= 1; i--) {
    const cell = cells[i];
    const manMatch = cell.match(/([\d,]+)\s*만\s*원?/);
    if (manMatch) {
      priceNum = parseInt(manMatch[1].replace(/,/g, ""), 10) * 10000;
      break;
    }
    const wonMatch = cell.match(/([\d,]+)\s*원/);
    if (wonMatch) {
      priceNum = parseInt(wonMatch[1].replace(/,/g, ""), 10);
      break;
    }
    const numOnly = cell.replace(/[^\d,]/g, "");
    if (numOnly.length >= 2) {
      const n = parseInt(numOnly.replace(/,/g, ""), 10);
      if (!Number.isNaN(n) && n < 100000000) {
        priceNum = n;
        break;
      }
    }
  }
  return { name, priceNum };
}

/** 인덱스 키 정규화: 공백 제거, 소문자, 괄호·특수문자 제거 */
function normalizeKey(name: string): string {
  return name
    .replace(/\s+/g, "")
    .toLowerCase()
    .replace(/[()[\]\-_.,:]/g, "")
    .replace(SUFFIXES, "")
    .trim();
}

/** 후보명으로 검색할 때 쓸 키 변형들 (원본, 접미사 제거) */
function keyVariants(candidateName: string): string[] {
  const base = normalizeKey(candidateName);
  const withoutSuffix = base.replace(SUFFIXES, "").trim();
  const set = new Set<string>([base, withoutSuffix]);
  return [...set];
}

/**
 * nonpayment/비급여/price 페이지의 tables_text에서 (항목명, 금액) 파싱 → PriceIndex
 */
export function buildPriceIndexFromTables(
  pages: FetchedPageForRanking[]
): PriceIndex {
  const index: PriceIndex = new Map();

  for (const p of pages) {
    if (!PRICE_URL.test(p.url)) continue;
    const tablesText = p.dom_extract?.tables_text?.trim();
    if (!tablesText) continue;

    for (const line of tablesText.split(/\n/)) {
      const parsed = parseTableRow(line);
      if (!parsed || parsed.priceNum == null) continue;
      const key = normalizeKey(parsed.name);
      if (!key) continue;
      const entry: PriceEntry = {
        min: parsed.priceNum,
        max: parsed.priceNum,
        currency: "KRW",
        source_url: p.url,
        snippet: line.slice(0, 150),
      };
      const list = index.get(key) ?? [];
      list.push(entry);
      index.set(key, list);
    }
  }

  return index;
}

const FUZZY_THRESHOLD = 0.6;

function tokenSet(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter++;
  }
  return inter / (a.size + b.size - inter);
}

export interface MatchPriceResult {
  price_min?: number;
  price_max?: number;
  currency?: string;
  price_note?: string;
  match_type?: "exact" | "fuzzy" | "none";
}

/**
 * 후보명으로 PriceIndex에서 매칭: exact → fuzzy(임계치 0.6) → 없으면 price_note="문의"
 */
export function matchPrice(
  candidateName: string,
  priceIndex: PriceIndex
): MatchPriceResult {
  const variants = keyVariants(candidateName);
  for (const key of variants) {
    const list = priceIndex.get(key);
    if (list && list.length > 0) {
      const min = Math.min(...list.map((e) => e.min));
      const max = Math.max(...list.map((e) => e.max));
      return {
        price_min: min,
        price_max: max === min ? undefined : max,
        currency: "KRW",
        match_type: "exact",
      };
    }
  }

  const candidateTokens = tokenSet(candidateName);
  if (candidateTokens.size === 0) {
    return { price_note: "문의", match_type: "none" };
  }

  let bestScore = 0;
  let bestEntries: PriceEntry[] | null = null;

  for (const [key, list] of priceIndex) {
    const keyTokens = tokenSet(key);
    const score = jaccard(candidateTokens, keyTokens);
    if (score >= FUZZY_THRESHOLD && score > bestScore) {
      bestScore = score;
      bestEntries = list;
    }
  }

  if (bestEntries && bestEntries.length > 0) {
    const min = Math.min(...bestEntries.map((e) => e.min));
    const max = Math.max(...bestEntries.map((e) => e.max));
    return {
      price_min: min,
      price_max: max === min ? undefined : max,
      currency: "KRW",
      match_type: "fuzzy",
    };
  }

  return { price_note: "문의", match_type: "none" };
}
