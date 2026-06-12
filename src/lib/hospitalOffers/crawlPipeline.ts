/**
 * ⚠️ LEGACY (피벗 전 디렉토리 시절 도구) — 어드민 "시술 자동생성"에서만 사용.
 * 환자 전면 기능 아님. 신규 코드에서 import 하지 말 것. (PROJECT_CONTEXT.md §2 참조)
 * 참고: playwright 런타임 의존 — package.json dependencies 의 playwright 를 옮기면 깨짐.
 *
 * HOSPITAL_OFFER_IMPORT_V1: 병원 웹사이트 크롤 파이프라인
 * - BFS 링크 확장: 내부 링크 최대 30페이지 (우선순위 키워드 적용)
 * - 탭/아코디언 클릭으로 동적 컨텐츠 로드
 * - fetch/Playwright 선택 (동적 사이트는 Playwright 권장)
 */

import { ssrfSafeFetch } from "./ssrfSafeFetch";
import type { OfferSource } from "./types";
import type { DebugFetchedPage } from "./types";
import type { FetchedPageForRanking, DomExtractPerPage } from "./types";

/** 시술/프로그램/진료/가격 관련 URL 우선순위 키워드 */
const PRIORITY_KEYWORDS =
  /treatment|clinic|program|service|price|fee|menu|진료|치료|프로그램|비용|가격|클리닉|procedure|introduce|소개|코스|메뉴/i;
const KEYWORDS = PRIORITY_KEYWORDS; // 하위 호환
const MAX_CANDIDATE_PAGES = 30;
const MAX_TOP_LINKS_DEBUG = 20;
const MAX_TAB_CLICKS = 10;
const MAX_PAGE_BYTES = 2 * 1024 * 1024; // 2MB per page
const PAGE_TIMEOUT_MS = 15_000;

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HAS_PRICE_LIKE = /\d+[\s,]*(원|만|달러|USD|KRW|가격|price|fee|비용)/i;
const HAS_TREATMENT_LIKE = /(시술|치료|프로그램|treatment|procedure|program|진료|클리닉)/i;

/** has_price_like === true 인 페이지가 5개 이상이면 "price", 아니면 "program" */
function detectHospitalType(pages: { has_price_like: boolean }[]): "price" | "program" {
  const count = pages.filter((p) => p.has_price_like === true).length;
  return count >= 5 ? "price" : "program";
}

/** URL에 스킴이 없으면 https:// 붙임 (DB에 "www.example.com" 형태로 저장된 경우 대비) */
export function normalizeWebsiteUrl(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return "https://" + s.replace(/^\/+/, "");
}

function extractTextFromHtml(html: string): string {
  const noScript = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  const noStyle = noScript.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  const text = noStyle
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 500_000); // 상한
}

/** URL 정규화: query/hash 제거하여 중복 제거 */
function normalizeLinkHref(href: string): string {
  try {
    const u = new URL(href);
    return `${u.origin}${u.pathname.replace(/\/$/, "") || "/"}`;
  } catch {
    return href;
  }
}

/** 내부 링크 추출 (같은 도메인, query/hash 정규화) */
function extractAllInternalLinks(html: string, baseUrl: string): string[] {
  const hrefRe = /<a\s+[^>]*href\s*=\s*["']([^"']+)["']/gi;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const origin = (() => {
    try {
      return new URL(base).origin;
    } catch {
      return base;
    }
  })();

  while ((m = hrefRe.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("javascript:") || raw.startsWith("mailto:")) continue;
    try {
      const u = new URL(raw, base);
      if (u.origin !== origin) continue;
      const norm = normalizeLinkHref(u.href);
      if (norm && !seen.has(norm)) seen.add(norm);
    } catch {
      /* ignore */
    }
  }
  return [...seen];
}

/** 링크 우선순위 점수 (시술/가격 관련일수록 높음) */
function scoreLink(url: string): number {
  const lower = url.toLowerCase();
  let score = 0;
  if (PRIORITY_KEYWORDS.test(lower)) score += 10;
  if (/treatment|시술|치료|진료|프로그램|program/i.test(lower)) score += 5;
  if (/price|fee|가격|비용|menu|메뉴/i.test(lower)) score += 5;
  if (/clinic|클리닉|service|서비스/i.test(lower)) score += 3;
  return score;
}

