/**
 * 식은 리드(cold lead) 판정 — «상담 단계에서 며칠째 아무도 안 건드리는 문의»를 찾는다.
 *
 * 왜 (2026-09-05 실측): 비시험 문의 8건을 전수로 보니 유치 후보 4건 중 3건이 «아무도 안 건드리는
 *   상태»였다 — 상담 단계에서 24일·32일 무동작. 코디 화면엔 「며칠째」 표시가 없고, 침묵 감지
 *   크론(detect-silent-patients)은 치료 «후» 환자의 증상 보고만 본다. 유치 «전» 단계는 아무도
 *   안 세고 있었다. 이 모듈은 그 구멍을 재는 순수 함수다(DB·알림은 크론 라우트가 맡는다).
 *
 * 「마지막 움직임」 = 아래 시각 중 가장 최근:
 *   문의 생성 · 상태 변경 · 케이스 단계 변경 · 자료 요청 · 후속 시작 · 결과 입력 ·
 *   후속 글(follow_ups[].at, 환자·코디 모두) · 케이스 이력(case_status_history) · 상담 세션 갱신
 * 「활성」 = 시험 아님 · 결과(outcome) 없음 · 케이스 단계가 «끝난 것»(보류·종결·유치 등)이 아님.
 *   단계가 비어 있어도(아무도 안 건드린 새 문의) 활성으로 본다 — 그게 제일 먼저 식는 건이다.
 */

export const COLD_LEAD_DAYS_DEFAULT = 7;

/** 이 단계면 «유치 전 진행 중»이 아니다 — 세지 않는다. */
export const NOT_ACTIVE_CASE_STATUSES: ReadonlySet<string> = new Set([
  "on_hold",
  "closed",
  "lost",
  "cancelled",
  "canceled",
  "completed",
  "admitted",
  "treatment",
  "aftercare",
  "done",
]);

export interface ColdLeadInput {
  id: number;
  created_at: string | null;
  status?: string | null;
  case_status?: string | null;
  status_updated_at?: string | null;
  case_status_updated_at?: string | null;
  info_requested_at?: string | null;
  followup_started_at?: string | null;
  outcome?: string | null;
  outcome_updated_at?: string | null;
  follow_ups?: unknown;
  is_test?: boolean | null;
  /** 외부에서 모아 넘기는 것: 케이스 이력 최신 시각 · 상담 세션 최신 갱신 시각 */
  last_history_at?: string | null;
  last_session_at?: string | null;
}

export interface ColdLead {
  id: number;
  days: number;
  lastActivityAt: string;
  caseStatus: string | null;
}

function ts(v: unknown): number | null {
  if (typeof v !== "string" || !v) return null;
  const n = Date.parse(v);
  return Number.isFinite(n) ? n : null;
}

/** 후속 글 중 가장 최근 시각(지운 글도 «움직임»이었으므로 센다). */
export function latestFollowUpAt(raw: unknown): number | null {
  if (!Array.isArray(raw)) return null;
  let best: number | null = null;
  for (const f of raw) {
    const n = ts((f as { at?: unknown } | null)?.at);
    if (n != null && (best == null || n > best)) best = n;
  }
  return best;
}

/** 마지막 움직임 시각(ms). 아무 시각도 없으면 null(= 판정 불가, 건너뛴다). */
export function lastActivityMs(row: ColdLeadInput): number | null {
  const candidates = [
    ts(row.created_at),
    ts(row.status_updated_at),
    ts(row.case_status_updated_at),
    ts(row.info_requested_at),
    ts(row.followup_started_at),
    ts(row.outcome_updated_at),
    latestFollowUpAt(row.follow_ups),
    ts(row.last_history_at),
    ts(row.last_session_at),
  ].filter((n): n is number => n != null);
  return candidates.length ? Math.max(...candidates) : null;
}

export function isActiveLead(row: ColdLeadInput): boolean {
  if (row.is_test === true) return false;
  if (row.outcome && String(row.outcome).trim()) return false;
  const cs = (row.case_status || "").trim().toLowerCase();
  if (cs && NOT_ACTIVE_CASE_STATUSES.has(cs)) return false;
  return true;
}

/**
 * 식은 리드 목록 — 오래 멈춘 순. thresholdDays 「이상」 멈춘 것만.
 */
export function selectColdLeads(
  rows: ColdLeadInput[],
  now: number = Date.now(),
  thresholdDays: number = COLD_LEAD_DAYS_DEFAULT
): ColdLead[] {
  const out: ColdLead[] = [];
  for (const row of rows) {
    if (!isActiveLead(row)) continue;
    const last = lastActivityMs(row);
    if (last == null) continue;
    const days = Math.floor((now - last) / 86_400_000);
    if (days >= thresholdDays) {
      out.push({
        id: row.id,
        days,
        lastActivityAt: new Date(last).toISOString(),
        caseStatus: row.case_status ?? null,
      });
    }
  }
  return out.sort((a, b) => b.days - a.days || a.id - b.id);
}

/** 알림 본문용 한 줄 — 개인정보 없이 번호·일수만. 10건 넘으면 「외 N건」. */
export function formatColdLeadLine(leads: { id: number; days: number }[], max = 10): string {
  const head = leads.slice(0, max).map((l) => `#${l.id}(${l.days}일)`).join(" · ");
  const rest = leads.length - Math.min(leads.length, max);
  return rest > 0 ? `${head} 외 ${rest}건` : head;
}
