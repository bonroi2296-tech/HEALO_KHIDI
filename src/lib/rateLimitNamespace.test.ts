import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import fs from "fs";
import path from "path";

/**
 * 「검사(CI)끼리 회수제한 통을 나눠 쓰지 않는다」를 잠근다.
 *
 * 왜 필요한가 (2026-08-31 실측):
 *   러너에서 도는 서버는 localhost 라 `getClientIp` 가 «항상 ::1» 이고, 통(rate_limit_buckets)은
 *   «검사 전용 Supabase» 한 곳에 들어간다. 그래서 통 이름이 어느 실행에서든 `inquiry:::1` 로 같았다.
 *   의뢰서 접수는 1분에 5회인데 스모크 한 번이 이미 4회를 쓴다 → PR 두 개가 겹쳐 도는 순간
 *   뒤에 온 요청이 429 를 맞는다. 서버는 429 를 로그로 안 남기고 시험은 「#track-url 을 못 찾음」
 *   이라고만 말해서, **남의 PR 이 내 PR 을 빨갛게 만든 것**이 「내 코드가 접수를 깼다」로 보인다.
 *   (그날 06:56, 27초 차이로 올라간 두 PR 이 같은 분에 8회를 밀어 넣었다. 내 쪽 3회 연속 실패 +
 *    상대 쪽 1회 실패 — 상대는 재시도로 통과해 아무도 못 봤다.)
 *
 * 여기서 막는 것은 두 가지다:
 *   ① 통 이름에서 실행 번호를 다시 빼는 것
 *   ② E2E 잡을 새로 만들면서 `RATE_LIMIT_NAMESPACE` 를 안 넘기는 것 — 이러면 그 잡만 조용히
 *      옛날 상태로 돌아가고, 증상은 «남의 PR 이 가끔 빨개짐»이라 원인을 찾는 데 또 반나절 든다.
 */

const rpc = vi.fn();
vi.mock("./rag/supabaseAdmin", () => ({
  supabaseAdmin: { rpc: (...args: any[]) => rpc(...args) },
}));

const { checkRateLimitPersistent } = await import("./rateLimit");

const CONFIG = { windowMs: 60_000, maxRequests: 5, apiName: "inquiry" };

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({
    data: [{ allowed: true, remaining: 4, reset_at: "2026-08-31T06:56:00.000Z" }],
    error: null,
  });
  delete process.env.RATE_LIMIT_NAMESPACE;
});

// vitest 는 «파일»마다 모듈은 새로 만들지만 process.env 는 워커 프로세스가 공유한다.
// 여기서 켜 둔 채 끝내면 뒤에 도는 다른 파일이 그 값을 물려받는다 — 치우고 나간다.
afterAll(() => {
  delete process.env.RATE_LIMIT_NAMESPACE;
});

describe("회수제한 통 이름 — 검사 실행끼리 안 섞인다", () => {
  it("RATE_LIMIT_NAMESPACE 가 있으면 통 이름에 그게 들어간다", async () => {
    process.env.RATE_LIMIT_NAMESPACE = "ci-111-1-smoke";
    await checkRateLimitPersistent("::1", CONFIG);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1].p_key).toBe("inquiry:ci-111-1-smoke:::1");
  });

  it("두 실행은 IP 가 같아도 통이 갈린다 (이게 이 수리의 전부다)", async () => {
    process.env.RATE_LIMIT_NAMESPACE = "ci-111-1-smoke";
    await checkRateLimitPersistent("::1", CONFIG);
    process.env.RATE_LIMIT_NAMESPACE = "ci-222-1-smoke";
    await checkRateLimitPersistent("::1", CONFIG);
    const [a, b] = rpc.mock.calls.map((c) => c[1].p_key);
    expect(
      a === b,
      `\n두 실행의 통 이름이 같다: ${a}\n` +
        `→ 이러면 동시에 도는 PR 끼리 접수 한도(1분 5회)를 나눠 쓴다.\n`
    ).toBe(false);
  });

  it("실서비스(변수 없음)에선 통 이름이 예전 그대로다 — 한 글자도 안 바뀐다", async () => {
    await checkRateLimitPersistent("203.0.113.7", CONFIG);
    expect(rpc.mock.calls[0][1].p_key).toBe("inquiry:203.0.113.7");
  });

  it("변수가 켜져도 IP 는 열쇠에 그대로 남는다 (제한이 느슨해지지 않는다)", async () => {
    process.env.RATE_LIMIT_NAMESPACE = "ci-111-1-smoke";
    await checkRateLimitPersistent("203.0.113.7", CONFIG);
    await checkRateLimitPersistent("203.0.113.8", CONFIG);
    const [a, b] = rpc.mock.calls.map((c) => c[1].p_key);
    expect(a).toContain("203.0.113.7");
    expect(a).not.toBe(b);
  });
});

describe("E2E 워크플로가 그 변수를 실제로 넘긴다", () => {
  const YML = fs.readFileSync(
    path.resolve(process.cwd(), ".github/workflows/e2e.yml"),
    "utf8"
  );
  const LINES = YML.split("\n");

  it("러너에서 도는 E2E 잡은 하나도 빠짐없이 RATE_LIMIT_NAMESPACE 를 넘긴다", () => {
    // 「러너에서 도는」 = 자기 서버를 띄워 localhost 를 보는 잡. 실서비스 대상(nightly)은 제외 —
    // 거기선 서버가 Vercel 이라 이 변수가 안 닿고, 닿아도 «손님과 같은 통»으로 재는 게 맞다.
    const localJobs = LINES.map((l, i) => [l, i] as const).filter(([l]) =>
      l.includes('E2E_BASE_URL: "http://localhost:3000"')
    );
    expect(localJobs.length, "localhost 대상 E2E 단계를 하나도 못 찾았다 — 이 시험이 헛돌고 있다").toBeGreaterThan(0);

    const missing = localJobs
      .filter(([, i]) => !LINES.slice(i, i + 20).some((l) => l.includes("RATE_LIMIT_NAMESPACE:")))
      .map(([, i]) => i + 1);
    expect(
      missing,
      `\nRATE_LIMIT_NAMESPACE 를 안 넘기는 단계(줄 번호): ${missing.join(", ")}\n` +
        `→ 그 잡은 다른 실행과 «같은 통»을 쓴다. 동시에 PR 두 개가 올라오면 서로를 빨갛게 만든다.\n`
    ).toEqual([]);
  });

  it("통 이름에 실행 번호와 잡 이름이 둘 다 들어간다", () => {
    // 실행 번호만 넣으면 같은 실행 안의 smoke·blast-radius 가 또 겹친다(둘은 동시에 돈다).
    const decls = LINES.filter((l) => l.includes("RATE_LIMIT_NAMESPACE:"));
    for (const d of decls) {
      expect(d, `실행 번호(github.run_id)가 빠졌다: ${d.trim()}`).toContain("github.run_id");
      expect(d, `잡 이름(github.job)이 빠졌다: ${d.trim()}`).toContain("github.job");
    }
  });
});
