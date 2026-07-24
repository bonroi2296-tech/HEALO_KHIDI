/**
 * 계약 회귀 테스트 — 「완료 처리 안 된 상담」 넛지 (GET /api/cron/dispatch-surveys)
 *
 * 왜 이 파일이 있나: 이 넛지 로직은 2026-07-20 하루에 **두 번 깨졌고 둘 다 사람이 아니라
 * 독립 리뷰가 잡았다.** 둘 다 "조용히 아무 일도 안 일어나는" 부류라 화면·CI 로는 안 보인다.
 *   ① 쿼리의 error 를 안 봐서, 컬럼/RLS 가 바뀌면 대상 0건이 되고 응답은 그대로 ok:true
 *      → "울릴 게 없음"과 "감지가 죽음"이 구별 불가.
 *   ② 디듀프를 "안 읽음" 기준으로 걸어서, 알림의 96%가 영영 안 읽히는 이 서비스에선
 *      첫 발송 후 영구 침묵.
 * detect-silent-patients 의 계약 테스트(POSTMORTEMS #12/#13)와 같은 취지 — 조용한 0건을
 * 테스트로 잠근다.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ⚠️ 이 라우트는 consultation_sessions 를 **두 번** 읽는다.
//    1회차 = 설문 발송 대상(completed) / 2회차 = 넛지 대상(scheduled·active).
//    한 덩어리로 mock 하면 넛지 쿼리만 실패하는 상황을 재현할 수 없다(설문 쿼리까지
//    같이 죽어 라우트가 500 으로 조기 반환됨 — 실제로 이 테스트를 쓰다 겪음).
//    호출 순서로 분리한다.
const h = vi.hoisted(() => ({
  /** 1회차: 설문 발송 대상 */
  surveySessions: [] as any[],
  /** 2회차: 넛지 대상 */
  nudgeSessions: [] as any[],
  nudgeError: null as any,
  /** consultation_sessions 호출 횟수 */
  calls: 0,
  /** notifyStaffUnclosedConsultations 가 받은 인자 */
  notified: [] as any[],
}));

vi.mock("@/lib/rag/supabaseAdmin", () => {
  const makeBuilder = (getResult: () => { data: any; error: any }) => {
    const builder: any = {};
    const passthrough = () => builder;
    for (const m of ["select", "gte", "lte", "lt", "not", "eq", "is", "in", "order", "limit", "insert", "delete", "maybeSingle"]) {
      builder[m] = passthrough;
    }
    builder.then = (resolve: any) => resolve(getResult());
    return builder;
  };
  return {
    supabaseAdmin: {
      from: (table: string) => {
        if (table === "consultation_sessions") {
          const nth = ++h.calls;
          return makeBuilder(() =>
            nth === 1
              ? { data: h.surveySessions, error: null }
              : { data: h.nudgeSessions, error: h.nudgeError }
          );
        }
        return makeBuilder(() => ({ data: [], error: null }));
      },
    },
  };
});

vi.mock("@/lib/notifications/inApp", () => ({
  notifyStaffUnclosedConsultations: vi.fn(async (n: any) => {
    h.notified.push(n);
  }),
  // 케이던스 제안 경로(2026-07-24)가 동적 import 로 쓰는 함수들 — 이 테스트에선 케이스 0건이라
  // 호출되지 않지만, mock 모듈에 export 가 없으면 vitest 가 접근 시점에 던진다.
  getStaffIdsByRole: vi.fn(async () => ({ admins: [], coordinators: [] })),
  broadcastInAppNotification: vi.fn(async () => {}),
}));

// 본업(설문 발송) 쪽 의존성은 이 테스트의 관심사가 아니므로 무해하게 막는다.
vi.mock("@/lib/surveys/generateSurveyToken", () => ({
  generateSurveyToken: vi.fn(async () => ({ ok: false })),
  sendSurveyEmail: vi.fn(async () => ({ ok: false, error: "noop" })),
}));
vi.mock("@/lib/surveys/resolveRecipient", () => ({
  resolveSurveyRecipient: () => null,
}));
vi.mock("@/lib/khidi/kpiHealthcheck", () => ({
  alertIfKpiStale: vi.fn(async () => ({ stale: false, latest: null })),
  alertIfSurveysStale: vi.fn(async () => ({ stale: false, overdue: 0 })),
}));
vi.mock("@/lib/security/encryptionV2", () => ({ decryptMaybe: (v: any) => v }));

import { GET } from "./route";

const SECRET = "test-cron-secret";
const DAY = 24 * 60 * 60 * 1000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const req = (): any => ({
  headers: { get: (k: string) => (k === "authorization" ? `Bearer ${SECRET}` : null) },
});

describe("미완료 상담 넛지 계약", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    h.surveySessions = [];
    h.nudgeSessions = [];
    h.nudgeError = null;
    h.calls = 0;
    h.notified.length = 0;
  });

  it("24시간 넘게 미완료인 상담이 있으면 직원 알림을 보낸다", async () => {
    h.nudgeSessions = [{ id: "a", scheduled_at: ago(3 * DAY) }, { id: "b", scheduled_at: ago(9 * DAY) }];

    const json = await (await GET(req())).json();

    expect(json.ok).toBe(true);
    expect(json.unclosed).toBe(2);
    expect(h.notified).toHaveLength(1);
    expect(h.notified[0]).toEqual({ count: 2, oldestDays: 9 });
  });

  it("미완료가 없으면 알림을 보내지 않는다 (조용해야 할 땐 조용히)", async () => {
    h.nudgeSessions = [{ id: "a", scheduled_at: ago(60 * 1000) }]; // 방금 잡힌 예정

    const json = await (await GET(req())).json();

    expect(json.unclosed).toBe(0);
    expect(json.unclosedCheckFailed).toBe(false);
    expect(h.notified).toHaveLength(0);
  });

  it("🔁 회귀잠금: 조회가 실패하면 '0건'으로 위장하지 않고 실패를 드러낸다", async () => {
    // 과거 결함: error 를 무시해 pending=null → unclosed:0 → 정상과 구별 불가.
    h.nudgeSessions = null as any;
    h.nudgeError = { message: 'column "scheduled_at" does not exist' };

    const json = await (await GET(req())).json();

    expect(json.unclosedCheckFailed).toBe(true); // ← 이게 핵심
    expect(h.notified).toHaveLength(0);
    // 본업(설문 발송)은 넛지 실패와 무관하게 응답을 정상 반환해야 한다
    expect(json.ok).toBe(true);
  });

  it("넛지가 실패해도 본업 응답 구조를 깨지 않는다", async () => {
    h.nudgeSessions = null as any;
    h.nudgeError = { message: "boom" };

    const json = await (await GET(req())).json();

    expect(json).toHaveProperty("surveysDispatched");
    expect(json).toHaveProperty("skipped");
    expect(json).toHaveProperty("kpiHealth");
  });

  it("CRON_SECRET 불일치 → 401 (넛지도 돌지 않음)", async () => {
    const res = await GET({ headers: { get: () => "Bearer wrong" } } as any);
    expect(res.status).toBe(401);
    expect(h.notified).toHaveLength(0);
  });
});
