/**
 * 파일 magic bytes (content sniffing) 검증
 *
 * 목적:
 * - 업로더가 declared MIME 만 보고 허용하면 공격자가 `.pdf.exe` 등 위장 업로드 가능
 * - 실제 파일 헤더의 매직 바이트를 확인해 선언된 타입과 일치하는지 검증
 * - 허용 타입 외에 매칭된 경우 업로드 차단
 *
 * 참고:
 * - JPEG: FF D8 FF
 * - PNG: 89 50 4E 47 0D 0A 1A 0A
 * - WEBP: RIFF....WEBP (52 49 46 46 _ _ _ _ 57 45 42 50)
 * - PDF: 25 50 44 46 2D ("%PDF-")
 * - DICOM: 128 byte preamble + "DICM" (0x44 0x49 0x43 0x4D at offset 128)
 */

export type AllowedMimeType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "application/msword"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/dicom";

export interface MagicCheckResult {
  ok: boolean;
  detectedMime?: AllowedMimeType;
  reason?: string;
}

/**
 * Buffer 의 첫 N 바이트로 파일 종류를 추정.
 *
 * @param buffer 최소 첫 512 바이트 이상
 * @param declaredMime formData 의 file.type
 * @returns ok=true + detectedMime 일치 여부, 실패 시 reason
 */
export function verifyFileMagic(
  buffer: Buffer,
  declaredMime: string
): MagicCheckResult {
  if (buffer.length < 12) {
    return { ok: false, reason: "file_too_small_for_magic_check" };
  }

  // PDF: "%PDF-"
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return check(declaredMime, "application/pdf");
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return check(declaredMime, "image/jpeg");
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return check(declaredMime, "image/png");
  }

  // WEBP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return check(declaredMime, "image/webp");
  }

  // GIF: "GIF87a" or "GIF89a"
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return check(declaredMime, "image/gif");
  }

  // DOC (OLE Compound File Binary): D0 CF 11 E0 A1 B1 1A E1
  if (
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  ) {
    return check(declaredMime, "application/msword");
  }

  // DOCX / Office OpenXML: ZIP 헤더 "PK\x03\x04" — 실제 OOXML 인지 구별하려면
  // ZIP 내 [Content_Types].xml 확인이 필요하지만 여기서는 ZIP 헤더만 보고
  // declared 가 docx 일 때 허용. Office 이외의 ZIP 포맷 위장은 여기서 통과될 수 있음.
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return check(
      declaredMime,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  }

  // DICOM: "DICM" at offset 128
  if (
    buffer.length > 132 &&
    buffer[128] === 0x44 &&
    buffer[129] === 0x49 &&
    buffer[130] === 0x43 &&
    buffer[131] === 0x4d
  ) {
    return check(declaredMime, "application/dicom");
  }

  return {
    ok: false,
    reason: `unrecognized_file_magic (declared=${declaredMime})`,
  };
}

function check(declared: string, detected: AllowedMimeType): MagicCheckResult {
  if (declared === detected) {
    return { ok: true, detectedMime: detected };
  }
  return {
    ok: false,
    detectedMime: detected,
    reason: `mime_mismatch (declared=${declared} vs actual=${detected})`,
  };
}
