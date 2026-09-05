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

// 2026-09-02 추가 — 환자가 음성 메모·텍스트 메모를 보내는 길을 열면서.
describe("verifyFileMagic — 음성", () => {
  it("MP3: ID3 태그로 시작", () => {
    const buf = make([0x49, 0x44, 0x33, 0x03]); // "ID3"
    expect(verifyFileMagic(buf, "audio/mpeg").ok).toBe(true);
  });

  it("MP3: 태그 없이 프레임부터 시작(FF FB)", () => {
    const buf = make([0xff, 0xfb, 0x90, 0x00]);
    expect(verifyFileMagic(buf, "audio/mpeg").ok).toBe(true);
  });

  it("M4A(아이폰 음성 메모): 오프셋 4의 ftyp", () => {
    const buf = make([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]);
    expect(verifyFileMagic(buf, "audio/mp4").ok).toBe(true);
  });

  it("WAV 는 RIFF 로 시작하지만 WebP 와 갈린다", () => {
    const wav = make([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00,
      0x57, 0x41, 0x56, 0x45, // WAVE
    ]);
    expect(verifyFileMagic(wav, "audio/wav").ok).toBe(true);
    // 같은 RIFF 라도 WebP 를 음성이라고 우기면 막혀야 한다
    const webp = make([
      0x52, 0x49, 0x46, 0x46,
      0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, // WEBP
    ]);
    expect(verifyFileMagic(webp, "audio/wav").ok).toBe(false);
  });

  it("OGG(왓즈앱·텔레그램 음성) 감지", () => {
    const buf = make([0x4f, 0x67, 0x67, 0x53]); // "OggS"
    expect(verifyFileMagic(buf, "audio/ogg").ok).toBe(true);
  });

  it("AMR(구형 안드로이드 녹음) 감지", () => {
    const buf = make([0x23, 0x21, 0x41, 0x4d, 0x52]); // "#!AMR"
    expect(verifyFileMagic(buf, "audio/amr").ok).toBe(true);
  });

  it("공격: 실제는 PNG 인데 음성이라고 선언 → 차단", () => {
    const buf = make([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(verifyFileMagic(buf, "audio/mpeg").ok).toBe(false);
  });
});

describe("verifyFileMagic — 텍스트 메모", () => {
  it("평범한 텍스트는 통과", () => {
    const buf = Buffer.from("환자 증상 메모입니다. 어제부터 통증이 있었습니다.", "utf8");
    expect(verifyFileMagic(buf, "text/plain")).toEqual({
      ok: true,
      detectedMime: "text/plain",
    });
  });

  it("공격: 앞머리에 NUL 이 섞인 이진파일을 텍스트라고 선언 → 차단", () => {
    // 윈도우 실행파일("MZ" + NUL 다수)을 .txt 로 위장한 경우
    const buf = make([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    expect(verifyFileMagic(buf, "text/plain").ok).toBe(false);
  });

  it("텍스트 내용이어도 다른 형식으로 선언하면 차단", () => {
    const buf = Buffer.from("이것은 그냥 글자입니다 그렇지만 PDF 는 아닙니다", "utf8");
    expect(verifyFileMagic(buf, "application/pdf").ok).toBe(false);
  });
});
