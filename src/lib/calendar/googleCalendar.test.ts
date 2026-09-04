import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateKeyPairSync } from "crypto";

// server-only 는 테스트 런타임에서 그냥 통과시킨다
vi.mock("server-only", () => ({}));

import { createCalendarEvent } from "./googleCalendar";

const OLD_ENV = { ...process.env };

// RS256 서명이 실제로 돌아야 하므로 진짜 키를 한 번 만들어 쓴다
const { privateKey: TEST_PRIVATE_KEY } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

describe("createCalendarEvent", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it("env 가 없으면 아무것도 호출하지 않고 조용히 건너뛴다", async () => {
    delete process.env.GOOGLE_CALENDAR_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const r = await createCalendarEvent({ summary: "x", startsAt: "2026-09-08T15:30:00+09:00" });

    expect(r).toEqual({ ok: false, skipped: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("캘린더 주소만 있고 서비스 계정 키가 없으면 건너뛴다", async () => {
    process.env.GOOGLE_CALENDAR_ID = "cal@example.com";
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const r = await createCalendarEvent({ summary: "x", startsAt: "2026-09-08T15:30:00+09:00" });

    expect(r.skipped).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("시작 시각이 올바르지 않으면 호출하지 않는다", async () => {
    process.env.GOOGLE_CALENDAR_ID = "cal@example.com";
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: "sa@example.iam.gserviceaccount.com",
      private_key: TEST_PRIVATE_KEY,
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const r = await createCalendarEvent({ summary: "x", startsAt: "언제인지 모름" });

    expect(r.skipped).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("끝 시각을 시작 + 길이(분)로 계산해 보낸다", async () => {
    process.env.GOOGLE_CALENDAR_ID = "cal@example.com";
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: "sa@example.iam.gserviceaccount.com",
      private_key: TEST_PRIVATE_KEY,
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((async (url: any) => {
      if (String(url).includes("oauth2.googleapis.com")) {
        return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 });
      }
      return new Response(JSON.stringify({ id: "evt_1" }), { status: 200 });
    }) as any);

    const r = await createCalendarEvent({
      summary: "[상담] 화상상담",
      startsAt: "2026-09-08T15:30:00+09:00",
      durationMinutes: 45,
    });

    expect(r.ok).toBe(true);
    expect(r.eventId).toBe("evt_1");

    const calendarCall = fetchSpy.mock.calls.find((c) => String(c[0]).includes("calendar/v3"));
    expect(calendarCall).toBeTruthy();
    const body = JSON.parse((calendarCall![1] as any).body);
    expect(body.start.dateTime).toBe("2026-09-08T06:30:00.000Z");
    // 15:30 + 45분 = 16:15 KST = 07:15 UTC
    expect(body.end.dateTime).toBe("2026-09-08T07:15:00.000Z");
    expect(body.start.timeZone).toBe("Asia/Seoul");
  });
});
