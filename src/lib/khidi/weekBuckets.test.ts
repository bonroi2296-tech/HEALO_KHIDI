import { describe, it, expect } from "vitest";
import { kstWeekStartStr, lastNWeekStarts } from "./weekBuckets";

describe("kstWeekStartStr", () => {
  it("월요일 00:00 KST 가 속한 주의 월요일을 반환", () => {
    // 2026-06-29 는 월요일. 00:00 KST = 2026-06-28T15:00:00Z
    const mon = new Date("2026-06-28T15:00:00Z");
    expect(kstWeekStartStr(mon)).toBe("2026-06-29");
  });

  it("같은 주 일요일은 직전 월요일로 묶인다(KST)", () => {
    // 2026-07-05(일) 23:00 KST = 2026-07-05T14:00:00Z → 주시작 2026-06-29
    const sun = new Date("2026-07-05T14:00:00Z");
    expect(kstWeekStartStr(sun)).toBe("2026-06-29");
  });

  it("KST 자정 직전/직후 경계가 올바르게 갈린다", () => {
    // 2026-06-29 00:00 KST 직전(2026-06-28 23:59 KST = 2026-06-28T14:59Z, 일요일) → 직전 주(06-22)
    const justBefore = new Date("2026-06-28T14:59:00Z");
    expect(kstWeekStartStr(justBefore)).toBe("2026-06-22");
    // 직후(2026-06-29 00:01 KST = 2026-06-28T15:01Z) → 06-29
    const justAfter = new Date("2026-06-28T15:01:00Z");
    expect(kstWeekStartStr(justAfter)).toBe("2026-06-29");
  });
});

describe("lastNWeekStarts", () => {
  it("n개의 주 시작일을 오래된→최신 순으로, 현재 주 포함", () => {
    const now = new Date("2026-07-01T03:00:00Z"); // 2026-07-01(수) KST
    const got = lastNWeekStarts(now, 4);
    expect(got).toEqual(["2026-06-08", "2026-06-15", "2026-06-22", "2026-06-29"]);
  });

  it("마지막 원소는 항상 현재 주", () => {
    const now = new Date("2026-07-01T03:00:00Z");
    const got = lastNWeekStarts(now, 12);
    expect(got).toHaveLength(12);
    expect(got[got.length - 1]).toBe("2026-06-29");
  });
});
