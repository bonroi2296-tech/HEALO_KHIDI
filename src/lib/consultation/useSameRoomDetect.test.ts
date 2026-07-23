import { describe, it, expect } from "vitest";
import { correlate, bothLoud } from "./useSameRoomDetect";

// 판정 임계값(훅 내부와 동일해야 의미가 있다)
const CORR_ON = 0.72;
const CORR_OFF = 0.5;
const N = 80;

/** 말소리 비슷한 음량 파형: 말하는 구간과 쉬는 구간이 번갈아 나온다. */
function speech(seed = 1) {
  let x = seed;
  const rand = () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
  return Array.from({ length: N }, (_, i) => {
    const talking = Math.floor(i / 7) % 2 === 0; // 대략 0.4초씩 발화/침묵
    return talking ? 0.15 + rand() * 0.5 : rand() * 0.01;
  });
}

describe("correlate — 같은 공간 판정의 핵심", () => {
  it("같은 공간: 두 마이크가 같은 목소리를 잡으면 상관이 높다", () => {
    const mine = speech(1);
    // 옆자리 마이크 — 같은 소리를 조금 작게, 약간의 잡음과 함께 잡는다
    const theirs = mine.map((v, i) => v * 0.7 + (i % 5) * 0.004);
    const c = correlate(mine, theirs);
    expect(c).not.toBeNull();
    expect(c).toBeGreaterThan(CORR_ON);
  });

  it("다른 공간: 번갈아 말하면 상관이 낮다 (오탐 방지)", () => {
    const mine = speech(1);
    // 원격 상대는 내가 조용할 때 말한다 → 파형이 반대로 움직인다
    const theirs = mine.map((v) => (v > 0.1 ? 0.005 : 0.4));
    const c = correlate(mine, theirs);
    expect(c).not.toBeNull();
    expect(c).toBeLessThan(CORR_OFF);
  });

  it("둘 다 조용하면 판정을 보류한다(null) — 정적에서 오판 금지", () => {
    const quiet = Array.from({ length: N }, () => 0.001);
    expect(correlate(quiet, quiet)).toBeNull();
  });

  it("표본이 모자라면 판정을 보류한다(null)", () => {
    expect(correlate([0.5, 0.4], [0.5, 0.4])).toBeNull();
  });

  it("한쪽이 완전 무변화면 판정을 보류한다(0으로 나누기 방지)", () => {
    const mine = speech(2);
    const flat = Array.from({ length: N }, () => 0.3); // 변화 없음 → 분모 0
    expect(correlate(mine, flat)).toBeNull();
  });
});

describe("bothLoud — 하울링 즉발(빠른 경로) 판정", () => {
  const loud = Array.from({ length: N }, () => 0.4); // 양쪽 마이크가 계속 큰 소리(하울링)
  const quiet = Array.from({ length: N }, () => 0.02);

  it("양쪽이 동시에 계속 큰 소리면 하울링으로 잡는다(true)", () => {
    expect(bothLoud(loud, loud)).toBe(true);
  });

  it("지속 하울링(높고 평평)은 correlate 로는 못 잡지만 bothLoud 가 잡는다", () => {
    // 상관계수는 분산≈0 이라 null → 이게 빠른 경로를 따로 둔 이유다
    expect(correlate(loud, loud)).toBeNull();
    expect(bothLoud(loud, loud)).toBe(true);
  });

  it("한쪽만 큰 소리(정상 발화 교대)면 안 잡는다(false)", () => {
    expect(bothLoud(loud, quiet)).toBe(false);
    expect(bothLoud(quiet, loud)).toBe(false);
  });

  it("둘 다 조용하면 안 잡는다(false)", () => {
    expect(bothLoud(quiet, quiet)).toBe(false);
  });

  it("표본이 창 길이보다 모자라면 판정하지 않는다(false)", () => {
    expect(bothLoud([0.4, 0.4], [0.4, 0.4])).toBe(false);
  });
});
