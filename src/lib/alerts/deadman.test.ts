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

// 채점이 «있어야 할 자리»에 없는 것 (2026-08-28 2차 훑기에서 발견 → 2026-09-11 모수 교정)
// 모수는 판사 «호출 수»가 아니라 «채점 대상 답변 수»다. 이유는 아래 블록의 회귀 시험에 적었다.
describe("evaluateDeadman — 채점이 있어야 할 자리에 없다", () => {
  it("답변 77건에 채점 47건이면 warning", () => {
    const a = evaluateDeadman({ ...OK, aiReplies: 77, aiEvaluations: 47 });
    const hit = a.find((x) => x.key === "ai_judge_save_gap");
    expect(hit?.severity).toBe("warning");
    expect(hit?.details.savedPct).toBe(61);
    expect(hit?.details.aiReplies).toBe(77);
  });
  it("저장률이 높으면 조용", () => {
    const a = evaluateDeadman({ ...OK, aiReplies: 50, aiEvaluations: 48 });
    expect(a.some((x) => x.key === "ai_judge_save_gap")).toBe(false);
  });
  it("답변이 적으면(<10) 안 본다 — 표본 부족에선 비율이 요동친다", () => {
    const a = evaluateDeadman({ ...OK, aiReplies: 9, aiEvaluations: 1 });
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

// ⬇️ 이 블록이 이번 수정의 «존재 이유»다. 지우지 마라.
// 실서비스 경보 [ALERT:deadman_coverage] 7건(2026-09-05~09-10, Sentry JAVASCRIPT-NEXTJS-M)의
// 정체가 이것이었다: 판사 호출 기록(ai_usage_events)은 스레드를 참조하지 않아 영원히 남는데
// 채점 행(ai_response_evaluations)은 chat_threads 에 ON DELETE CASCADE 로 매달려 있어
// 점검 도구가 제 스레드를 치우면 «채점만» 사라진다. 그래서 호출을 모수로 쓰면 치울 때마다
// 유령 간극이 생긴다. 2026-09-11 실측(30일): 호출 215 vs 채점 대상 답변 82 — 호출이 모수의 2.6배.
describe("삭제된 스레드가 만든 유령 간극은 경보를 만들지 않는다 (반성문 #195 회귀)", () => {
  it("점검 스레드를 치워 호출만 잔뜩 남아도, 답변 대비 채점이 멀쩡하면 조용하다", () => {
    // 실환자 답변 20건 전부 채점됨. 그 위에 «치워진» 점검 대화의 호출 200건이 얹혀 있는 상황.
    const a = evaluateDeadman({ ...OK, aiReplies: 20, aiEvaluations: 20, aiJudgeCalls: 220 });
    expect(a.some((x) => x.key === "ai_judge_save_gap")).toBe(false);
  });
  it("거꾸로, 호출 기록이 통째로 없어도 답변 대비 채점이 비면 경보가 뜬다", () => {
    // 판사를 «부르지도 못한» 갈래(fire-and-forget 유실)는 호출 기록조차 안 남는다.
    // 옛 판정(호출 기준)은 이 부류를 원천적으로 못 봤다.
    const a = evaluateDeadman({ ...OK, aiReplies: 20, aiEvaluations: 5, aiJudgeCalls: 0 });
    const hit = a.find((x) => x.key === "ai_judge_save_gap");
    expect(hit?.details.savedPct).toBe(25);
  });
});
