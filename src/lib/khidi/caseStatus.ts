/**
 * 케이스(환자 유치) 진행 상황 단계 — 단일 정의
 * 코디가 설정하고, 환자·에이전시가 확인. 카자흐 에이전시 요구(병원 응답 느림 → 단계 가시성).
 */

export const CASE_STATUS_STEPS = [
  { key: "received", ko: "문의 접수", order: 1 },
  { key: "pre_consult", ko: "사전상담 진행", order: 2 },
  { key: "hospital_review", ko: "병원 치료가능 검토 중", order: 3 },
  { key: "scheduling", ko: "치료 일정·견적 조율 중", order: 4 },
  { key: "visa_prep", ko: "비자·예약 준비", order: 5 },
  { key: "treatment", ko: "입국·치료 중", order: 6 },
  { key: "follow_up", ko: "사후관리 중", order: 7 },
  { key: "completed", ko: "완료", order: 8 },
  { key: "on_hold", ko: "보류", order: 99 },
] as const;

export type CaseStatusKey = (typeof CASE_STATUS_STEPS)[number]["key"];

export const CASE_STATUS_KEYS: string[] = CASE_STATUS_STEPS.map((s) => s.key);

export function caseStatusLabel(key?: string | null): string {
  if (!key) return "미설정";
  return CASE_STATUS_STEPS.find((s) => s.key === key)?.ko || key;
}

export function caseStatusOrder(key?: string | null): number {
  if (!key) return 0;
  return CASE_STATUS_STEPS.find((s) => s.key === key)?.order || 0;
}
