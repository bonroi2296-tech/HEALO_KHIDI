/**
 * healwith: «폰 알림을 보낼까 / 지금 보낼까» 판단 — 순수 함수만.
 *
 * 왜 파일을 갈랐나: `pushBridge.ts` 는 `server-only` + DB 를 물고 있어 테스트에서 못 부른다.
 * 판단 규칙은 값만 보면 되므로 여기로 빼서 그대로 시험한다(`push/buildPushMessage.ts` 와 같은 방식).
 */

export type PushPriority = "low" | "normal" | "high" | "urgent";

/**
 * 활성 6개 언어 → 대표 시간대(UTC 기준 시차).
 * 사용자별 «시간대» 항목을 새로 만들지 않기 위한 근사값이다. 정확한 시간대가 필요해지면
 * user_roles 에 timezone 을 추가하고 여기를 폴백으로 남겨라.
 */
export const UTC_OFFSET_BY_LANG: Record<string, number> = {
  ru: 3, // 모스크바
  kz: 5, // 알마티
  zh: 8,
  ja: 9,
  ko: 9,
  en: 0,
};

/** 현지 22시 ~ 다음날 8시 = 조용 시간 */
export const QUIET_FROM = 22;
export const QUIET_TO = 8;

/**
 * 지금이 그 사람의 «자는 시간»인가.
 * 환자는 카자흐스탄·러시아에 있고 한국보다 3~6시간 느리다 → 한국 낮이 현지 새벽일 수 있다.
 * 모르는 언어는 러시아어(주 타겟)로 본다.
 */
export function isQuietHour(nowMs: number, lang: string | null | undefined): boolean {
  const key = (lang || "").toLowerCase().slice(0, 2);
  const offset = UTC_OFFSET_BY_LANG[key === "kk" ? "kz" : key] ?? UTC_OFFSET_BY_LANG.ru;
  const localHour = new Date(nowMs + offset * 3_600_000).getUTCHours();
  return localHour >= QUIET_FROM || localHour < QUIET_TO;
}

/**
 * 이 우선순위를 폰까지 보내야 하나.
 * ⚠️ 새 «사건 목록»을 만들지 않는다 — 사건이 늘 때마다 갱신해야 하고 반드시 빠뜨린다.
 *    알림에 이미 있는 priority 로 가른다.
 */
export function shouldPush(priority: PushPriority | undefined | null): boolean {
  return priority === "urgent" || priority === "high";
}

/** 조용 시간을 무시하고 즉시 보내야 하는가 (상담 곧 시작 등). */
export function ignoresQuietHours(priority: PushPriority | undefined | null): boolean {
  return priority === "urgent";
}
