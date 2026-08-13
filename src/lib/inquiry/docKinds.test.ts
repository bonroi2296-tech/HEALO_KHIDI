import { describe, it, expect } from "vitest";
// @ts-expect-error — JS 파일
import { DOC_KINDS, NEEDED_KINDS, isKnownKind, kindLabel, missingKinds } from "./docKinds";

describe("서류 종류 판별", () => {
  it("아무것도 안 올리면 대학병원이 요구하는 것 전부가 「아직 없는 것」", () => {
    expect(missingKinds([])).toEqual(NEEDED_KINDS);
    expect(NEEDED_KINDS.length).toBeGreaterThan(0);
  });

  it("올린 종류는 「아직 없는 것」에서 빠진다", () => {
    const left = missingKinds([{ kind: "pathology" }, { kind: "blood" }]);
    expect(left).not.toContain("pathology");
    expect(left).not.toContain("blood");
    expect(left).toContain("discharge");
  });

  it("판별 못 한 파일은 아무것도 채워주지 않는다 — 「있다」로 세면 안 된다", () => {
    expect(missingKinds([{ kind: "unknown" }])).toEqual(NEEDED_KINDS);
    expect(missingKinds([{ kind: null }])).toEqual(NEEDED_KINDS);
  });

  it("AI 가 목록에 없는 종류를 지어내면 걸러진다", () => {
    expect(isKnownKind("pathology")).toBe(true);
    expect(isKnownKind("초음파_아무말")).toBe(false);
    expect(isKnownKind(undefined)).toBe(false);
  });

  it("모든 종류에 한국어·영어·러시아어 이름이 있다", () => {
    for (const k of DOC_KINDS) {
      for (const l of ["ko", "en", "ru"]) {
        expect(kindLabel(k.value, l), `${k.value} / ${l}`).toBeTruthy();
      }
    }
  });

  it("사용자가 고른 값도 AI 판독과 똑같이 셈에 들어간다", () => {
    // 「제가 판독한 게 틀렸다면 직접 수정」 — 고친 값이 반영 안 되면 그 기능이 무의미하다.
    const before = missingKinds([{ kind: "unknown" }]);
    const after = missingKinds([{ kind: "discharge", corrected: true }]);
    expect(before).toContain("discharge");
    expect(after).not.toContain("discharge");
  });
});
