/**
 * 계약 회귀 테스트 — 배포 창구 크론 (GET /api/cron/daily-deploy)
 *
 * 이 경로는 누르면 실서비스가 바뀐다. 지켜야 할 계약 3가지:
 *   ① 열쇠 없이 부르면 아무것도 안 한다(401)
 *   ② 깃허브 토큰이 없으면 조용히 성공한 척하지 않는다(503)
 *   ③ main 과 production 이 같으면 빌드를 안 짓는다(그날 머지 없음)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const SECRET = "test-cron-secret";
const auth = (v: string) => new Request("https://x/api/cron/daily-deploy", {
  headers: { authorization: v },
}) as any;

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.CRON_SECRET = SECRET;
  delete process.env.GITHUB_DEPLOY_TOKEN;
});

describe("배포 창구 크론", () => {
  it("열쇠가 틀리면 401 — 아무나 실서비스를 못 민다", async () => {
    const { GET } = await import("./route");
    const res = await GET(auth("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("깃허브 토큰이 없으면 503 — 못 했으면 못 했다고 한다", async () => {
    const { GET } = await import("./route");
    const res = await GET(auth(`Bearer ${SECRET}`));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("not_configured");
  });

  it("main 과 production 이 같으면 밀지 않는다 (빌드 낭비 방지)", async () => {
    process.env.GITHUB_DEPLOY_TOKEN = "gh-token";
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method || "GET"} ${url}`);
      return new Response(JSON.stringify({ object: { sha: "same-sha" } }), { status: 200 });
    }));

    const { GET } = await import("./route");
    const res = await GET(auth(`Bearer ${SECRET}`));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, deployed: false });
    expect(calls.some((c) => c.startsWith("PATCH"))).toBe(false); // 밀기 시도 자체가 없어야 한다
  });
});
