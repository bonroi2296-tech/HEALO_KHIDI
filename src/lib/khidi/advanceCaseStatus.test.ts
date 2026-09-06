import { describe, it, expect, vi } from "vitest";
import { advanceCaseStatus } from "./advanceCaseStatus";

/**
 * 2026-08-14 감사: Supabase 는 실패를 throw 하지 않고 { error } 로 «돌려준다».
 * 예전엔 그 error 를 한 번도 안 읽어서, 저장이 실패해도 advanced:true 를 돌려주고
 * 흔적조차 안 남았다 — 상담·유치는 저장됐는데 단계만 조용히 정체.
 * 이 시험이 「실패를 성공으로 속이지 않는다」를 잠근다.
 */

/** 최소 Supabase 흉내 — select 는 현재 단계, update/insert 는 주어진 error 를 돌려준다. */
function fakeDb(current: string | null, errs: { update?: any; insert?: any } = {}) {
  return {
    from() {
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { case_status: current } }) }) }),
        update: () => ({ eq: async () => ({ error: errs.update ?? null }) }),
        insert: async () => ({ error: errs.insert ?? null }),
      };
    },
  } as any;
}

describe("advanceCaseStatus — 저장 실패를 성공으로 속이지 않는다", () => {
  it("정상 저장이면 advanced:true / ok:true", async () => {
    const r = await advanceCaseStatus(fakeDb("inquiry"), 1, "consultation", "메모");
    expect(r.advanced).toBe(true);
    expect(r.ok).toBe(true);
    expect(r.to).toBe("consultation");
    expect(r.errors).toEqual([]);
  });

  it("단계 저장이 실패하면 advanced:false + ok:false + 사유", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await advanceCaseStatus(fakeDb("inquiry", { update: { message: "column missing" } }), 1, "consultation", "메모");
    expect(r.ok).toBe(false);
    expect(r.advanced).toBe(false);   // ← 예전엔 여기가 true 였다(거짓 성공)
    expect(r.to).toBe("inquiry");     // 단계가 안 올라갔으니 원래 값
    expect(r.errors.join()).toContain("column missing");
    expect(spy).toHaveBeenCalled();   // 조용히 넘어가지 않는다
    spy.mockRestore();
  });

  it("이력 기록이 실패해도 ok:false 로 알린다", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await advanceCaseStatus(fakeDb("inquiry", { insert: { message: "history table gone" } }), 1, "consultation", "메모");
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toContain("history table gone");
    spy.mockRestore();
  });

  it("뒤로 가는 요청은 단계를 안 내린다(기존 가드 유지)", async () => {
    const r = await advanceCaseStatus(fakeDb("treatment"), 1, "consultation", "메모");
    expect(r.advanced).toBe(false);
    expect(r.ok).toBe(true);          // 실패가 아니라 «전진 대상이 아님»
    expect(r.to).toBe("treatment");
  });
});

describe("advanceCaseStatus — «보류»는 단계가 아니라 멈춤", () => {
  it("보류(on_hold)에서 유치 확정하면 입국·치료로 올라간다(순서 99 를 «지난 단계»로 읽지 않는다)", async () => {
    const r = await advanceCaseStatus(fakeDb("on_hold"), 37, "treatment", "🎯 유치 확정", "u1");
    expect(r.advanced).toBe(true);
    expect(r.to).toBe("treatment");
    expect(r.ok).toBe(true);
  });
});
