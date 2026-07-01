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

/** 설문 응답 한 건 (Q1~Q5). null/미응답 문항은 평균에서 **제외**(0점 아님). */
export interface SurveyScores {
  q1_score?: number | null;
  q2_score?: number | null;
  q3_score?: number | null;
  q4_score?: number | null;
  q5_score?: number | null;
}

/** avgSatisfaction100 옵션 */
export interface SatisfactionOpts {
  /**
   * 최소 유효 응답 수. 실제 점수가 매겨진 응답이 이보다 적으면 null 반환
   * (표본 부족 — 응답 1~2건으로 K-03 만족도를 확정하지 않기 위함). 기본 0 = 가드 없음.
   */
  minResponses?: number;
}

/**
 * Likert 평균(1~5) → 100점 환산. 소수점 첫째 자리 반올림.
 * 예: 4.5 → 90, 3.0 → 60.
 */
export function likertTo100(avg5: number): number {
  return Math.round(avg5 * 20 * 10) / 10;
}

/**
 * 응답 배열 → 전체 만족도 100점 평균. 유효 응답이 없으면 null.
 *
 * 계산: 각 응답에서 **실제 점수가 매겨진 문항만** 평균(avg5) → 100점 환산(×20) →
 *   유효 응답들의 평균. 미응답(null) 문항은 0점이 아니라 **분모에서 제외**한다
 *   (부분응답을 0점으로 깎던 버그 수정 — KNOWN_ISSUES #9 / POSTMORTEMS 만족도).
 *   문항을 하나도 안 매긴 응답은 유효 응답에서 제외.
 *
 * @param opts.minResponses 유효 응답이 이보다 적으면 null(표본 부족). 기본 0=가드 없음.
 */
export function avgSatisfaction100(
  responses: SurveyScores[] | null | undefined,
  opts: SatisfactionOpts = {},
): number | null {
  if (!responses || responses.length === 0) return null;
  const per100: number[] = [];
  for (const r of responses) {
    const scores = [r.q1_score, r.q2_score, r.q3_score, r.q4_score, r.q5_score]
      .filter((s): s is number => s != null);
    if (scores.length === 0) continue; // 전부 미응답인 설문은 제외
    const avg5 = scores.reduce((a, b) => a + b, 0) / scores.length;
    per100.push(avg5 * 20);
  }
  if (per100.length === 0) return null;
  if (opts.minResponses && per100.length < opts.minResponses) return null; // 표본 부족
  const sum = per100.reduce((a, b) => a + b, 0);
  return Math.round((sum / per100.length) * 10) / 10;
}
