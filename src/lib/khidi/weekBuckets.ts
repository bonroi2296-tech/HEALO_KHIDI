/**
 * KST 주(week) 버킷 순수 유틸 — northStar.ts 에서 분리(server-only 없이 단위테스트 가능).
 * 주 = KST 월요일 00:00 시작. DST 없음(UTC+9 고정).
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** UTC 인스턴트 → 그 주의 KST 월요일 'YYYY-MM-DD'. */
export function kstWeekStartStr(d: Date): string {
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  const dow = k.getUTCDay(); // 0=일..6=토
  const sinceMon = dow === 0 ? 6 : dow - 1;
  k.setUTCDate(k.getUTCDate() - sinceMon);
  const y = k.getUTCFullYear();
  const m = String(k.getUTCMonth() + 1).padStart(2, "0");
  const day = String(k.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 최근 n주의 주 시작일('YYYY-MM-DD', KST 월요일) 배열 — 오래된→최신, 현재 주 포함. */
export function lastNWeekStarts(now: Date, n: number): string[] {
  const thisMon = kstWeekStartStr(now);
  const out: string[] = [];
  let cur = new Date(`${thisMon}T00:00:00+09:00`);
  for (let i = 0; i < n; i++) {
    out.unshift(kstWeekStartStr(cur));
    cur = new Date(cur.getTime() - WEEK_MS);
  }
  return out;
}
