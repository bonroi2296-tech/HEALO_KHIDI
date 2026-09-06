/**
 * 계약 회귀 테스트 — LiveKit Webhook (POST /api/livekit/webhook)
 *
 * 목적: room_finished 이벤트가 상담 세션을 자동으로 '완료(completed)' 처리하지
 *       **않는지** 잠근다.
 *
 * 왜(과거 위험): webhook 이 room_finished 마다 status='completed' 를 찍으면
 *   ① KHIDI 성과지표 K-02(사전상담·사후관리 건수)가 부풀려지고(테스트콜·중단콜까지
 *      실적 집계), ② 완료된 세션은 token·guest-join 이 consultation_closed 를 반환해
 *      **재입장까지 막힌다**('나가기 ≠ 완료' 설계와 모순). 완료는 staff 가 상담관리에서
 *      직접 처리하는 것이 유일 정본 경로다. 이 테스트가 그 자동완료 부활을 커밋 전에 잡는다.
 *   recording_finished 의 녹화 URL 기록은 그대로 동작해야 한다(회귀 방지 대칭).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// LiveKit 서명검증 우회 — receive() 는 우리가 세팅한 event 를 그대로 반환
const mockState: {
  event: any;
  sessionRow?: { id: string; started_at?: string | null } | null;
  /** consultation_admissions 조회 결과(room_finished 의 «손님 전부 나갔나» 판정용) */
  admissionRows: Array<{ left_at: string | null }>;
} = {
  event: null,
  sessionRow: null,
  admissionRows: [],
};
vi.mock("livekit-server-sdk", () => ({
  WebhookReceiver: class {
    constructor(_key: string, _secret: string) {}
    async receive(_body: string, _auth: string) {
      return mockState.event;
    }
  },
}));

// 서버 클라이언트 — update 호출을 캡처(어떤 테이블에 무슨 payload 로 어떤 필터를 걸었는지).
// update 는 체인형 thenable(eq/is/lt 를 이어 붙이고 await 가능) — 실제 supabase-js 빌더와 동형.
// select().eq().maybeSingle() 은 mockState.sessionRow 를 돌려준다(participant_left 의 방 조회용).
type Call = {
  table: string;
  update: any;
  eqField?: string;
  eqVal?: any;
  filters: Array<{ op: string; field: string; val: any }>;
};
const calls: Call[] = [];
vi.mock("@/lib/data/supabaseServerClient", () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => ({
      select: (_cols: string) => ({
        eq: (_field: string, _val: any) => ({
          // 실제 코드는 limit(1) 로 조회한다 — maybeSingle 은 같은 방 이름 행이 2개면 에러를
          // 내고 data 를 null 로 만들어 "그런 방 없음"과 구별이 안 되기 때문(POSTMORTEMS #105).
          // 목도 배열을 돌려주는 실제 모양으로 맞춘다.
          limit: async (_n: number) => ({
            data:
              table === "consultation_admissions"
                ? mockState.admissionRows
                : mockState.sessionRow
                  ? [mockState.sessionRow]
                  : [],
            error: null,
          }),
          maybeSingle: async () => ({
            data: mockState.sessionRow ?? null,
            error: null,
          }),
        }),
      }),
      update: (payload: any) => {
        const rec: Call = { table, update: payload, filters: [] };
        calls.push(rec);
        const builder: any = {
          then: (resolve: any) => resolve({ data: null, error: null }),
        };
        for (const op of ["eq", "is", "lt", "or"]) {
          builder[op] = (field: string, val: any) => {
            rec.filters.push({ op, field, val });
            if (op === "eq" && rec.eqField === undefined) {
              rec.eqField = field;
              rec.eqVal = val;
            }
            return builder;
          };
        }
        return builder;
      },
    }),
  }),
}));

// route 는 모듈 로드 시점에 env 를 읽는다 → import 전에 세팅
process.env.LIVEKIT_API_KEY = "test-key";
process.env.LIVEKIT_API_SECRET = "test-secret";

