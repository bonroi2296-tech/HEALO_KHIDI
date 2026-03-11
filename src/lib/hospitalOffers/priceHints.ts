/**
 * 비급여/가격 테이블에서 시술명→가격 힌트 dict 구축.
 * 대표 시술명과 fuzzy match로 price_min/max/currency/price_note 보강용.
 */

import type { FetchedPageForRanking } from "./types";

const PRICE_URL = /nonpayment|비급여|price|fee|가격|비용/i;
const MAX_HINTS = 30;
const ROW_SPLIT = /\t|\|/;

export interface PriceHint {
  price_min?: number | null;
  price_max?: number | null;
  currency?: "KRW" | "USD" | null;
  price_note?: string | null;
}

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

function normalizeName(name: string): string {
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * 페이지 목록 중 가격 관련 URL의 tables_text에서 (시술명 → 가격힌트) 최대 30개.
 */
export function buildPriceHintsFromPages(
  pages: FetchedPageForRanking[]
): Record<string, PriceHint> {
  const out: Record<string, PriceHint> = {};
  const seen = new Set<string>();

  for (const p of pages) {
    if (Object.keys(out).length >= MAX_HINTS) break;
    if (!PRICE_URL.test(p.url)) continue;
    const tablesText = p.dom_extract?.tables_text?.trim();
    if (!tablesText) continue;

    const lines = tablesText.split(/\n/);
    for (const line of lines) {
      if (Object.keys(out).length >= MAX_HINTS) break;
      const parsed = parseTableRow(line);
      if (!parsed) continue;
      const key = normalizeName(parsed.name);
      if (seen.has(key)) continue;
      seen.add(key);
      out[parsed.name] = {
        price_min: parsed.priceNum ?? null,
        price_max: parsed.priceNum ?? null,
        currency: "KRW",
        price_note: parsed.priceNum == null ? "문의" : null,
      };
    }
  }

  return out;
}

/**
 * 대표 시술명과 힌트 키를 fuzzy match (공백/특수문자 제거 + 포함 관계).
 */
export function matchPriceHint(
  treatmentName: string,
  hints: Record<string, PriceHint>
): PriceHint | null {
  const norm = treatmentName.replace(/\s+/g, "").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
  if (!norm) return null;
  for (const [key, hint] of Object.entries(hints)) {
    const keyNorm = key.replace(/\s+/g, "").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
    if (norm.includes(keyNorm) || keyNorm.includes(norm)) return hint;
  }
  return null;
}
