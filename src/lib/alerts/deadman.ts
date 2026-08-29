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
  /** 최근 윈도 AI 챗 답변 수 (chat_messages actor_type=system) */
  aiReplies?: number;
  /** 최근 윈도 품질 채점 수 (ai_response_evaluations) */
  aiEvaluations?: number;
  /** 최근 윈도 «문제 표시가 붙은» 채점 수 (flags 비어있지 않음) */
  aiFlagged?: number;
  /** 최근 윈도 품질 경고 알림 발송 수 (notifications type=ai_quality_alert) */
  aiQualityAlertsSent?: number;
  /**
   * 최근 윈도 판사 «호출» 수 (ai_usage_events surface='judge').
   * 이건 모델을 실제로 부른 횟수다. 부른 뒤 JSON 파싱이나 저장에서 깨지면
   * aiEvaluations 에 안 들어간다 — 그 차이가 곧 «조용한 실패»다.
   * ⚠️ 자가시험은 surface='regression_judge' 로 따로 기록되므로 여기 안 섞인다(2026-08-28 확인).
   */
  aiJudgeCalls?: number;
}

export interface DeadmanAlert {
  key:
    | "kpi_snapshot_stale"
    | "survey_dispatch_zero"
    | "ai_judge_zero"
    | "ai_quality_alert_zero"
    | "ai_judge_save_gap";
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
/** AI 답변이 이 수 이상인데 채점 0건이면 판사가 죽은 것으로 본다. */
export const JUDGE_ZERO_MIN_REPLIES = 10;
/** 판사 호출이 이 수 이상일 때만 저장률을 본다(표본이 적으면 비율이 요동친다). */
export const JUDGE_SAVE_MIN_CALLS = 20;
/** 호출 대비 채점 저장이 이 비율 미만이면 «부르고도 결과를 잃는 중»으로 본다. */
export const JUDGE_SAVE_RATE_FLOOR = 0.8;
/** 문제 표시가 이 수 이상 붙었는데 알림 0건이면 통보 경로가 죽은 것으로 본다. */
export const QUALITY_ALERT_ZERO_MIN_FLAGGED = 3;
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

  // 3) AI 답변은 나가는데 품질 채점 0 = 판사가 죽음
  //    판사가 멈추면 환각·의료 레드라인이 «검사조차 안 된 채» 환자에게 나간다. 화면상으론 정상이다.
  const replies = input.aiReplies ?? 0;
  const evaluations = input.aiEvaluations ?? 0;
  if (replies >= JUDGE_ZERO_MIN_REPLIES && evaluations === 0) {
    alerts.push({
      key: "ai_judge_zero",
      severity: "critical",
      message: `AI 답변 ${replies}건인데 품질 채점 0건. 판사(LLM-as-judge)가 멈췄고, 환각·레드라인이 검사 없이 나가는 중입니다`,
      details: { aiReplies: replies, aiEvaluations: evaluations },
    });
  }

  // 4) 문제 표시는 붙는데 코디 알림 0 = 통보 경로가 죽음
  //    2026-08-28 사고가 정확히 이것: 판사가 265건에 표시를 붙였는데 235건(89%)이 무알림이었고
  //    8/12 이후로는 «한 건도» 안 갔다. 조건을 고쳤어도 대상자 0명·발송 오류로 또 조용해질 수 있다.
  //    「탐지된다」와 「사람이 본다」는 다른 자다 — 그 사이를 여기서 감시한다.
  const flagged = input.aiFlagged ?? 0;
  const alertsSent = input.aiQualityAlertsSent ?? 0;
  if (flagged >= QUALITY_ALERT_ZERO_MIN_FLAGGED && alertsSent === 0) {
    alerts.push({
      key: "ai_quality_alert_zero",
      severity: "warning",
      message: `품질 문제 표시 ${flagged}건인데 코디 알림 0건. 탐지는 되는데 아무에게도 안 가고 있습니다(2026-08-28 부류)`,
      details: { aiFlagged: flagged, aiQualityAlertsSent: alertsSent },
    });
  }

  // 5) 판사를 «불렀는데» 채점이 안 남는다 = 조용한 실패
  //    2026-08-28 실측: 최근 이틀 판사 호출 77건인데 채점 저장은 47건(39% 유실).
  //    evaluateResponse 는 JSON 파싱이 깨지면 null 을 돌려주고 runJudgeInBackground 는
  //    그걸 조용히 삼킨다: 로그에만 남고 DB 에는 «아무 흔적도» 없다.
  //    ⚠️ 원인(파싱 실패인지 저장 실패인지)은 아직 미규명이다. 값을 추측으로 고치지 말고
  //    먼저 «보이게» 만든다: 이 경보가 며칠 쌓이면 어느 쪽인지 데이터가 말해준다.
  //    evaluations === 0 인 경우는 ai_judge_zero 가 이미 잡으므로 여기선 뺀다(중복 경보 방지).
  const judgeCalls = input.aiJudgeCalls ?? 0;
  if (
    judgeCalls >= JUDGE_SAVE_MIN_CALLS &&
    evaluations > 0 &&
    evaluations < judgeCalls * JUDGE_SAVE_RATE_FLOOR
  ) {
    const pct = Math.round((evaluations / judgeCalls) * 100);
    alerts.push({
      key: "ai_judge_save_gap",
      severity: "warning",
      message: `판사를 ${judgeCalls}번 불렀는데 채점은 ${evaluations}건만 남았습니다(${pct}%). 부르고도 결과를 잃는 중입니다`,
      details: { aiJudgeCalls: judgeCalls, aiEvaluations: evaluations, savedPct: pct },
    });
  }

  return alerts;
}