function makeReq(body: any, auth = "signed-jwt"): any {
  return {
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    headers: {
      get: (h: string) =>
        h.toLowerCase() === "authorization" ? auth : null,
    },
  };
}

async function loadPost() {
  const mod = await import("./route");
  return mod.POST;
}

describe("livekit webhook 계약 — 자동완료 금지(K-02 인플레·재입장 차단 회귀)", () => {
  beforeEach(() => {
    calls.length = 0;
    mockState.event = null;
    mockState.sessionRow = null;
    mockState.admissionRows = [];
  });

  it("room_finished 는 관측용 통화시간만 쓴다(status·실적 컬럼 불변)", async () => {
    // 2026-07-31 계약 «변경». 예전 계약은 "DB 를 아예 안 건드린다" 였는데, 그 때문에
    // 7월 상담 21건이 전부 통화시간 0분으로 남아 «몇 분 상담했나»를 증명할 수 없었다.
    // 이 파일이 지키는 원칙은 «DB 금지»가 아니라 «실적 자동집계 금지»다. 그래서 계약을 조인다:
    //   ① status 절대 불변  ② 실적 정본 컬럼(ended_at·duration_seconds) 절대 불변
    //   ③ 기계 관측값(livekit_*)만 쓴다
    const POST = await loadPost();
    const startedAt = new Date("2026-07-31T01:00:00.000Z").toISOString();
    mockState.sessionRow = { id: "sess-1", started_at: startedAt };
    mockState.event = {
      event: "room_finished",
      room: { name: "consult-abc" },
      createdAt: Math.floor(Date.parse("2026-07-31T01:30:00.000Z") / 1000),
    };

    const res = await POST(makeReq({ event: "room_finished" }));
    expect((await res.json()).ok).toBe(true);

    expect(calls.length).toBe(1);
    expect(calls[0].table).toBe("consultation_sessions");
    // 🔒 자동완료·실적 인플레 금지 계약
    expect(calls[0].update.status).toBeUndefined();
    expect(calls[0].update.ended_at).toBeUndefined();
    expect(calls[0].update.duration_seconds).toBeUndefined();
    expect(calls.some((c) => c.update?.status === "completed")).toBe(false);
    // 관측값: 30분 통화 → 1800초. 이벤트 시각 기준이라 재시도해도 같은 값이 나온다.
    expect(calls[0].update.livekit_duration_seconds).toBe(1800);
    expect(calls[0].update.livekit_ended_at).toBe("2026-07-31T01:30:00.000Z");
  });

  it("room_finished — 아무도 안 들어온 방은 통화시간을 0 이 아니라 «없음»으로 남긴다", async () => {
    // 0 으로 적으면 «0분 통화했다»로 읽혀 평균 상담시간을 왜곡한다.
    const POST = await loadPost();
    mockState.sessionRow = { id: "sess-2", started_at: null };
    mockState.event = {
      event: "room_finished",
      room: { name: "consult-empty" },
      createdAt: Math.floor(Date.parse("2026-07-31T02:00:00.000Z") / 1000),
    };

    const res = await POST(makeReq({ event: "room_finished" }));
    expect((await res.json()).ok).toBe(true);

    expect(calls.length).toBe(1);
    expect(calls[0].update.livekit_duration_seconds).toBeNull();
    expect(calls[0].update.livekit_ended_at).toBe("2026-07-31T02:00:00.000Z");
  });

  it("room_finished — 모르는 방이면 아무것도 쓰지 않는다", async () => {
    const POST = await loadPost();
    mockState.sessionRow = null;
    mockState.event = { event: "room_finished", room: { name: "consult-없음" } };

    const res = await POST(makeReq({ event: "room_finished" }));
    expect((await res.json()).ok).toBe(true);
    expect(calls.length).toBe(0);
  });

  it("participant_joined 는 started_at 만 채운다(status 불변, 첫 입장만)", async () => {
    // 2026-07-27 계약 «변경». 예전 계약은 "DB 를 아예 안 건드린다(로그만)" 였다.
    // 그런데 실측에서 세션 54건 전부 started_at 이 NULL 이라 «회의를 실제로 했는지»를
    // 데이터로 증명할 수 없었다(상태는 계속 scheduled).
    // 이 파일이 지키려는 원칙은 «DB 금지»가 아니라 «status 자동완료 금지»(K-02 인플레·재입장 차단)다
    // — 바로 아래 participant_left 도 이미 left_at 을 쓴다. 그 원칙에 맞춰 계약을 조인다:
    //   ① status 는 절대 안 건드린다   ② 첫 입장에만(started_at IS NULL) 쓴다.
    const POST = await loadPost();
    mockState.event = {
      event: "participant_joined",
      room: { name: "consult-abc" },
      participant: { identity: "guest-1" },
    };

    const res = await POST(makeReq({ event: "participant_joined" }));
    expect((await res.json()).ok).toBe(true);

    expect(calls.length).toBe(1);
    expect(calls[0].table).toBe("consultation_sessions");
    expect(calls[0].update.started_at).toBeTruthy();
    // 🔒 자동완료 금지 계약 — 여기서도 status 는 건드리지 않는다
    expect(calls[0].update.status).toBeUndefined();
    // 첫 입장에만 기록: 방 매칭 + started_at 이 아직 비어 있을 때만
    // (두 번째 참가자가 덮으면 그건 «시작»이 아니다)
    const ops = calls[0].filters.map((f) => `${f.op}:${f.field}`);
    expect(ops).toContain("eq:livekit_room_name");
    expect(ops).toContain("is:started_at");
  });

  it("participant_joined — 혼자 들어온 건 «시작»이 아니다 (테스트 입장이 회의 시작으로 박히던 것)", async () => {
    // 2026-07-31 PO 결정. 실측: 오늘 16:30 회의방의 시작 시각이 «10:59» 로 박혀 있었다 —
    // 아침에 직원이 혼자 테스트로 들어간 순간. 첫 입장에만 쓰고 덮지 않으니 진짜 회의를 해도
    // 기록은 5시간 반 전이고 통화 길이도 그만큼 부풀려진다. → 2명 이상일 때만 시작.
    const POST = await loadPost();
    mockState.event = {
      event: "participant_joined",
      room: { name: "consult-abc", numParticipants: 1 },
      participant: { identity: "guest-1" },
    };

    const res = await POST(makeReq({ event: "participant_joined" }));

    expect((await res.json()).ok).toBe(true);
    expect(calls.length).toBe(0); // DB 를 아예 안 건드린다
  });

  it("participant_joined — 2명이 되면 그때 started_at 을 쓴다", async () => {
    const POST = await loadPost();
    mockState.event = {
      event: "participant_joined",
      room: { name: "consult-abc", numParticipants: 2 },
      participant: { identity: "guest-2" },
    };

    const res = await POST(makeReq({ event: "participant_joined" }));

    expect((await res.json()).ok).toBe(true);
    expect(calls.length).toBe(1);
    expect(calls[0].update.started_at).toBeTruthy();
    expect(calls[0].update.status).toBeUndefined(); // 자동완료 금지 계약 유지
    const ops2 = calls[0].filters.map((f) => `${f.op}:${f.field}`);
    expect(ops2).toContain("is:started_at"); // 2명이 된 첫 순간에만
  });

  it("participant_left 는 열린 입장기록의 left_at 만 채운다(status 불변, 재입장 새 기록 보호)", async () => {
    const POST = await loadPost();
    mockState.sessionRow = { id: "session-123" };
    const joinedAtSec = 1_700_000_000; // 떠나는 접속의 LiveKit 합류 시각(초)
    mockState.event = {
      event: "participant_left",
      room: { name: "khidi-room-1" },
      participant: { identity: "guest-guest-abc12345-dev1", joinedAt: joinedAtSec },
    };

    const res = await POST(makeReq({ event: "participant_left" }));
    expect((await res.json()).ok).toBe(true);

    expect(calls.length).toBe(1);
    expect(calls[0].table).toBe("consultation_admissions");
    // left_at 만 기록 — status 자동완료(K-02 인플레) 금지 계약은 여기서도 유지
    expect(calls[0].update.left_at).toBeTruthy();
    expect(calls[0].update.status).toBeUndefined();
    // 필터: 세션 매칭 + identity 매칭 + 아직 안 닫힌 기록 + 재입장 새 기록 보호(joinedAt 기준)
    const ops = calls[0].filters.map((f) => `${f.op}:${f.field}`);
    expect(ops).toEqual([
      "eq:consultation_id",
      "eq:participant_identity",
      "is:left_at",
      "lt:requested_at",
    ]);
    expect(calls[0].filters[0].val).toBe("session-123");
    expect(calls[0].filters[1].val).toBe("guest-guest-abc12345-dev1");
    // 컷오프 = 떠나는 접속의 joinedAt + 2초 — 그 이후 생성된 기록(재입장 새 기록)은 안 닫힘
    expect(calls[0].filters[3].val).toBe(
      new Date(joinedAtSec * 1000 + 2000).toISOString()
    );
  });

  it("participant_left 인데 방 이름으로 세션을 못 찾으면 아무것도 안 건드린다", async () => {
    const POST = await loadPost();
    mockState.sessionRow = null;
    mockState.event = {
      event: "participant_left",
      room: { name: "unknown-room" },
      participant: { identity: "guest-guest-abc12345-dev1" },
    };

    const res = await POST(makeReq({ event: "participant_left" }));
    expect((await res.json()).ok).toBe(true);
    expect(calls.length).toBe(0);
  });

  it("recording_finished 는 recording_url 을 방 이름으로 저장한다(녹화 기록 회귀)", async () => {
    const POST = await loadPost();
    mockState.event = {
      event: "recording_finished",
      room: { name: "consult-xyz" },
      egressInfo: { fileResults: [{ location: "https://rec.example/vid.mp4" }] },
    };

    const res = await POST(makeReq({ event: "recording_finished" }));
    expect((await res.json()).ok).toBe(true);

    expect(calls.length).toBe(1);
    expect(calls[0].table).toBe("consultation_sessions");
    expect(calls[0].update.recording_url).toBe("https://rec.example/vid.mp4");
    // 절대 status 를 함께 바꾸지 않는다
    expect(calls[0].update.status).toBeUndefined();
    expect(calls[0].eqField).toBe("livekit_room_name");
    expect(calls[0].eqVal).toBe("consult-xyz");
  });

  it("recording_finished 인데 파일 URL 이 없으면 아무것도 저장하지 않는다", async () => {
    const POST = await loadPost();
    mockState.event = {
      event: "recording_finished",
      room: { name: "consult-xyz" },
      egressInfo: { fileResults: [] },
    };

    const res = await POST(makeReq({ event: "recording_finished" }));
    expect((await res.json()).ok).toBe(true);
    expect(calls.length).toBe(0);
  });
  // ── 2026-09-06 통화시간 부풀림 2종 회귀 잠금 ─────────────────────────────────────────
  // 실측: 8/04 실환자 상담 «76,319초(21시간)» — 전날 시험 입장의 started_at 이 남아 있었다.
  //       9/01 파트너 미팅 «15,324초(4.3시간)» — 손님 전부 나간 뒤 진행자 탭이 좀비로 남았다.
  //       7/31 파트너 미팅 «324,432초(90시간)» — 같은 좀비.

  it("participant_joined — started_at 이 «이전 방 인스턴스» 것이면 덮어쓰고 종료 표시·길이를 지운다", async () => {
    const POST = await loadPost();
    const creationSec = Math.floor(Date.parse("2026-08-04T05:48:00.000Z") / 1000);
    const joinedSec = Math.floor(Date.parse("2026-08-04T05:53:04.000Z") / 1000);
    mockState.event = {
      event: "participant_joined",
      room: { name: "consult-abc", numParticipants: 2, creationTime: BigInt(creationSec) },
      participant: { identity: "guest-2" },
      createdAt: BigInt(joinedSec),
    };

    const res = await POST(makeReq({ event: "participant_joined" }));
    expect((await res.json()).ok).toBe(true);

    expect(calls.length).toBe(1);
    // LiveKit 시계(event.createdAt)로 기록 — creationTime 과 같은 시계
    expect(calls[0].update.started_at).toBe("2026-08-04T05:53:04.000Z");
    // 이전 인스턴스의 종료 표시·길이는 지운다(청소기가 새 방을 다시 볼 수 있게)
    expect(calls[0].update.livekit_ended_at).toBeNull();
    expect(calls[0].update.livekit_duration_seconds).toBeNull();
    expect(calls[0].update.status).toBeUndefined(); // 자동완료 금지 계약 유지
    // 필터: 방 매칭 + (비어 있거나 OR 이 방 생성 이전이거나)
    const orFilter = calls[0].filters.find((f) => f.op === "or");
    expect(orFilter?.field).toBe("started_at.is.null,started_at.lt.2026-08-04T05:48:00Z");
    expect(calls[0].filters.some((f) => f.op === "is")).toBe(false);
  });

  it("participant_joined — creationTime 이 안 실려 오면 옛 방식(비어 있을 때만)으로 기록한다", async () => {
    const POST = await loadPost();
    mockState.event = {
      event: "participant_joined",
      room: { name: "consult-abc", numParticipants: 2 },
      participant: { identity: "guest-2" },
    };
    const res = await POST(makeReq({ event: "participant_joined" }));
    expect((await res.json()).ok).toBe(true);
    expect(calls.length).toBe(1);
    const ops = calls[0].filters.map((f) => `${f.op}:${f.field}`);
    expect(ops).toContain("is:started_at");
    expect(calls[0].filters.some((f) => f.op === "or")).toBe(false);
  });

  it("room_finished — started_at 이 이 방 인스턴스보다 앞이면 통화시간은 «모름(null)» (8/04 21시간 회귀)", async () => {
    const POST = await loadPost();
    // 전날 시험 입장 시각이 남아 있고, 오늘 방은 그 뒤에 새로 만들어졌다
    mockState.sessionRow = { id: "sess-stale", started_at: "2026-08-03T09:18:58.000Z" };
    mockState.event = {
      event: "room_finished",
      room: {
        name: "consult-abc",
        creationTime: BigInt(Math.floor(Date.parse("2026-08-04T04:26:00.000Z") / 1000)),
      },
      createdAt: Math.floor(Date.parse("2026-08-04T06:30:57.000Z") / 1000),
    };

    const res = await POST(makeReq({ event: "room_finished" }));
    expect((await res.json()).ok).toBe(true);
    expect(calls.length).toBe(1);
    expect(calls[0].update.livekit_ended_at).toBe("2026-08-04T06:30:57.000Z");
    expect(calls[0].update.livekit_duration_seconds).toBeNull(); // 76319 이 아니다
  });

  it("room_finished — 손님이 전부 나갔으면 마지막 퇴장까지만 통화다 (9/01 4.3시간 좀비 회귀)", async () => {
    const POST = await loadPost();
    mockState.sessionRow = { id: "sess-zombie", started_at: "2026-09-01T09:22:15.000Z" };
    mockState.admissionRows = [
      { left_at: "2026-09-01T09:54:23.000Z" },
      { left_at: "2026-09-01T09:54:28.000Z" },
      { left_at: "2026-09-01T09:54:25.000Z" },
    ];
    mockState.event = {
      event: "room_finished",
      room: {
        name: "meeting-1",
        creationTime: BigInt(Math.floor(Date.parse("2026-09-01T09:20:00.000Z") / 1000)),
      },
      // 3시간 청소기가 닫은 시각
      createdAt: Math.floor(Date.parse("2026-09-01T13:37:40.000Z") / 1000),
    };

    const res = await POST(makeReq({ event: "room_finished" }));
    expect((await res.json()).ok).toBe(true);
    expect(calls.length).toBe(1);
    // 09:22:15 → 09:54:28 = 1933초. 15,324초(4.3시간)가 아니다
    expect(calls[0].update.livekit_duration_seconds).toBe(1933);
    // 종료 시각 자체는 관측 그대로(방이 실제로 닫힌 시각)
    expect(calls[0].update.livekit_ended_at).toBe("2026-09-01T13:37:40.000Z");
  });

  it("room_finished — 손님 대장이 비었거나(직원끼리) 한 명이라도 안 나갔으면 종전대로 방 종료까지", async () => {
    const POST = await loadPost();
    mockState.sessionRow = { id: "sess-staff", started_at: "2026-09-01T09:00:00.000Z" };
    mockState.event = {
      event: "room_finished",
      room: { name: "meeting-2" },
      createdAt: Math.floor(Date.parse("2026-09-01T09:30:00.000Z") / 1000),
    };
    let res = await POST(makeReq({ event: "room_finished" }));
    expect((await res.json()).ok).toBe(true);
    expect(calls[0].update.livekit_duration_seconds).toBe(1800);

    // 한 명은 left_at 이 없다(퇴장 웹훅 유실) → 상한을 못 정하므로 종전 값
    calls.length = 0;
    mockState.admissionRows = [{ left_at: "2026-09-01T09:10:00.000Z" }, { left_at: null }];
    res = await POST(makeReq({ event: "room_finished" }));
    expect((await res.json()).ok).toBe(true);
    expect(calls[0].update.livekit_duration_seconds).toBe(1800);
  });

  it("room_finished — 손님 대장이 시작보다 «앞»(어제 손님)이면 상한으로 안 쓴다(0초로 뭉개지지 않게)", async () => {
    const POST = await loadPost();
    mockState.sessionRow = { id: "sess-yday", started_at: "2026-09-02T09:00:00.000Z" };
    mockState.admissionRows = [{ left_at: "2026-09-01T09:54:28.000Z" }];
    mockState.event = {
      event: "room_finished",
      room: { name: "meeting-3" },
      createdAt: Math.floor(Date.parse("2026-09-02T09:20:00.000Z") / 1000),
    };
    const res = await POST(makeReq({ event: "room_finished" }));
    expect((await res.json()).ok).toBe(true);
    expect(calls[0].update.livekit_duration_seconds).toBe(1200);
  });
  it("room_finished — 방 생성과 «같은 초»에 2명이 된 통화는 모름으로 뭉개지 않는다(ms 생성 시각 내림)", async () => {
    const POST = await loadPost();
    // started_at 은 초 단위(event.createdAt), creationTimeMs 는 같은 초의 700ms
    mockState.sessionRow = { id: "sess-same-sec", started_at: "2026-09-02T09:00:00.000Z" };
    mockState.event = {
      event: "room_finished",
      room: { name: "meeting-4", creationTimeMs: BigInt(Date.parse("2026-09-02T09:00:00.700Z")) },
      createdAt: Math.floor(Date.parse("2026-09-02T09:20:00.000Z") / 1000),
    };
    const res = await POST(makeReq({ event: "room_finished" }));
    expect((await res.json()).ok).toBe(true);
    expect(calls[0].update.livekit_duration_seconds).toBe(1200);
  });
});
