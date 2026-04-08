/**
 * HEALO: Rebooking Engine
 *
 * 팔로업 스케줄, 증상 분석, 의사 권고에 기반한 재예약 자동 제안.
 * 기존 scheduler.ts와 symptomAnalyzer.ts를 재사용.
 */

import { getDueFollowups, type FollowupSchedule, type DueFollowup } from './scheduler';
import { analyzeSymptoms, type SymptomReport, type SymptomAnalysis } from './symptomAnalyzer';

export type RebookingSource = 'followup' | 'symptom' | 'doctor';

export interface RebookingEvaluation {
  shouldRebook: boolean;
  source: RebookingSource;
  reason: string;
  urgency: 'routine' | 'soon' | 'urgent';
  suggestedSessionType: 'follow_up' | 'emergency' | 'diagnostic';
  suggestedDaysFromNow: number;
  details?: {
    dueFollowup?: DueFollowup;
    symptomAnalysis?: SymptomAnalysis;
  };
}

/**
 * 팔로업 스케줄 기반 재예약 평가
 * video_call 액션이 도래한 경우 재예약 제안
 */
export function evaluateFromFollowup(
  schedules: FollowupSchedule[]
): RebookingEvaluation | null {
  const dueItems = getDueFollowups(schedules);

  // video_call 타입의 도래 항목 찾기
  const videoCallDue = dueItems.find(d => d.step.type === 'video_call');
  if (!videoCallDue) return null;

  const isOverdue = videoCallDue.overdueDays > 7;

  return {
    shouldRebook: true,
    source: 'followup',
    reason: isOverdue
      ? `팔로업 화상 상담이 ${videoCallDue.overdueDays}일 초과되었습니다 (${videoCallDue.step.title_ko})`
      : `팔로업 화상 상담 일정입니다 (${videoCallDue.step.title_ko})`,
    urgency: isOverdue ? 'soon' : 'routine',
    suggestedSessionType: 'follow_up',
    suggestedDaysFromNow: isOverdue ? 1 : 3,
    details: { dueFollowup: videoCallDue },
  };
}

/**
 * 증상 보고 기반 재예약 평가
 * schedule_followup 또는 escalate_doctor 액션이면 재예약 트리거
 */
export function evaluateFromSymptoms(
  report: SymptomReport
): RebookingEvaluation | null {
  const analysis = analyzeSymptoms(report);

  if (analysis.recommendedAction === 'emergency_refer') {
    return {
      shouldRebook: true,
      source: 'symptom',
      reason: `응급 증상 감지: ${analysis.flaggedSymptoms.join(', ')}`,
      urgency: 'urgent',
      suggestedSessionType: 'emergency',
      suggestedDaysFromNow: 0,
      details: { symptomAnalysis: analysis },
    };
  }

  if (analysis.recommendedAction === 'escalate_doctor') {
    return {
      shouldRebook: true,
      source: 'symptom',
      reason: `고위험 증상으로 의사 상담 필요 (위험도 ${(analysis.riskScore * 100).toFixed(0)}%)`,
      urgency: 'soon',
      suggestedSessionType: 'diagnostic',
      suggestedDaysFromNow: 1,
      details: { symptomAnalysis: analysis },
    };
  }

  if (analysis.recommendedAction === 'schedule_followup') {
    return {
      shouldRebook: true,
      source: 'symptom',
      reason: `증상 추가 확인 필요 (위험도 ${(analysis.riskScore * 100).toFixed(0)}%)`,
      urgency: 'routine',
      suggestedSessionType: 'follow_up',
      suggestedDaysFromNow: 5,
      details: { symptomAnalysis: analysis },
    };
  }

  return null;
}

/**
 * 의사 권고 기반 재예약 생성
 */
export function createDoctorRebooking(
  reason: string,
  sessionType: 'follow_up' | 'emergency' | 'diagnostic' = 'follow_up',
  daysFromNow: number = 7
): RebookingEvaluation {
  return {
    shouldRebook: true,
    source: 'doctor',
    reason,
    urgency: sessionType === 'emergency' ? 'urgent' : 'routine',
    suggestedSessionType: sessionType,
    suggestedDaysFromNow: daysFromNow,
  };
}

/**
 * 종합 재예약 평가 (팔로업 + 증상 모두 체크)
 * 가장 긴급한 결과 반환
 */
export function evaluateRebooking(
  schedules: FollowupSchedule[],
  latestReport?: SymptomReport
): RebookingEvaluation | null {
  const results: RebookingEvaluation[] = [];

  // 1. 팔로업 기반 체크
  const followupResult = evaluateFromFollowup(schedules);
  if (followupResult) results.push(followupResult);

  // 2. 증상 기반 체크
  if (latestReport) {
    const symptomResult = evaluateFromSymptoms(latestReport);
    if (symptomResult) results.push(symptomResult);
  }

  if (results.length === 0) return null;

  // 긴급도 순 정렬: urgent > soon > routine
  const urgencyOrder = { urgent: 0, soon: 1, routine: 2 };
  results.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return results[0];
}
