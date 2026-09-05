import { describe, it, expect } from "vitest";
import { evaluateDeadman, daysBetween } from "./deadman";

describe("daysBetween", () => {
  it("같은 날 = 0", () => expect(daysBetween("2026-06-24", "2026-06-24")).toBe(0));
  it("이틀 차 = 2", () => expect(daysBetween("2026-06-22", "2026-06-24")).toBe(2));
  it("월 경계 넘김", () => expect(daysBetween("2026-05-31", "2026-06-02")).toBe(2));
  it("파싱 불가 = NaN", () => expect(Number.isNaN(daysBetween("bad", "2026-06-24"))).toBe(true));
});

const OK = { todayKst: "2026-06-24", latestSnapshotDate: "2026-06-24", completedSessions: 5, surveysSent: 2 };

describe("evaluateDeadman — KPI 스냅샷", () => {
  it("최신이면 알림 없음", () => {
    expect(evaluateDeadman(OK)).toHaveLength(0);
  });
  it("스냅샷 없음 = critical", () => {
    const a = evaluateDeadman({ ...OK, latestSnapshotDate: null });
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ key: "kpi_snapshot_stale", severity: "critical" });
  });
  it("2일 밀림 = warning", () => {
    const a = evaluateDeadman({ ...OK, latestSnapshotDate: "2026-06-22" });
    expect(a[0]).toMatchObject({ key: "kpi_snapshot_stale", severity: "warning" });
    expect(a[0].details.lagDays).toBe(2);
  });
  it("1일 밀림 = 알림 없음(정상 지연)", () => {
    expect(evaluateDeadman({ ...OK, latestSnapshotDate: "2026-06-23" })).toHaveLength(0);
  });
  it("4일 이상 밀림 = critical", () => {
    const a = evaluateDeadman({ ...OK, latestSnapshotDate: "2026-06-20" });
    expect(a[0]).toMatchObject({ key: "kpi_snapshot_stale", severity: "critical" });
  });
});

describe("evaluateDeadman — 설문 발송 0", () => {
  it("완료 상담 있고 설문 0 = warning", () => {
    const a = evaluateDeadman({ ...OK, completedSessions: 4, surveysSent: 0 });
    expect(a.some((x) => x.key === "survey_dispatch_zero")).toBe(true);
  });
  it("설문 발송 있으면 알림 없음", () => {
    const a = evaluateDeadman({ ...OK, completedSessions: 4, surveysSent: 1 });
    expect(a.some((x) => x.key === "survey_dispatch_zero")).toBe(false);
  });
  it("완료 상담 적으면(<3) 알림 없음 — 데이터 부족이지 고장 아님", () => {
    const a = evaluateDeadman({ ...OK, completedSessions: 2, surveysSent: 0 });
    expect(a.some((x) => x.key === "survey_dispatch_zero")).toBe(false);
  });
  it("두 조건 동시 발화", () => {
    const a = evaluateDeadman({ todayKst: "2026-06-24", latestSnapshotDate: null, completedSessions: 9, surveysSent: 0 });
    expect(a).toHaveLength(2);
  });
});

// ── AI 챗 파수꾼 (2026-08-28 사고 후속) ──────────────────────────────
// 계기: 판사가 환각을 265건 찍었는데 235건(89%)이 무알림이었고, 8/12 이후로는 한 건도
// 안 갔다. 화면상 「정상」과 구별이 안 돼 PO 가 대화 로그를 눈으로 보고서야 드러났다.
describe("evaluateDeadman — AI 판사가 멈춤", () => {
  it("답변은 나가는데 채점 0 = critical", () => {
    const a = evaluateDeadman({ ...OK, aiReplies: 58, aiEvaluations: 0 });
    expect(a.some((x) => x.key === "ai_judge_zero" && x.severity === "critical")).toBe(true);
  });
  it("채점이 돌면 알림 없음", () => {
    const a = evaluateDeadman({ ...OK, aiReplies: 58, aiEvaluations: 45 });
    expect(a.some((x) => x.key === "ai_judge_zero")).toBe(false);
  });
  it("답변이 적으면(<10) 알림 없음 — 한산한 날이지 고장 아님", () => {
    const a = evaluateDeadman({ ...OK, aiReplies: 4, aiEvaluations: 0 });
    expect(a.some((x) => x.key === "ai_judge_zero")).toBe(false);
  });
});

describe("evaluateDeadman — 탐지는 되는데 통보가 안 됨", () => {
  it("문제 표시는 붙는데 코디 알림 0 = warning (2026-08-28 사고 재현)", () => {
    // 사고 당일 실측값 그대로: 최근 7일 채점 45건 중 표시 3건, 품질 알림 0건.
    const a = evaluateDeadman({ ...OK, aiReplies: 58, aiEvaluations: 45, aiFlagged: 3, aiQualityAlertsSent: 0 });
    expect(a.some((x) => x.key === "ai_quality_alert_zero")).toBe(true);
  });
  it("알림이 나가면 조용 — 통보가 살아 있다", () => {
    const a = evaluateDeadman({ ...OK, aiFlagged: 9, aiQualityAlertsSent: 4 });
    expect(a.some((x) => x.key === "ai_quality_alert_zero")).toBe(false);
  });
  it("표시가 적으면(<3) 알림 없음 — 표본 부족", () => {
    const a = evaluateDeadman({ ...OK, aiFlagged: 2, aiQualityAlertsSent: 0 });
    expect(a.some((x) => x.key === "ai_quality_alert_zero")).toBe(false);
  });
  it("AI 값을 안 넘기면 기존 판정만 돈다 — 옛 호출부가 안 깨진다", () => {
    expect(evaluateDeadman(OK)).toHaveLength(0);
  });
});

// 판사를 «불렀는데» 채점이 안 남는 것 (2026-08-28 2차 훑기에서 발견)
// 실측: 최근 이틀 판사 호출 77건 · 채점 저장 47건 = 39% 유실. 로그에만 남고 DB엔 흔적이 없었다.
describe("evaluateDeadman — 부르고도 결과를 잃는 중", () => {
  it("호출 77건에 저장 47건이면 warning (발견 당시 실측값)", () => {
    const a = evaluateDeadman({ ...OK, aiJudgeCalls: 77, aiEvaluations: 47 });
    const hit = a.find((x) => x.key === "ai_judge_save_gap");
    expect(hit?.severity).toBe("warning");
    expect(hit?.details.savedPct).toBe(61);
  });
  it("저장률이 높으면 조용", () => {
    const a = evaluateDeadman({ ...OK, aiJudgeCalls: 50, aiEvaluations: 48 });
    expect(a.some((x) => x.key === "ai_judge_save_gap")).toBe(false);
  });
  it("호출이 적으면(<20) 안 본다 — 표본 부족에선 비율이 요동친다", () => {
    const a = evaluateDeadman({ ...OK, aiJudgeCalls: 9, aiEvaluations: 1 });
    expect(a.some((x) => x.key === "ai_judge_save_gap")).toBe(false);
  });
  it("채점이 0이면 ai_judge_zero 쪽에 맡기고 여기선 안 울린다 — 중복 경보 방지", () => {
    const a = evaluateDeadman({ ...OK, aiReplies: 58, aiJudgeCalls: 40, aiEvaluations: 0 });
    expect(a.some((x) => x.key === "ai_judge_save_gap")).toBe(false);
    expect(a.some((x) => x.key === "ai_judge_zero")).toBe(true);
  });
  it("값을 안 넘기면 기존 판정만 돈다", () => {
    expect(evaluateDeadman(OK)).toHaveLength(0);
  });
});
