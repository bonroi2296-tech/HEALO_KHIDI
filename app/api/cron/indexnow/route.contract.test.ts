/**
 * 계약 회귀 테스트 — IndexNow 제출 cron (GET /api/cron/indexnow)
 *
 * 잠그는 계약: ①비밀키 없으면 401 ②평일엔 사이트맵에서 최근(3일) 바뀐 주소만 보낸다 ③월요일(UTC)·?full=1 이면 전부
 * ④엔진이 거절하면 502(크론 기록에 남게) ⑤사이트맵이 죽으면 500 + 코드형 오류만(메시지 노출 없음).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => ({
  entries: [] as any[],
  sitemapError: null as Error | null,
  posts: [] as any[],
  status: 202,
}));

vi.mock("../../../sitemap", () => ({
  default: vi.fn(async () => {
    if (h.sitemapError) throw h.sitemapError;
    return h.entries;
  }),
}));
vi.mock("@/lib/security/cronAuth", () => ({
  verifyCronSecret: (header: string | null) => header === "Bearer test-secret",
}));

import { GET, isFullSubmissionDay } from "./route";

const DAY = 86_400_000;
const MONDAY = Date.parse("2026-09-07T07:00:00Z"); // 월요일
const TUESDAY = MONDAY + DAY;
const req = (auth?: string, qs = "") =>
  new Request(`http://localhost/api/cron/indexnow${qs}`, { headers: auth ? { authorization: auth } : {} }) as any;

let realFetch: typeof fetch;
beforeEach(() => {
  h.entries = [
    { url: "https://healwith.co.kr/ru", lastModified: new Date(TUESDAY - 1 * DAY) },
    { url: "https://healwith.co.kr/kz/hospitals/immune", lastModified: new Date(TUESDAY - 20 * DAY) },
    { url: "https://healwith.co.kr/en/faq", lastModified: new Date("2026-08-20") },
  ];
  h.sitemapError = null;
  h.posts = [];
  h.status = 202;
  realFetch = global.fetch;
  global.fetch = vi.fn(async (_url: any, init: any) => {
    h.posts.push(JSON.parse(init.body));
    return new Response("", { status: h.status });
  }) as any;
  vi.useFakeTimers();
  vi.setSystemTime(TUESDAY);
});
afterEach(() => {
  global.fetch = realFetch;
  vi.useRealTimers();
});

describe("indexnow cron", () => {
  it("비밀키가 없으면 401 이고 아무것도 안 보낸다", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(h.posts).toHaveLength(0);
  });

  it("평일: 최근 3일 안에 바뀐 주소만 보낸다", async () => {
    const res = await GET(req("Bearer test-secret"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, mode: "recent", submitted: 1, status: 202 });
    expect(h.posts).toHaveLength(1);
    expect(h.posts[0].host).toBe("healwith.co.kr");
    expect(h.posts[0].urlList).toEqual(["https://healwith.co.kr/ru"]);
  });

  it("월요일(UTC)엔 전부 보낸다", async () => {
    vi.setSystemTime(MONDAY);
    expect(isFullSubmissionDay(new Date())).toBe(true);
    const res = await GET(req("Bearer test-secret"));
    expect((await res.json()).mode).toBe("full");
    expect(h.posts[0].urlList).toHaveLength(3);
  });

  it("?full=1 이면 요일과 무관하게 전부", async () => {
    const res = await GET(req("Bearer test-secret", "?full=1"));
    expect((await res.json())).toMatchObject({ mode: "full", submitted: 3 });
  });

  it("보낼 변경이 없으면 네트워크를 안 타고 submitted=0", async () => {
    h.entries = [{ url: "https://healwith.co.kr/en/faq", lastModified: new Date("2026-08-20") }];
    const res = await GET(req("Bearer test-secret"));
    expect(await res.json()).toMatchObject({ ok: true, submitted: 0 });
    expect(h.posts).toHaveLength(0);
  });

  it("엔진이 거절(403)하면 502 — 크론 기록에 빨간불로 남는다", async () => {
    h.status = 403;
    const res = await GET(req("Bearer test-secret"));
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ ok: false, status: 403, submitted: 0 });
  });

  it("사이트맵이 죽으면 500 + 코드형 오류만(원문 메시지 노출 없음)", async () => {
    h.sitemapError = new Error("db down: secret detail");
    const res = await GET(req("Bearer test-secret"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: "internal_error" });
    expect(JSON.stringify(body)).not.toMatch(/secret detail/);
  });
});
