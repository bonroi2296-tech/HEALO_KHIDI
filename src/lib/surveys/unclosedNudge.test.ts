import { describe, it, expect } from "vitest";
import { computeUnclosedNudge, UNCLOSED_THRESHOLD_MS } from "./unclosedNudge";

const NOW = Date.parse("2026-07-20T00:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const DAY = 24 * 60 * 60 * 1000;

describe("computeUnclosedNudge", () => {
  it("대상이 없으면 null — 알림을 울리지 않는다", () => {
    expect(computeUnclosedNudge([], NOW)).toBeNull();
  });

  it("예정시각이 아직 24시간을 안 지났으면 넛지하지 않는다 (상담 직후 오발화 방지)", () => {
    const rows = [{ scheduled_at: ago(DAY - 60_000) }];
    expect(computeUnclosedNudge(rows, NOW)).toBeNull();
  });

  it("정확히 임계값(24시간)이면 대상에 포함한다", () => {
    const rows = [{ scheduled_at: ago(UNCLOSED_THRESHOLD_MS) }];
    expect(computeUnclosedNudge(rows, NOW)).toEqual({ count: 1, oldestDays: 1 });
  });

  it("여러 건이면 개수를 세고, 경과일은 가장 오래된 건 기준", () => {
    const rows = [
      { scheduled_at: ago(2 * DAY) },
      { scheduled_at: ago(9 * DAY) }, // 가장 오래됨
      { scheduled_at: ago(3 * DAY) },
    ];
    expect(computeUnclosedNudge(rows, NOW)).toEqual({ count: 3, oldestDays: 9 });
  });

  it("임계값 미만 건은 개수에서 빠진다", () => {
    const rows = [
      { scheduled_at: ago(5 * DAY) },
      { scheduled_at: ago(1000) }, // 방금 잡힌 예정 — 제외
    ];
    expect(computeUnclosedNudge(rows, NOW)).toEqual({ count: 1, oldestDays: 5 });
  });

  it("scheduled_at 이 없거나 깨졌으면 판단 보류 — 알림을 죽이지 않는다", () => {
    expect(computeUnclosedNudge([{ scheduled_at: null }], NOW)).toBeNull();
    expect(computeUnclosedNudge([{ scheduled_at: "언젠가" }], NOW)).toBeNull();
    // 정상 건이 섞여 있으면 그것만 센다
    const mixed = [{ scheduled_at: null }, { scheduled_at: ago(4 * DAY) }];
    expect(computeUnclosedNudge(mixed, NOW)).toEqual({ count: 1, oldestDays: 4 });
  });

  it("24시간을 갓 넘긴 건도 '0일'이 아니라 최소 1일로 표시한다", () => {
    const rows = [{ scheduled_at: ago(DAY + 60_000) }];
    expect(computeUnclosedNudge(rows, NOW)?.oldestDays).toBe(1);
  });
});
