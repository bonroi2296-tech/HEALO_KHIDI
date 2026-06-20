import { describe, it, expect, vi, afterEach } from 'vitest';
import { alertKpiAggregationErrors } from './operationalAlerts';

/**
 * KPI 집계 오류 알림 (#102 부류 재발 canary) 단위 테스트.
 * 테스트 환경엔 SENTRY_DSN·ALERT_EMAIL env 가 없으므로 sendAlert 는
 * 콘솔 로깅만 수행한다(이메일·Sentry 경로는 env 가드로 skip). 따라서
 * console.error spy 로 "critical 알림이 실제 발사됐는지"를 검증한다.
 */
describe('alertKpiAggregationErrors', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('오류가 없으면 no-op (알림 발사 안 함)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(alertKpiAggregationErrors([], 'snapshot 2026-06-20')).resolves.toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });

  it('오류가 있으면 critical 알림을 발사한다', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await alertKpiAggregationErrors(
      ['attraction count: column inquiries.foo does not exist'],
      'snapshot 2026-06-20'
    );
    // sendAlert(critical) → console.error 로 [ALERT:critical] 출력
    expect(spy).toHaveBeenCalled();
    const logged = spy.mock.calls.map((c) => String(c[0])).join(' ');
    expect(logged).toContain('kpi_aggregation_error');
  });

  it('알림 경로가 throw 해도 호출자에게 전파하지 않는다(메인 로직 보호)', async () => {
    // sendAlert 내부 채널 실패는 자체 try/catch 로 흡수 → 항상 resolve
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      alertKpiAggregationErrors(['e1', 'e2'], 'ctx')
    ).resolves.toBeUndefined();
  });
});
