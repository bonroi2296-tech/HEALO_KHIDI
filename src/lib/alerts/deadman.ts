/**
 * deadman — "조용한 0/멈춤"을 시끄럽게 만드는 데드맨 판정 (POSTMORTEMS #35 구조게이트 S1)
 *
 * 왜: 집계·cron·발송이 조용히 0/빈값으로 떨어지면 build·tsc는 통과하고 화면이 0으로 보일
 *     때까지 아무도 모른다(검증 주체가 PO로 떨어짐). 그래서 "있어야 할 신호가 없다"를
 *     능동적으로 감지해 알린다:
 *       1) KPI 스냅샷이 며칠째 안 갱신 = cron 멈춤/실패 (#8 부류)
 *       2) 완료 상담은 있는데 만족도 설문 발송 0 = K-03 측정 불능 (#12/#13 부류)
 *
 * 순수 함수(DB·시간 의존 0) → 단위테스트로 경계 고정. 실제 수집·발신은 호출부(cron)가 한다.
 */
export type DeadmanSeverity = "warning" | "critical";

export interface DeadmanInput {
  /** KST 기준 오늘 "YYYY-MM-DD" */
  todayKst: string;
  /** kpi_snapshots 최신 snapshot_date "YYYY-MM-DD" (없으면 null) */
  latestSnapshotDate: string | null;
  /** 최근 윈도(예: 14일) 완료 상담 수 */
  completedSessions: number;
  /** 최근 윈도 설문 발송(sent_at not null) 수 */
  surveysSent: number;
}

export interface DeadmanAlert {
  key: "kpi_snapshot_stale" | "survey_dispatch_zero";
  severity: DeadmanSeverity;
  message: string;
  details: Record<string, unknown>;
}

/** "YYYY-MM-DD" 두 날짜의 일수 차(b - a). 파싱 불가 시 NaN. */
export function daysBetween(a: string, b: string): number {
  const da = Date.parse(`${a}T00:00:00Z`);
  const db = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(da) || Number.isNaN(db)) return NaN;
  return Math.round((db - da) / 86_400_000);
}

/** 완료 상담이 이 수 이상인데 설문 0건이면 발송 파이프 고장으로 본다. */
export const SURVEY_ZERO_MIN_COMPLETED = 3;
/** 스냅샷이 이 일수 이상 밀리면 경고, 더 밀리면 긴급. */
export const SNAPSHOT_STALE_WARN_DAYS = 2;
export const SNAPSHOT_STALE_CRIT_DAYS = 4;

export function evaluateDeadman(input: DeadmanInput): DeadmanAlert[] {
  const alerts: DeadmanAlert[] = [];

  // 1) KPI 스냅샷 stale / 부재
  if (!input.latestSnapshotDate) {
    alerts.push({
      key: "kpi_snapshot_stale",
      severity: "critical",
      message: "KPI 스냅샷이 한 건도 없음 — 평가 자동집계가 돌지 않음",
      details: { latestSnapshotDate: null, todayKst: input.todayKst },
    });
  } else {
    const lag = daysBetween(input.latestSnapshotDate, input.todayKst);
    if (!Number.isNaN(lag) && lag >= SNAPSHOT_STALE_WARN_DAYS) {
      alerts.push({
        key: "kpi_snapshot_stale",
        severity: lag >= SNAPSHOT_STALE_CRIT_DAYS ? "critical" : "warning",
        message: `KPI 스냅샷이 ${lag}일째 갱신 안 됨 — kpi-snapshot cron 누락/실패 의심(#8)`,
        details: { latestSnapshotDate: input.latestSnapshotDate, lagDays: lag, todayKst: input.todayKst },
      });
    }
  }

  // 2) 완료 상담은 있는데 설문 발송 0 (K-03 측정 불능)
  if (input.completedSessions >= SURVEY_ZERO_MIN_COMPLETED && input.surveysSent === 0) {
    alerts.push({
      key: "survey_dispatch_zero",
      severity: "warning",
      message: `완료 상담 ${input.completedSessions}건인데 설문 발송 0건 — 만족도(K-03) 측정 불능 의심(#12/#13)`,
      details: { completedSessions: input.completedSessions, surveysSent: input.surveysSent },
    });
  }

  return alerts;
}
