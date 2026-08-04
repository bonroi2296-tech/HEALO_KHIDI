/**
 * 일정 파일(.ics) 잠금 — 이게 깨지면 달력 앱이 파일을 통째로 거부하고,
 * 「받는 사람 시간대로 자동 표시」라는 목적이 조용히 사라진다(메일은 정상으로 보임).
 */
import { describe, it, expect } from "vitest";
import { buildConsultationIcs } from "./icsInvite";

// 2026-08-03 15:00 KST = 06:00 UTC
const SCHEDULED = "2026-08-03T06:00:00.000Z";

describe("buildConsultationIcs", () => {
  const ics = buildConsultationIcs({
    uid: "abc-123",
    scheduledAt: SCHEDULED,
    joinUrl: "https://healwith.co.kr/c/xyz",
    lang: "ru",
  });

  it("시각은 UTC 로 담긴다 — 달력이 각자 현지 시각으로 그린다", () => {
    expect(ics).toContain("DTSTART:20260803T060000Z");
    expect(ics).toContain("DTEND:20260803T070000Z"); // 기본 60분
  });

  it("필수 뼈대와 줄바꿈(CRLF)", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("UID:abc-123@healwith.co.kr");
    expect(ics).toContain("URL:https://healwith.co.kr/c/xyz");
    expect(ics).toContain("SUMMARY:healwith — онлайн-консультация");
    // LF 만 있는 줄이 있으면 일부 달력 앱이 거부한다
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("쉼표·줄바꿈이 든 값은 이스케이프한다", () => {
    const out = buildConsultationIcs({
      uid: "u,1",
      scheduledAt: SCHEDULED,
      joinUrl: "https://x/a,b",
    });
    expect(out).toContain("UID:u\\,1@healwith.co.kr");
    expect(out).toContain("URL:https://x/a\\,b");
  });
});
