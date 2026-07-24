/**
 * 케이던스 계획 계산 단위테스트 — "조용히 0건/중복 발송" 두 실패 모드를 잠근다.
 * 스케줄 템플릿은 실제 scheduler.ts 의 것을 그대로 사용(계약이 어긋나면 여기서 깨져야 함).
 */
import { describe, it, expect } from "vitest";
import { createFollowupSchedule } from "@/lib/followup/scheduler";
import { computeCadencePlan, cadenceStepKey, cadenceSurveyType } from "./cadencePlan";

const DAY = 86_400_000;
const T0 = Date.parse("2026-07-01T00:00:00Z");
const anchorIso = new Date(T0).toISOString();

function plan(nowOffsetDays: number, sent: string[] = [], fired: string[] = [], cancer = "unspecified") {
  const s = createFollowupSchedule("1", cancer, anchorIso);
  return computeCadencePlan({
    steps: s.schedule,
    anchorMs: T0,
    nowMs: T0 + nowOffsetDays * DAY,
    sentSurveyTypes: new Set(sent),
    firedStepKeys: new Set(fired),
  });
}

describe("computeCadencePlan", () => {
  it("앵커 직후(D+0)에는 아무것도 발사되지 않는다 — 첫 실행 폭주 방지", () => {
    const p = plan(0);
    expect(p.surveysDue).toHaveLength(0);
    expect(p.proposalsDue).toHaveLength(0);
  });

  it("D+7 에 1주차 설문(fu_week_1)만 나온다", () => {
    const p = plan(7);
    expect(p.surveysDue.map((x) => x.surveyType)).toEqual(["fu_week_1"]);
    expect(p.proposalsDue).toHaveLength(0);
  });

  it("이미 나간 차수는 다시 나오지 않는다 (멱등)", () => {
    const p = plan(7, ["fu_week_1"]);
    expect(p.surveysDue).toHaveLength(0);
  });

  it("D+90 에 미발송분이 소급된다: fu_week_1·fu_month_3 + 복약(D+14)·화상(D+30) 제안", () => {
    const p = plan(90);
    expect(p.surveysDue.map((x) => x.surveyType).sort()).toEqual(["fu_month_3", "fu_week_1"]);
    expect(p.proposalsDue.map((x) => x.stepKey).sort()).toEqual([
      "month_1:video_call",
      "week_2:medication_check",
    ]);
  });

  it("이미 만든 제안(phase:action)은 다시 만들지 않는다 (멱등)", () => {
    const p = plan(30, [], ["week_2:medication_check"]);
    expect(p.proposalsDue.map((x) => x.stepKey)).toEqual(["month_1:video_call"]);
  });

  it("유방암: 같은 phase(month_1)의 화상(D+30)·검사리뷰(D+45)가 각각 구분돼 나온다", () => {
    const p = plan(45, ["fu_week_1"], [], "breast");
    expect(p.proposalsDue.map((x) => x.stepKey).sort()).toEqual([
      "month_1:lab_review",
      "month_1:video_call",
      "week_2:medication_check",
    ]);
  });

  it("위암: week_2 에 추가 설문(D+10)이 있어도 기본 복약확인(D+14)과 키가 안 겹친다", () => {
    const p = plan(14, [], [], "stomach");
    // D+10 설문(fu_week_2) + D+7 설문(fu_week_1) + D+14 복약 제안
    expect(p.surveysDue.map((x) => x.surveyType).sort()).toEqual(["fu_week_1", "fu_week_2"]);
    expect(p.proposalsDue.map((x) => x.stepKey)).toEqual(["week_2:medication_check"]);
  });

  it("키 헬퍼 계약: fu_<phase> / phase:action", () => {
    expect(cadenceSurveyType("month_6")).toBe("fu_month_6");
    expect(cadenceStepKey({ phase: "month_1", type: "video_call" })).toBe("month_1:video_call");
  });
});
