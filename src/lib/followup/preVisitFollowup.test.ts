import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/security/encryptionV2", () => ({ decryptMaybe: (v: any) => v, encryptStringNullable: (v: any) => v }));
vi.mock("@/lib/email/sendEmail", () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/notifications/inApp", () => ({ notifyStaffPreVisitSilent: vi.fn(async () => {}) }));
vi.mock("@/lib/siteUrl", () => ({ siteUrl: () => "https://healwith.co.kr" }));

import { planPreVisitAction, STALE_DAYS } from "./preVisitFollowup";

const DAY = 24 * 60 * 60 * 1000;
const base = {
  anchorMs: 0,
  donePhases: new Set<string>(),
  respondedSinceAnchor: false,
  outcome: null,
  caseStatus: "consultation",
};

describe("planPreVisitAction — 소견 뒤 방문 전 케이던스 판정", () => {
  it("D+3 전에는 아무것도 하지 않는다", () => {
    expect(planPreVisitAction({ ...base, nowMs: 2 * DAY })).toEqual({ send: null, skip: [], nudgeStaff: false });
  });

  it("D+3 이 되면 안부 한 통 — 코디 알림은 없다", () => {
    expect(planPreVisitAction({ ...base, nowMs: 3 * DAY })).toEqual({ send: "d3", skip: [], nudgeStaff: false });
  });

  it("D+14 무응답이면 결정 확인 메일 + 코디 알림", () => {
    const r = planPreVisitAction({ ...base, nowMs: 14 * DAY, donePhases: new Set(["d3"]) });
    expect(r).toEqual({ send: "d14", skip: [], nudgeStaff: true });
  });

  it("환자가 이미 말을 걸었으면 D+14·D+30 독촉은 보내지 않고 지나감으로만 기록한다", () => {
    const r = planPreVisitAction({ ...base, nowMs: 14 * DAY, donePhases: new Set(["d3"]), respondedSinceAnchor: true });
    expect(r).toEqual({ send: null, skip: ["d14"], nudgeStaff: false });
  });

  it("한 실행에 한 통만 — 여러 단계가 한꺼번에 도래하면 가장 늦은 단계만 보내고 아래는 지나감", () => {
    const r = planPreVisitAction({ ...base, nowMs: 16 * DAY });
    expect(r).toEqual({ send: "d14", skip: ["d3"], nudgeStaff: true });
  });

  it("도래한 지 STALE_DAYS 를 넘긴 단계는 보내지 않는다(도입 시점 옛 케이스 소급 발송 방지)", () => {
    const r = planPreVisitAction({ ...base, nowMs: (30 + STALE_DAYS + 1) * DAY });
    expect(r).toEqual({ send: null, skip: ["d3", "d14", "d30"], nudgeStaff: false });
  });

  it("결과가 정해졌거나(유치 확정·종료) 치료 단계면 대상이 아니다", () => {
    expect(planPreVisitAction({ ...base, nowMs: 5 * DAY, outcome: "admitted" }).send).toBeNull();
    expect(planPreVisitAction({ ...base, nowMs: 5 * DAY, outcome: "lost" }).send).toBeNull();
    expect(planPreVisitAction({ ...base, nowMs: 5 * DAY, caseStatus: "follow_up" }).send).toBeNull();
    expect(planPreVisitAction({ ...base, nowMs: 5 * DAY, caseStatus: "treatment" }).send).toBeNull();
  });

  it("이미 나간 단계는 다시 보내지 않는다(멱등)", () => {
    const r = planPreVisitAction({ ...base, nowMs: 31 * DAY, donePhases: new Set(["d3", "d14", "d30"]) });
    expect(r).toEqual({ send: null, skip: [], nudgeStaff: false });
  });
});
