/**
 * 표(dom_extract.tables_text)에서 (시술명, 금액) 행 파싱 → 정규화된 오퍼 (하드 evidence 1차)
 */

import type { RankedCandidate } from "./pageRanking";
import type { OfferItem } from "./types";
import { normalizeOfferDraft, normalizedToOfferItem } from "./normalizeOffer";

const PRICE_URL = /nonpayment|비급여|price|fee|가격|비용/i;
const MAX_TABLE_OFFERS = 10;
const ROW_SPLIT = /\t|\|/;
const NUM_OR_WON = /[\d,]+(?:\s*만?\s*원)?|원\s*[\d,]+/;

/** 테이블 한 행에서 시술명·금액 후보 추출 (첫 컬럼=이름, 마지막 또는 숫자 컬럼=금액) */
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

/**
 * ranked 페이지 중 URL이 price 관련인 것의 tables_text에서 시술·가격 행 파싱 후 정규화. 최대 10개.
 */
export function extractOffersFromTables(
  ranked: RankedCandidate[],
  hospitalName?: string
): OfferItem[] {
  const priceRelated = ranked.filter((r) => PRICE_URL.test(r.url));
  const offers: OfferItem[] = [];
  const seenNames = new Set<string>();

  for (const r of priceRelated) {
    if (offers.length >= MAX_TABLE_OFFERS) break;
    const tablesText = r.dom_extract?.tables_text?.trim();
    if (!tablesText) continue;

    const lines = tablesText.split(/\n/);
    for (const line of lines) {
      if (offers.length >= MAX_TABLE_OFFERS) break;
      const parsed = parseTableRow(line);
      if (!parsed) continue;
      const normKey = parsed.name.replace(/\s/g, "").toLowerCase();
      if (seenNames.has(normKey)) continue;
      seenNames.add(normKey);

      const draft = {
        name: parsed.name,
        text: line,
        price_min: parsed.priceNum ?? undefined,
        price_max: parsed.priceNum ?? undefined,
        currency: "KRW" as const,
        evidence: {
          name: { source_url: r.url, snippet_or_ocr_text: line.slice(0, 200) },
        },
      };
      const normalized = normalizeOfferDraft(draft, hospitalName);
      if (normalized) {
        offers.push(normalizedToOfferItem(normalized, 0.85));
      }
    }
  }

  return offers;
}
