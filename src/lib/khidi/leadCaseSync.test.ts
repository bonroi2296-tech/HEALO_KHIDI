import { describe, it, expect } from "vitest";
import { syncLeadStatusToCase, fmtKst } from "./leadCaseSync";

/**
 * 회귀 잠금(KHIDI-8): 병원 리드 '치료 확정(converted)' → inquiries.outcome='admitted' 자동집계.
 * 이 K-01 유치 숫자는 DB 트리거가 아니라 이 앱 로직이 결정하므로, 코드 변경 시 조용히
 * 미집계되지 않도록 계약을 테스트로 박는다. supabase 를 가짜로 주입(서버 의존 없음).
 */

// 가짜 supabase: 조회(.maybeSingle())는 canned, 쓰기(update/insert)는 calls 에 기록.
function makeFakeSupabase(opts: {
  caseStatus?: string | null;
  inquiryId?: number | null;
  normalizedId?: string | null;
} = {}) {
  const calls: Array<{ table: string; op: "update" | "insert"; payload: any; guardOutcomeNull: boolean }> = [];
  const canned: Record<string, any> = {
    hospital_leads: { normalized_inquiry_id: opts.normalizedId === undefined ? "norm-1" : opts.normalizedId },
    normalized_inquiries: { source_inquiry_id: opts.inquiryId === undefined ? 42 : opts.inquiryId },
    hospitals: { name: "테스트병원" },
    inquiries: { case_status: opts.caseStatus ?? null },
  };
  function builder(table: string) {
    const state: any = { op: null, payload: null, guard: false };
    const b: any = {
      select: () => b,
      eq: () => b,
      is: () => { state.guard = true; return b; },
      update: (payload: any) => { state.op = "update"; state.payload = payload; return b; },
      insert: (payload: any) => { calls.push({ table, op: "insert", payload, guardOutcomeNull: false }); state.op = "insert"; return b; },
      maybeSingle: () => Promise.resolve({ data: canned[table] ?? null, error: null }),
      // update/insert 체인은 maybeSingle 없이 await → thenable 로 결과 반환 + update 만 기록.
      then: (resolve: any) => {
        if (state.op === "update") calls.push({ table, op: "update", payload: state.payload, guardOutcomeNull: state.guard });
        resolve({ data: null, error: null });
      },
    };
    return b;
  }
  return { db: { from: (t: string) => builder(t) }, calls };
}

const NO_SLOTS: { at: string; note: string | null }[] = [];

describe("syncLeadStatusToCase — 병원 확정 → 유치 자동집계 (KHIDI-8 회귀잠금)", () => {
  it("'converted' 면 inquiries.outcome='admitted' 자동기록 + outcome IS NULL 가드 + 자동표시", async () => {
    const { db, calls } = makeFakeSupabase({ caseStatus: "hospital_review" });
    await syncLeadStatusToCase(db, "lead-1", "converted", "hosp-1", "user-1", { min: 100, max: 200 }, NO_SLOTS);

    const outcomeWrite = calls.find((c) => c.table === "inquiries" && c.payload?.outcome !== undefined);
    expect(outcomeWrite).toBeDefined();
    expect(outcomeWrite!.payload.outcome).toBe("admitted");
    // 코디 수동분과 구분(자동 배지)
    expect(outcomeWrite!.payload.outcome_updated_by).toBeNull();
    // 코디가 이미 정한 결정 보존 — outcome IS NULL 일 때만 쓰는 가드가 걸려 있어야 함
    expect(outcomeWrite!.guardOutcomeNull).toBe(true);
  });

  it("'replied' 는 유치(admitted) 자동집계 안 함 (case_status 메모만)", async () => {
    const { db, calls } = makeFakeSupabase({ caseStatus: "hospital_review" });
    await syncLeadStatusToCase(db, "lead-1", "replied", "hosp-1", "user-1", {}, NO_SLOTS);
    expect(calls.some((c) => c.payload?.outcome === "admitted")).toBe(false);
    // case_status 전진은 일어남(회신 시 preparation 으로)
    expect(calls.some((c) => c.table === "inquiries" && c.payload?.case_status === "preparation")).toBe(true);
  });

  it("'rejected' 도 유치 자동집계 안 함", async () => {
    const { db, calls } = makeFakeSupabase({ caseStatus: "hospital_review" });
    await syncLeadStatusToCase(db, "lead-1", "rejected", "hosp-1", "user-1", {}, NO_SLOTS);
    expect(calls.some((c) => c.payload?.outcome === "admitted")).toBe(false);
  });

  it("'viewed' 는 케이스에 아예 반영 안 함(쓰기 0)", async () => {
    const { db, calls } = makeFakeSupabase({ caseStatus: "hospital_review" });
    await syncLeadStatusToCase(db, "lead-1", "viewed", "hosp-1", "user-1", {}, NO_SLOTS);
    expect(calls.length).toBe(0);
  });

  it("리드에 연결된 의뢰가 없으면(normalized 없음) 아무 것도 안 씀", async () => {
    const { db, calls } = makeFakeSupabase({ normalizedId: null });
    await syncLeadStatusToCase(db, "lead-1", "converted", "hosp-1", "user-1", {}, NO_SLOTS);
    expect(calls.length).toBe(0);
  });

  it("normalized 에 원본 의뢰 id 가 없으면 아무 것도 안 씀", async () => {
    const { db, calls } = makeFakeSupabase({ inquiryId: null });
    await syncLeadStatusToCase(db, "lead-1", "converted", "hosp-1", "user-1", {}, NO_SLOTS);
    expect(calls.length).toBe(0);
  });
});

describe("fmtKst", () => {
  it("ISO 문자열을 KST 표기로", () => {
    expect(fmtKst("2026-06-25T05:00:00Z")).toContain("KST");
  });
  it("유효하지 않은 입력도 던지지 않고 문자열 반환", () => {
    expect(typeof fmtKst("not-a-date")).toBe("string");
  });
});
