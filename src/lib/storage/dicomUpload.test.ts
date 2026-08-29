import { describe, it, expect } from "vitest";
import { normalizeMime } from "./directUpload";
import { verifyFileMagic } from "@/lib/security/fileMagic";
import { UPLOAD_POLICY } from "@/lib/uploadPolicy";

/**
 * 자료 칸에서 낱개 DICOM 을 받는다 (2026-08-18 PO 지시).
 *
 * 🛑 여기서 지켜야 할 두 가지가 서로 반대 방향이다:
 *   ① 병원 CD 의 DICOM 은 «확장자가 없다». 실측(환자 CD 601개): 이름이 Z01·Z02… 였고
 *      브라우저는 형식을 빈 문자열로 준다 → 확장자·브라우저 형식만 믿으면 못 받는다.
 *   ② 그렇다고 확장자 없는 걸 다 통과시키면 아무거나 들어온다
 *      → 진짜 문지기는 «앞머리 검사»다. DICOM 은 128바이트 머리말 뒤에 "DICM" 이 있어야 한다.
 */
function dicomBytes(): Buffer {
  const b = Buffer.alloc(600, 0);
  b.write("DICM", 128, "ascii");
  return b;
}

describe("자료 칸의 DICOM 받기", () => {
  it("자료 칸이 DICOM 을 목록에 넣고 있다", () => {
    expect(UPLOAD_POLICY.medicalDoc.mimes).toContain("application/dicom");
    expect(UPLOAD_POLICY.medicalDoc.exts).toContain("DICOM");
  });

  it("확장자 없는 파일(Z01 같은 CD 파일)을 DICOM 으로 본다", () => {
    expect(normalizeMime("Z01", "")).toBe("application/dicom");
    expect(normalizeMime("DICOMDIR", "")).toBe("application/dicom");
    expect(normalizeMime("scan.dcm", "")).toBe("application/dicom");
  });

  it("브라우저별 딴 이름(x-rar·octet-stream)을 앞머리 검사가 아는 이름으로 맞춘다", () => {
    // 🛑 안 맞추면 sign 통과 → commit 의 앞머리 검사가 mime_mismatch 로 지운다(「올렸는데 사라짐」)
    expect(normalizeMime("cd.rar", "application/x-rar-compressed")).toBe("application/vnd.rar");
    expect(normalizeMime("cd.rar", "application/octet-stream")).toBe("application/vnd.rar");
    expect(normalizeMime("cd.zip", "application/octet-stream")).toBe("application/zip");
    expect(normalizeMime("IM0001.dcm", "application/octet-stream")).toBe("application/dicom");
    expect(normalizeMime("Z01", "application/octet-stream")).toBe("application/dicom");
  });

  it("브라우저가 형식을 알려주면 그걸 존중한다 (사진을 DICOM 으로 만들지 않는다)", () => {
    expect(normalizeMime("x.jpg", "image/jpeg")).toBe("image/jpeg");
    expect(normalizeMime("보고서.pdf", "application/pdf")).toBe("application/pdf");
  });

  it("진짜 DICOM 은 앞머리 검사를 통과한다", () => {
    expect(verifyFileMagic(dicomBytes(), "application/dicom").ok).toBe(true);
  });

  it("🛑 확장자만 없는 «가짜»는 막힌다 — 관대함이 구멍이 되지 않는다", () => {
    const notDicom = Buffer.alloc(600, 0x41); // "AAAA…" — 128바이트째에 DICM 이 없다
    const mime = normalizeMime("Z01", "");    // 이름만 보면 DICOM 으로 보이지만
    expect(verifyFileMagic(notDicom, mime).ok).toBe(false);
  });
});
