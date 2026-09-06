/**
 * 계약 회귀 테스트 — 코디 「종료(안 옴)」 (POST /api/coordinator/inquiries/[id]/outcome)
 * 잠그는 계약: staff 만 · outcome 은 lost/null 만 · 종료는 단계=보류까지 · 오류는 코드형만.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ calls: [] as any[], authOk: true, result: null as any }));

vi.mock("@/lib/auth/requirePortalAuth", () => ({
  requirePortalAuth: async () =>
    h.authOk
      ? { success: true, userId: "u1", email: "coord@healwith.co.kr", isAdmin: false, appRole: "coordinator" }
      : { success: false, response: Response.json({ ok: false, error: "unauthorized" }, { status: 401 }) },
}));
vi.mock("@/lib/rag/supabaseAdmin", () => ({ supabaseAdmin: { tag: "admin-client" } }));
vi.mock("@/lib/khidi/inquiryOutcome", () => ({
  setInquiryOutcome: async (db: any, input: any) => {
    h.calls.push({ db, input });
    if (h.result) return h.result;
    return { ok: true, caseStatus: input.outcome === "lost" ? "on_hold" : "consultation", caseStatusNote: input.outcome === "lost" ? (input.note || "종료(안 옴)") : undefined };
  },
}));

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (body: any) =>
  new Request("http://localhost/api/coordinator/inquiries/37/outcome", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;

beforeEach(() => { h.calls = []; h.authOk = true; h.result = null; });

describe("coordinator/outcome", () => {
  it("종료: setInquiryOutcome 을 holdOnLost 로 부르고 단계=보류를 돌려준다", async () => {
    const res = await POST(req({ outcome: "lost", note: "안 온다고 함" }), ctx("37"));
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j).toEqual({ ok: true, id: 37, outcome: "lost", case_status: "on_hold", case_status_note: "안 온다고 함", unchanged: false });
    expect(h.calls[0].input).toEqual({ inquiryId: 37, outcome: "lost", note: "안 온다고 함", userId: "u1", holdOnLost: true });
    expect(h.calls[0].db).toEqual({ tag: "admin-client" });
  });

  it("되돌리기: outcome null 도 받는다", async () => {
    const res = await POST(req({ outcome: null }), ctx("37"));
    expect((await res.json()).outcome).toBeNull();
  });

  it("admitted·이상한 값·빈 본문은 400 (유치 확정은 단계 전진으로만)", async () => {
    for (const body of [{ outcome: "admitted" }, { outcome: "closed" }, {}]) {
      const res = await POST(req(body), ctx("37"));
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect((await res.json()).error).toBe("invalid_body");
    }
    expect(h.calls).toHaveLength(0);
  });

  it("helper 오류는 코드형 상태로 — not_found 404 · already_arrived 409 · update_failed 500", async () => {
    for (const [error, status] of [["not_found", 404], ["already_arrived", 409], ["update_failed", 500]] as const) {
      h.result = { ok: false, error, caseStatus: error === "already_arrived" ? "treatment" : null };
      const res = await POST(req({ outcome: "lost" }), ctx("37"));
      expect(res.status, error).toBe(status);
      const j = await res.json();
      expect(j.error).toBe(error);
      expect(JSON.stringify(j)).not.toMatch(/message|stack/);
    }
  });

  it("id 가 숫자가 아니면 400, 인증 실패면 그 응답 그대로", async () => {
    expect((await POST(req({ outcome: "lost" }), ctx("abc"))).status).toBe(400);
    h.authOk = false;
    expect((await POST(req({ outcome: "lost" }), ctx("37"))).status).toBe(401);
    expect(h.calls).toHaveLength(0);
  });
});
