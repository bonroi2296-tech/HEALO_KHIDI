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
    delete process.env.GOOGLE_CALENDAR_SHARE_WITH;
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

  it("캘린더 지정이 없으면 자기 캘린더를 만들고 공유할 사람에게 소유자로 넘긴다", async () => {
    delete process.env.GOOGLE_CALENDAR_ID;
    process.env.GOOGLE_CALENDAR_SHARE_WITH = "po@example.com";
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: "sa@example.iam.gserviceaccount.com",
      private_key: TEST_PRIVATE_KEY,
    });

    const calls: Array<{ url: string; method: string; body: any }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((async (url: any, init: any) => {
      const u = String(url);
      let parsed: any = null;
      try { parsed = init?.body ? JSON.parse(init.body) : null; } catch { parsed = null; }
      calls.push({ url: u, method: init?.method || "GET", body: parsed });
      if (u.includes("oauth2.googleapis.com")) {
        return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 });
      }
      if (u.includes("calendarList")) return new Response(JSON.stringify({ items: [] }), { status: 200 });
      if (u.includes("/acl")) return new Response(JSON.stringify({ id: "acl_1" }), { status: 200 });
      if (u.endsWith("/calendars")) return new Response(JSON.stringify({ id: "newcal@group.calendar.google.com" }), { status: 200 });
      return new Response(JSON.stringify({ id: "evt_2" }), { status: 200 });
    }) as any);

    const r = await createCalendarEvent({ summary: "[상담] 화상상담", startsAt: "2026-09-08T15:30:00+09:00" });

    expect(r.ok).toBe(true);
    // 캘린더를 새로 만들었다
    expect(calls.some((c) => c.url.endsWith("/calendars") && c.method === "POST")).toBe(true);
    // 그 캘린더를 사람에게 소유자로 공유했다
    const acl = calls.find((c) => c.url.includes("/acl"));
    expect(acl?.body).toMatchObject({ role: "owner", scope: { type: "user", value: "po@example.com" } });
    // 일정은 새로 만든 캘린더에 넣었다
    expect(calls.some((c) => c.url.includes(encodeURIComponent("newcal@group.calendar.google.com")) && c.url.includes("/events"))).toBe(true);
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
