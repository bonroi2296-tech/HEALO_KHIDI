/**
 * healwith: 구글 캘린더에 일정 등록 (서버 전용)
 *
 * 화상상담이 잡히면 PO 구글 캘린더에도 같은 일정을 넣어, 캘린더만 봐도 그 주 일정이 다 보이게 한다.
 * 인증은 `src/lib/push/fcm.ts` 와 같은 방식(서비스 계정 JSON → RS256 JWT → OAuth 토큰). 새 의존성 0.
 *
 * ⚠️ fcm.ts 의 토큰 캐시를 재사용하지 않고 여기서 따로 캐시한다.
 *    OAuth 토큰은 **scope 마다 별개**여서, 푸시용 토큰으로 캘린더를 호출하면 403 이 난다.
 *
 * 환경변수:
 *   - GOOGLE_SERVICE_ACCOUNT_JSON  (필수. 서비스 계정 키 JSON 전체 문자열 — 푸시와 같은 키)
 *   - GOOGLE_CALENDAR_SHARE_WITH   (일정을 볼 사람의 구글 계정 주소. 이것만 넣으면 나머지는 자동)
 *   - GOOGLE_CALENDAR_ID           (선택. 특정 캘린더를 직접 지정하고 싶을 때만)
 *
 * 📌 **사람이 캘린더를 공유해 줄 필요가 없다.** `GOOGLE_CALENDAR_ID` 가 없으면 서비스 계정이
 *    «자기 소유» 캘린더(healwith 상담)를 한 번 만들고, 그것을 `GOOGLE_CALENDAR_SHARE_WITH` 에게
 *    소유자 권한으로 공유한다. 받는 쪽 구글 캘린더에는 그때부터 그냥 보인다.
 *    남의 캘린더에 쓰기 권한을 얻는 방식이 아니므로 권한 범위도 좁다.
 *
 * 🛑 캘린더 본문에 환자 이름·연락처 같은 개인정보를 넣지 않는다. 구글 서버에 평문으로 남는다.
 */
import "server-only";
import { createSign } from "crypto";

type ServiceAccount = { client_email: string; private_key: string };

// 캘린더 자체를 만들고 공유해야 하므로 events 가 아니라 calendar 전체 스코프가 필요하다
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const OWN_CALENDAR_SUMMARY = "healwith 상담";

let cachedToken: { value: string; expEpochMs: number } | null = null;
let cachedCalendarId: string | null = null;

function getServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw);
    if (sa.client_email && sa.private_key) return sa;
  } catch {
    /* 파싱 실패 → 미설정 취급 */
  }
  return null;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(sa: ServiceAccount): Promise<string | null> {
  if (cachedToken && cachedToken.expEpochMs - 60_000 > Date.now()) return cachedToken.value;

  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: CALENDAR_SCOPE,
      aud: TOKEN_URL,
      iat: nowSec,
      exp: nowSec + 3600,
    })
  );
  const signingInput = `${header}.${claims}`;
  const signature = base64url(createSign("RSA-SHA256").update(signingInput).sign(sa.private_key));

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${signature}`,
    }),
  });
  if (!res.ok) {
    console.error("[calendar] OAuth 토큰 발급 실패:", res.status);
    return null;
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;
  cachedToken = {
    value: json.access_token,
    expEpochMs: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return json.access_token;
}

/** 구글 캘린더 API 호출 한 번. 실패하면 null 을 돌려주고 이유를 남긴다. */
async function callCalendar(
  token: string,
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<any | null> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3/${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    console.error(`[calendar] ${init?.method ?? "GET"} ${path} 실패:`, res.status, await res.text().catch(() => ""));
    return null;
  }
  return res.json().catch(() => ({}));
}

/**
 * 일정을 넣을 캘린더를 정한다.
 * 1) `GOOGLE_CALENDAR_ID` 가 있으면 그대로 쓴다(사람이 직접 지정한 경우).
 * 2) 없으면 서비스 계정이 «자기 소유» 캘린더를 찾고, 없으면 만들어서
 *    `GOOGLE_CALENDAR_SHARE_WITH` 에게 소유자 권한으로 공유한다.
 * 성공하면 캘린더 ID 를 캐시해 다음 호출부터는 조회하지 않는다.
 */
async function resolveCalendarId(token: string): Promise<string | null> {
  const explicit = process.env.GOOGLE_CALENDAR_ID;
  if (explicit) return explicit;
  if (cachedCalendarId) return cachedCalendarId;

  const list = await callCalendar(token, "users/me/calendarList?minAccessRole=owner&maxResults=250");
  const found = (list?.items ?? []).find((c: any) => c?.summary === OWN_CALENDAR_SUMMARY);
  if (found?.id) {
    cachedCalendarId = found.id;
    return found.id;
  }

  const created = await callCalendar(token, "calendars", {
    method: "POST",
    body: { summary: OWN_CALENDAR_SUMMARY, timeZone: "Asia/Seoul" },
  });
  if (!created?.id) return null;

  // 만든 직후 사람에게 공유한다. 여기서 실패해도 일정 등록 자체는 진행한다
  // (나중에 공유만 다시 걸면 되고, 일정을 잃는 것보다 낫다).
  const shareWith = process.env.GOOGLE_CALENDAR_SHARE_WITH;
  if (shareWith) {
    await callCalendar(token, `calendars/${encodeURIComponent(created.id)}/acl`, {
      method: "POST",
      body: { role: "owner", scope: { type: "user", value: shareWith } },
    });
  } else {
    console.warn("[calendar] GOOGLE_CALENDAR_SHARE_WITH 가 없어 캘린더를 아무에게도 공유하지 않았다");
  }

  cachedCalendarId = created.id;
  return created.id;
}

export type CalendarEventInput = {
  /** 제목. 개인정보를 넣지 말 것 */
  summary: string;
  /** 시작 시각 (ISO 8601) */
  startsAt: string;
  /** 길이(분). 기본 30 */
  durationMinutes?: number;
  /** 설명. 개인정보를 넣지 말 것 */
  description?: string;
  /** 구글 캘린더 색 번호. 규칙은 memory/google-calendar-connector-account.md */
  colorId?: string;
};

export type CalendarResult = { ok: boolean; skipped: boolean; eventId?: string };

/**
 * 캘린더에 일정 하나를 넣는다. env 미설정이면 무음 no-op(skipped).
 * 호출처에서 best-effort 로 쓰고, 실패해도 본 작업(상담 생성)을 막지 않는다.
 */
export async function createCalendarEvent(input: CalendarEventInput): Promise<CalendarResult> {
  const sa = getServiceAccount();
  // 볼 사람도 없고 캘린더 지정도 없으면 넣을 곳이 없다 → 무음으로 넘어간다
  if (!sa || (!process.env.GOOGLE_CALENDAR_ID && !process.env.GOOGLE_CALENDAR_SHARE_WITH)) {
    return { ok: false, skipped: true };
  }

  const start = new Date(input.startsAt);
  if (Number.isNaN(start.getTime())) {
    console.warn("[calendar] 시작 시각이 올바르지 않아 건너뜀:", input.startsAt);
    return { ok: false, skipped: true };
  }
  const end = new Date(start.getTime() + (input.durationMinutes ?? 30) * 60_000);

  const accessToken = await getAccessToken(sa);
  if (!accessToken) return { ok: false, skipped: false };

  const calendarId = await resolveCalendarId(accessToken);
  if (!calendarId) return { ok: false, skipped: false };

  const json = await callCalendar(accessToken, `calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: {
      summary: input.summary,
      description: input.description,
      colorId: input.colorId,
      start: { dateTime: start.toISOString(), timeZone: "Asia/Seoul" },
      end: { dateTime: end.toISOString(), timeZone: "Asia/Seoul" },
    },
  });
  if (!json?.id) return { ok: false, skipped: false };
  return { ok: true, skipped: false, eventId: json.id };
}
