/**
 * healwith: 상담 세션 notes 암호화 헬퍼 (2026-07-06, PO 승인)
 *
 * 상담 메모(consultation_sessions.notes)에는 환자 PII·의료 맥락이 섞이므로
 * visa/cost-estimates 와 동일하게 AES-256-GCM 암호문(notes_encrypted)으로만 저장한다.
 *
 * 이전(migration) 전략 — "기회주의적 백필":
 *   이 실행환경에는 ENCRYPTION_KEY_V1 이 없어 기존 평문 행을 밖에서 일괄 변환할 수 없다.
 *   대신 서버(키 보유)가 조회 시점에 평문 잔존 행을 발견하면 즉시 암호화해 옮기고
 *   평문을 지운다. 어드민 상담 목록이 매일 열리므로 수일 내 전량 이전되고 이후 no-op.
 *
 * 읽기 규칙: 암호문 우선, (아직 이전 안 된) 평문 폴백. 응답 필드명은 기존 그대로
 * `notes` — 화면 코드는 변경 불필요.
 */

import "server-only";
import {
  encryptStringNullable,
  decryptStringNullable,
} from "@/lib/security/encryptionV2";

type SessionNotesRow = {
  id?: string;
  notes?: string | null;
  notes_encrypted?: string | null;
};

/** 저장용: 평문 → 암호문 (null/빈문자열은 null). */
export function encryptSessionNotes(
  notes: string | null | undefined
): string | null {
  return encryptStringNullable(notes || null);
}

/** 응답용: 암호문 우선 복호화, 평문 폴백. 손상 암호문은 노출하지 않음(null). */
export function readSessionNotes(row: SessionNotesRow): string | null {
  if (row?.notes_encrypted) {
    try {
      return decryptStringNullable(row.notes_encrypted);
    } catch {
      // 조용히 null 만 주면 키 문제(회전·env 누락)가 '빈 메모'로 위장된다 —
      // 비PII 마커만 로그에 남겨 Vercel 로그에서 바로 보이게 (평문·암호문 출력 금지).
      console.warn(
        `[consultationNotes] notes decrypt failed (session=${row?.id ?? "?"}) — ENCRYPTION_KEY_V1 확인`
      );
      return null;
    }
  }
  return row?.notes ?? null;
}

/**
 * 기회주의적 백필: 조회된 행 중 평문만 있는 행을 암호화해 옮기고 평문을 지운다.
 * best-effort — 실패해도 조회 응답에는 영향 없음. 요청당 cap 건으로 지연 상한.
 * `.is("notes_encrypted", null)` 조건으로 동시 요청의 이중 변환을 막는다.
 */
export async function backfillSessionNotesEncryption(
  db: any,
  rows: SessionNotesRow[],
  cap = 20
): Promise<number> {
  const targets = (rows || [])
    .filter((r) => r?.id && r.notes && !r.notes_encrypted)
    .slice(0, cap);
  let moved = 0;
  for (const row of targets) {
    try {
      const { error } = await db
        .from("consultation_sessions")
        .update({
          notes_encrypted: encryptStringNullable(row.notes as string),
          notes: null,
        } as any)
        .eq("id", row.id)
        .is("notes_encrypted", null);
      if (!error) moved++;
    } catch {
      // best-effort: 다음 조회 때 재시도된다
    }
  }
  return moved;
}
