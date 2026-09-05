import { describe, it, expect } from "vitest";
import {
  BY_PATIENT_LINK,
  daysSince,
  latestPatientNoteAt,
  latestStaffNoteAt,
  patientUnreadSince,
} from "./patientMessages";

const T = (h: number) => new Date(Date.UTC(2026, 8, 5, h)).toISOString(); // 2026-09-05 h시 UTC

describe("latestPatientNoteAt / latestStaffNoteAt — 작성자 표시로 가른다", () => {
  const raw = [
    { at: T(1), by: "coord@healwith.co.kr", text_encrypted: "x" },
    { at: T(3), by: BY_PATIENT_LINK, text_encrypted: "x" },
    { at: T(5), by: BY_PATIENT_LINK, text_encrypted: "x", removed_at: T(6) }, // 환자가 치움 — 안 센다
    { at: T(2), by: "코디네이터", text_encrypted: "x" },
  ];
  it("환자 글 중 치우지 않은 최신", () => {
    expect(latestPatientNoteAt(raw)).toBe(T(3));
  });
  it("직원 글 최신", () => {
    expect(latestStaffNoteAt(raw)).toBe(T(2));
  });
  it("읽기 모양(removedAt)도 받는다", () => {
    expect(latestPatientNoteAt([{ at: T(3), by: BY_PATIENT_LINK, removedAt: T(4) }])).toBeNull();
  });
  it("배열이 아니거나 비면 null", () => {
    expect(latestPatientNoteAt(null)).toBeNull();
    expect(latestPatientNoteAt("[]")).toBeNull();
    expect(latestStaffNoteAt([])).toBeNull();
  });
});

describe("patientUnreadSince — 열람·직원 글보다 «뒤»에 온 환자 글만", () => {
  it("아무도 안 열었고 직원 글도 없으면 안 읽음", () => {
    expect(patientUnreadSince(T(3), null, null)).toBe(T(3));
  });
  it("글 «뒤»에 상세를 열었으면 읽음", () => {
    expect(patientUnreadSince(T(3), T(4), null)).toBeNull();
  });
  it("글 «앞»에만 열었으면 여전히 안 읽음 (2026-09-05 문의 모양: 9/4 글, 마지막 열람은 그 전)", () => {
    expect(patientUnreadSince(T(3), T(1), T(2))).toBe(T(3));
  });
  it("직원 글이 뒤에 붙었으면 읽음", () => {
    expect(patientUnreadSince(T(3), null, T(5))).toBeNull();
  });
  it("환자 글이 없으면 null", () => {
    expect(patientUnreadSince(null, T(1), T(2))).toBeNull();
  });
  it("같은 시각이면 읽음으로 본다(열람이 글 저장과 같은 초)", () => {
    expect(patientUnreadSince(T(3), T(3), null)).toBeNull();
  });
});

describe("daysSince", () => {
  it("내림, 음수·이상값은 0", () => {
    const now = Date.parse(T(10));
    expect(daysSince(T(3), now)).toBe(0);
    expect(daysSince(new Date(now - 2.9 * 86_400_000).toISOString(), now)).toBe(2);
    expect(daysSince("garbage", now)).toBe(0);
    expect(daysSince(new Date(now + 86_400_000).toISOString(), now)).toBe(0);
  });
});