/** 키워드 매칭 링크 우선 + 점수순 정렬, 상위 N개 */
function extractAndScoreLinks(html: string, baseUrl: string, limit: number): { url: string; score: number }[] {
  const all = extractAllInternalLinks(html, baseUrl);
  const scored = all.map((url) => ({ url, score: scoreLink(url) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/** 하위 호환: 키워드 링크만 반환 */
function extractLinks(html: string, baseUrl: string): string[] {
  return extractAndScoreLinks(html, baseUrl, MAX_CANDIDATE_PAGES).map((x) => x.url);
}

export interface CrawlMetadata {
  method: "fetch" | "playwright";
  pages_fetched: number;
  text_length: number;
  hint?: string;
}

export interface CrawlDebugInfo {
  fetched_pages: DebugFetchedPage[];
  discovered_links_top: string[];
  assets_found: { pdf_count: number; image_count: number; ocr_used: boolean; pdf_used: boolean };
  hospital_type?: "price" | "program";
}

export interface CrawlResult {
  sources: OfferSource[];
  combinedText: string;
  /** 페이지별 텍스트 (랭킹·LLM 입력 구성용) */
  pages?: FetchedPageForRanking[];
  error?: string;
  crawl_metadata?: CrawlMetadata;
  debug?: CrawlDebugInfo;
}

export interface CrawlOptions {
  usePlaywright?: boolean;
}

/** 탭/아코디언 버튼 클릭으로 숨겨진 컨텐츠 로드 */
async function clickTabsAndAccordions(page: { content: () => Promise<string>; $$: (sel: string) => Promise<Array<{ click: () => Promise<void>; textContent: () => Promise<string | null> }>> }, maxClicks: number): Promise<string> {
  const TAB_TEXT = /프로그램|진료|가격|비용|치료|시술|program|treatment|price|fee|menu|메뉴/i;
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let html = await page.content();
  let prevLen = extractTextFromHtml(html).length;
  let clicks = 0;
  for (let i = 0; i < maxClicks; i++) {
    const buttons = await page.$$(
      "button, [role=tab], [role=button], .tab, .accordion [data-toggle], a[data-toggle], [data-tab]"
    );
    let clicked = false;
    for (const btn of buttons) {
      if (clicks >= maxClicks) break;
      try {
        const text = await btn.textContent();
        if (text && TAB_TEXT.test(text)) {
          await btn.click();
          await delay(500);
          html = await page.content();
          const newLen = extractTextFromHtml(html).length;
          if (newLen > prevLen || !clicked) {
            prevLen = newLen;
            clicks++;
            clicked = true;
          }
        }
      } catch {
        /* skip */
      }
    }
    if (!clicked) break;
  }
  return html;
}

function extractPdfLinks(html: string, baseUrl: string): string[] {
  const hrefRe = /<a\s+[^>]*href\s*=\s*["']([^"']*\.pdf)["']/gi;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const origin = (() => {
    try {
      return new URL(base).origin;
    } catch {
      return base;
    }
  })();
  while ((m = hrefRe.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      const u = new URL(raw, base);
      if (u.origin !== origin) continue;
      const norm = u.href;
      if (!seen.has(norm)) seen.add(norm);
    } catch {
      /* ignore */
    }
  }
  return [...seen];
}

async function extractPdfTextSnippet(pdfUrl: string, baseOrigin: string): Promise<string | null> {
  try {
    const u = new URL(pdfUrl);
    if (u.origin !== baseOrigin) return null;
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ url: pdfUrl });
    const result = await parser.getText();
    await parser.destroy();
    const text = result?.text;
    if (!text || typeof text !== "string") return null;
    return text.slice(0, 15_000).trim();
  } catch {
    return null;
  }
}

/**
 * 브라우저에서 실행: 테이블(행 단위), 시술 상세 가격 블록만 강하게 필터, h1~h3+단락 추출.
 * Playwright page.evaluate에 넘길 함수 (직렬화 가능하도록 외부 참조 없음).
 */
function extractDomStructuredInBrowser(): DomExtractPerPage {
  const MAX_TABLE_ROWS = 50;
  const MAX_PRICE_BLOCKS = 10;
  const MAX_HEADINGS = 30;
  const MIN_PRICE_BLOCK_LEN = 50;
  const LAYOUT_SELECTOR = "header, footer, nav, .footer, .header, .gnb, .gnb-wrap, .menu, .nav, #header, #footer, #gnb";
  const PRICE_UNIT = /₩|\d+\s*만\s*원|\d+\s*원|KRW\s*\d|\d{1,3}(,\d{3})+\s*원/i;
  const TREATMENT_KEYWORD = /시술|수술|클리닉|센터|프로그램|치료/i;
  const NOISE_KEYWORD = /약관|이용약관|로그인|문의하기|센터소개|공지사항|공지\s*사항|FAQ|개인정보처리방침/i;

  let tablesRows = 0;
  const tableLines: string[] = [];
  const tables = document.querySelectorAll("table");
  for (const t of tables) {
    if (t.closest(LAYOUT_SELECTOR)) continue;
    const rows = t.querySelectorAll("tr");
    for (const row of rows) {
      if (tablesRows >= MAX_TABLE_ROWS) break;
      const cells = row.querySelectorAll("td, th");
      const cellTexts = Array.from(cells).map((c) => (c.textContent || "").trim());
      const line = cellTexts.join("\t");
      if (line) {
        tableLines.push(line);
        tablesRows++;
      }
    }
    if (tablesRows >= MAX_TABLE_ROWS) break;
  }
  const tables_text = tableLines.join("\n");

  let removed_by_layout_count = 0;
  let removed_by_noise_keyword_count = 0;
  let removed_by_short_length_count = 0;
  const priceBlocks: string[] = [];
  const seenText = new Set<string>();
  const candidates = document.querySelectorAll("div, section, p, td, li, span");
  for (const el of candidates) {
    if (priceBlocks.length >= MAX_PRICE_BLOCKS) break;
    if (el.closest(LAYOUT_SELECTOR)) {
      removed_by_layout_count++;
      continue;
    }
    const text = (el.textContent || "").trim();
    if (text.length < MIN_PRICE_BLOCK_LEN) {
      removed_by_short_length_count++;
      continue;
    }
    const digitCount = (text.match(/\d/g) || []).length;
    if (digitCount < 2) continue;
    if (!PRICE_UNIT.test(text)) continue;
    if (!TREATMENT_KEYWORD.test(text)) continue;
    if (NOISE_KEYWORD.test(text)) {
      removed_by_noise_keyword_count++;
      continue;
    }
    const normalized = text.slice(0, 5000);
    if (seenText.has(normalized)) continue;
    seenText.add(normalized);
    priceBlocks.push(normalized);
  }
  const price_blocks_text = priceBlocks.join("\n\n");

  const headingLines: string[] = [];
  const headings = document.querySelectorAll("h1, h2, h3");
  for (const h of headings) {
    if (headingLines.length >= MAX_HEADINGS) break;
    if (h.closest(LAYOUT_SELECTOR)) continue;
    const headText = (h.textContent || "").trim();
    let nextText = "";
    const sib = h.nextElementSibling;
    if (sib) nextText = (sib.textContent || "").trim().slice(0, 500);
    const line = (headText + " " + nextText).trim();
    if (line) headingLines.push(line);
  }
  const headings_context = headingLines.join("\n\n");

  const ogEl = document.querySelector('meta[property="og:title"]');
  const page_title = (document.title || "").trim();
  const og_title = ogEl ? (ogEl.getAttribute("content") || "").trim() : "";
  const firstH1 = document.querySelector("h1");
  const h1_text = firstH1 ? (firstH1.textContent || "").trim() : "";

  return {
    tables_text,
    price_blocks_text,
    headings_context,
    tables_rows: tablesRows,
    price_blocks_count: priceBlocks.length,
    headings_count: headingLines.length,
    filtered_price_blocks_count: priceBlocks.length,
    removed_by_layout_count,
    removed_by_noise_keyword_count,
    removed_by_short_length_count,
    page_title,
    og_title,
    h1_text,
  };
}

function countAssets(html: string): { pdf_count: number; image_count: number } {
  const pdfRe = /href\s*=\s*["'][^"']*\.pdf["']/gi;
  const imgRe = /<img[^>]+>/gi;
  let pdf_count = 0;
  let m: RegExpExecArray | null;
  while ((m = pdfRe.exec(html)) !== null) pdf_count++;
  const imgs = html.match(imgRe) || [];
  const priceImgRe = /(price|menu|fee|가격표|메뉴|비용)/i;
  let image_count = 0;
  for (const img of imgs) {
    if (priceImgRe.test(img)) image_count++;
    else if (/width\s*=\s*["']?\d{3,}/i.test(img)) image_count++; // width >= 100
  }
  return { pdf_count, image_count };
}

/**
 * Playwright: BFS 링크 확장(최대 30페이지) + 탭/아코디언 클릭
 */
async function crawlWithPlaywright(websiteUrl: string): Promise<CrawlResult> {
  const metadata: CrawlMetadata = { method: "playwright", pages_fetched: 0, text_length: 0 };
  const debug: CrawlDebugInfo = {
    fetched_pages: [],
    discovered_links_top: [],
    assets_found: { pdf_count: 0, image_count: 0, ocr_used: false, pdf_used: false },
  };
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setDefaultTimeout(PAGE_TIMEOUT_MS);

    // BFS: 시작 URL + 내부 링크 (우선순위 키워드 적용)
    const visited = new Set<string>();
    const mainNorm = normalizeLinkHref(websiteUrl);
    const queue: string[] = [mainNorm];
    const allLinksMap = new Map<string, number>();
    const pdfLinks = new Set<string>();
    const sources: OfferSource[] = [];
    const textChunks: string[] = [];
    const domExtracts: (DomExtractPerPage | undefined)[] = [];
  let totalPdf = 0;
  let totalImg = 0;
  let baseOrigin: string;
  try {
    baseOrigin = new URL(websiteUrl).origin;
  } catch {
    baseOrigin = websiteUrl;
  }

  while (queue.length > 0 && visited.size < MAX_CANDIDATE_PAGES) {
      const url = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });

        // 탭/아코디언 클릭으로 숨겨진 컨텐츠 로드
        const html = await clickTabsAndAccordions(page, MAX_TAB_CLICKS);
        const text = extractTextFromHtml(html);

        const { pdf_count, image_count } = countAssets(html);
        totalPdf += pdf_count;
        totalImg += image_count;
        for (const pl of extractPdfLinks(html, url)) pdfLinks.add(pl);

        sources.push({ url, type: "html", title: undefined });
        textChunks.push(text);

        let domExtract: DomExtractPerPage | undefined;
        try {
          domExtract = await page.evaluate(extractDomStructuredInBrowser);
        } catch {
          domExtract = undefined;
        }
        domExtracts.push(domExtract);

        const links = extractAndScoreLinks(html, url, MAX_CANDIDATE_PAGES);
        debug.fetched_pages.push({
          url,
          status: "ok",
          text_len: text.length,
          has_price_like: HAS_PRICE_LIKE.test(text),
          has_treatment_like: HAS_TREATMENT_LIKE.test(text),
          discovered_links_count: links.length,
        });

        // BFS: 새 링크를 점수 순으로 queue에 추가
        links.sort((a, b) => b.score - a.score);
        for (const { url: h, score } of links) {
          const norm = normalizeLinkHref(h);
          if (!visited.has(norm) && !queue.includes(norm)) {
            const prev = allLinksMap.get(norm);
            if (prev == null || score > prev) allLinksMap.set(norm, score);
            queue.push(norm);
          }
        }
      } catch {
        debug.fetched_pages.push({
          url,
          status: "fail",
          text_len: 0,
          has_price_like: false,
          has_treatment_like: false,
          discovered_links_count: 0,
        });
      }
    }

    const sortedLinks = [...allLinksMap.entries()].sort((a, b) => b[1] - a[1]);
    debug.discovered_links_top = sortedLinks.slice(0, MAX_TOP_LINKS_DEBUG).map(([u]) => u);
    debug.hospital_type = detectHospitalType(debug.fetched_pages);

    const pages: FetchedPageForRanking[] = sources.map((s, i) => ({
      url: s.url,
      text: textChunks[i] ?? "",
      text_len: (textChunks[i] ?? "").length,
      dom_extract: domExtracts[i],
    }));

    let pdfUsed = false;
    for (const pdfUrl of [...pdfLinks].slice(0, 3)) {
      const snippet = await extractPdfTextSnippet(pdfUrl, baseOrigin);
      if (snippet) {
        textChunks.push(`[PDF: ${pdfUrl}]\n${snippet}`);
        pdfUsed = true;
      }
    }
    debug.assets_found = { pdf_count: totalPdf, image_count: totalImg, ocr_used: false, pdf_used: pdfUsed };

    await browser.close();
    metadata.pages_fetched = sources.length;
    const combinedText = textChunks.join("\n\n").replace(/\s+/g, " ").trim().slice(0, 300_000);
    metadata.text_length = combinedText.length;
    if (combinedText.length < 100) {
      metadata.hint = "동적 렌더링 후에도 수집된 텍스트가 적습니다. 사이트 구조를 확인하세요.";
    }
    return {
      sources,
      combinedText,
      pages,
      crawl_metadata: metadata,
      debug,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    metadata.hint = `Playwright 실행 실패: ${msg.slice(0, 100)}. npm install playwright 후 재시도하세요.`;
    return {
      sources: [],
      combinedText: "",
      pages: [],
      error: "playwright_failed",
      crawl_metadata: metadata,
      debug,
    };
  }
}

/**
 * fetch 기반: BFS 링크 확장 (최대 30페이지)
 */
async function crawlWithFetch(websiteUrl: string): Promise<CrawlResult> {
  const metadata: CrawlMetadata = { method: "fetch", pages_fetched: 0, text_length: 0 };
  const debug: CrawlDebugInfo = {
    fetched_pages: [],
    discovered_links_top: [],
    assets_found: { pdf_count: 0, image_count: 0, ocr_used: false, pdf_used: false },
  };
  const url = normalizeWebsiteUrl(websiteUrl);
  if (!url) return { sources: [], combinedText: "", error: "empty_url" };

  const main = await ssrfSafeFetch(url, {
    timeoutMs: PAGE_TIMEOUT_MS,
    maxBytes: MAX_PAGE_BYTES,
    headers: { "User-Agent": DEFAULT_USER_AGENT },
  });

  if (!main.ok || main.body == null) {
    metadata.hint = "메인 페이지 fetch 실패. 동적 사이트라면 Playwright 옵션을 사용해 보세요.";
    return { sources: [], combinedText: "", error: main.error ?? "main_page_fetch_failed", crawl_metadata: metadata, debug };
  }

  const sources: OfferSource[] = [];
  const textChunks: string[] = [];
  const visited = new Set<string>();
  const queue: string[] = [normalizeLinkHref(url)];
  const allLinksMap = new Map<string, number>();
  const pdfLinks = new Set<string>();
  let totalPdf = 0;
  let totalImg = 0;
  let baseOrigin: string;
  try {
    baseOrigin = new URL(url).origin;
  } catch {
    baseOrigin = url;
  }

  while (queue.length > 0 && visited.size < MAX_CANDIDATE_PAGES) {
    const curr = queue.shift()!;
    if (visited.has(curr)) continue;
    visited.add(curr);

    let html: string;
    if (curr === normalizeLinkHref(url)) {
      html = main.body;
    } else {
      const res = await ssrfSafeFetch(curr, {
        timeoutMs: PAGE_TIMEOUT_MS,
        maxBytes: MAX_PAGE_BYTES,
        headers: { "User-Agent": DEFAULT_USER_AGENT },
      });
      if (!res.ok || !res.body) {
        debug.fetched_pages.push({
          url: curr,
          status: "fail",
          text_len: 0,
          has_price_like: false,
          has_treatment_like: false,
          discovered_links_count: 0,
        });
        continue;
      }
      html = res.body;
    }

    const text = extractTextFromHtml(html);
    const { pdf_count, image_count } = countAssets(html);
    totalPdf += pdf_count;
    totalImg += image_count;
    for (const pl of extractPdfLinks(html, curr)) pdfLinks.add(pl);

    sources.push({ url: curr, type: "html", title: undefined });
    textChunks.push(text);

    const links = extractAndScoreLinks(html, curr, MAX_CANDIDATE_PAGES);
    debug.fetched_pages.push({
      url: curr,
      status: "ok",
      text_len: text.length,
      has_price_like: HAS_PRICE_LIKE.test(text),
      has_treatment_like: HAS_TREATMENT_LIKE.test(text),
      discovered_links_count: links.length,
    });

    links.sort((a, b) => b.score - a.score);
    for (const { url: h, score } of links) {
      const norm = normalizeLinkHref(h);
      if (!visited.has(norm) && !queue.includes(norm)) {
        const prev = allLinksMap.get(norm);
        if (prev == null || score > prev) allLinksMap.set(norm, score);
        queue.push(norm);
      }
    }
  }

  const sortedLinks = [...allLinksMap.entries()].sort((a, b) => b[1] - a[1]);
  debug.discovered_links_top = sortedLinks.slice(0, MAX_TOP_LINKS_DEBUG).map(([u]) => u);
  debug.hospital_type = detectHospitalType(debug.fetched_pages);

  const pages: FetchedPageForRanking[] = sources.map((s, i) => ({
    url: s.url,
    text: textChunks[i] ?? "",
    text_len: (textChunks[i] ?? "").length,
  }));

  let pdfUsed = false;
  for (const pdfUrl of [...pdfLinks].slice(0, 3)) {
    const snippet = await extractPdfTextSnippet(pdfUrl, baseOrigin);
    if (snippet) {
      textChunks.push(`[PDF: ${pdfUrl}]\n${snippet}`);
      pdfUsed = true;
    }
  }
  debug.assets_found = { pdf_count: totalPdf, image_count: totalImg, ocr_used: false, pdf_used: pdfUsed };

  metadata.pages_fetched = sources.length;
  const combinedText = textChunks.join("\n\n").replace(/\s+/g, " ").trim().slice(0, 300_000);
  metadata.text_length = combinedText.length;
  if (combinedText.length < 100) {
    metadata.hint = "수집된 텍스트가 매우 적습니다. 사이트가 SPA(동적 렌더링)이면 Playwright 옵션으로 재시도하세요.";
  } else if (offersHasFewFields(combinedText)) {
    metadata.hint = "HTML에 시술 상세(가격·설명 등)가 적을 수 있습니다. 동적 사이트면 Playwright 옵션, 아니면 관리자 직접 입력.";
  }
  return { sources, combinedText, pages, crawl_metadata: metadata, debug };
}

/**
 * 병원 웹사이트에서 텍스트 수집
 * usePlaywright=true면 Playwright (BFS+탭클릭), 기본은 fetch (BFS)
 */
export async function crawlHospitalWebsite(
  websiteUrl: string,
  options?: CrawlOptions
): Promise<CrawlResult> {
  const url = normalizeWebsiteUrl(websiteUrl);
  if (!url) return { sources: [], combinedText: "", error: "empty_url" };
  if (options?.usePlaywright) return crawlWithPlaywright(url);
  return crawlWithFetch(url);
}

function offersHasFewFields(text: string): boolean {
  const hasPrice = /\d+[\s,]*(원|만|달러|USD|KRW|가격|price)/i.test(text);
  const hasDesc = /(설명|소개|효과|description|treatment)/i.test(text);
  return !hasPrice && !hasDesc;
}
