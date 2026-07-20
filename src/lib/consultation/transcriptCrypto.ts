import "server-only";

/**
 * transcriptCrypto — 상담 대화 내용(자막·번역·채팅)의 암복호화 단일 창구.
 *
 * 왜: 프로젝트 규칙은 "환자 PII 는 AES-256-GCM 으로 `*_encrypted` 컬럼"인데,
 *   정작 **대화 내용 전체가 평문**으로 쌓이고 있었다(2026-07-20 실측: translations 460건,
 *   messages 10건 전부 평문 / 같은 테이블의 코디 메모 notes_encrypted 는 28건 암호화됨).
 *   규칙은 세워놓고 이 테이블만 빠진 것 — 상담 대화엔 진단·병기·투약이 그대로 들어간다.
 *
 * 설계:
 *   · 쓰기는 **암호문만** 남긴다(평문 컬럼 null). 새 데이터가 더 이상 평문으로 안 쌓이게.
 *   · 읽기는 **암호문 우선, 없으면 평문 폴백**. 이미 쌓인 460건을 마이그레이션 전에도
 *     화면이 계속 보여야 하므로(무중단). 마이그레이션 후에도 폴백은 남긴다 — 실패한 행이
 *     있어도 화면이 빈칸이 되는 것보단 낫다.
 *   · 복호화 실패는 **throw 하지 않는다**. 키 교체·손상 행 하나가 상담 기록 전체 조회를
 *     깨뜨리면 안 된다. 대신 null 을 돌려 호출부가 그 줄만 건너뛰게 한다.
 */

import {
  encryptStringNullable,
  decryptStringNullable,
  isEncryptedPayload,
} from "@/lib/security/encryptionV2";

/** DB 에 넣을 대화 한 줄 — 평문 컬럼은 비우고 암호문만 채운다. */
export function encryptTranscriptRow(row: {
  sourceText: string | null | undefined;
  translatedText: string | null | undefined;
}): {
  source_text: null;
  source_text_encrypted: string | null;
  translated_text: null;
  translated_text_encrypted: string | null;
} {
  return {
    source_text: null,
    source_text_encrypted: encryptStringNullable(row.sourceText),
    translated_text: null,
    translated_text_encrypted: encryptStringNullable(row.translatedText),
  };
}

/**
 * 저장된 값 하나를 평문으로. 암호문이면 풀고, 아니면(옛 평문 행) 그대로 돌려준다.
 * 복호화 실패 시 null — 호출부는 그 줄을 건너뛰면 된다(전체 조회는 살아 있어야 한다).
 */
export function readTranscriptField(
  encrypted: string | null | undefined,
  plain: string | null | undefined
): string | null {
  if (encrypted) {
    try {
      return decryptStringNullable(encrypted);
    } catch {
      return null; // 손상·키불일치 — 이 줄만 포기
    }
  }
  // 옛 평문 행(마이그레이션 전) — 그대로 사용.
  // 혹시 평문 컬럼에 암호문이 잘못 들어가 있으면 풀어서 준다(과거 실험 흔적 방어).
  if (plain && isEncryptedPayload(plain)) {
    try {
      return decryptStringNullable(plain);
    } catch {
      return null;
    }
  }
  return plain ?? null;
}

/** 조회 결과 행들을 화면용으로 — 원문/번역문을 평문화해서 붙인다. */
export function decryptTranscriptRows<
  T extends {
    source_text?: string | null;
    source_text_encrypted?: string | null;
    translated_text?: string | null;
    translated_text_encrypted?: string | null;
  },
>(rows: T[] | null | undefined): (T & { source_text: string | null; translated_text: string | null })[] {
  if (!rows?.length) return [];
  return rows.map((r) => ({
    ...r,
    source_text: readTranscriptField(r.source_text_encrypted, r.source_text),
    translated_text: readTranscriptField(r.translated_text_encrypted, r.translated_text),
  }));
}
