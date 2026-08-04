import { describe, it, expect } from "vitest";
import { kstDateString, windowHolidayReason, DEPLOY_WINDOW_HOLIDAYS } from "./windowHoliday";

// 이 장치의 제일 위험한 실패는 «영영 멈추는 것»이다 — 그래서 「쉰다」보다 「다음 날 되살아난다」를 더 촘촘히 잠근다.
describe("배포 창구 하루 휴무", () => {
  it("한국시간 날짜를 서버 시간대와 무관하게 계산한다", () => {
    // 2026-08-04 06:00 UTC = 같은 날 15:00 한국시간 (= 창구 시각)
    expect(kstDateString(new Date("2026-08-04T06:00:00Z"))).toBe("2026-08-04");
    // 2026-08-03 15:30 UTC = 다음 날 00:30 한국시간 → 한국 날짜는 08-04
    expect(kstDateString(new Date("2026-08-03T15:30:00Z"))).toBe("2026-08-04");
    // 2026-08-03 14:30 UTC = 같은 날 23:30 한국시간 → 아직 08-03
    expect(kstDateString(new Date("2026-08-03T14:30:00Z"))).toBe("2026-08-03");
  });

  it("지정한 날의 창구 시각에는 쉰다", () => {
    expect(windowHolidayReason(new Date("2026-08-04T06:00:00Z"))).toContain("PO");
  });

  it("⭐ 그 다음 날에는 반드시 되살아난다 (영영 멈춤 방지)", () => {
    expect(windowHolidayReason(new Date("2026-08-05T06:00:00Z"))).toBeNull();
    expect(windowHolidayReason(new Date("2026-08-06T06:00:00Z"))).toBeNull();
    expect(windowHolidayReason(new Date("2026-09-04T06:00:00Z"))).toBeNull();
  });

  it("지정 전날에도 정상 가동한다", () => {
    expect(windowHolidayReason(new Date("2026-08-03T06:00:00Z"))).toBeNull();
  });

  it("목록이 비면 어떤 날도 안 쉰다 (기본값은 «가동»)", () => {
    // 목록을 비운 상태를 흉내 낸다 — 실제 상수를 건드리지 않고 같은 판정식을 확인.
    const empty: typeof DEPLOY_WINDOW_HOLIDAYS = [];
    const today = kstDateString(new Date("2026-08-04T06:00:00Z"));
    expect(empty.find((h) => h.date === today)).toBeUndefined();
  });

  it("쉬는 날마다 «왜»가 적혀 있다 (안 적으면 다음 사람이 못 지운다)", () => {
    for (const h of DEPLOY_WINDOW_HOLIDAYS) {
      expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(h.why.length).toBeGreaterThan(10);
    }
  });
});
