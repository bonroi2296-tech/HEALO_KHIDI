/**
 * 유치 전환 깔때기(conversion funnel) 순수 계산 헬퍼.
 *
 * conversion-funnel/route.ts 에서 추출: 라우트 파일은 vitest 로 직접 테스트하기
 * 까다롭고(Next 핸들러 export 규약), 전환율·PII 마스킹은 평가 숫자/개인정보에
 * 직접 영향이라 순수 함수로 떼어 테스트로 고정한다.
 */

/**
 * 전환율(%) = num/den × 100, 소수점 첫째 자리 반올림. 분모 0이면 0.
 * 예: pct(1, 3) → 33.3, pct(0, 0) → 0.
 */
export function pct(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 1000) / 10 : 0;
}

/**
 * 이름 마스킹: 첫 글자 + *** (PII 최소 노출). 이름이 없으면 "(이름 없음)".
 * 예: maskName("Aigerim", "Nur") → "A***", maskName("", "") → "(이름 없음)".
 */
export function maskName(first?: string | null, last?: string | null): string {
  const n = `${(first || "").trim()} ${(last || "").trim()}`.trim();
  if (!n) return "(이름 없음)";
  const head = [...n][0] || "";
  return `${head}***`;
}
