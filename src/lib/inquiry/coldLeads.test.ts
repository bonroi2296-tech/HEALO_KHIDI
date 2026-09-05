import { describe, it, expect } from "vitest";
import {
  formatColdLeadLine,
  isActiveLead,
  lastActivityMs,
  latestFollowUpAt,
  selectColdLeads,
} from "./coldLeads";

const DAY = 86_400_000;
const NOW = Date.parse("2026-09-05T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * DAY).toISOString();

describe("lastActivityMs — 마지막 움직임은 여러 시각 중 «가장 최근»", () => {
  it("상태 시각·후속 글·이력·상담 중 최근 것을 고른다", () => {
    const ms = lastActivityMs({
      id: 1,
      created_at: daysAgo(30),
      case_status_updated_at: daysAgo(20),
      follow_ups: [{ at: daysAgo(25) }, { at: daysAgo(3), removed_at: daysAgo(2) }],
      last_history_at: daysAgo(10),
      last_session_at: daysAgo(15),
    });
    expect(ms).toBe(Date.parse(daysAgo(3)));
  });
  it("시각이 하나도 없으면 null", () => {
    expect(lastActivityMs({ id: 2, created_at: null })).toBeNull();
  });
  it("후속 글 배열이 아니거나 at 이 깨져도 죽지 않는다", () => {
    expect(latestFollowUpAt(null)).toBeNull();
    expect(latestFollowUpAt([{ at: "not a date" }, { at: daysAgo(1) }])).toBe(Date.parse(daysAgo(1)));
  });
});

describe("isActiveLead — 유치 «전» 진행 중인 것만", () => {
  it("시험·결과 있음·보류/종결/유치 단계는 뺀다", () => {
    expect(isActiveLead({ id: 1, created_at: daysAgo(1), is_test: true })).toBe(false);
    expect(isActiveLead({ id: 2, created_at: daysAgo(1), outcome: "lost" })).toBe(false);
    expect(isActiveLead({ id: 3, created_at: daysAgo(1), case_status: "on_hold" })).toBe(false);
    expect(isActiveLead({ id: 4, created_at: daysAgo(1), case_status: "Admitted" })).toBe(false);
  });
  it("단계가 비어 있는 새 문의도 활성이다(제일 먼저 식는 건)", () => {
    expect(isActiveLead({ id: 5, created_at: daysAgo(1), case_status: null })).toBe(true);
    expect(isActiveLead({ id: 6, created_at: daysAgo(1), case_status: "consultation" })).toBe(true);
  });
});

describe("selectColdLeads — 2026-09-05 실측 모양을 그대로 재현", () => {
  const rows = [
    // 상담 단계, 24일 무동작 → 식음
    { id: 93, created_at: daysAgo(26), case_status: "consultation", case_status_updated_at: daysAgo(24), last_history_at: daysAgo(24) },
    // 사전상담 뒤 32일 → 식음
    { id: 60, created_at: daysAgo(35), case_status: "consultation", case_status_updated_at: daysAgo(32), follow_ups: [{ at: daysAgo(33) }], last_session_at: daysAgo(33) },
    // 환자가 이틀 전에 글 남김 → 아직 안 식음
    { id: 302, created_at: daysAgo(2), case_status: null, follow_ups: [{ at: daysAgo(1) }] },
    // 보류(종결) → 안 센다
    { id: 94, created_at: daysAgo(26), case_status: "on_hold", case_status_updated_at: daysAgo(3) },
    // PO 가 3일 전에 단계 바꿈 → 안 식음
    { id: 291, created_at: daysAgo(3), case_status: "consultation", case_status_updated_at: daysAgo(2) },
    // 시험 → 안 센다
    { id: 999, created_at: daysAgo(90), is_test: true },
  ];
  it("7일 기준으로 93·60 만 잡고, 오래 멈춘 순으로 준다", () => {
    const cold = selectColdLeads(rows, NOW, 7);
    expect(cold.map((c) => [c.id, c.days])).toEqual([[60, 32], [93, 24]]);
  });
  it("기준을 40일로 올리면 0건", () => {
    expect(selectColdLeads(rows, NOW, 40)).toEqual([]);
  });
  it("알림 한 줄엔 번호·일수만, 10건 넘으면 «외 N건»", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, days: 30 - i, lastActivityAt: "", caseStatus: null }));
    const line = formatColdLeadLine(many);
    expect(line.startsWith("#1(30일) · #2(29일)")).toBe(true);
    expect(line.endsWith("외 2건")).toBe(true);
    expect(line).not.toMatch(/#11\(/);
  });
});
