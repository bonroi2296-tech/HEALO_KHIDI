import { describe, it, expect } from "vitest";
import { shouldSwitchToServerStt, createSpokenClock, STT_WATCHDOG } from "./sttWatchdog";

/**
 * 자막 경로 워치독 — «말을 안 했으면 절대 서버 길로 안 넘어간다»가 핵심.
 * 예전 규칙(8초 무결과 → 무조건 전환)이 회의 중 «듣기만 한» 사람을 나쁜 길로 영영 보냈다.
 */
describe("shouldSwitchToServerStt", () => {
  it("켜자마자 남 말만 들었다(내 발화 0) → 8초가 지나도 안 넘어간다 (예전 버그)", () => {
    expect(shouldSwitchToServerStt({ elapsedMs: 8_000, spokenMs: 0, browserSttAlive: false })).toBe(false);
    expect(shouldSwitchToServerStt({ elapsedMs: 60_000, spokenMs: 0, browserSttAlive: false })).toBe(false);
  });

  it("내가 3초 넘게 말했는데 브라우저 결과가 0 → 넘어간다 (삼성 인터넷류 조용한 사망)", () => {
    expect(shouldSwitchToServerStt({ elapsedMs: 9_000, spokenMs: 3_200, browserSttAlive: false })).toBe(true);
  });

  it("브라우저가 결과를 냈으면 얼마를 기다렸든 안 넘어간다", () => {
    expect(shouldSwitchToServerStt({ elapsedMs: 30_000, spokenMs: 20_000, browserSttAlive: true })).toBe(false);
  });

  it("최소 대기(8초) 전에는 말을 했어도 안 넘어간다 — 첫 결과가 늦는 브라우저 보호", () => {
    expect(
      shouldSwitchToServerStt({ elapsedMs: STT_WATCHDOG.MIN_ELAPSED_MS - 1, spokenMs: 5_000, browserSttAlive: false })
    ).toBe(false);
  });
});

describe("createSpokenClock", () => {
  it("말한 구간만 누적한다(말하는 중이면 현재까지 포함)", () => {
    let t = 0;
    const clock = createSpokenClock(() => t);
    clock.set(true); // 0
    t = 1_000;
    clock.set(false); // +1000
    t = 5_000;
    clock.set(true); // 5000~
    t = 7_500;
    expect(clock.spokenMs()).toBe(3_500);
    clock.set(true); // 중복 on 은 무시
    t = 8_000;
    expect(clock.spokenMs()).toBe(4_000);
    clock.reset();
    expect(clock.spokenMs()).toBe(0);
  });
});
