/**
 * 계약 회귀 테스트 — 침묵환자 감지 cron (GET /api/cron/detect-silent-patients)
 *
 * 과거 버그(POSTMORTEMS #12/#13): consultation_sessions 를 `.not("patient_id",...)` 로
 *   걸렀는데 patient_id 가 전 행 null 이라 항상 0건 → 침묵 알림이 한 번도 안 떴음.
 * 이 테스트가 "inquiry_id 기준으로 활성 문의를 찾고, 오래된 문의에 silence_long 알림을
 *   inquiry_id 로 만든다"는 계약을 잠근다.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock 은 파일 최상단으로 hoist 되므로 공유 상태는 vi.hoisted 로 만든다.
const h = vi.hoisted(() => ({
  sessions: [] as any[],
  report: [] as any[],
  existing: [] as any[],
  saved: [] as any[],
}));

vi.mock("@/lib/rag/supabaseAdmin", () => {
  // 어느 메서드를 호출해도 같은 객체를 반환하고, await 하면 table 별 결과를 돌려준다.
  const makeBuilder = (getResult: () => { data: any; error: any }) => {
    const builder: any = {};
    const passthrough = () => builder;
    for (const m of ["select", "gte", "lte", "not", "eq", "is", "order", "limit"]) {
      builder[m] = passthrough;
    }
    builder.then = (resolve: any) => resolve(getResult());
    return builder;
  };
  return {
    supabaseAdmin: {
      from: (table: string) => {
        if (table === "consultation_sessions")
          return makeBuilder(() => ({ data: h.sessions, error: null }));
        if (table === "symptom_reports")
          return makeBuilder(() => ({ data: h.report, error: null }));
        if (table === "symptom_alerts")
          return makeBuilder(() => ({ data: h.existing, error: null }));
        return makeBuilder(() => ({ data: [], error: null }));
      },
    },
  };
});

vi.mock("@/lib/symptoms/alertService", () => ({
  saveAndNotifyAlerts: vi.fn(async (alerts: any[]) => {
    h.saved.push(...alerts);
    return alerts.map((_, i) => `alert-${i}`);
  }),
}));

import { GET } from "./route";

const SECRET = "test-cron-secret";
function makeReq(): any {
  return { headers: { get: (k: string) => (k === "authorization" ? `Bearer ${SECRET}` : null) } };
}

describe("침묵환자 감지 cron 계약 — inquiry_id 기준", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    h.sessions = [];
    h.report = [];
    h.existing = [];
    h.saved.length = 0;
  });

  it("CRON_SECRET 불일치 → 401", async () => {
    const res = await GET({ headers: { get: () => "Bearer wrong" } } as any);
    expect(res.status).toBe(401);
  });

  it("오래된 증상 보고가 있는 문의 → silence_long 알림을 inquiry_id 로 생성", async () => {
    h.sessions = [{ inquiry_id: 42, updated_at: "2026-06-20T00:00:00Z" }];
    h.report = [{ created_at: new Date(Date.now() - 10 * 86400000).toISOString() }];
    h.existing = [];

    const res = await GET(makeReq());
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.checked).toBe(1);
    expect(json.detected).toBe(1);
    expect(h.saved).toHaveLength(1);
    expect(h.saved[0].inquiry_id).toBe(42);
    expect(h.saved[0].patient_id).toBeNull();
    expect(h.saved[0].alert_type).toBe("silence_long");
  });

  it("이미 미해결 알림이 있으면 중복 생성 안 함", async () => {
    h.sessions = [{ inquiry_id: 42, updated_at: "2026-06-20T00:00:00Z" }];
    h.report = [{ created_at: new Date(Date.now() - 10 * 86400000).toISOString() }];
    h.existing = [{ id: "existing-1" }];

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.detected).toBe(0);
    expect(h.saved).toHaveLength(0);
  });

  it("증상 보고가 한 번도 없으면(빈 결과) 알림 안 함", async () => {
    h.sessions = [{ inquiry_id: 42, updated_at: "2026-06-20T00:00:00Z" }];
    h.report = []; // 보고 없음
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.detected).toBe(0);
    expect(h.saved).toHaveLength(0);
  });
});
