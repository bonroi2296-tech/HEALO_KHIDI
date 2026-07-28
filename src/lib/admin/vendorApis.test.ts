import { describe, it, expect } from "vitest";
import { summarizeDeployments, EST_USD_PER_BUILD_MINUTE } from "./vendorApis";

/**
 * 어드민 「사용량·요금」 화면의 Vercel 빌드 집계.
 * 돈이 걸린 산수라, 특히 «쓰레기 값이 합계를 폭파시키는» 경우를 못 박는다.
 */

const MIN = 60_000;

describe("summarizeDeployments", () => {
  it("지어진 것(READY)만 요금에 넣는다 — 스킵·에러는 시간 0", () => {
    const r = summarizeDeployments([
      { state: "READY", target: "production", buildingAt: 0 + 1, ready: 1 + 3 * MIN },
      { state: "CANCELED", target: null, buildingAt: 1, ready: 1 + 99 * MIN },
      { state: "ERROR", target: null, buildingAt: 1, ready: 1 + 99 * MIN },
    ]);
    expect(r.builtDeployments).toBe(1);
    expect(r.skippedDeployments).toBe(1);
    expect(r.buildWallMinutes).toBe(3);
  });

  it("buildingAt 이 0/누락인 행이 합계를 폭파시키지 않는다 (2026-07-28 실제로 «8,900만 분»이 나왔던 케이스)", () => {
    const r = summarizeDeployments([
      { state: "READY", buildingAt: 0, ready: 1_784_000_000_000 }, // 에폭 그대로 = 쓰레기
      { state: "READY", buildingAt: 1_000, ready: 1_000 + 2 * MIN },
    ]);
    expect(r.buildWallMinutes).toBe(2); // 쓰레기 행은 버리고 정상 2분만
  });

  it("끝나지 않은 빌드(ready 없음)·시간 역전은 0 분으로 센다", () => {
    const r = summarizeDeployments([
      { state: "READY", buildingAt: 5_000 },
      { state: "READY", buildingAt: 9_000, ready: 5_000 },
    ]);
    expect(r.buildWallMinutes).toBe(0);
  });

  it("프로덕션 건수를 따로 세고, 추정 비용은 교정 단가를 그대로 쓴다", () => {
    const r = summarizeDeployments([
      { state: "READY", target: "production", buildingAt: 1, ready: 1 + 10 * MIN },
      { state: "READY", target: null, buildingAt: 1, ready: 1 + 10 * MIN },
    ]);
    expect(r.deploymentsThisPeriod).toBe(2);
    expect(r.productionDeployments).toBe(1);
    expect(r.estimatedBuildCostUsd).toBeCloseTo(Math.round(20 * EST_USD_PER_BUILD_MINUTE * 100) / 100, 5);
  });

  it("배포가 하나도 없으면 전부 0 (조용한 NaN 금지)", () => {
    const r = summarizeDeployments([]);
    expect(r).toMatchObject({
      deploymentsThisPeriod: 0,
      builtDeployments: 0,
      skippedDeployments: 0,
      buildWallMinutes: 0,
      estimatedBuildCostUsd: 0,
    });
  });
});
