/**
 * 계약 회귀 테스트 — 증상 기반 재예약 (POST /api/khidi/rebooking/create)
 *
 * 과거 버그: 호출부(SymptomAlerts)가 inquiry_id 를 patientId 로 보내 uuid 컬럼에
 *   bigint 를 넣고, 스키마에 없는 컬럼(rebooking_source·parent_consultation_id)에
 *   insert 해 항상 500. 이 테스트가 inquiry_id 분리 저장 + 없는 컬럼 미사용을 잠근다.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/rateLimiter", () => ({
  defaultLimiter: { check: () => null },
}));
vi.mock("@/lib/api/sanitize", () => ({
  sanitizeString: (s: any) => (s == null ? "" : String(s)),
}));
vi.mock("@/lib/auth/checkAdminAuth", () => ({
  checkAdminAuth: vi.fn(async () => ({ userId: "admin-1", isAdmin: true })),
}));

const captured: { table?: string; insert?: any } = {};
vi.mock("@/lib/data/supabaseServerClient", () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      captured.table = table;
      return {
        insert: (rows: any[]) => {
          captured.insert = rows[0];
          return {
            select: () => ({
              single: async () => ({
                data: { id: "rebook-1", ...rows[0] },
                error: null,
              }),
            }),
          };
        },
      };
    },
  }),
}));

import { POST } from "./route";

function makeReq(body: any): any {
  return { json: async () => body, headers: { get: () => null } };
}

describe("재예약 생성 계약 — SymptomAlerts(inquiryId) → DB insert", () => {
  beforeEach(() => {
    captured.table = undefined;
    captured.insert = undefined;
  });

  it("inquiryId 를 inquiry_id(숫자)로 저장하고 patient_id 는 null", async () => {
    const res = await POST(
      makeReq({
        inquiryId: 42,
        source: "symptom",
        reason: "증상 악화",
        sessionType: "diagnostic",
        daysFromNow: 1,
      })
    );
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(captured.table).toBe("consultation_sessions");
    expect(captured.insert.inquiry_id).toBe(42);
    expect(captured.insert.patient_id).toBeNull();
  });

  it("스키마에 없는 컬럼(rebooking_source·parent_consultation_id)을 쓰지 않는다", async () => {
    await POST(
      makeReq({ inquiryId: 42, source: "symptom", reason: "x" })
    );
    expect(captured.insert).not.toHaveProperty("rebooking_source");
    expect(captured.insert).not.toHaveProperty("parent_consultation_id");
    // source 정보는 notes 로 보존
    expect(captured.insert.notes).toContain("symptom");
  });

  it("inquiry·patient 둘 다 없으면 400", async () => {
    const res = await POST(makeReq({ source: "symptom", reason: "x" }));
    expect(res.status).toBe(400);
  });

  it("유효한 환자 uuid 는 patient_id 로 저장된다", async () => {
    await POST(
      makeReq({
        patientId: "11111111-2222-3333-4444-555555555555",
        source: "doctor",
        reason: "x",
      })
    );
    expect(captured.insert.patient_id).toBe("11111111-2222-3333-4444-555555555555");
  });
});
