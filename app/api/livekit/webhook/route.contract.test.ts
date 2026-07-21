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
const mockState: { event: any; sessionRow?: { id: string } | null } = {
  event: null,
  sessionRow: null,
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
            data: mockState.sessionRow ? [mockState.sessionRow] : [],
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
        for (const op of ["eq", "is", "lt"]) {
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
  });

  it("room_finished 는 consultation_sessions 를 건드리지 않는다(자동완료 금지)", async () => {
    const POST = await loadPost();
    mockState.event = { event: "room_finished", room: { name: "consult-abc" } };

    const res = await POST(makeReq({ event: "room_finished" }));
    const json = await res.json();

    expect(json.ok).toBe(true);
    // 핵심: 어떤 DB update 도 일어나면 안 된다(특히 status='completed')
    expect(calls.length).toBe(0);
    expect(calls.some((c) => c.update?.status === "completed")).toBe(false);
  });

  it("participant_joined 도 DB 를 건드리지 않는다(로그만)", async () => {
    const POST = await loadPost();
    mockState.event = {
      event: "participant_joined",
      room: { name: "consult-abc" },
      participant: { identity: "guest-1" },
    };

    const res = await POST(makeReq({ event: "participant_joined" }));
    expect((await res.json()).ok).toBe(true);
    expect(calls.length).toBe(0);
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
});
