/**
 * 환자가 «진행상황 링크»로 남긴 글 — 코디가 «아직 안 본 것»을 가려내는 순수 함수.
 *
 * 왜 (2026-09-05 실측): 환자가 진행상황 링크로 글을 남겼는데 코디 화면 어디에도 «새 글»이 안 떴다.
 *   목록엔 정체 배지(⏰ N일째)만 있고, 상세에선 «접수 후 추가 정보» 칸이 맨 아래(2,000줄짜리
 *   화면의 끝)에 있다. 종 알림(notifyStaffPatientMessage)은 «그 순간» 울리지만, 놓치면 끝이다.
 *   → 목록에서 «환자 새 글 · N일째 안 읽음»이 계속 떠 있어야 한다.
 *
 * 「읽음」의 정의 = 그 글이 온 «뒤»에 직원이 ①상세 화면을 열었거나(admin_audit_logs VIEW_INQUIRY)
 *   ②직원 글을 추가했다(follow_ups 의 직원 항목). 답을 왓츠앱·메일로 하면 여기 안 잡히지만,
 *   답하려면 열어야 하니 ①로 잡힌다. **손으로 「읽음」을 누르는 칸은 만들지 않았다**(DESIGN.md 18).
 *
 * 본문은 안 본다 — 시각·작성자 표시만 쓴다(암호문을 풀 필요 없음, 개인정보 0).
 */

/** 환자가 «진행상황 링크에서» 직접 보낸 것의 표시. 이 값으로 코디 글과 환자 글을 가른다. */
export const BY_PATIENT_LINK = "환자(진행상황 링크)";

type StoredLike = { at?: unknown; by?: unknown; removed_at?: unknown; removedAt?: unknown } | null | undefined;

function ts(v: unknown): number | null {
  if (typeof v !== "string" || !v) return null;
  const n = Date.parse(v);
  return Number.isFinite(n) ? n : null;
}

function isPatient(f: StoredLike): boolean {
  return String(f?.by || "") === BY_PATIENT_LINK;
}

/** 환자가 «치우지 않은» 글 중 가장 최근 시각. 없으면 null. (저장 모양·읽기 모양 둘 다 받는다) */
export function latestPatientNoteAt(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  let best: number | null = null;
  for (const f of raw as StoredLike[]) {
    if (!f || typeof f !== "object" || !isPatient(f)) continue;
    if (f.removed_at || f.removedAt) continue; // 환자가 스스로 치운 글은 «답을 기다리는 글»이 아니다
    const n = ts(f.at);
    if (n != null && (best == null || n > best)) best = n;
  }
  return best == null ? null : new Date(best).toISOString();
}

/** 직원(코디·어드민)이 남긴 글 중 가장 최근 시각. 없으면 null. */
export function latestStaffNoteAt(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  let best: number | null = null;
  for (const f of raw as StoredLike[]) {
    if (!f || typeof f !== "object" || isPatient(f)) continue;
    const n = ts(f.at);
    if (n != null && (best == null || n > best)) best = n;
  }
  return best == null ? null : new Date(best).toISOString();
}

/**
 * «안 읽은 환자 글»의 시각. 환자 글이 마지막 열람·마지막 직원 글보다 «뒤»면 그 시각, 아니면 null.
 * 열람·직원 글이 아예 없으면(null) 환자 글이 있는 한 안 읽은 것이다.
 */
export function patientUnreadSince(
  patientNoteAt: string | null | undefined,
  lastStaffViewAt: string | null | undefined,
  lastStaffNoteAt: string | null | undefined
): string | null {
  const note = ts(patientNoteAt);
  if (note == null) return null;
  const seen = Math.max(ts(lastStaffViewAt) ?? -Infinity, ts(lastStaffNoteAt) ?? -Infinity);
  return note > seen ? new Date(note).toISOString() : null;
}

/** 며칠째인가(내림). 시각이 이상하면 0. */
export function daysSince(iso: string | null | undefined, now: number = Date.now()): number {
  const n = ts(iso);
  if (n == null) return 0;
  return Math.max(0, Math.floor((now - n) / 86_400_000));
}
