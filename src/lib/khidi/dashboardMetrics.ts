/**
 * KHIDI KPI 대시보드 표시용 순수 계산 (달성률·진척률·분포 %).
 *
 * 왜 분리: 이 퍼센트들이 곧 8/27 중간평가위원이 보는 "달성률"이다(유치 4/12→33%,
 * 상담+사후 12/120→10% 등). 기존엔 kpi-dashboard/page.jsx 안에 인라인 산술로 흩어져
 * 테스트가 0이었고, 같은 공식(actual/target)이 KpiCard·ProgressBar 등에 복붙돼 갈라질
 * 위험이 있었다 → 여기로 단일화 + 단위테스트로 고정. (렌더 결과는 기존과 동일.)
 */

/**
 * 달성률(%) = actual/target × 100, 0~100 클램프, 반올림.
 * target 이 없으면(0/null) null — 목표 바 없는 카드(이번 달 상세)용.
 */
export function achievementPct(
  actual: number | null | undefined,
  target: number | null | undefined
): number | null {
  if (!target) return null;
  return Math.min(100, Math.round(((actual ?? 0) / target) * 100));
}

/**
 * 진행바 채움(%) = value/max × 100, 0~100 클램프, 반올림. max 0이면 0.
 */
export function barPct(
  value: number | null | undefined,
  max: number | null | undefined
): number {
  if (!max || max <= 0) return 0;
  return Math.min(100, Math.round(((value ?? 0) / max) * 100));
}

/**
 * 사업 기간 진척률(%) = 경과/전체, 0~100 클램프, 반올림.
 * now 를 주입받아 순수 함수로 테스트 가능하게 한다.
 */
export function projectProgressPct(now: Date, start: Date, end: Date): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 0;
  const elapsed = Math.min(now.getTime() - start.getTime(), total);
  return Math.max(0, Math.round((elapsed / total) * 100));
}

/**
 * 사전상담 + 사후관리 합산 (공식 K-02+K-04, 목표 120). null 은 0 취급.
 */
export function consultCareTotal(
  preConsultation: number | null | undefined,
  followUp: number | null | undefined
): number {
  return (preConsultation ?? 0) + (followUp ?? 0);
}

/**
 * 국가별 분포 비율(%) = count/total × 100, 반올림. total 0이면 0.
 */
export function sharePct(
  count: number | null | undefined,
  total: number | null | undefined
): number {
  if (!total || total <= 0) return 0;
  return Math.round(((count ?? 0) / total) * 100);
}
