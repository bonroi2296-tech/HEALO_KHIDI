/**
 * 만족도 설문 발송 대상 시간창 계산 (순수함수 — 단위테스트로 고정)
 *
 * 배경(POSTMORTEMS #19): 기존 cron 은 "완료 24~30시간 전" 6시간 슬라이스만 조회했는데
 * cron 은 하루 1회(09:00 UTC)라, 그 6시간 밖(하루의 나머지 18시간)에 완료된 세션은
 * 다음 실행에선 이미 30h 를 넘겨 영구 누락 → 만족도(K-03) 설문이 ~25% 만 발송됐다.
 *
 * 수정: 하한을 넓게(기본 14일) 잡아, cron 이 놓치거나 장애로 며칠 안 돌아도
 * 다음 실행에서 소급(backfill) 발송한다. 같은 세션 재발송은 호출부의 `surveys`
 * 존재검사(consultation_session_id 유일)로 막혀 멱등이다.
 *
 * - windowEnd   = now - delayHours(기본 24h) : 완료 직후가 아니라 하루 뒤 발송(경험 정리 시간)
 * - windowStart = now - backfillDays(기본 14일) : 그 사이 미발송분 소급
 */
export function surveyDispatchWindow(
  now: number = Date.now(),
  opts: { delayHours?: number; backfillDays?: number } = {}
): { windowStart: string; windowEnd: string } {
  const delayHours = opts.delayHours ?? 24;
  const backfillDays = opts.backfillDays ?? 14;
  const windowEnd = new Date(now - delayHours * 60 * 60 * 1000).toISOString();
  const windowStart = new Date(now - backfillDays * 24 * 60 * 60 * 1000).toISOString();
  return { windowStart, windowEnd };
}

/**
 * 어떤 완료시각(completedAt)이 지금 발송 대상인지 — 테스트·검증용 술어.
 * 완료 후 delayHours 이상 지났고 backfillDays 이내면 true.
 */
export function isWithinDispatchWindow(
  completedAt: number,
  now: number = Date.now(),
  opts: { delayHours?: number; backfillDays?: number } = {}
): boolean {
  const { windowStart, windowEnd } = surveyDispatchWindow(now, opts);
  const t = new Date(completedAt).toISOString();
  return t >= windowStart && t <= windowEnd;
}
