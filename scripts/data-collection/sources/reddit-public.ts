/**
 * Reddit 공개 검색 소스 — 글로벌(영어권) 환자·의료관광 커뮤니티 신호.
 *
 * 왜 Reddit:
 *   r/cancer · r/medicaltourism 등에서 "한국 암치료/의료관광"이 어떻게 논의되는지,
 *   경쟁국(태국·터키·인도)과 비교돼 어떤 질문·불만·기대가 나오는지 = 마케팅 메시지 힌트.
 *
 * 공개 JSON 엔드포인트(.json)만 사용 — 로그인·OAuth 불필요(읽기 전용 공개 데이터).
 * 수집 원칙: 공개 게시물의 제목·요약·링크만. 작성자 신원 추적·개인 건강정보 저장 금지.
 */

import { FeedItem, cleanText } from "./rss-feed";

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * 한 서브레딧에서 질의로 공개 검색.
 * @param subreddit  서브레딧 이름(접두 r/ 없이)
 * @param query      검색어(영어 권장)
 * @param queryKey   주제 키(라벨용)
 * @param limit      최대 건수
 */
export async function searchReddit(
  subreddit: string,
  query: string,
  queryKey: string,
  limit = 8
): Promise<FeedItem[]> {
  const url =
    `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/search.json` +
    `?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=${limit}`;
  try {
    const res = await fetch(url, {
      headers: {
        // Reddit 은 기본 UA(예: node-fetch)를 자주 429/403 → 정직한 식별 UA 필수.
        "User-Agent": "HEALO-MarketIntel/1.0 (public read-only research)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`  ⚠️ reddit ${res.status}: r/${subreddit}`);
      return [];
    }
    const json: any = await res.json();
    const children: any[] = json?.data?.children || [];
    return children
      .map((c) => c?.data)
      .filter(Boolean)
      .map((d: any): FeedItem => ({
        platform: "reddit",
        source: `r/${subreddit}`,
        title: cleanText(d.title || "", 240),
        url: d.permalink ? `https://www.reddit.com${d.permalink}` : d.url || "",
        snippet: cleanText(d.selftext || "", 280),
        publishedAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : null,
        lang: "en",
        query: queryKey,
      }))
      .filter((i) => i.title && i.url);
  } catch (e: any) {
    console.warn(`  ⚠️ reddit 실패(r/${subreddit}): ${String(e?.message || e).slice(0, 80)}`);
    return [];
  }
}
