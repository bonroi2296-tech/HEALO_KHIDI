/**
 * 계약 회귀 테스트 — 비밀번호 재설정 메일 (POST /api/auth/forgot-password)
 *
 * 왜 이 테스트가 있나 (2026-08-13):
 *   이 관문의 횟수제한이 인메모리 판(서버 인스턴스별)이라, Vercel 이 인스턴스를 N대로 늘리면
 *   「같은 이메일 1분 1통」이 실제로는 1분 N통까지 나갔다(받은편지함 폭탄 방어가 헐거웠음).
 *   DB 기반 판(cross-isolate)으로 교체했고, 이 테스트가 두 가지를 잠근다:
 *     ① 인메모리 판을 «호출하지 않는다»           — 되돌아가면 실패
 *     ② 상한을 넘기면 메일을 안 보낸다             — 차단이 실제로 발송을 막는지
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const calls = { memory: 0, persistent: 0, sent: 0 };
let allowed = true;

vi.mock("server-only", () => ({}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: () => {
    calls.memory++;
    return { allowed: true, remaining: 9, resetAt: 0 };
  },
  checkRateLimitPersistent: async () => {
    calls.persistent++;
    return { allowed, remaining: allowed ? 4 : 0, resetAt: 0, blocked: !allowed };
  },
  getClientIp: () => "203.0.113.9",
  getRateLimitHeaders: () => ({}),
}));

vi.mock("@/lib/email/sendEmail", () => ({
  sendEmail: async () => {
    calls.sent++;
    return { ok: true };
  },
}));

vi.mock("@/lib/siteUrl", () => ({ siteUrl: () => "https://example.test" }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      admin: { listUsers: async () => ({ data: { users: [] }, error: null }) },
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
    },
  }),
}));

import { POST } from "./route";

function makeReq(body: any): any {
  return { json: async () => body, headers: { get: () => null } };
}

describe("비밀번호 재설정 관문 — 횟수제한은 인스턴스 공용(DB) 판이어야 한다", () => {
  beforeEach(() => {
    calls.memory = 0;
    calls.persistent = 0;
    calls.sent = 0;
    allowed = true;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  });

  it("인메모리(인스턴스별) 판을 쓰지 않는다", async () => {
    await POST(makeReq({ email: "a@b.co" }));
    expect(calls.memory).toBe(0);
    expect(calls.persistent).toBeGreaterThan(0);
  });

  it("상한을 넘기면 429 이고 메일이 나가지 않는다", async () => {
    allowed = false;
    const res: any = await POST(makeReq({ email: "victim@b.co" }));
    expect(res.status).toBe(429);
    expect(calls.sent).toBe(0);
  });
});
