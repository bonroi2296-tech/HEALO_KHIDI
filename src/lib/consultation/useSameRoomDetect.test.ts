import { describe, it, expect } from "vitest";
import { correlate, bothLoud, isTonalFrame, tonalBoth } from "./useSameRoomDetect";

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
  const loud = Array.from({ length: N }, () => 0.6); // 양쪽 마이크가 포화 수준으로 계속 큰 소리(하울링)
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

  it("양쪽이 '일반 큰 발화'(포화 이하)면 안 잡는다 — 겹발화·소음 오탐 방지(독립리뷰 #1)", () => {
    // 같은 방이 아닌 정상 원격통화의 겹발화/환자쪽 소음: 크지만 하울링 포화(0.45)엔 못 미침
    const talkLoud = Array.from({ length: N }, () => 0.3);
    expect(bothLoud(talkLoud, talkLoud)).toBe(false);
  });

  it("둘 다 조용하면 안 잡는다(false)", () => {
    expect(bothLoud(quiet, quiet)).toBe(false);
  });

  it("표본이 창 길이보다 모자라면 판정하지 않는다(false)", () => {
    expect(bothLoud([0.4, 0.4], [0.4, 0.4])).toBe(false);
  });

  it("2단(AGC) 문턱: 중간 음량(0.3)은 기본 문턱은 못 넘지만 낮춘 문턱은 넘는다", () => {
    // AGC 가 하울링을 눌러 0.45에 못 미치는 실전 케이스(2026-07-24 PO 실테스트) —
    // 이 음량대는 tonalBoth(단일음)와 결합해서만 하울링으로 인정된다(훅의 agcHowl 경로).
    const agcPressed = Array.from({ length: N }, () => 0.3);
    expect(bothLoud(agcPressed, agcPressed)).toBe(false); // 1단(0.45) 그대로
    expect(bothLoud(agcPressed, agcPressed, 3, 0.22)).toBe(true); // 2단(0.22)
    // ⚠️ 2026-08-18: 「한쪽만 넘으면 안 걸린다」를 못 박는다. 로봇 통화 기록
    //    my=0.221 / peer=0.217 을 보고 «둘 다 문턱에 닿았다»고 읽어 문턱을 올릴 뻔했는데,
    //    실제로는 상대가 0.22 를 한 번도 안 넘어 애초에 발동 불가였다(독립 리뷰가 잡음).
    expect(bothLoud([0.221, 0.221, 0.221], [0.217, 0.217, 0.217], 3, 0.22)).toBe(false);
  });
});

describe("isTonalFrame — 단일음(하울링 스펙트럼 지문) 판정", () => {
  const BINS = 256;
  // 하울링: 한 주파수 빈에 에너지 집중, 나머지는 바닥
  const howl = Array.from({ length: BINS }, (_, i) => (i === 40 ? 220 : 8));
  // 말소리: 여러 포먼트 대역에 에너지 분산
  const speechSpec = Array.from({ length: BINS }, (_, i) =>
    i > 4 && i < 90 ? 90 + ((i * 37) % 60) : 20
  );
  const silence = Array.from({ length: BINS }, () => 3);

  it("한 주파수에 몰린 스펙트럼(하울링)은 단일음이다", () => {
    expect(isTonalFrame(howl)).toBe(true);
  });

  it("포먼트로 퍼진 말소리는 단일음이 아니다 — 겹발화 오탐 방지", () => {
    expect(isTonalFrame(speechSpec)).toBe(false);
  });

  it("정적(피크 자체가 작음)은 단일음이 아니다", () => {
    expect(isTonalFrame(silence)).toBe(false);
  });

  it("DC·초저역(0~1번 빈)의 럼블은 무시한다", () => {
    const rumbleOnly = Array.from({ length: BINS }, (_, i) => (i < 2 ? 255 : 5));
    expect(isTonalFrame(rumbleOnly)).toBe(false);
  });
});

describe("tonalBoth — 양쪽 단일음 지속(2단 하울링의 스펙트럼 조건)", () => {
  const tonalRun = Array.from({ length: 10 }, () => true);
  const speechRun = Array.from({ length: 10 }, (_, i) => i % 3 === 0); // 가끔만 true(우연)

  it("양쪽 다 최근 창에서 단일음이 충분하면 true", () => {
    expect(tonalBoth(tonalRun, tonalRun)).toBe(true);
  });

  it("한쪽만 단일음이면 false — 원격 통화의 일방 소음 오탐 방지", () => {
    expect(tonalBoth(tonalRun, speechRun)).toBe(false);
  });

  it("표본이 창보다 모자라면 false(판정 보류)", () => {
    expect(tonalBoth([true, true], tonalRun)).toBe(false);
  });
});
