/**
 * RSS/Atom 피드 소스 — 의존성 없이 표준 피드를 파싱한다.
 *
 * 왜 직접 파서:
 *   새 npm 패키지 없이(빌드·보안 감사 부담 0) RSS 2.0(<item>)·Atom(<entry>) 양쪽을
 *   가볍게 읽기 위함. 시장 인텔리전스 수집은 "공개 피드"가 1순위 소스 — 합법(공식 배포물)·
 *   인증 불필요·ToS 친화적. YouTube 채널도 RSS(feeds/videos.xml?channel_id=…)로 노출된다.
 *
 * 수집 원칙(MARKET_INTEL_PLAYBOOK 와 정합): 공개 게시물의 제목·링크·요약·발행일만.
 * 환자 개인식별정보(PII)·로그인 뒤 콘텐츠는 다루지 않는다.
 */

export interface FeedItem {
  /** 어느 수집 경로인지 (google_news | rss | reddit | …) */
  platform: string;
  /** 사람이 읽는 소스 라벨 (피드 제목·서브레딧 등) */
  source: string;
  title: string;
  url: string;
  /** 본문 요약/스니펫 (HTML 제거·길이 제한) */
  snippet: string;
  /** ISO 발행일 (파싱 실패 시 null) */
  publishedAt: string | null;
  /** 수집을 유발한 언어 (ru·kk·zh·en·ko …) */
  lang: string | null;
  /** 수집을 유발한 질의/주제 키 */
  query: string | null;
}

const DEFAULT_TIMEOUT_MS = 8000;
const SNIPPET_MAX = 280;

/** HTML 엔티티 디코드 → 태그 제거 → 공백 정리 → 길이 제한.
 *  순서 중요: Google News RSS 처럼 본문이 이중 인코딩(&lt;a&gt;…)된 경우, 디코드를 먼저
 *  해야 그 안의 태그까지 제거된다(태그 제거를 먼저 하면 &lt;a&gt; 가 살아남아 본문에 박힘). */
export function cleanText(raw: string, max = SNIPPET_MAX): string {
  const unCdata = (raw || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  const decoded = unCdata
    // &amp; 를 가장 먼저 — Google News 처럼 &amp;nbsp;/&amp;lt; 로 이중 인코딩된 경우를 1패스로 푼다.
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;|&#0*160;/g, " ");
  const noTags = decoded.replace(/<[^>]+>/g, " ");
  const collapsed = noTags.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? collapsed.slice(0, max - 1).trim() + "…" : collapsed;
}

function firstTag(block: string, tag: string): string {
  // 속성 유무 모두 허용: <tag ...>...</tag>
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(block);
  return m ? m[1] : "";
}

/** Atom <link href="…"/> 또는 RSS <link>…</link> 양쪽에서 URL 추출 */
function extractLink(block: string): string {
  const rss = firstTag(block, "link").trim();
  if (rss && /^https?:/i.test(cleanText(rss, 2000))) return cleanText(rss, 2000);
  // Atom: <link rel="alternate" href="…"/> 우선, 없으면 첫 href
  const alt = /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i.exec(block);
  if (alt) return alt[1];
  const any = /<link[^>]*href=["']([^"']+)["']/i.exec(block);
  if (any) return any[1];
  return cleanText(rss, 2000);
}

/** RSS/Atom XML 문자열을 FeedItem[] 로 파싱 (플랫폼·소스·lang·query 는 호출자가 주입) */
export function parseFeed(
  xml: string,
  meta: { platform: string; source: string; lang?: string | null; query?: string | null }
): FeedItem[] {
  if (!xml) return [];
  const items: FeedItem[] = [];
  // RSS <item> 과 Atom <entry> 둘 다 수집
  const blocks = [
    ...xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [],
    ...xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [],
  ];
  for (const block of blocks) {
    const title = cleanText(firstTag(block, "title"), 240);
    const url = extractLink(block).trim();
    if (!title || !url) continue;
    const rawDate =
      firstTag(block, "pubDate") ||
      firstTag(block, "published") ||
      firstTag(block, "updated") ||
      firstTag(block, "dc:date");
    let publishedAt: string | null = null;
    if (rawDate) {
      const d = new Date(cleanText(rawDate, 60));
      if (!isNaN(d.getTime())) publishedAt = d.toISOString();
    }
    const snippet = cleanText(
      firstTag(block, "description") || firstTag(block, "summary") || firstTag(block, "content")
    );
    items.push({
      platform: meta.platform,
      source: meta.source,
      title,
      url,
      snippet,
      publishedAt,
      lang: meta.lang ?? null,
      query: meta.query ?? null,
    });
  }
  return items;
}

/** 단일 RSS/Atom 피드 URL 을 가져와 파싱. 실패는 빈 배열로 우아하게 흡수(수집 전체를 막지 않음). */
export async function fetchFeed(
  feedUrl: string,
  meta: { platform: string; source: string; lang?: string | null; query?: string | null },
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<FeedItem[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        // 일부 피드는 UA 없으면 차단 — 공개 봇임을 정직하게 밝힌다.
        "User-Agent": "HEALO-MarketIntel/1.0 (+https://healwith.co.kr; public feed reader)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.warn(`  ⚠️ feed ${res.status}: ${meta.source}`);
      return [];
    }
    const xml = await res.text();
    return parseFeed(xml, meta);
  } catch (e: any) {
    console.warn(`  ⚠️ feed 실패(${meta.source}): ${String(e?.message || e).slice(0, 80)}`);
    return [];
  }
}
