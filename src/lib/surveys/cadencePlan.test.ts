/**
 * 케이던스 계획 계산 단위테스트 — "조용히 0건/중복 발송" 두 실패 모드를 잠근다.
 * 스케줄 템플릿은 실제 scheduler.ts 의 것을 그대로 사용(계약이 어긋나면 여기서 깨져야 함).
 */
import { describe, it, expect } from "vitest";
import { createFollowupSchedule } from "@/lib/followup/scheduler";
import {
  computeCadencePlan,
  cadenceStepKey,
  cadenceSurveyType,
  buildSentSurveyTypes,
  duePhases,
  STALE_PENDING_MS,
} from "./cadencePlan";

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

describe("duePhases (교육 발송 단위)", () => {
  const steps = createFollowupSchedule("1", "stomach", anchorIso).schedule;

  it("D+0 엔 아직 도래한 단계가 없다", () => {
    expect(duePhases(steps, T0, T0)).toEqual([]);
  });

  it("D+7 엔 1주차만, D+40 엔 그 앞 단계들이 모두 나온다", () => {
    expect(duePhases(steps, T0, T0 + 7 * DAY)).toEqual(["week_1"]);
    const d40 = duePhases(steps, T0, T0 + 40 * DAY);
    expect(d40).toEqual(["week_1", "week_2", "month_1"]);
  });

  it("같은 단계에 여러 일정이 있어도 단계는 한 번만 나온다", () => {
    const dup = [...steps, ...steps];
    expect(duePhases(dup, T0, T0 + 400 * DAY)).toEqual(duePhases(steps, T0, T0 + 400 * DAY));
  });
});

describe("buildSentSurveyTypes", () => {
  const NOW = Date.parse("2026-07-24T12:00:00Z");
  const row = (over: Partial<Parameters<typeof buildSentSurveyTypes>[0][number]>) => ({
    id: "s1",
    survey_type: "fu_week_1",
    sent_at: "2026-07-20T00:00:00Z",
    created_at: "2026-07-20T00:00:00Z",
    ...over,
  });

  it("실발송된 케이던스 행은 집합에 들어간다", () => {
    const r = buildSentSurveyTypes([row({})], NOW);
    expect(r.types.has("fu_week_1")).toBe(true);
    expect(r.staleIds).toEqual([]);
  });

  it("🔁 P-2: 고아 pending(fu_*·sent_at null·2시간↑)은 '발송됨'이 아니라 삭제·재시도 대상", () => {
    const r = buildSentSurveyTypes(
      [row({ sent_at: null, created_at: new Date(NOW - STALE_PENDING_MS - 1000).toISOString() })],
      NOW
    );
    expect(r.types.has("fu_week_1")).toBe(false);
    expect(r.staleIds).toEqual(["s1"]);
  });

  it("방금 만든 pending(2시간 내)은 동시 실행 보호로 '발송됨' 취급 — 중복 발사 금지", () => {
    const r = buildSentSurveyTypes(
      [row({ sent_at: null, created_at: new Date(NOW - 60_000).toISOString() })],
      NOW
    );
    expect(r.types.has("fu_week_1")).toBe(true);
    expect(r.staleIds).toEqual([]);
  });

  it("🔁 P-1·P-4: 레거시·세션 설문(post_*)이 나간 케이스는 첫 차수(fu_week_1)를 접는다", () => {
    for (const legacy of ["post_followup", "post_consultation"]) {
      const r = buildSentSurveyTypes([row({ survey_type: legacy })], NOW);
      expect(r.types.has("fu_week_1")).toBe(true); // 동일 템플릿 메일 2통 방지
      expect(r.types.has("fu_month_3")).toBe(false); // 이후 차수는 정상 진행
    }
  });

  it("레거시 pending(sent_at null·비 fu_)은 삭제 대상이 아니다 — 케이던스 소유 행만 지운다", () => {
    const r = buildSentSurveyTypes(
      [row({ survey_type: "post_consultation", sent_at: null, created_at: new Date(NOW - 10 * STALE_PENDING_MS).toISOString() })],
      NOW
    );
    expect(r.staleIds).toEqual([]);
  });
});
