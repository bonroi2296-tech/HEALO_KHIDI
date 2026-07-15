import { describe, it, expect } from "vitest";
import { hasMojibake } from "./noMojibake";

describe("hasMojibake", () => {
  it("깨진 문자열(U+FFFD)을 잡는다 — 중첩 객체·배열 포함", () => {
    expect(hasMojibake("[TEST] ���")).toBe(true);
    expect(hasMojibake({ intakePatch: { memo: "��" } })).toBe(true);
    expect(hasMojibake({ list: ["ok", { deep: "�" }] })).toBe(true);
  });

  it("정상 다국어(한·러·카자흐)·숫자·null은 통과", () => {
    expect(hasMojibake({ cancerType: "위암", memo: "Рак желудка / Асқазан", n: 3, x: null })).toBe(false);
    expect(hasMojibake("other")).toBe(false);
    expect(hasMojibake(undefined)).toBe(false);
  });

  it("깊은 중첩(1만 겹)에서도 RangeError 없이 동작 — 적대 페이로드 대비", () => {
    let deep: unknown = "�";
    for (let i = 0; i < 10_000; i++) deep = [deep];
    expect(hasMojibake(deep)).toBe(true);
    let clean: unknown = "ok";
    for (let i = 0; i < 10_000; i++) clean = { a: clean };
    expect(hasMojibake(clean)).toBe(false);
  });

  it("실사고 재현: CP949 한글을 UTF-8로 디코딩한 값은 걸린다 (POSTMORTEMS #92)", () => {
    // "테스트"의 CP949 바이트를 UTF-8로 해석 — #30·#35·#36이 깨진 것과 동일 경로
    const cp949Bytes = Buffer.from([0xc5, 0xd7, 0xbd, 0xba, 0xc6, 0xae]);
    expect(hasMojibake(cp949Bytes.toString("utf8"))).toBe(true);
  });
});
