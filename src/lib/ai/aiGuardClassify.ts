/**
 * healwith: AI 가드 — IP 위험도 분류 (순수 로직, server-only 아님 → 단위테스트 가능)
 *
 * "감지 우선" 정책(2026-06-30 PO): IP당 일일 호출수를 3단계로 본다.
 *  - normal(<soft): 정상.
 *  - elevated(soft~): 관측 — 차단하지 않고 알림만(헤비 유저일 수도, 초기 남용일 수도).
 *  - likely_intrusion(soft*3~): 사람으론 드문 양 → 외부 침입 가능성 높음(알림 강화, 차단은 hard에서).
 *  - intrusion(>=hard): 사람이 할 수 없는 양 → 자동 차단(비용 백스톱).
 */
export type IpRisk = "normal" | "elevated" | "likely_intrusion" | "intrusion";

export function classifyIpRisk(count: number, soft: number, hard: number): IpRisk {
  if (count >= hard) return "intrusion";
  if (count >= Math.min(soft * 3, hard)) return "likely_intrusion";
  if (count >= soft) return "elevated";
  return "normal";
}

/** soft 대비 몇 배인지(알림 메시지·판단용). soft<=0 이면 0. */
export function intrusionFactor(count: number, soft: number): number {
  if (soft <= 0) return 0;
  return Math.round((count / soft) * 10) / 10;
}
