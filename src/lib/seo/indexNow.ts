/**
 * IndexNow — 검색엔진에 «이 주소가 새로 생겼다/바뀌었다»를 우리가 직접 알리는 공개 규약(무료).
 * 한 곳(api.indexnow.org)에 보내면 참여 엔진 전부(빙·얀덱스·네이버·Seznam·Yep)에 전달된다. 구글은 안 받는다.
 *
 * 왜 (2026-09-05 실측):
 *   · 빙 `site:healwith.co.kr` = 0쪽(«There are no results»). 빙은 DuckDuckGo·야후에도 결과를 댄다.
 *   · 얀덱스(러시아 1위·카자흐 2위 검색)는 크롤이 7/23 이후 멈춰 8/20 에 «손으로» 재크롤 49건을 넣은 게 마지막이다
 *     (하루 상한 150). 사람이 잊으면 그대로 멈춘다 — 이 규약이 그 손일을 대신한다.
 *   · 네이버도 참여 엔진이라 한국어 대행사·보호자 검색에도 같이 닿는다.
 *
 * 키는 비밀이 아니다: 규약상 `https://호스트/<키>.txt` 로 공개 서빙돼야 한다(엔진이 그 파일을 읽어 «이 호스트 주인이
 * 보낸 것»만 확인). 그래서 저장소에 그대로 둔다(public/<키>.txt 와 반드시 같은 값).
 * 제출 주기: 규약 권고는 «바뀔 때 보내라». 우리 사이트맵의 lastModified 를 그대로 써서 최근 창(기본 3일) 안의
 * 주소만 매일 보내고, 월요일엔 전부(170쪽 안팎, 1회 요청 상한 10,000) 한 번 보낸다(빠진 게 있어도 일주일 안에 닿는다).
 */

export const INDEXNOW_KEY = "bea9fc493565bfdb34a73f8ce0c7739d";
/** 키 파일 경로 — public/ 에 같은 이름의 파일이 있어야 하고, proxy.ts 가 언어 주소로 보내지 않아야 한다. */
export const INDEXNOW_KEY_PATH = `/${INDEXNOW_KEY}.txt`;
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";
export const INDEXNOW_MAX_URLS = 10_000;
/** 「최근」 창 — 사이트맵 lastModified 가 이 안이면 매일 제출. */
export const INDEXNOW_WINDOW_DAYS = 3;

export type SitemapLike = { url?: string | null; lastModified?: Date | string | number | null };

function toMs(v: SitemapLike["lastModified"]): number | null {
  if (v == null) return null;
  const t = v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(String(v));
  return Number.isFinite(t) ? t : null;
}

/**
 * 사이트맵 항목에서 제출할 주소를 고른다.
 *  - 우리 host 의 https 주소만(다른 host·http 는 규약이 422 로 거절한다 → 애초에 안 보낸다)
 *  - 중복 제거(사이트맵은 언어별 6개 항목에 같은 alternates 를 반복하지만 <loc> 자체는 유일하다)
 *  - full 이면 전부, 아니면 lastModified 가 windowDays 안인 것만(lastModified 없는 항목은 «언제 바뀌었는지 모름» = 매일 안 보냄)
 *  - 규약 상한(10,000) 초과분은 잘라낸다
 */
export function pickIndexNowUrls(
  entries: ReadonlyArray<SitemapLike> | null | undefined,
  opts: { host: string; full?: boolean; now?: number; windowDays?: number; max?: number }
): string[] {
  const now = opts.now ?? Date.now();
  const windowMs = (opts.windowDays ?? INDEXNOW_WINDOW_DAYS) * 86_400_000;
  const max = opts.max ?? INDEXNOW_MAX_URLS;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of entries || []) {
    const raw = typeof e?.url === "string" ? e.url.trim() : "";
    if (!raw) continue;
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      continue;
    }
    if (u.protocol !== "https:" || u.host !== opts.host) continue;
    if (!opts.full) {
      const t = toMs(e.lastModified);
      if (t == null || now - t > windowMs) continue;
    }
    const key = u.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= max) break;
  }
  return out;
}

export type IndexNowResult = { status: number; ok: boolean; submitted: number };

/**
 * api.indexnow.org 에 한 번에 보낸다. 200/202 = 받아들임(202 는 키 검증 대기 — 첫 제출에서 흔하다).
 * 네트워크 오류는 status 0 으로 돌려준다(크론이 500 을 내며 죽는 것보다 한 줄 로그가 낫다).
 */
export async function submitIndexNow(opts: {
  host: string;
  urls: ReadonlyArray<string>;
  key?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}): Promise<IndexNowResult> {
  const urls = opts.urls.slice(0, INDEXNOW_MAX_URLS);
  if (urls.length === 0) return { status: 0, ok: true, submitted: 0 };
  const key = opts.key ?? INDEXNOW_KEY;
  const body = {
    host: opts.host,
    key,
    keyLocation: `https://${opts.host}/${key}.txt`,
    urlList: urls,
  };
  const doFetch = opts.fetchImpl ?? fetch;
  try {
    const res = await doFetch(opts.endpoint ?? INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    const ok = res.status === 200 || res.status === 202;
    return { status: res.status, ok, submitted: ok ? urls.length : 0 };
  } catch {
    return { status: 0, ok: false, submitted: 0 };
  }
}
