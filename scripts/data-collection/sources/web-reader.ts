/**
 * 범용 웹 리더 — 임의의 공개 URL 을 깔끔한 텍스트/마크다운으로 가져온다.
 *
 * 왜:
 *   Agent Reach 의 "이 링크 읽어줘"에 해당하는 범용 경로. 경쟁사 페이지·블로그 글·
 *   특정 기사 1건을 운영자가 지목하면 본문을 추출해 요약/보관한다.
 *   r.jina.ai(무료 리더, 인증 불필요)를 우선 쓰고, 실패하면 원문 fetch 후 태그 제거로 폴백.
 *
 * 수집 원칙: 공개적으로 접근 가능한 URL 만. 로그인/페이월 우회 안 함.
 */

import { cleanText } from "./rss-feed";

const DEFAULT_TIMEOUT_MS = 12000;
const BODY_MAX = 8000;

export interface ReadResult {
  url: string;
  ok: boolean;
  /** 추출 본문(마크다운/플레인, 길이 제한) */
  text: string;
  via: "jina" | "raw" | "none";
}

/** r.jina.ai 리더로 URL → 마크다운. 무료·키 불필요. */
async function viaJina(url: string, timeoutMs: number): Promise<string> {
  const readerUrl = `https://r.jina.ai/${url}`;
  const res = await fetch(readerUrl, {
    headers: {
      "User-Agent": "HEALO-MarketIntel/1.0 (public reader)",
      // 마크다운 형태로 본문만 받기
      "X-Return-Format": "markdown",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`jina ${res.status}`);
  return await res.text();
}

/** 원문을 직접 받아 태그 제거(폴백). */
async function viaRaw(url: string, timeoutMs: number): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "HEALO-MarketIntel/1.0 (public reader)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`raw ${res.status}`);
  const html = await res.text();
  // <script>/<style> 통째 제거 후 태그 정리
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  return cleanText(stripped, BODY_MAX);
}

/** 공개 URL 의 본문을 가져온다. jina → raw 순으로 폴백, 둘 다 실패면 ok:false. */
export async function readUrl(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ReadResult> {
  if (!/^https?:\/\//i.test(url)) {
    return { url, ok: false, text: "", via: "none" };
  }
  try {
    const text = (await viaJina(url, timeoutMs)).trim();
    if (text) return { url, ok: true, text: text.slice(0, BODY_MAX), via: "jina" };
  } catch (e: any) {
    console.warn(`  ⚠️ jina 실패: ${String(e?.message || e).slice(0, 60)} → raw 폴백`);
  }
  try {
    const text = (await viaRaw(url, timeoutMs)).trim();
    if (text) return { url, ok: true, text, via: "raw" };
  } catch (e: any) {
    console.warn(`  ⚠️ raw 실패: ${String(e?.message || e).slice(0, 60)}`);
  }
  return { url, ok: false, text: "", via: "none" };
}
