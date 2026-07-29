import { describe, it, expect } from "vitest";
import { isQuietHour, shouldPush, ignoresQuietHours } from "./pushPolicy";

/** 주어진 «UTC 시각»을 ms 로. */
const utc = (h: number, m = 0) => Date.UTC(2026, 6, 28, h, m);

describe("shouldPush — 무엇을 폰까지 보내나", () => {
  it("급한 것만 보낸다", () => {
    expect(shouldPush("urgent")).toBe(true);
    expect(shouldPush("high")).toBe(true);
  });
  it("일반·낮음은 앱 안 종 아이콘만", () => {
    expect(shouldPush("normal")).toBe(false);
    expect(shouldPush("low")).toBe(false);
    expect(shouldPush(undefined)).toBe(false);
  });
});

describe("isQuietHour — 받는 사람 현지 기준", () => {
  it("러시아어 사용자(UTC+3): 현지 새벽 1시는 조용 시간", () => {
    // UTC 22시 = 모스크바 다음날 01시
    expect(isQuietHour(utc(22), "ru")).toBe(true);
  });
  it("러시아어 사용자(UTC+3): 현지 낮 3시는 아니다", () => {
    // UTC 12시 = 모스크바 15시
    expect(isQuietHour(utc(12), "ru")).toBe(false);
  });
  it("같은 순간이라도 사람마다 다르게 판정된다 (이게 이 함수의 존재 이유)", () => {
    // UTC 21시 = 한국 06시(조용) / 모스크바 24시(조용) / 영어권 21시(조용 아님)
    expect(isQuietHour(utc(21), "ko")).toBe(true);
    expect(isQuietHour(utc(21), "ru")).toBe(true);
    expect(isQuietHour(utc(21), "en")).toBe(false);
    // UTC 01시 = 한국 10시(아님) / 모스크바 04시(조용)
    expect(isQuietHour(utc(1), "ko")).toBe(false);
    expect(isQuietHour(utc(1), "ru")).toBe(true);
  });
  it("경계: 현지 22:00 은 조용, 08:00 은 아니다", () => {
    // 한국(UTC+9) 기준 → UTC 13시 = 22시 / UTC 23시 = 08시
    expect(isQuietHour(utc(13), "ko")).toBe(true);
    expect(isQuietHour(utc(23), "ko")).toBe(false);
  });
  it("카자흐 코드가 kk 로 와도 kz 로 본다 (경계 매핑 — 예전에 여기서 한 번 터졌다)", () => {
    expect(isQuietHour(utc(20), "kk")).toBe(isQuietHour(utc(20), "kz"));
    expect(isQuietHour(utc(3), "kk-KZ")).toBe(isQuietHour(utc(3), "kz"));
  });
  it("모르는 언어·빈값은 러시아어로 본다 (주 타겟)", () => {
    expect(isQuietHour(utc(22), "fr")).toBe(isQuietHour(utc(22), "ru"));
    expect(isQuietHour(utc(22), null)).toBe(isQuietHour(utc(22), "ru"));
  });
});

describe("ignoresQuietHours — 자는 시간에도 깨우는 것", () => {
  it("urgent 만 깨운다", () => {
    expect(ignoresQuietHours("urgent")).toBe(true);
    expect(ignoresQuietHours("high")).toBe(false);
  });
});
