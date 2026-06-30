/**
 * 시장 인텔리전스 수집기 — 여러 공개 소스를 모아 마케팅·운영 신호로 통합.
 *
 * 소스: Google News(다국어) + Reddit(영어 커뮤니티) + 추가 RSS 피드.
 * 흐름: 주제×언어 / 서브레딧 / 피드 별로 병렬 수집 → URL 중복 제거 → 워치키워드 태깅
 *       → 발행일 최신순 정렬. 개별 소스 실패는 흡수(전체 수집을 막지 않음).
 *
 * 수집 원칙(MARKET_INTEL_PLAYBOOK): 공개 게시물의 제목·요약·링크·발행일만.
 * 환자 개인식별정보(PII)·로그인 뒤 콘텐츠·민감 건강기록은 수집·저장하지 않는다.
 */

import { config } from "../config";
import { FeedItem, fetchFeed } from "../sources/rss-feed";
import { searchGoogleNews } from "../sources/google-news-rss";
import { searchReddit } from "../sources/reddit-public";

export interface IntelItem extends FeedItem {
  /** 워치 키워드 매칭(브랜드·경쟁어) — 평판/경쟁 신호 표시용 */
  matchedKeywords: string[];
}

export interface IntelResult {
  items: IntelItem[];
  /** 소스별 수집 건수(요약 보고용) */
  bySource: Record<string, number>;
  collectedAt: string;
  /** 실제로 응답한 소스 / 시도한 소스 (네트워크 가시성) */
  sourcesOk: number;
  sourcesTried: number;
}

function tagKeywords(item: FeedItem, keywords: string[]): string[] {
  const hay = `${item.title} ${item.snippet}`.toLowerCase();
  return keywords.filter((k) => hay.includes(k.toLowerCase()));
}

export class MarketIntelCollector {
  /** 설정(config.intel)에 따라 전 소스를 수집해 통합 결과를 반환 */
  async collect(): Promise<IntelResult> {
    const intel = config.intel;
    const tasks: Promise<FeedItem[]>[] = [];

    // 1) Google News — 주제 × 언어
    for (const topic of intel.topics) {
      for (const lang of intel.newsLangs) {
        const q = topic.queries[lang] || topic.queries.en;
        if (!q) continue;
        tasks.push(searchGoogleNews(q, lang, topic.label));
      }
    }

    // 2) Reddit — 서브레딧별 공개 검색
    for (const sub of intel.subreddits) {
      tasks.push(searchReddit(sub, intel.redditQuery, "글로벌 커뮤니티", intel.perSourceLimit));
    }

    // 3) 추가 RSS 피드(경쟁사 블로그·유튜브 등)
    for (const f of intel.extraFeeds) {
      tasks.push(fetchFeed(f.url, { platform: "rss", source: f.source, query: "구독 피드" }));
    }

    const sourcesTried = tasks.length;
    const settled = await Promise.allSettled(tasks);

    let sourcesOk = 0;
    const seen = new Set<string>();
    const perSourceCount: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const items: IntelItem[] = [];

    for (const r of settled) {
      if (r.status !== "fulfilled") continue;
      if (r.value.length > 0) sourcesOk++;
      for (const it of r.value) {
        // URL 정규화(쿼리스트링 제거)로 중복 제거
        const key = it.url.split("?")[0].replace(/\/$/, "").toLowerCase();
        if (seen.has(key)) continue;
        // 소스별 상한
        perSourceCount[it.source] = (perSourceCount[it.source] || 0) + 1;
        if (perSourceCount[it.source] > config.intel.perSourceLimit) continue;
        seen.add(key);
        items.push({ ...it, matchedKeywords: tagKeywords(it, config.intel.watchKeywords) });
        bySource[it.source] = (bySource[it.source] || 0) + 1;
      }
    }

    // 최신순 정렬(발행일 없으면 뒤로)
    items.sort((a, b) => {
      const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return tb - ta;
    });

    return {
      items,
      bySource,
      collectedAt: new Date().toISOString(),
      sourcesOk,
      sourcesTried,
    };
  }
}
