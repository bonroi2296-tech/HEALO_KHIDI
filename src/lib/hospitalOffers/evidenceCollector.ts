/**
 * Evidence Chunk Collector: 후보명이 등장하는 문단을 찾아 상위 1~2개 chunk 반환.
 * 의료 키워드 가산, 노이즈/문장형 패널티 적용.
 */

import type { FetchedPageForRanking } from "./types";

const MAX_CHUNKS = 2;
const PARAGRAPHS_AROUND = { min: 3, max: 6 };
const CHUNK_MAX_CHARS = 1200;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const MEDICAL_KEYWORDS =
  /치료|검사|시술|수술|주사|처치|프로그램|입원|재활|항암|면역|도수|클리닉|센터|진료/i;
const NOISE_PENALTY =
  /로그인|문의|QR|후기|검색|공지|이용약관|밤마다|아픈|통증|\.\.\.|입니다\s*\.?|물음표|말줄임|[?？！!…]{1,}/i;

export interface EvidenceChunk {
  url: string;
  title: string;
  chunk_text: string;
  score: number;
}

const evidenceCache = new Map<
  string,
  { chunks: EvidenceChunk[]; ts: number }
>();

function cacheKey(candidateName: string, hospitalId?: string): string {
  const n = (candidateName || "").trim().replace(/\s+/g, " ").toLowerCase();
  return hospitalId ? `${hospitalId}:${n}` : n;
}

function getPageTitle(p: FetchedPageForRanking): string {
  const d = p.dom_extract;
  return (d?.page_title || d?.og_title || d?.h1_text || p.url || "").trim().slice(0, 200);
}

function scoreChunk(chunkText: string, candidateName: string, exactMatch: boolean): number {
  let score = exactMatch ? 50 : 20;
  const lower = chunkText.toLowerCase();
  const nameLower = candidateName.trim().toLowerCase();
  if (lower.includes(nameLower)) score += 30;
  let medCount = 0;
  const re = new RegExp(MEDICAL_KEYWORDS.source, "gi");
  let _m: RegExpExecArray | null;
  while ((_m = re.exec(chunkText)) !== null) {
    medCount++;
    if (medCount >= 8) break;
  }
  score += Math.min(medCount * 5, 40);
  if (NOISE_PENALTY.test(chunkText)) score -= 35;
  return Math.max(0, score);
}

/**
 * candidateName이 등장하는 위치를 page.text에서 찾고, 주변 3~6 문단을 chunk로 생성.
 * 상위 1~2 chunk만 반환. 캐시 키: hospitalId + candidateName (24h).
 */
export function collectEvidenceChunks(
  pages: FetchedPageForRanking[],
  candidateName: string,
  options?: { hospitalId?: string; maxChunks?: number }
): EvidenceChunk[] {
  const name = (candidateName || "").trim();
  if (!name || name.length < 2) return [];

  const k = cacheKey(name, options?.hospitalId);
  const cached = evidenceCache.get(k);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return (options?.maxChunks ? cached.chunks.slice(0, options.maxChunks) : cached.chunks).slice(0, MAX_CHUNKS);
  }

  const allChunks: EvidenceChunk[] = [];

  for (const p of pages) {
    const text = (p.text || "").trim();
    if (text.length < 50) continue;

    const paragraphs = text.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
    if (paragraphs.length === 0) continue;

    const nameNorm = name.replace(/\s+/g, " ");
    let idx = -1;
    for (let i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].includes(nameNorm) || paragraphs[i].includes(name)) {
        idx = i;
        break;
      }
    }
    if (idx < 0) continue;

    const half = Math.floor((PARAGRAPHS_AROUND.min + PARAGRAPHS_AROUND.max) / 2);
    const start = Math.max(0, idx - half);
    const end = Math.min(paragraphs.length, idx + half + 1);
    const slice = paragraphs.slice(start, end);
    const chunkText = slice.join("\n\n").slice(0, CHUNK_MAX_CHARS);
    if (chunkText.length < 30) continue;

    const exactMatch = paragraphs[idx].includes(nameNorm);
    const score = scoreChunk(chunkText, name, exactMatch);
    const title = getPageTitle(p);
    allChunks.push({
      url: p.url,
      title: title || p.url,
      chunk_text: chunkText,
      score,
    });
  }

  allChunks.sort((a, b) => b.score - a.score);
  const top = allChunks.slice(0, options?.maxChunks ?? MAX_CHUNKS);
  evidenceCache.set(k, { chunks: top, ts: Date.now() });
  return top;
}
