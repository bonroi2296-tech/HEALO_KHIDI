/**
 * KHIDI K-03 만족도 점수 환산 (순수 함수).
 *
 * kpi.ts 와 분리한 이유 2가지:
 *   1) kpi.ts 는 `import "server-only"` 라 vitest 에서 직접 임포트하면 throw 한다.
 *   2) Likert(1~5) → 100점 환산식(×20)이 kpi.ts 와 satisfaction/route.ts 에
 *      따로 복붙돼 있어 두 대시보드 숫자가 갈라질 위험이 있었다 → 여기로 단일화.
 *
 * 평가 직결: 이 환산식이 곧 중간평가 K-03(목표 90점) 점수다. 단일 소스 + 테스트로 고정.
 */

/** 설문 응답 한 건 (Q1~Q5, null/미응답은 0점 취급 — 기존 동작 보존) */
export interface SurveyScores {
  q1_score?: number | null;
  q2_score?: number | null;
  q3_score?: number | null;
  q4_score?: number | null;
  q5_score?: number | null;
}

/**
 * Likert 평균(1~5) → 100점 환산. 소수점 첫째 자리 반올림.
 * 예: 4.5 → 90, 3.0 → 60.
 */
export function likertTo100(avg5: number): number {
  return Math.round(avg5 * 20 * 10) / 10;
}

/**
 * 응답 배열 → 전체 만족도 100점 평균. 응답이 없으면 null.
 *
 * 계산: 각 응답의 Q1~Q5 평균(avg5)을 100점 환산(×20)한 뒤 응답들의 평균.
 * (kpi.ts 의 기존 로직과 수학적으로 동일 — null 점수는 0점으로 합산.)
 */
export function avgSatisfaction100(responses: SurveyScores[] | null | undefined): number | null {
  if (!responses || responses.length === 0) return null;
  const sum = responses.reduce((acc, r) => {
    const avg5 =
      ((r.q1_score ?? 0) +
        (r.q2_score ?? 0) +
        (r.q3_score ?? 0) +
        (r.q4_score ?? 0) +
        (r.q5_score ?? 0)) /
      5;
    return acc + avg5 * 20;
  }, 0);
  return Math.round((sum / responses.length) * 10) / 10;
}
