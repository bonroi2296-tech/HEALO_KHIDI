import { describe, it, expect } from "vitest";
import { pickImagingFiles, sumBytes, formatMB, isProbablyPhone , filesFromDrop, splitDrop } from "./cdBundle";

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

// ── 끌어다 놓은 폴더 훑기 ────────────────────────────────────────────────
/** 진짜 브라우저의 FileSystemEntry 흉내. readEntries 는 100개씩 끊어 준다. */
function fakeDir(name: string, fileNames: string[]): any {
  let sent = 0;
  return {
    isFile: false, isDirectory: true, name,
    createReader: () => ({
      readEntries(cb: (e: any[]) => void) {
        const batch = fileNames.slice(sent, sent + 100).map((n) => ({
          isFile: true, isDirectory: false, name: n,
          file: (ok: (f: any) => void) => ok(new File(["x"], n)),
        }));
        sent += batch.length;
        cb(batch);
      },
    }),
  };
}
const drop = (entry: any) => ({ items: [{ webkitGetAsEntry: () => entry }], files: [] });

describe("filesFromDrop — 폴더째 끌어다 놓기", () => {
  it("🛑 100개가 넘어도 «전부» 꺼낸다 (readEntries 는 한 번에 100개까지만 준다)", async () => {
    const names = Array.from({ length: 250 }, (_, i) => `IM${i}.dcm`);
    const got = await filesFromDrop(drop(fakeDir("DICOM", names)) as any);
    expect(got.length).toBe(250);
  });

  it("폴더 안 경로를 살려둔다 — 걸러내기가 이 값을 본다", async () => {
    const got = await filesFromDrop(drop(fakeDir("DICOM", ["IM1.dcm"])) as any);
    expect((got[0] as any).webkitRelativePath).toBe("DICOM/IM1.dcm");
  });

  it("폴더를 못 읽는 브라우저면 평범한 파일 목록으로 물러선다", async () => {
    const f = new File(["x"], "a.pdf");
    const got = await filesFromDrop({ items: [{}], files: [f] } as any);
    expect(got.length).toBe(1);
  });
});

// ── 폴더와 서류를 «같이» 놓았을 때 ────────────────────────────────────────
function fakeFile(name: string): any {
  return { isFile: true, isDirectory: false, name, file: (ok: (f: any) => void) => ok(new File(["x"], name)) };
}
function fakeDir2(name: string, names: string[]): any {
  let sent = 0;
  return {
    isFile: false, isDirectory: true, name,
    createReader: () => ({
      readEntries(cb: (e: any[]) => void) {
        const batch = names.slice(sent, sent + 100).map(fakeFile);
        sent += batch.length;
        cb(batch);
      },
    }),
  };
}

describe("splitDrop — 폴더와 서류를 갈라 보낸다", () => {
  it("🛑 폴더와 서류를 같이 놓아도 서류가 사라지지 않는다", async () => {
    const dt: any = {
      items: [
        { webkitGetAsEntry: () => fakeDir2("DICOM", ["IM1.dcm", "IM2.dcm"]) },
        { webkitGetAsEntry: () => fakeFile("소견서.pdf") },
      ],
      files: [],
    };
    const { folderFiles, looseFiles } = await splitDrop(dt);
    expect(folderFiles.map((f) => f.name)).toEqual(["IM1.dcm", "IM2.dcm"]);
    expect(looseFiles.map((f) => f.name)).toEqual(["소견서.pdf"]);
  });

  it("서류만 놓으면 폴더 쪽은 비어 있다", async () => {
    const dt: any = { items: [{ webkitGetAsEntry: () => fakeFile("a.pdf") }], files: [] };
    const { folderFiles, looseFiles } = await splitDrop(dt);
    expect(folderFiles).toEqual([]);
    expect(looseFiles.map((f) => f.name)).toEqual(["a.pdf"]);
  });

  it("폴더를 못 읽는 브라우저면 전부 낱개 서류로 본다", async () => {
    const f = new File(["x"], "b.pdf");
    const { folderFiles, looseFiles } = await splitDrop({ items: [{}], files: [f] } as any);
    expect(folderFiles).toEqual([]);
    expect(looseFiles.length).toBe(1);
  });
});
