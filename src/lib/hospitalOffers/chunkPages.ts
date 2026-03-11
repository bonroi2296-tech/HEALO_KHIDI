/**
 * 선택된 페이지에서 headings(h2~h4) 기준 섹션 분할 → 의료 키워드 포함 섹션만 → 200~600자 chunk.
 * 페이지당 최대 12 chunk, 전체 최대 6,000자.
 */

import type { FetchedPageForRanking } from "./types";
import type { ScoredPage } from "./selectRepresentativePages";

const MEDICAL_KEYWORDS =
  /치료|검사|시술|수술|주사|처치|프로그램|입원|재활|항암|면역|도수|클리닉|센터|진료|비용|가격|대상|구성|기간|주의|특징/i;
const MIN_CHUNK = 200;
const MAX_CHUNK = 600;
const MAX_CHUNKS_PER_PAGE = 12;
const MAX_TOTAL_CHARS = 6_000;

export interface PageChunk {
  url: string;
  title: string;
  chunk_text: string;
  char_count: number;
}

/**
 * 한 페이지 텍스트를 블록으로 나누고, 의료 키워드가 있는 블록만 200~600자 chunk로 자른다.
 */
function chunkOnePage(
  page: FetchedPageForRanking,
  maxChunks: number,
  remainingChars: { value: number }
): PageChunk[] {
  const chunks: PageChunk[] = [];
  const d = page.dom_extract;
  const title = (d?.h1_text || d?.page_title || d?.og_title || page.url || "").trim().slice(0, 200);

  let source = "";
  if (d?.headings_context?.trim()) source += d.headings_context.trim() + "\n\n";
  if (page.text?.trim()) source += page.text.trim();

  if (!source || remainingChars.value <= 0) return chunks;

  const blocks = source.split(/\n\n+/).map((b) => b.trim()).filter((b) => b.length >= 30);
  const medicalBlocks = blocks.filter((b) => MEDICAL_KEYWORDS.test(b));

  for (const block of medicalBlocks) {
    if (chunks.length >= maxChunks || remainingChars.value <= 0) break;
    let start = 0;
    while (start < block.length && chunks.length < maxChunks && remainingChars.value > 0) {
      const take = Math.min(MAX_CHUNK, block.length - start, remainingChars.value);
      if (take < MIN_CHUNK && start > 0) break;
      const slice = block.slice(start, start + take).trim();
      if (slice.length >= MIN_CHUNK || (slice.length >= 80 && medicalBlocks.length === 1)) {
        chunks.push({
          url: page.url,
          title,
          chunk_text: slice,
          char_count: slice.length,
        });
        remainingChars.value -= slice.length;
      }
      start += take;
    }
  }

  return chunks;
}

/**
 * 선택된 상위 페이지들에서 chunk 수집. 페이지당 최대 12, 전체 최대 6,000자.
 */
export function chunkPages(selectedPages: ScoredPage[]): PageChunk[] {
  const all: PageChunk[] = [];
  const remaining = { value: MAX_TOTAL_CHARS };

  for (const { page } of selectedPages) {
    if (remaining.value <= 0) break;
    const perPage = Math.min(MAX_CHUNKS_PER_PAGE, Math.ceil(remaining.value / MAX_CHUNK));
    const pageChunks = chunkOnePage(page, perPage, remaining);
    all.push(...pageChunks);
  }

  return all;
}

/**
 * Chunk 배열을 LLM 입력용 단일 텍스트로 합침 (URL 태그 포함).
 */
export function chunksToLlmText(chunks: PageChunk[]): string {
  return chunks
    .map((c) => `[URL: ${c.url}]\n${c.chunk_text}`)
    .join("\n\n")
    .slice(0, MAX_TOTAL_CHARS);
}
