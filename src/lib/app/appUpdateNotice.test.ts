import { describe, it, expect } from "vitest";
import { needsUpdate } from "./appUpdateNotice";

const MIN = { ios: 4, android: 10 };

describe("앱 업데이트 안내 판정", () => {
  it("기준보다 낮으면 안내한다", () => {
    expect(needsUpdate("ios", 3, MIN)).toBe(true);
    expect(needsUpdate("android", "9", MIN)).toBe(true);
  });

  it("기준과 같거나 높으면 안내하지 않는다", () => {
    expect(needsUpdate("ios", 4, MIN)).toBe(false);
    expect(needsUpdate("ios", 12, MIN)).toBe(false);
    expect(needsUpdate("android", "10", MIN)).toBe(false);
  });

  it("판 번호를 못 읽으면 «안내하지 않는다» — 멀쩡한 사람에게 띄우는 쪽이 더 나쁘다", () => {
    expect(needsUpdate("ios", null, MIN)).toBe(false);
    expect(needsUpdate("ios", "", MIN)).toBe(false);
    expect(needsUpdate("ios", "알수없음", MIN)).toBe(false);
  });

  it("앱이 아니면 안내하지 않는다 (웹 방문자에게 스토어를 권하지 않는다)", () => {
    expect(needsUpdate("web", 1, MIN)).toBe(false);
    expect(needsUpdate(null, 1, MIN)).toBe(false);
  });
});
