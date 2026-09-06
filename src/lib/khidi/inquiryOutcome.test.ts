import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ before: { case_status: "consultation", outcome: null } as any, updates: [] as any[], inserts: [] as any[], advance: [] as any[] }));

vi.mock("./advanceCaseStatus", () => ({
  advanceCaseStatus: async (_db: any, id: any, to: string, note: string, uid: any) => {
    h.advance.push({ id, to, note, uid });
    return { advanced: true, from: "consultation", to, ok: true };
  },
}));

import { setInquiryOutcome, isValidOutcome } from "./inquiryOutcome";

function fakeDb() {
  return {
    from: (table: string) => {
      const b: any = {};
      let op: any = null;
      b.select = () => b;
      b.eq = () => b;
      b.maybeSingle = async () => ({ data: h.before, error: null }); // before=null 이면 «없는 문의»
      b.update = (patch: any) => { op = { table, patch }; return b; };
      b.insert = async (row: any) => { h.inserts.push({ table, row }); return { error: null }; };
      b.then = (resolve: any) => { if (op) h.updates.push(op); return resolve({ error: null }); };
      return b;
    },
  };
}

beforeEach(() => { h.before = { case_status: "consultation", outcome: null }; h.updates = []; h.inserts = []; h.advance = []; });

describe("setInquiryOutcome — 결과 한 곳에서", () => {
  it("코디 「종료(안 옴)」: 결과=lost + 단계=보류 + 이력 «🚫 이탈 처리 — 메모»", async () => {
    const r = await setInquiryOutcome(fakeDb(), { inquiryId: 37, outcome: "lost", note: "  소견 전달 후 안 온다고 함 ", userId: "u1", holdOnLost: true });
    expect(r).toEqual({ ok: true, caseStatus: "on_hold", caseStatusNote: "소견 전달 후 안 온다고 함" });
    const outcomeUpdate = h.updates.find((u) => "outcome" in u.patch)!.patch;
    expect(outcomeUpdate.outcome).toBe("lost");
    expect(outcomeUpdate.outcome_note).toBe("소견 전달 후 안 온다고 함");
    expect(outcomeUpdate.outcome_updated_by).toBe("u1");
    const holdUpdate = h.updates.find((u) => u.patch.case_status === "on_hold")!.patch;
    expect(holdUpdate.case_status_note).toBe("소견 전달 후 안 온다고 함");
    expect(h.inserts[0].row).toMatchObject({ inquiry_id: 37, status: "on_hold", note: "🚫 이탈 처리 — 소견 전달 후 안 온다고 함", created_by: "u1" });
  });

  it("어드민 점수판(holdOnLost 없음): 단계는 그대로, 이력만", async () => {
    const r = await setInquiryOutcome(fakeDb(), { inquiryId: 37, outcome: "lost", userId: "u1" });
    expect(r.caseStatus).toBe("consultation");
    expect(h.updates.some((u) => u.patch.case_status === "on_hold")).toBe(false);
    expect(h.inserts[0].row.note).toBe("🚫 이탈 처리");
    expect(h.inserts[0].row.status).toBe("consultation");
  });

  it("이미 보류인 케이스를 종료하면 단계 갱신을 또 하지 않는다", async () => {
    h.before = { case_status: "on_hold", outcome: null };
    await setInquiryOutcome(fakeDb(), { inquiryId: 1, outcome: "lost", userId: "u1", holdOnLost: true });
    expect(h.updates.filter((u) => "case_status" in u.patch)).toHaveLength(0);
  });

  it("되돌리기(null): 종료였으면 «종료 취소», 유치였으면 «유치 취소»; 단계는 안 건드린다", async () => {
    h.before = { case_status: "on_hold", outcome: "lost" };
    let r = await setInquiryOutcome(fakeDb(), { inquiryId: 1, outcome: null, userId: "u1", holdOnLost: true });
    expect(r.caseStatus).toBe("on_hold");
    expect(h.inserts[0].row.note).toBe("↩️ 종료 취소 (다시 진행)");
    expect(h.updates.filter((u) => "case_status" in u.patch)).toHaveLength(0);

    h.before = { case_status: "treatment", outcome: "admitted" }; h.inserts = [];
    r = await setInquiryOutcome(fakeDb(), { inquiryId: 1, outcome: null, userId: "u1" });
    expect(h.inserts[0].row.note).toBe("↩️ 유치 취소 (집계 제외)");
  });

  it("admitted: 입국·치료로 전진(advanceCaseStatus)하고 이력은 그쪽이 남긴다", async () => {
    const r = await setInquiryOutcome(fakeDb(), { inquiryId: 5, outcome: "admitted", userId: "u2" });
    expect(r).toEqual({ ok: true, caseStatus: "treatment" });
    expect(h.advance).toEqual([{ id: 5, to: "treatment", note: "🎯 유치 확정", uid: "u2" }]);
    expect(h.inserts).toHaveLength(0);
  });

  it("없는 문의는 not_found — 0행 갱신을 성공으로 속이지 않는다", async () => {
    h.before = null;
    const r = await setInquiryOutcome(fakeDb(), { inquiryId: 999999, outcome: "lost", userId: "u1", holdOnLost: true });
    expect(r).toEqual({ ok: false, error: "not_found", caseStatus: null });
    expect(h.updates).toHaveLength(0);
    expect(h.inserts).toHaveLength(0);
  });

  it("이미 입국·치료 이후면 코디 종료(holdOnLost)는 already_arrived — 점수판(holdOnLost 없음)은 막지 않는다", async () => {
    for (const st of ["treatment", "follow_up", "completed"]) {
      h.before = { case_status: st, outcome: null }; h.updates = [];
      const r = await setInquiryOutcome(fakeDb(), { inquiryId: 1, outcome: "lost", userId: "u1", holdOnLost: true });
      expect(r, st).toEqual({ ok: false, error: "already_arrived", caseStatus: st });
      expect(h.updates).toHaveLength(0);
    }
    h.before = { case_status: "completed", outcome: null }; h.updates = [];
    const r = await setInquiryOutcome(fakeDb(), { inquiryId: 1, outcome: "lost", userId: "u1" });
    expect(r.ok).toBe(true);
    expect(r.caseStatus).toBe("completed");
  });

  it("같은 결과를 다시 보내면 이력·단계는 안 건드린다 — null→null 은 아무것도 안 쓰고, lost→lost 는 메모만", async () => {
    h.before = { case_status: "on_hold", outcome: null };
    let r = await setInquiryOutcome(fakeDb(), { inquiryId: 1, outcome: null, userId: "u1", holdOnLost: true });
    expect(r).toEqual({ ok: true, caseStatus: "on_hold", unchanged: true });
    expect(h.updates).toHaveLength(0);
    expect(h.inserts).toHaveLength(0);

    h.before = { case_status: "on_hold", outcome: "lost" };
    r = await setInquiryOutcome(fakeDb(), { inquiryId: 1, outcome: "lost", note: "새 메모", userId: "u1", holdOnLost: true });
    expect(r).toEqual({ ok: true, caseStatus: "on_hold", unchanged: true });
    expect(h.updates).toHaveLength(1);
    expect(h.updates[0].patch).toEqual(expect.objectContaining({ outcome_note: "새 메모" }));
    expect("outcome" in h.updates[0].patch).toBe(false);
    expect(h.inserts).toHaveLength(0);
  });

  it("허용 값은 admitted·lost·null 뿐", async () => {
    expect(isValidOutcome("closed")).toBe(false);
    const r = await setInquiryOutcome(fakeDb(), { inquiryId: 1, outcome: "closed" as any, userId: null });
    expect(r).toEqual({ ok: false, error: "invalid_outcome", caseStatus: null });
    expect(h.updates).toHaveLength(0);
  });
});
