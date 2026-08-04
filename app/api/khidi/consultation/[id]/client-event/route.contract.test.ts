/**
 * 계약 회귀 테스트 — 진단 비콘 (POST /api/khidi/consultation/[id]/client-event)
 *
 * 지키려는 것 하나: **하울링 기록이 「오류 폭증」 종을 울리면 안 된다.**
 *   그 경보는 10분에 오류 8건이면 직원에게 알림을 쏜다. 하울링은 한 번 나면 여러 기기가
 *   동시에 여러 건을 보내므로, 같은 이름(CONSULTATION_CLIENT_ERROR)으로 세면 회의마다
 *   직원이 헛걸음한다. 그래서 소리 기록은 다른 이름으로 남기고 경보 계산을 건너뛴다.
 *   이 시험이 그 갈래를 커밋 전에 잡는다.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/requireConsultationAccess", () => ({
  resolveConsultationActor: vi.fn(async () => ({
    success: true,
    role: "guest",
    isGuest: true,
  })),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: () => ({ allowed: true }),
  getClientIp: () => "203.0.113.9",
  getRateLimitHeaders: () => ({}),
}));

const notify = vi.fn(async () => {});
vi.mock("@/lib/notifications/inApp", () => ({
  notifyStaffConsultationErrorStorm: notify,
}));

// insert 된 행을 모으고, 경보 계산용 select 가 돌았는지도 센다.
const state = { inserts: [] as any[], selectCalls: 0, recentCount: 99 };
vi.mock("@/lib/rag/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: () => ({
      insert: async (row: any) => {
        state.inserts.push(row);
        return { error: null };
      },
      select: () => {
        state.selectCalls += 1;
        const q: any = {
          eq: () => q,
          gte: () => q,
          filter: () => q,
          then: (resolve: any) => resolve({ count: state.recentCount, error: null }),
        };
        return q;
      },
    }),
  },
}));

const { POST } = await import("./route");

function req(type: string) {
  return new Request("http://x/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type, message: "my=0.31 peer=0.28" }),
  }) as any;
}
const params = Promise.resolve({ id: "cid-1" });

beforeEach(() => {
  state.inserts = [];
  state.selectCalls = 0;
  notify.mockClear();
});

describe("client-event — 소리 기록은 오류와 갈라서 센다", () => {
  it("하울링 기록은 CONSULTATION_AUDIO_EVENT 로 남고 폭증 경보를 안 울린다", async () => {
    const res = await POST(req("howling_missed"), { params });
    expect(res.status).toBe(200);
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0].action).toBe("CONSULTATION_AUDIO_EVENT");
    // 경보 계산 자체를 건너뛰어야 한다 (센 뒤 안 울리는 게 아니라 아예 안 셈)
    expect(state.selectCalls).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("연결 오류는 예전 그대로 CONSULTATION_CLIENT_ERROR 로 남는다", async () => {
    await POST(req("connect_error"), { params });
    expect(state.inserts[0].action).toBe("CONSULTATION_CLIENT_ERROR");
    expect(state.selectCalls).toBeGreaterThan(0); // 경보 계산이 돈다
  });

  it("모르는 종류는 거절한다", async () => {
    const res = await POST(req("아무거나"), { params });
    expect(res.status).toBe(400);
    expect(state.inserts).toHaveLength(0);
  });
});
