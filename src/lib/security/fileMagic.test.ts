import { describe, it, expect } from "vitest";
import { verifyFileMagic } from "./fileMagic";

function make(bytes: number[]): Buffer {
  const arr = new Uint8Array(Math.max(bytes.length, 16));
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes[i];
  return Buffer.from(arr);
}

describe("verifyFileMagic", () => {
  it("PDF: declared + actual 일치", () => {
    const buf = make([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // %PDF-1.7
    expect(verifyFileMagic(buf, "application/pdf")).toEqual({
      ok: true,
      detectedMime: "application/pdf",
    });
  });

  it("JPEG 헤더는 JPEG 로 감지", () => {
    const buf = make([0xff, 0xd8, 0xff, 0xe0]);
    expect(verifyFileMagic(buf, "image/jpeg").ok).toBe(true);
  });

  it("PNG 헤더는 PNG 로 감지", () => {
    const buf = make([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(verifyFileMagic(buf, "image/png").ok).toBe(true);
  });

  it("WEBP (RIFF....WEBP) 헤더 감지", () => {
    const buf = make([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00, // size placeholder
      0x57, 0x45, 0x42, 0x50, // WEBP
    ]);
    expect(verifyFileMagic(buf, "image/webp").ok).toBe(true);
  });

  it("GIF89a 헤더 감지", () => {
    const buf = make([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(verifyFileMagic(buf, "image/gif").ok).toBe(true);
  });

  it("공격: declared PDF 지만 실제는 PNG → 차단", () => {
    const buf = make([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = verifyFileMagic(buf, "application/pdf");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("mime_mismatch");
    expect(result.detectedMime).toBe("image/png");
  });

  it("공격: declared JPEG 지만 실제는 PDF → 차단", () => {
    const buf = make([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const result = verifyFileMagic(buf, "image/jpeg");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("mime_mismatch");
  });

  it("공격: 알 수 없는 바이너리 (.exe 같은) → 차단", () => {
    // MZ (Windows EXE)
    const buf = make([0x4d, 0x5a, 0x90, 0x00]);
    const result = verifyFileMagic(buf, "application/pdf");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("unrecognized");
  });

  it("파일 너무 작으면 차단", () => {
    const buf = make([0x25]);
    expect(verifyFileMagic(buf, "application/pdf").ok).toBe(false);
  });

  it("DOC (OLE) 헤더 감지", () => {
    const buf = make([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(verifyFileMagic(buf, "application/msword").ok).toBe(true);
  });

  it("DOCX (ZIP) 헤더 감지", () => {
    const buf = make([0x50, 0x4b, 0x03, 0x04]);
    expect(
      verifyFileMagic(
        buf,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ).ok
    ).toBe(true);
  });
});
