/**
 * 침묵(장기 무입력) 감지 — 순수 함수 (server-only 아님 → 단위 테스트로 고정)
 *
 * ⚠️ 왜 분리했나 (POSTMORTEMS #12/#13 의 교훈):
 *  detect.ts 는 `import "server-only"` 라 vitest 에서 못 불러온다. "조용히 0건"으로
 *  위장되는 cron 로직은 순수 함수로 빼서 CI 로 잠가야 재발을 막는다.
 *
 * ⚠️ 식별자 규약:
 *  메신저 문의 환자는 auth 계정(uuid)이 없고 실제 연결고리는 inquiry_id 다.
 *  그래서 알림 주체를 patient_id(로그인 환자) 또는 inquiry_id(문의 환자) 둘 다로 받는다.
 *
 * ⚠️ 의료 면책: 감지 결과는 코디네이터 확인 요청이며 의학적 진단이 아니다.
 */

import type { DetectedAlert } from "./detect";

export interface SilenceRef {
  /** 로그인 환자 식별 (auth.users uuid) */
  patientId?: string | null;
  /** 메신저 문의 환자 식별 (inquiries.id bigint) */
  inquiryId?: number | null;
}

/**
 * 마지막 증상 입력 후 `silenceDays` 이상 무입력이면 silence_long 알림을 만든다.
 *
 * - `lastEntryAt` 가 null(= 한 번도 입력 없음)이면 무시(null 반환).
 *   처음부터 증상 기능을 안 쓴 환자 전원에게 알림이 쏟아지는 것을 막기 위함.
 * - 7일 이상이면 high, 그 미만이면 medium.
 * - `now` 는 테스트 결정성을 위해 주입 가능(기본 Date.now()).
 */
export function buildSilenceAlert(
  ref: SilenceRef,
  lastEntryAt: Date | null,
  silenceDays = 3,
  now: number = Date.now()
): DetectedAlert | null {
  if (!lastEntryAt) return null;
  if (ref.patientId == null && ref.inquiryId == null) return null;

  const diffDays = (now - lastEntryAt.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < silenceDays) return null;

  return {
    patient_id: ref.patientId ?? null,
    inquiry_id: ref.inquiryId ?? null,
    alert_type: "silence_long",
    severity: diffDays >= 7 ? "high" : "medium",
    detected_by: "rule",
    data: {
      last_entry_at: lastEntryAt.toISOString(),
      silence_days: Math.floor(diffDays),
      threshold_days: silenceDays,
      rule: "silence_long",
    },
  };
}

/**
 * 세션 목록에서 고유 inquiry_id 추출(중복 제거, 가장 최근 updated_at 유지).
 * 순수 함수 — cron 의 "활성 환자 목록" 산출을 테스트로 잠그기 위해 분리.
 */
export function uniqueInquiryIds(
  sessions: Array<{ inquiry_id?: number | null; updated_at?: string | null }>
): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const s of sessions) {
    const id = s.inquiry_id;
    if (id != null && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}
