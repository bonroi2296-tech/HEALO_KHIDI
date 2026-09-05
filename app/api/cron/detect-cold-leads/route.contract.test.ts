/**
 * 계약 회귀 테스트 — 식은 리드 감지 cron (GET /api/cron/detect-cold-leads)
 *
 * 잠그는 계약: ①비시험·결과 없음 문의를 읽고 ②이력·상담 최신 시각을 합쳐 «마지막 움직임»을 재며
 * ③기준일 넘은 것만 번호·일수로 알림 하나에 묶어 보내고 ④없으면 알림을 안 보낸다 ⑤비밀키 없으면 401.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  inquiries: [] as any[],
  history: [] as any[],
  sessions: [] as any[],
  notified: [] as any[],
}));

vi.mock("@/lib/rag/supabaseAdmin", () => {
  const makeBuilder = (getResult: () => { data: any; error: any }) => {
    const builder: any = {};
    for (const m of ["select", "or", "is", "in", "eq", "gte", "order", "limit"]) builder[m] = () => builder;
    builder.then = (resolve: any) => resolve(getResult());
    return builder;
  };
  return {
    supabaseAdmin: {
      from: (table: string) => {
        if (table === "inquiries") return makeBuilder(() => ({ data: h.inquiries, error: null }));
        if (table === "case_status_history") return makeBuilder(() => ({ data: h.history, error: null }));
        if (table === "consultation_sessions") return makeBuilder(() => ({ data: h.sessions, error: null }));
        return makeBuilder(() => ({ data: [], error: null }));
      },
    },
  };
});
vi.mock("@/lib/notifications/inApp", () => ({
  notifyStaffColdLeads: vi.fn(async (notice: any) => {
    h.notified.push(notice);
  }),
}));
vi.mock("@/lib/security/cronAuth", () => ({
  verifyCronSecret: (header: string | null) => header === "Bearer test-secret",
}));

import { GET } from "./route";

const DAY = 86_400_000;
const daysAgo = (d: number) => new Date(Date.now() - d * DAY).toISOString();
const req = (auth?: string) =>
  new Request("http://localhost/api/cron/detect-cold-leads", {
    headers: auth ? { authorization: auth } : {},
  }) as any;

beforeEach(() => {
  h.inquiries = [];
  h.history = [];
  h.sessions = [];
  h.notified = [];
});

describe("detect-cold-leads cron", () => {
  it("비밀키가 없으면 401", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("상담 단계에서 오래 멈춘 것만 번호·일수로 알림 하나에 묶는다 (2026-09-05 실측 모양)", async () => {
    h.inquiries = [
      { id: 93, created_at: daysAgo(26), case_status: "consultation", case_status_updated_at: daysAgo(24), follow_ups: null, is_test: false },
      { id: 60, created_at: daysAgo(35), case_status: "consultation", case_status_updated_at: daysAgo(32), follow_ups: [{ at: daysAgo(33) }], is_test: false },
      { id: 302, created_at: daysAgo(2), case_status: null, follow_ups: [{ at: daysAgo(1) }], is_test: null },
      { id: 291, created_at: daysAgo(3), case_status: "consultation", case_status_updated_at: daysAgo(2), is_test: false },
      { id: 94, created_at: daysAgo(26), case_status: "on_hold", case_status_updated_at: daysAgo(3), is_test: false },
    ];
    // 이력·상담이 «더 최근»이면 그것이 마지막 움직임이다: 93 은 이력이 어제 → 식지 않음
    h.history = [{ inquiry_id: 93, created_at: daysAgo(1) }, { inquiry_id: 60, created_at: daysAgo(32) }];
    h.sessions = [{ inquiry_id: 60, updated_at: daysAgo(33) }];

    const res = await GET(req("Bearer test-secret"));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.checked).toBe(5);
    expect(json.cold).toEqual([{ id: 60, days: 32, case_status: "consultation" }]);
    expect(h.notified).toHaveLength(1);
    expect(h.notified[0].leads).toEqual([{ id: 60, days: 32 }]);
    expect(h.notified[0].thresholdDays).toBe(7);
    // 알림 재료에 이름·연락처 같은 칸이 섞이지 않는다
    expect(Object.keys(h.notified[0].leads[0]).sort()).toEqual(["days", "id"]);
  });

  it("식은 건이 없으면 알림을 안 보낸다", async () => {
    h.inquiries = [{ id: 1, created_at: daysAgo(1), case_status: "consultation", is_test: false }];
    const res = await GET(req("Bearer test-secret"));
    const json = await res.json();
    expect(json.cold).toEqual([]);
    expect(json.notified).toBe(false);
    expect(h.notified).toHaveLength(0);
  });
});
