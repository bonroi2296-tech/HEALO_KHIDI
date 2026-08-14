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
  // 임상요약·권고도 진단명·병기·치료계획이 담기는 환자 PII 다 — 같은 규약으로 암호화한다(2026-08-14).
  clinical_summary?: string | null;
  clinical_summary_encrypted?: string | null;
  recommendations?: string | null;
  recommendations_encrypted?: string | null;
};

/** 저장용: 평문 → 암호문 (null/빈문자열은 null). */
export function encryptSessionNotes(
  notes: string | null | undefined
): string | null {
  return encryptStringNullable(notes || null);
}

/** notes/clinical_summary/recommendations 공용 복호화 — 암호문 우선, 평문 폴백. 손상 암호문은 null. */
function readEncryptedField(
  encrypted: string | null | undefined,
  plain: string | null | undefined,
  label: string,
  sessionId: string | undefined
): string | null {
  if (encrypted) {
    try {
      return decryptStringNullable(encrypted);
    } catch {
      // 조용히 null 만 주면 키 문제(회전·env 누락)가 '빈 값'으로 위장된다 —
      // 비PII 마커만 로그에 남겨 Vercel 로그에서 바로 보이게 (평문·암호문 출력 금지).
      console.warn(
        `[consultationNotes] ${label} decrypt failed (session=${sessionId ?? "?"}) — ENCRYPTION_KEY_V1 확인`
      );
      return null;
    }
  }
  return plain ?? null;
}

/** 응답용: 암호문 우선 복호화, 평문 폴백. 손상 암호문은 노출하지 않음(null). */
export function readSessionNotes(row: SessionNotesRow): string | null {
  return readEncryptedField(row?.notes_encrypted, row?.notes, "notes", row?.id);
}

/** 응답용: 임상요약(암호문 우선, 평문 폴백). */
export function readClinicalSummary(row: SessionNotesRow): string | null {
  return readEncryptedField(row?.clinical_summary_encrypted, row?.clinical_summary, "clinical_summary", row?.id);
}

/** 응답용: 권고(암호문 우선, 평문 폴백). */
export function readRecommendations(row: SessionNotesRow): string | null {
  return readEncryptedField(row?.recommendations_encrypted, row?.recommendations, "recommendations", row?.id);
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
  // notes·clinical_summary·recommendations 를 한 번의 조회분에서 같이 이전한다.
  // 각 필드는 «평문만 있고 암호문 없음»일 때만 대상, 그 필드만 건드리고 `.is(...,null)` 로
  // 동시 요청의 이중 변환을 막는다(2026-08-14: clinical_summary·recommendations 추가).
  const FIELDS: Array<{ plain: keyof SessionNotesRow; enc: string }> = [
    { plain: "notes", enc: "notes_encrypted" },
    { plain: "clinical_summary", enc: "clinical_summary_encrypted" },
    { plain: "recommendations", enc: "recommendations_encrypted" },
  ];
  let moved = 0;
  for (const f of FIELDS) {
    const targets = (rows || [])
      .filter((r) => r?.id && r[f.plain] && !(r as any)[f.enc])
      .slice(0, cap);
    for (const row of targets) {
      try {
        const { error } = await db
          .from("consultation_sessions")
          .update({
            [f.enc]: encryptStringNullable(row[f.plain] as string),
            [f.plain]: null,
          } as any)
          .eq("id", row.id)
          .is(f.enc, null);
        if (!error) moved++;
      } catch {
        // best-effort: 다음 조회 때 재시도된다
      }
    }
  }
  return moved;
}
