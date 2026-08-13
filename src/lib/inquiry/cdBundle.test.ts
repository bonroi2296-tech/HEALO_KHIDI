import { describe, it, expect } from "vitest";
// @ts-expect-error — JS 파일
import { pickImagingFiles, sumBytes, formatMB, isProbablyPhone } from "./cdBundle";

const f = (name: string, size = 1000) => ({ name, size });

describe("병원 CD 고르기", () => {
  it("뷰어 프로그램·자동실행 파일은 안 올린다", () => {
    const picked = pickImagingFiles([
      f("IM_0001"), f("IM_0002"), f("DICOMDIR"),
      f("AUTORUN.INF"), f("CDVIEWER.EXE"), f("CDVIEWER.JAR"),
      f("INDEX.HTM"), f("LABEL.HTM"), f("Thumbs.db"), f(".DS_Store"),
    ]).map((x: any) => x.name);
    expect(picked).toEqual(["IM_0001", "IM_0002", "DICOMDIR"]);
  });

  it("확장자 없는 낱장 영상을 버리지 않는다 — DICOM 은 보통 확장자가 없다", () => {
    expect(pickImagingFiles([f("I0000001"), f("1.2.840.113619.2")]).length).toBe(2);
  });

  it("빈 파일은 뺀다", () => {
    expect(pickImagingFiles([f("IM_0001", 0), f("IM_0002", 10)]).length).toBe(1);
  });

  it("총 용량은 고른 것만 더한다", () => {
    expect(sumBytes([f("a", 100), f("b", 250)] as any)).toBe(350);
  });

  it("용량 표시는 100MB 넘으면 정수로", () => {
    expect(formatMB(1024 * 1024 * 12.34)).toBe("12.3MB");
    expect(formatMB(1024 * 1024 * 301)).toBe("301MB");
  });

  it("폰 판별", () => {
    // navigator 가 없는 곳(서버)에서도 터지지 않아야 한다
    expect(typeof isProbablyPhone()).toBe("boolean");
  });
});
