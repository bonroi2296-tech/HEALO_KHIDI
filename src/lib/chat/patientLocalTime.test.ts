/**
 * 계약 테스트 — 환자 현지 시각 추정 (2026-07-23 PO: "새벽에 알림으로 깨우지 말자")
 */

import { describe, it, expect } from "vitest";
import { guessPatientTimezone, patientLocalTime } from "./patientLocalTime";

describe("guessPatientTimezone — 신호 우선순위", () => {
  it("웹 브라우저 tz(정확)가 최우선", () => {
    const g = guessPatientTimezone({
      metadata: { tz: "Asia/Tashkent", language: "ru", whatsapp: { wa_id: "79161234567" } },
    });
    expect(g).toEqual({ tz: "Asia/Tashkent", source: "browser" });
  });

  it("왓츠앱 전화 국가번호 — +7 대역으로 카자흐/러시아 구분", () => {
    expect(guessPatientTimezone({ metadata: { whatsapp: { wa_id: "77471234567" } } }).tz).toBe("Asia/Almaty");
    expect(guessPatientTimezone({ metadata: { whatsapp: { wa_id: "79161234567" } } }).tz).toBe("Europe/Moscow");
    expect(guessPatientTimezone({ metadata: { whatsapp: { wa_id: "998901234567" } } }).tz).toBe("Asia/Tashkent");
  });

  it("언어 폴백(텔레그램) — kz→알마티, ru→모스크바, en 은 추정 불가", () => {
    expect(guessPatientTimezone({ metadata: { language: "kz" } })).toEqual({ tz: "Asia/Almaty", source: "language" });
    expect(guessPatientTimezone({ metadata: { language: "ru" } }).tz).toBe("Europe/Moscow");
    expect(guessPatientTimezone({ metadata: { language: "en" } })).toEqual({ tz: null, source: null });
    expect(guessPatientTimezone({})).toEqual({ tz: null, source: null });
  });
});

describe("patientLocalTime — 현지 시각·심야 판정", () => {
  // 고정 시각: 2026-07-23 00:00 UTC = 서울 09:00 / 알마티 05:00 / 모스크바 03:00
  const NOW = new Date("2026-07-23T00:00:00Z");

  it("시간대별 현지 시각이 맞는다 (한국 아침 9시 = 알마티 새벽 5시)", () => {
    expect(patientLocalTime("Asia/Seoul", NOW)?.label).toBe("09:00");
    expect(patientLocalTime("Asia/Almaty", NOW)?.label).toBe("05:00");
    expect(patientLocalTime("Europe/Moscow", NOW)?.label).toBe("03:00");
  });

  it("심야 판정: 22:00~07:59 만 night", () => {
    expect(patientLocalTime("Asia/Seoul", NOW)?.night).toBe(false); // 09:00
    expect(patientLocalTime("Asia/Almaty", NOW)?.night).toBe(true); // 05:00
    expect(patientLocalTime("Europe/Moscow", NOW)?.night).toBe(true); // 03:00
    // 22시 경계: UTC 13:00 = 서울 22:00 → night
    expect(patientLocalTime("Asia/Seoul", new Date("2026-07-23T13:00:00Z"))?.night).toBe(true);
    // 21:59 는 낮 취급
    expect(patientLocalTime("Asia/Seoul", new Date("2026-07-23T12:59:00Z"))?.night).toBe(false);
  });

  it("잘못된 tz 는 null(표시 생략, throw 금지)", () => {
    expect(patientLocalTime("Not/AZone", NOW)).toBeNull();
  });
});
