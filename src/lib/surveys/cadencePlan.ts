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

/** insert 후 crash 로 남은 고아 pending 을 "발송됨"으로 오인하지 않기 위한 유예(동시 실행 보호 겸). */
export const STALE_PENDING_MS = 2 * 3_600_000;

export interface SurveyRowLike {
  id: string;
  survey_type: string | null;
  sent_at: string | null;
  created_at: string | null;
}

/**
 * 케이스의 surveys 행들 → 케이던스 멱등 판정용 "이미 나간 차수" 집합.
 *
 * - 고아 pending(fu_* 인데 sent_at null + 생성 2시간↑): 발송된 적 없음 → 집합에서 빼고
 *   staleIds 로 반환(호출부가 지우고 이번 실행이 재발송) — 안 그러면 행 존재 가드에 걸려
 *   그 차수가 영구 침묵한다(독립 리뷰 P-2).
 * - 레거시·세션 설문(post_consultation/post_followup 등 fu_ 밖 타입)이 이미 나간 케이스는
 *   첫 차수(fu_week_1)를 접는다 — 설문 이메일 템플릿에 차수 구분이 없어 같은 메일 2통이
 *   된다(독립 리뷰 P-1·P-4). 이후 차수(D+90~)는 정상 진행.
 */
export function buildSentSurveyTypes(
  rows: SurveyRowLike[],
  nowMs: number
): { types: Set<string>; staleIds: string[] } {
  const types = new Set<string>();
  const staleIds: string[] = [];
  for (const r of rows) {
    const t = r.survey_type || "";
    const createdMs = r.created_at ? new Date(r.created_at).getTime() : NaN;
    if (
      t.startsWith("fu_") &&
      !r.sent_at &&
      Number.isFinite(createdMs) &&
      nowMs - createdMs > STALE_PENDING_MS
    ) {
      staleIds.push(r.id);
      continue;
    }
    if (t) types.add(t);
  }
  if ([...types].some((t) => !t.startsWith("fu_"))) types.add(cadenceSurveyType("week_1"));
  return { types, staleIds };
}

/**
 * 기한이 도래한 단계의 phase 목록(중복 제거, 일정 순서 유지).
 *
 * 교육 콘텐츠 발송이 이걸 쓴다 — 설문·제안과 달리 교육은 «단계»가 단위다(한 단계에
 * 투약·식단·경고징후가 함께 붙는다). computeCadencePlan 의 결과를 재활용하지 않는 이유:
 * 그건 «아직 안 한 것»만 담아서, 설문이 이미 나간 단계의 교육이 영영 안 나간다.
 */
export function duePhases(
  steps: ScheduleStep[],
  anchorMs: number,
  nowMs: number
): string[] {
  const out: string[] = [];
  for (const s of steps) {
    if (nowMs < anchorMs + s.daysFromTreatment * DAY_MS) continue;
    if (!out.includes(s.phase)) out.push(s.phase);
  }
  return out;
}

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
