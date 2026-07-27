/**
 * 계약 회귀 테스트 — 증상 기반 재예약 (POST /api/khidi/rebooking/create)
 *
 * 과거 버그 ①: 호출부(SymptomAlerts)가 inquiry_id 를 patientId 로 보내 uuid 컬럼에
 *   bigint 를 넣고, 스키마에 없는 컬럼(rebooking_source 등)에 insert 해 항상 500.
 * 과거 버그 ②: 엔진이 consultation_sessions(화상세션)에 써서 환자 재진화면(followup_schedules)
 *   이 항상 비었음. 이 테스트가 정식 테이블(followup_schedules) 기록 + 환자 노출키
 *   (patient_user_id) + cancer_type NOT NULL 충족을 잠근다.
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

// inquiry 행을 테스트가 주입(cancer_type·user_id 연결 검증용)
let inquiryRow: any = { cancer_type: "stomach", user_id: null };
const captured: { table?: string; insert?: any } = {};
vi.mock("@/lib/data/supabaseServerClient", () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table === "inquiries") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: inquiryRow, error: null }) }),
          }),
        };
      }
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

describe("재예약 생성 계약 — SymptomAlerts(inquiryId) → followup_schedules", () => {
  beforeEach(() => {
    captured.table = undefined;
    captured.insert = undefined;
    inquiryRow = { cancer_type: "stomach", user_id: null };
  });

  it("정식 테이블 followup_schedules 에 inquiry_id(숫자)로 제안을 쓴다", async () => {
    const res = await POST(
      makeReq({
        inquiryId: 42,
        source: "symptom",
        reason: "증상 악화",
        // "diagnostic" 은 DB CHECK 가 안 받는 값이었다 — mock DB 라 이 테스트가 통과했을 뿐
        // 실서비스에선 insert 가 깨졌다(2026-07-27). 유효한 값으로 교체.
        sessionType: "pre_consultation",
        daysFromNow: 1,
      })
    );
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(captured.table).toBe("followup_schedules");
    expect(captured.insert.inquiry_id).toBe(42);
    expect(captured.insert.status).toBe("proposed");
  });

  it("DB 가 안 받는 session_type 은 400 으로 막는다 (mock DB 라 통과하던 구멍)", async () => {
    const res = await POST(
      makeReq({ inquiryId: 42, source: "symptom", reason: "x", sessionType: "diagnostic" })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("inquiry 에서 cancer_type·user_id 를 끌어와 환자에 연결한다", async () => {
    inquiryRow = { cancer_type: "lung", user_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" };
    await POST(makeReq({ inquiryId: 7, source: "symptom", reason: "x" }));
    expect(captured.insert.cancer_type).toBe("lung");
    expect(captured.insert.patient_user_id).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
  });

  it("cancer_type 이 전혀 없으면 NOT NULL 위반 방지로 'unspecified'", async () => {
    inquiryRow = { cancer_type: null, user_id: null };
    await POST(makeReq({ inquiryId: 7, source: "symptom", reason: "x" }));
    expect(captured.insert.cancer_type).toBe("unspecified");
  });

  it("스키마에 없는 컬럼(rebooking_source·parent_consultation_id·patient_id)을 쓰지 않는다", async () => {
    await POST(makeReq({ inquiryId: 42, source: "symptom", reason: "x" }));
    expect(captured.insert).not.toHaveProperty("rebooking_source");
    expect(captured.insert).not.toHaveProperty("parent_consultation_id");
    expect(captured.insert).not.toHaveProperty("patient_id");
    // source 정보는 schedule(Json)에 보존
    expect(captured.insert.schedule.source).toBe("symptom");
  });

  it("inquiry·patient 둘 다 없으면 400", async () => {
    const res = await POST(makeReq({ source: "symptom", reason: "x" }));
    expect(res.status).toBe(400);
  });

  it("유효한 환자 uuid 는 patient_user_id 로 저장된다", async () => {
    await POST(
      makeReq({
        patientId: "11111111-2222-3333-4444-555555555555",
        source: "doctor",
        reason: "x",
      })
    );
    expect(captured.insert.patient_user_id).toBe("11111111-2222-3333-4444-555555555555");
  });
});
