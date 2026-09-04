/**
 * healwith: 구글 캘린더에 일정 등록 (서버 전용)
 *
 * 화상상담이 잡히면 PO 구글 캘린더에도 같은 일정을 넣어, 캘린더만 봐도 그 주 일정이 다 보이게 한다.
 * 인증은 `src/lib/push/fcm.ts` 와 같은 방식(서비스 계정 JSON → RS256 JWT → OAuth 토큰). 새 의존성 0.
 *
 * ⚠️ fcm.ts 의 토큰 캐시를 재사용하지 않고 여기서 따로 캐시한다.
 *    OAuth 토큰은 **scope 마다 별개**여서, 푸시용 토큰으로 캘린더를 호출하면 403 이 난다.
 *
 * 환경변수(둘 다 있어야 실제 등록, 없으면 무음 no-op):
 *   - GOOGLE_SERVICE_ACCOUNT_JSON  (서비스 계정 키 JSON 전체 문자열 — 푸시와 같은 키)
 *   - GOOGLE_CALENDAR_ID           (넣을 캘린더 주소. 그 캘린더를 서비스 계정 client_email 에
 *                                   «변경 권한»으로 공유해 두어야 한다)
 *
 * 🛑 캘린더 본문에 환자 이름·연락처 같은 개인정보를 넣지 않는다. 구글 서버에 평문으로 남는다.
 */
import "server-only";
import { createSign } from "crypto";

type ServiceAccount = { client_email: string; private_key: string };

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

let cachedToken: { value: string; expEpochMs: number } | null = null;

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
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const sa = getServiceAccount();
  if (!calendarId || !sa) return { ok: false, skipped: true };

  const start = new Date(input.startsAt);
  if (Number.isNaN(start.getTime())) {
    console.warn("[calendar] 시작 시각이 올바르지 않아 건너뜀:", input.startsAt);
    return { ok: false, skipped: true };
  }
  const end = new Date(start.getTime() + (input.durationMinutes ?? 30) * 60_000);

  const accessToken = await getAccessToken(sa);
  if (!accessToken) return { ok: false, skipped: false };

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        colorId: input.colorId,
        start: { dateTime: start.toISOString(), timeZone: "Asia/Seoul" },
        end: { dateTime: end.toISOString(), timeZone: "Asia/Seoul" },
      }),
    }
  );

  if (!res.ok) {
    // 403 은 대개 «캘린더를 서비스 계정에 공유하지 않음» 또는 «Calendar API 미사용 설정»이다.
    console.error("[calendar] 일정 등록 실패:", res.status, await res.text().catch(() => ""));
    return { ok: false, skipped: false };
  }
  const json = (await res.json()) as { id?: string };
  return { ok: true, skipped: false, eventId: json.id };
}
