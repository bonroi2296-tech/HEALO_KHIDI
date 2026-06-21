import { describe, it, expect } from "vitest";
import { surveyDispatchWindow, isWithinDispatchWindow } from "./dispatchWindow";

const H = 60 * 60 * 1000;
const D = 24 * H;
const NOW = Date.parse("2026-06-21T09:00:00.000Z"); // cron 예시 시각(09:00 UTC)

describe("surveyDispatchWindow", () => {
  it("windowEnd 는 24h 전, windowStart 는 14일 전(기본값)", () => {
    const { windowStart, windowEnd } = surveyDispatchWindow(NOW);
    expect(windowEnd).toBe(new Date(NOW - 24 * H).toISOString());
    expect(windowStart).toBe(new Date(NOW - 14 * D).toISOString());
  });

  it("옵션으로 지연·소급기간을 조절할 수 있다", () => {
    const { windowStart, windowEnd } = surveyDispatchWindow(NOW, {
      delayHours: 12,
      backfillDays: 3,
    });
    expect(windowEnd).toBe(new Date(NOW - 12 * H).toISOString());
    expect(windowStart).toBe(new Date(NOW - 3 * D).toISOString());
  });
});

describe("isWithinDispatchWindow — '하루 1회 cron 이 6시간 슬라이스 밖 완료분을 놓치던' 회귀 방지", () => {
  it("완료 24h 미만 세션은 아직 대상 아님(경험 정리 시간 확보)", () => {
    expect(isWithinDispatchWindow(NOW - 23 * H, NOW)).toBe(false);
    expect(isWithinDispatchWindow(NOW - 1 * H, NOW)).toBe(false);
  });

  it("완료 24h~14일 사이는 '하루 중 언제 완료됐든' 전부 대상", () => {
    // 옛 버그: 24~30h(6시간)만 잡아 그 외는 영구 누락. 이제 하루 전체가 잡혀야 한다.
    for (let h = 24; h <= 14 * 24; h += 1) {
      expect(isWithinDispatchWindow(NOW - h * H, NOW)).toBe(true);
    }
  });

  it("옛 버그가 놓치던 '30~48h 전 완료' 세션이 이제 대상에 포함된다", () => {
    // 예: 어제 정오(=cron 으로부터 약 21h~45h 전 분포) 완료분
    expect(isWithinDispatchWindow(NOW - 31 * H, NOW)).toBe(true); // 옛 윈도우(24~30h) 밖이었음
    expect(isWithinDispatchWindow(NOW - 45 * H, NOW)).toBe(true);
  });

  it("14일을 넘긴 아주 오래된 완료분은 제외(설문이 무의미하게 늦는 것 방지)", () => {
    expect(isWithinDispatchWindow(NOW - 15 * D, NOW)).toBe(false);
  });
});
