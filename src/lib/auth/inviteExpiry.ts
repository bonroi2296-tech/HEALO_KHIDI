/**
 * healwith: 상담 초대 링크 만료시각 계산 (순수 함수 — 서버/테스트 공용)
 *
 * 왜 별도 모듈인가 (2026-07-27, POSTMORTEM #129):
 *   초대 링크 만료가 "발급 시점 + 72h" 고정이라 **예약시각과 아무 관계가 없었다.**
 *   → 미팅이 연기되거나(가장 흔함) 링크를 미리 뽑아두면, 상담 당일 링크가 이미 죽어 있다.
 *   실제로 7/24 발급(만료 7/27 11:55 KST) 링크가 7/27 17:00 로 연기된 미팅
 *   **5시간 전에 만료**돼 해외 에이전시가 "방이 만료됐다"고 알려왔다.
 *
 * 규칙: 만료는 **항상 예약시각을 넘어선다**. 요청된 유효시간과 «예약시각 + 유예»
 *   중 더 늦은 쪽을 쓴다(요청분을 줄이지는 않는다).
 *   상한(MAX_LINK_LIFETIME_DAYS)은 아주 먼 미래로 잡힌 상담 하나가 사실상
 *   무기한 링크가 되는 걸 막는 안전선.
 */

/** 상담이 끝난 뒤에도 링크가 살아있는 시간 — 지연 시작·재입장·연장 회의 대비 */
export const POST_MEETING_GRACE_HOURS = 12;

/** 예약시각 연동으로도 넘을 수 없는 절대 상한 (발급 시점 기준) */
export const MAX_LINK_LIFETIME_DAYS = 45;

export interface ResolveInviteExpiryParams {
  /** 발급 시각 (기본: 현재) */
  now?: Date;
  /** 요청된 유효시간(시간 단위) — 기존 동작 */
  expiresInHours: number;
  /** 상담 예약시각 (없거나 파싱 불가면 무시) */
  scheduledAt?: string | Date | null;
}

export interface ResolveInviteExpiryResult {
  expiresAt: Date;
  /** 예약시각 때문에 요청분보다 늘어났는가 (로깅·감사용) */
  extendedForSchedule: boolean;
  /** 상한에 걸려 잘렸는가 */
  cappedByMaxLifetime: boolean;
}

export function resolveInviteExpiry({
  now = new Date(),
  expiresInHours,
  scheduledAt,
}: ResolveInviteExpiryParams): ResolveInviteExpiryResult {
  const base = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

  const scheduled =
    scheduledAt instanceof Date ? scheduledAt : scheduledAt ? new Date(scheduledAt) : null;
  const scheduledValid = scheduled && !Number.isNaN(scheduled.getTime());

  let expiresAt = base;
  let extendedForSchedule = false;

  if (scheduledValid) {
    const meetingFloor = new Date(
      scheduled!.getTime() + POST_MEETING_GRACE_HOURS * 60 * 60 * 1000
    );
    // 예약이 과거면 늘리지 않는다(요청분 그대로) — 줄이는 일도 없다.
    if (meetingFloor.getTime() > base.getTime()) {
      expiresAt = meetingFloor;
      extendedForSchedule = true;
    }
  }

  const hardCap = new Date(now.getTime() + MAX_LINK_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
  let cappedByMaxLifetime = false;
  // 상한은 «예약시각 때문에 늘어난 부분»만 자른다. 요청분(base)보다 짧아지는 역전은 없어야 하고
  // (요청 자체가 상한을 넘는 건 라우트에서 이미 차단), 그 경우 «잘렸다»고 보고하지도 않는다.
  if (expiresAt.getTime() > hardCap.getTime() && hardCap.getTime() > base.getTime()) {
    expiresAt = hardCap;
    cappedByMaxLifetime = true;
  }

  return { expiresAt, extendedForSchedule, cappedByMaxLifetime };
}
