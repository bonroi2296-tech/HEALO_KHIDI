/**
 * 계약 회귀 테스트 — 공개 챗봇 피드백 (POST /api/public/chat/feedback)
 *
 * 과거 버그: 존재하지 않는 테이블 inquiry_threads 를 조회해 모든 👍/👎 피드백이
 *   403 으로 실패. 이 테스트가 "chat_threads 를 조회하고 정상 저장됨"을 잠근다.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const fromCalls: string[] = [];

function chain(terminal: any) {
  const q: any = {
    select: () => q,
    eq: () => q,
    limit: () => q,
    single: async () => terminal.single ?? { data: null, error: null },
    maybeSingle: async () => terminal.maybeSingle ?? { data: null, error: null },
    insert: async () => terminal.insert ?? { error: null },
  };
  return q;
}

vi.mock("@/lib/rag/supabaseAdmin", () => ({
  assertSupabaseEnv: () => {},
  supabaseAdmin: {
    from: (table: string) => {
      fromCalls.push(table);
      if (table === "chat_threads") {
        return chain({
          single: { data: { id: "t1", guest_email: "a@b.c", user_id: null }, error: null },
        });
      }
      return chain({});
    },
  },
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: () => ({ allowed: true }),
  getClientIp: () => "127.0.0.1",
  RATE_LIMITS: { CHAT: { windowMs: 60000, maxRequests: 100, apiName: "chat" } },
}));

vi.mock("@/lib/notifications/inApp", () => ({
  broadcastInAppNotification: vi.fn(async () => {}),
  getStaffIdsByRole: vi.fn(async () => ({ admins: [], coordinators: [] })),
}));

import { POST } from "./route";

function makeReq(body: any): any {
  return { json: async () => body, headers: { get: () => null } };
}

describe("챗봇 피드백 계약 — chat_threads 조회 + 저장", () => {
  beforeEach(() => {
    fromCalls.length = 0;
  });

  it("👍 피드백이 성공하고 chat_threads 를 조회한다 (inquiry_threads 아님)", async () => {
    const res = await POST(
      makeReq({
        thread_id: "t1",
        message_id: "m1",
        public_token: "tok",
        rating: 1,
      })
    );
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(fromCalls).toContain("chat_threads");
    expect(fromCalls).not.toContain("inquiry_threads");
    expect(fromCalls).toContain("chat_feedback");
  });

  it("필수 필드 누락 시 400", async () => {
    const res = await POST(makeReq({ thread_id: "t1", rating: 1 }));
    expect(res.status).toBe(400);
  });
});
