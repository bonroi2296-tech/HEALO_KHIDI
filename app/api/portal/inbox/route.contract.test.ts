/**
 * 계약 회귀 테스트 — 코디 인박스 목록 (GET /api/portal/inbox)
 *
 * 잠그는 계약: 환자가 «진행상황 링크»로 남긴 글을 직원이 아직 안 봤으면 patient_unread_since 가 그 시각이고,
 * 글 «뒤»에 상세를 열었거나(감사로그 VIEW_INQUIRY) 직원 글을 붙였으면 null 이다. 본문은 응답에 안 나간다.
 * (2026-09-05: 환자 글이 왔는데 목록 어디에도 안 떠서 열람 0·답 0 으로 이틀이 갔다.)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BY_PATIENT_LINK } from "@/lib/inquiry/patientMessages";

const h = vi.hoisted(() => ({
  inquiries: [] as any[],
  views: [] as any[],
  auditCalls: 0,
}));

vi.mock("@/lib/auth/requirePortalAuth", () => ({
  requirePortalAuth: async () => ({ success: true, userId: "u1", email: "coord@healwith.co.kr", isAdmin: false, appRole: "coordinator" }),
}));
vi.mock("@/lib/security/encryptionV2", () => ({
  decryptStringNullable: (v: any) => (v ? String(v).replace(/^enc:/, "") : null),
}));
vi.mock("@/lib/rag/supabaseAdmin", () => {
  const makeBuilder = (getResult: () => any) => {
    const builder: any = {};
    for (const m of ["select", "not", "eq", "gte", "in", "order", "limit", "overlaps"]) builder[m] = () => builder;
    builder.then = (resolve: any) => resolve(getResult());
    return builder;
  };
  return {
    supabaseAdmin: {
      from: (table: string) => {
        if (table === "inquiries") return makeBuilder(() => ({ data: h.inquiries, error: null, count: 0 }));
        if (table === "admin_audit_logs") {
          h.auditCalls += 1;
          return makeBuilder(() => ({ data: h.views, error: null }));
        }
        return makeBuilder(() => ({ data: [], error: null, count: 0 }));
      },
    },
  };
});

import { GET } from "./route";

const T = (h_: number) => new Date(Date.UTC(2026, 8, 4, h_)).toISOString();
const req = () => new Request("http://localhost/api/portal/inbox") as any;
const base = (id: number, extra: any = {}) => ({
  id, created_at: T(0), status: "received", case_status: "consultation", first_name: "enc:А", last_name: "enc:Б",
  is_test: false, follow_ups: null, ...extra,
});

beforeEach(() => {
  h.inquiries = [];
  h.views = [];
  h.auditCalls = 0;
});

describe("portal/inbox — 환자 새 글 안 읽음", () => {
  it("환자 글 뒤에 아무도 안 열었으면 patient_unread_since = 글 시각, 본문은 안 나간다", async () => {
    h.inquiries = [
      base(302, { follow_ups: [{ id: "a", at: T(9), by: BY_PATIENT_LINK, text_encrypted: "enc:비밀" }] }),
      base(291),
    ];
    const res = await GET(req());
    const j = await res.json();
    expect(j.ok).toBe(true);
    const r302 = j.items.find((x: any) => x.id === 302);
    expect(r302.patient_note_at).toBe(T(9));
    expect(r302.patient_unread_since).toBe(T(9));
    expect(JSON.stringify(j)).not.toContain("비밀");
    expect(JSON.stringify(j)).not.toContain("follow_ups");
    expect(j.items.find((x: any) => x.id === 291).patient_unread_since).toBeNull();
  });

  it("글 «뒤»에 상세를 열었으면(VIEW_INQUIRY) 읽음, «앞»에만 열었으면 안 읽음", async () => {
    h.inquiries = [
      base(1, { follow_ups: [{ at: T(9), by: BY_PATIENT_LINK, text_encrypted: "x" }] }),
      base(2, { follow_ups: [{ at: T(9), by: BY_PATIENT_LINK, text_encrypted: "x" }] }),
    ];
    h.views = [
      { inquiry_ids: [1], created_at: T(10) },
      { inquiry_ids: [2, 999], created_at: T(8) },
    ];
    const j = await (await GET(req())).json();
    expect(j.items.find((x: any) => x.id === 1).patient_unread_since).toBeNull();
    expect(j.items.find((x: any) => x.id === 2).patient_unread_since).toBe(T(9));
  });

  it("직원 글이 뒤에 붙었으면 읽음 · 환자가 치운 글은 새 글이 아니다 · 환자 글 없으면 감사로그를 안 부른다", async () => {
    h.inquiries = [
      base(1, { follow_ups: [{ at: T(9), by: BY_PATIENT_LINK, text_encrypted: "x" }, { at: T(11), by: "coord@healwith.co.kr", text_encrypted: "y" }] }),
      base(2, { follow_ups: [{ at: T(9), by: BY_PATIENT_LINK, text_encrypted: "x", removed_at: T(10) }] }),
    ];
    const j = await (await GET(req())).json();
    expect(j.items.find((x: any) => x.id === 1).patient_unread_since).toBeNull();
    expect(j.items.find((x: any) => x.id === 2).patient_note_at).toBeNull();
    expect(h.auditCalls).toBe(1); // 1번 문의 때문에 한 번은 부른다

    h.inquiries = [base(3)];
    h.auditCalls = 0;
    await GET(req());
    expect(h.auditCalls).toBe(0);
  });
});
