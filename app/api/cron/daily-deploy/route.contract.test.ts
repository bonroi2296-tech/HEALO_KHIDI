/**
 * 계약 회귀 테스트 — 배포 창구 크론 (GET /api/cron/daily-deploy)
 *
 * 이 경로는 누르면 실서비스가 바뀐다. 지켜야 할 계약 5가지:
 *   ① 열쇠 없이 부르면 아무것도 안 한다(401)
 *   ② Vercel 열쇠가 없으면 조용히 성공한 척하지 않는다(503)
 *   ③ 지금 살아있는 배포가 main 과 같은 커밋이면 빌드를 안 짓는다
 *   ④ 지을 때는 「창구 표식」을 반드시 실어 보낸다 — 빠지면 배포가 스스로 취소된다
 *   ⑤ 직전 배포가 실패·취소면 「같은 커밋」으로 보지 않는다 — 그날 배포가 통째로 사라지지 않게
 *   ⑥ 「오늘 하루 휴무」로 지정된 날에는 아무것도 안 짓는다 (2026-08-04 추가)
 *
 * ⚠️ ①~⑤ 는 «평범한 날»의 계약이다. 휴무 목록에 오늘이 들어 있으면 라우트가 앞에서 돌아가므로
 *    이 시험들이 달력에 따라 깨진다(2026-08-04 실제로 깨졌다). 그래서 아래에서 휴무 판정을
 *    «평범한 날»로 고정하고, 휴무 자체는 ⑥에서 따로 확인한다.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// 기본값 = 평범한 날. ⑥ 에서만 휴무로 바꾼다.
const holidayReason = vi.fn((): string | null => null);
vi.mock("@/lib/deploy/windowHoliday", () => ({
  windowHolidayReason: () => holidayReason(),
}));

const SECRET = "test-cron-secret";
const call = (v: string) =>
  new Request("https://x/api/cron/daily-deploy", { headers: { authorization: v } }) as any;

/** main 커밋 = mainSha, 살아있는 배포 = live 인 세상을 만든다. */
function stubWorld(mainSha: string, live: { sha: string; state?: string } | null) {
  const calls: { url: string; method: string; body?: any }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({
        url,
        method: init?.method || "GET",
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      });
      if (url.includes("api.github.com")) {
        return new Response(JSON.stringify({ sha: mainSha }), { status: 200 });
      }
      if (url.includes("/v6/deployments")) {
        const deployments = live
          ? [{ state: live.state ?? "READY", meta: { githubCommitSha: live.sha } }]
          : [];
        return new Response(JSON.stringify({ deployments }), { status: 200 });
      }
      return new Response(JSON.stringify({ id: "dpl_new" }), { status: 200 });
    })
  );
  return calls;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  process.env.CRON_SECRET = SECRET;
  delete process.env.VERCEL_API_TOKEN;
  delete process.env.VERCEL_TOKEN;
});

describe("배포 창구 크론", () => {
  it("열쇠가 틀리면 401 — 아무나 실서비스를 못 민다", async () => {
    const { GET } = await import("./route");
    expect((await GET(call("Bearer wrong"))).status).toBe(401);
  });

  it("Vercel 열쇠가 없으면 503 — 못 했으면 못 했다고 한다", async () => {
    const { GET } = await import("./route");
    const res = await GET(call(`Bearer ${SECRET}`));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("not_configured");
  });

  it("살아있는 배포가 main 과 같은 커밋이면 안 짓는다 (빌드 낭비 방지)", async () => {
    process.env.VERCEL_API_TOKEN = "vc-token";
    const calls = stubWorld("same-sha", { sha: "same-sha" });

    const { GET } = await import("./route");
    const res = await GET(call(`Bearer ${SECRET}`));

    expect(await res.json()).toMatchObject({ ok: true, deployed: false });
    expect(calls.some((c) => c.method === "POST")).toBe(false); // 만들기 시도 자체가 없어야 한다
  });

  it("새 머지가 있으면 그 커밋으로 짓고, 창구 표식을 실어 보낸다", async () => {
    process.env.VERCEL_API_TOKEN = "vc-token";
    const calls = stubWorld("new-sha", { sha: "old-sha" });

    const { GET } = await import("./route");
    const res = await GET(call(`Bearer ${SECRET}`));

    expect(await res.json()).toMatchObject({ ok: true, deployed: true });
    const post = calls.find((c) => c.method === "POST");
    expect(post?.body?.target).toBe("production");
    expect(post?.body?.gitSource?.sha).toBe("new-sha");
    // 표식이 빠지면 「안 볼 배포는 짓지 않는다」 규칙이 이 배포를 취소해버린다.
    expect(post?.body?.build?.env?.DEPLOY_WINDOW).toBe("1");
  });

  it("직전 배포가 실패·취소 상태면 「같은 커밋」으로 보지 않고 다시 짓는다", async () => {
    process.env.VERCEL_API_TOKEN = "vc-token";
    const calls = stubWorld("same-sha", { sha: "same-sha", state: "ERROR" });

    const { GET } = await import("./route");
    await GET(call(`Bearer ${SECRET}`));

    expect(calls.some((c) => c.method === "POST")).toBe(true);
  });

  it("⑥ 오늘이 「창구 휴무」면 새 머지가 있어도 아무것도 안 짓는다", async () => {
    process.env.VERCEL_API_TOKEN = "vc-token";
    holidayReason.mockReturnValueOnce("시험용 휴무");
    const calls = stubWorld("new-sha", { sha: "old-sha" }); // 새 머지가 «있는» 상태

    const { GET } = await import("./route");
    const res = await GET(call(`Bearer ${SECRET}`));

    expect(await res.json()).toMatchObject({ ok: true, deployed: false, reason: "holiday" });
    expect(calls.some((c) => c.method === "POST"), "휴무인데 배포를 지었다").toBe(false);
  });
});
