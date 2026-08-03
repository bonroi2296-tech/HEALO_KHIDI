import { describe, it, expect } from "vitest";
import {
  isAllowedProgressFileType,
  isWithinProgressSize,
  normalizeRecordType,
  progressStoragePath,
  validateProgressUpload,
  PROGRESS_MAX_SIZE,
} from "./progressRecords";

describe("progressRecords 검증 로직", () => {
  it("허용 파일 종류만 통과", () => {
    expect(isAllowedProgressFileType("application/pdf")).toBe(true);
    expect(isAllowedProgressFileType("image/jpeg")).toBe(true);
    expect(isAllowedProgressFileType("application/dicom")).toBe(true);
    expect(isAllowedProgressFileType("image/svg+xml")).toBe(false);
    expect(isAllowedProgressFileType("application/x-msdownload")).toBe(false);
    expect(isAllowedProgressFileType(null)).toBe(false);
  });

  it("크기 한도(50MB) 검사", () => {
    expect(isWithinProgressSize(1)).toBe(true);
    expect(isWithinProgressSize(PROGRESS_MAX_SIZE)).toBe(true);
    expect(isWithinProgressSize(PROGRESS_MAX_SIZE + 1)).toBe(false);
    expect(isWithinProgressSize(0)).toBe(false);
    expect(isWithinProgressSize(null)).toBe(false);
  });

  it("기록 종류 정규화 — 미상은 progress 폴백", () => {
    expect(normalizeRecordType("test_result")).toBe("test_result");
    expect(normalizeRecordType("imaging")).toBe("imaging");
    expect(normalizeRecordType("clinical_note")).toBe("clinical_note");
    expect(normalizeRecordType("garbage")).toBe("progress");
    expect(normalizeRecordType(null)).toBe("progress");
  });

  it("스토리지 경로 — inquiry별 폴더 + 무작위 조각 + 안전한 확장자", () => {
    expect(progressStoragePath(13, "ct-scan.PDF", "abc123")).toBe("progress/13/abc123.pdf");
    expect(progressStoragePath(7, "noext", "u1")).toBe("progress/7/u1.bin");
    // 확장자 인젝션 방지(경로 구분자/특수문자 제거)
    expect(progressStoragePath(1, "x.jp/g", "u")).toBe("progress/1/u.jpg");
  });

  it("업로드 검증 — 파일 있는 정상 케이스", () => {
    expect(
      validateProgressUpload({ inquiryId: "13", hasFile: true, fileType: "image/png", fileSize: 1000 })
    ).toEqual({ ok: true });
  });

  it("업로드 검증 — 메모만(파일 없음)도 허용, 단 빈 메모는 거부", () => {
    expect(validateProgressUpload({ inquiryId: 13, hasFile: false, note: "환자 회복 양호" })).toEqual({ ok: true });
    expect(validateProgressUpload({ inquiryId: 13, hasFile: false, note: "  " })).toEqual({
      ok: false,
      error: "empty_record",
    });
  });

  it("업로드 검증 — 잘못된 inquiry / 파일종류 / 크기 거부(코드형 에러)", () => {
    expect(validateProgressUpload({ inquiryId: "abc", hasFile: false, note: "x" })).toEqual({
      ok: false,
      error: "invalid_inquiry",
    });
    expect(
      validateProgressUpload({ inquiryId: 13, hasFile: true, fileType: "text/html", fileSize: 100 })
    ).toEqual({ ok: false, error: "file_type_not_allowed" });
    expect(
      validateProgressUpload({ inquiryId: 13, hasFile: true, fileType: "image/png", fileSize: PROGRESS_MAX_SIZE + 1 })
    ).toEqual({ ok: false, error: "file_too_large" });
  });
});
