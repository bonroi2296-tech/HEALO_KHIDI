/**
 * KHIDI 공식 성과지표 목표 (8/27 중간평가 기준) — 단일 소스(SoR)
 *
 * 출처: docs/KHIDI_중간보고_베이스.md §2 (계획서 확정본)
 *   | 외국인환자 유치        | 12건  | (월1.5×8개월, KHIDI 최소 10 +20%) |
 *   | 사전상담·사후관리      | 120건 | (유치 12 × 10회: 사전5 + 사후5)   |
 *   | 환자 만족도            | 90점  | (100점 만점, KHIDI 최소 80 +10)   |
 *
 * ⚠️ 옛 값(유치 10 / 상담 80 / 만족도 80)이 여러 파일에 흩어져 있었음 → 여기로 통일.
 *    목표는 "사업 누적"(2026-04~11) 기준. 대시보드 달성률도 누적으로 산출해야 함.
 */
export const KHIDI_TARGETS = {
  /** K-01 외국인환자 유치 (inquiries.outcome='admitted') */
  attraction: 12,
  /** K-02+K-04 사전상담+사후관리 합산 (consultation_sessions 완료 건수) */
  consultAndCare: 120,
  /** K-03 환자 만족도 평균 (100점 환산) */
  satisfaction: 90,
} as const;

/** 사업 기간 (KST) */
export const PROJECT_START_DATE = "2026-04-01";
export const PROJECT_END_DATE = "2026-11-30";
