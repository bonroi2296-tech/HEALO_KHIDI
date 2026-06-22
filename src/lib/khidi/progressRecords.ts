/**
 * 경과 기록(progress_records) 순수 검증 로직.
 *
 * 사후관리(ICT ④) 업로드의 파일 종류·크기·기록종류 검증을 서버 라우트와 분리해
 * 단위테스트로 잠근다(DB·스토리지 없이 검증). API: app/api/khidi/progress/route.ts
 */

// 환자 의료문서 업로드(app/api/patient/documents)와 동일한 허용 집합 — 일관성 유지.
export const PROGRESS_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/dicom",
] as const;

export const PROGRESS_MAX_SIZE = 20 * 1024 * 1024; // 20MB

// 사후관리 경과 기록 종류. 미상/오타는 'progress'(일반 경과)로 안전 폴백.
export const PROGRESS_RECORD_TYPES = [
  "test_result", // 검사결과
  "imaging", // 영상정보
  "clinical_note", // 임상 소견
  "progress", // 일반 경과
] as const;

export type ProgressRecordType = (typeof PROGRESS_RECORD_TYPES)[number];

export function isAllowedProgressFileType(type: string | null | undefined): boolean {
  return !!type && (PROGRESS_ALLOWED_TYPES as readonly string[]).includes(type);
}

export function isWithinProgressSize(size: number | null | undefined): boolean {
  return typeof size === "number" && size > 0 && size <= PROGRESS_MAX_SIZE;
}

export function normalizeRecordType(t: string | null | undefined): ProgressRecordType {
  return (PROGRESS_RECORD_TYPES as readonly string[]).includes(t as string)
    ? (t as ProgressRecordType)
    : "progress";
}

/**
 * documents 버킷 내 경과 파일 저장 경로. `uniq`는 호출부에서 주입(테스트 가능).
 * 열거(enumeration) 방지를 위해 무작위 조각을 파일명에 포함한다.
 */
export function progressStoragePath(
  inquiryId: number | string,
  fileName: string,
  uniq: string
): string {
  const parts = fileName.split(".");
  const rawExt = parts.length > 1 ? parts.pop()! : "";
  const ext = (rawExt || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  return `progress/${inquiryId}/${uniq}.${ext}`;
}

/**
 * 업로드 요청 1건을 검증. 파일 없이 note 만 보내는 것도 허용(메모형 경과).
 * 반환: { ok: true } | { ok: false, error } — error 는 코드형(메시지 노출 금지 규칙).
 */
export function validateProgressUpload(input: {
  inquiryId: unknown;
  hasFile: boolean;
  fileType?: string | null;
  fileSize?: number | null;
  note?: string | null;
}): { ok: true } | { ok: false; error: string } {
  const idNum = Number(input.inquiryId);
  if (!Number.isInteger(idNum) || idNum <= 0) return { ok: false, error: "invalid_inquiry" };

  if (!input.hasFile) {
    // 파일이 없으면 note 가 비어있지 않아야 의미가 있다.
    if (!input.note || !input.note.trim()) return { ok: false, error: "empty_record" };
    return { ok: true };
  }
  if (!isAllowedProgressFileType(input.fileType)) return { ok: false, error: "file_type_not_allowed" };
  if (!isWithinProgressSize(input.fileSize)) return { ok: false, error: "file_too_large" };
  return { ok: true };
}
