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
  | "application/dicom"
  | "application/zip"
  | "application/vnd.rar"
  | "audio/mpeg"
  | "audio/mp4"
  | "audio/wav"
  | "audio/ogg"
  | "audio/webm"
  | "audio/amr"
  | "text/plain";

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
  // ZIP 계열(PK) — docx 도 zip 이고 병원 CD 묶음(.zip)도 zip 이라 겉만으로는 못 가른다.
  // 선언한 쪽이 둘 중 하나면 통과시키고, 진짜 내용물 판정은 여는 쪽(뷰어·파서)이 한다.
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    if (declaredMime === "application/zip" || declaredMime === "application/x-zip-compressed") {
      return { ok: true, detectedMime: "application/zip" };
    }
    return check(
      declaredMime,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  }

  // RAR: "Rar!" (v4 는 뒤가 0x00, v5 는 0x01 0x00)
  if (
    buffer.length > 7 &&
    buffer[0] === 0x52 && buffer[1] === 0x61 && buffer[2] === 0x72 && buffer[3] === 0x21 &&
    buffer[4] === 0x1a && buffer[5] === 0x07
  ) {
    return check(declaredMime, "application/vnd.rar");
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

  // ── 음성 ─────────────────────────────────────────────────────────
  // MP3: "ID3" 태그로 시작하거나, 태그 없이 프레임부터 시작(첫 11비트가 전부 1).
  // JPEG(FF D8 …)는 위에서 이미 걸러졌으므로 여기서 겹치지 않는다.
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) ||
    (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
  ) {
    return check(declaredMime, "audio/mpeg");
  }

  // M4A(아이폰 음성 메모)·3GP: 오프셋 4에 "ftyp" — MP4 계열 상자.
  if (
    buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70
  ) {
    return check(declaredMime, "audio/mp4");
  }

  // WAV: RIFF....WAVE (WebP 도 RIFF 로 시작하지만 9~12번째가 "WEBP" 라 위에서 갈린다)
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45
  ) {
    return check(declaredMime, "audio/wav");
  }

  // OGG(왓즈앱·텔레그램 음성): "OggS"
  if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    return check(declaredMime, "audio/ogg");
  }

  // WebM/Matroska: EBML 머리 1A 45 DF A3
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return check(declaredMime, "audio/webm");
  }

  // AMR(구형 안드로이드 녹음): "#!AMR"
  if (
    buffer[0] === 0x23 && buffer[1] === 0x21 && buffer[2] === 0x41 &&
    buffer[3] === 0x4d && buffer[4] === 0x52
  ) {
    return check(declaredMime, "audio/amr");
  }

  // ── 텍스트 메모 ──────────────────────────────────────────────────
  // 🛑 txt 에는 «머리 표식이 없다» — 어떤 바이트로도 「이건 텍스트다」라고 단정할 수 없다.
  //    그래서 반대로 «실행파일이 아님»을 확인한다: 앞 512바이트에 NUL(0x00)이 하나도 없으면 텍스트로 본다.
  //    (git 이 이진/텍스트를 가르는 것과 같은 기준. exe·ELF·오피스 문서는 앞머리에 NUL 이 반드시 섞인다.)
  //    ⚠️ 반드시 «맨 마지막»에 둔다 — 앞의 표식 검사들이 먼저 제 형식을 집어가야 하고,
  //    선언이 정확히 text/plain 일 때만 이 길로 온다.
  if (declaredMime === "text/plain" && !buffer.includes(0x00)) {
    return { ok: true, detectedMime: "text/plain" };
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
