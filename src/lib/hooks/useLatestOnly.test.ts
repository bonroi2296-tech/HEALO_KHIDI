import { describe, it, expect } from "vitest";
import { createLatestGate } from "./useLatestOnly";

// 이 자물쇠가 없으면: 거름망을 바꾼 순간 조회가 겹치고, 늦게 온 «옛» 응답이 새 목록을 덮는다.
// 화면엔 「전체」가 눌려 있는데 목록은 옛 거름망 것 — 오류가 안 떠서 아무도 고장인 줄 모른다.
describe("늦게 온 옛 응답 막기", () => {
  it("혼자 도는 조회는 최신이다", () => {
    const begin = createLatestGate();
    const isLatest = begin();
    expect(isLatest()).toBe(true);
  });

  it("새 조회가 시작되면 «앞선» 조회는 최신이 아니다 (핵심)", () => {
    const begin = createLatestGate();
    const first = begin();   // 거름망 '미확인' 조회
    const second = begin();  // 딥링크가 '전체'로 바꿔 다시 조회
    expect(first()).toBe(false); // 늦게 와도 버려진다
    expect(second()).toBe(true);
  });

  it("셋이 겹쳐도 마지막만 남는다", () => {
    const begin = createLatestGate();
    const a = begin(), b = begin(), c = begin();
    expect([a(), b(), c()]).toEqual([false, false, true]);
  });

  it("최신 판정은 몇 번을 물어도 같다 (한 번 쓰고 마는 표가 아니다)", () => {
    const begin = createLatestGate();
    const first = begin();
    expect(first()).toBe(true);
    expect(first()).toBe(true);
    begin();
    expect(first()).toBe(false);
    expect(first()).toBe(false);
  });

  it("자물쇠는 화면마다 따로다 (한 화면 조회가 다른 화면을 무르게 하지 않는다)", () => {
    const alerts = createLatestGate();
    const leads = createLatestGate();
    const alertsReq = alerts();
    leads(); leads(); // 다른 화면에서 조회가 여러 번 돌아도
    expect(alertsReq()).toBe(true); // 이쪽은 그대로 최신
  });

  it("실제 겹침을 흉내내도 마지막 응답만 반영된다", async () => {
    const begin = createLatestGate();
    const applied: string[] = [];
    const load = async (label: string, delayMs: number) => {
      const isLatest = begin();
      await new Promise((r) => setTimeout(r, delayMs));
      if (!isLatest()) return;
      applied.push(label);
    };
    // '미확인'이 «먼저» 시작했지만 «늦게» 도착한다 — 자물쇠가 없으면 이게 이긴다.
    await Promise.all([load("미확인", 30), load("전체", 5)]);
    expect(applied).toEqual(["전체"]);
  });
});
