/**
 * healwith: 사후관리 D+ 케이던스 — "이번 실행에서 뭘 해야 하나" 계산 (순수함수)
 *
 * dispatch-surveys cron 의 케이스 경로가 쓴다. D+0 앵커(사후관리 진입 시각) 기준으로
 * 기한이 도래한 단계 중 아직 안 한 것만 골라낸다:
 *   - 설문 단계(survey)      → 이메일 발송 대상. 멱등 키 = surveys.survey_type('fu_<phase>')
 *   - 비설문 단계(화상·복약·검사) → 환자 제안 + 직원 종 알림 대상. 멱등 키 = 'phase:action'
 *
 * 계산을 라우트에서 떼어 단위테스트로 고정하는 이유: 이 부류(설문·알림)는 "조용히 0건"이
 * 돼도 화면에 안 보인다 — surveyDispatchWindow·computeUnclosedNudge 와 같은 취지.
 */

import type { ScheduleStep } from "@/lib/followup/scheduler";

export interface CadencePlan {
  /** 이메일로 보낼 설문 단계 */
  surveysDue: Array<{ step: ScheduleStep; surveyType: string }>;
  /** 환자 제안 + 직원 알림을 만들 비설문 단계 */
  proposalsDue: Array<{ step: ScheduleStep; stepKey: string; dueAtIso: string }>;
}

/**
 * 설문 멱등 키(= surveys.survey_type). DB 유니크 인덱스 uniq_surveys_inquiry_type 과 한 쌍.
 * ponytail: phase 당 설문 1개 가정 — 같은 phase 에 설문이 2개인 암종 템플릿이 생기면
 * 뒤엣것이 조용히 눌린다(현재 템플릿엔 그런 조합 없음. 생기면 키에 daysFromTreatment 추가).
 */
export const cadenceSurveyType = (phase: string) => `fu_${phase}`;

/** 비설문 단계 멱등 키 — 같은 phase 에 화상+검사가 겹칠 수 있어 action 까지 포함(유방암 month_1). */
export const cadenceStepKey = (step: Pick<ScheduleStep, "phase" | "type">) =>
  `${step.phase}:${step.type}`;

const DAY_MS = 86_400_000;

export function computeCadencePlan(opts: {
  steps: ScheduleStep[];
  /** D+0 앵커(inquiries.followup_started_at) epoch ms */
  anchorMs: number;
  nowMs: number;
  /** 이 케이스에 이미 만들어진 surveys.survey_type 집합 */
  sentSurveyTypes: ReadonlySet<string>;
  /** 이 케이스에 이미 만든 케이던스 제안 키(phase:action) 집합 */
  firedStepKeys: ReadonlySet<string>;
}): CadencePlan {
  const plan: CadencePlan = { surveysDue: [], proposalsDue: [] };
  for (const step of opts.steps) {
    const dueMs = opts.anchorMs + step.daysFromTreatment * DAY_MS;
    if (opts.nowMs < dueMs) continue; // 아직 기한 전

    if (step.type === "survey") {
      const surveyType = cadenceSurveyType(step.phase);
      if (!opts.sentSurveyTypes.has(surveyType)) plan.surveysDue.push({ step, surveyType });
    } else {
      const stepKey = cadenceStepKey(step);
      if (!opts.firedStepKeys.has(stepKey))
        plan.proposalsDue.push({ step, stepKey, dueAtIso: new Date(dueMs).toISOString() });
    }
  }
  return plan;
}
