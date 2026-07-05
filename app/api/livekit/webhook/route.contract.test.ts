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
const mockState: { event: any } = { event: null };
vi.mock("livekit-server-sdk", () => ({
  WebhookReceiver: class {
    constructor(_key: string, _secret: string) {}
    async receive(_body: string, _auth: string) {
      return mockState.event;
    }
  },
}));

// 서버 클라이언트 — update 호출을 캡처(어떤 테이블에 무슨 payload 로 어디를 eq 했는지)
type Call = { table: string; update: any; eqField?: string; eqVal?: any };
const calls: Call[] = [];
vi.mock("@/lib/data/supabaseServerClient", () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => ({
      update: (payload: any) => {
        const rec: Call = { table, update: payload };
        calls.push(rec);
        return {
          eq: (field: string, val: any) => {
            rec.eqField = field;
            rec.eqVal = val;
            return Promise.resolve({ data: null, error: null });
          },
        };
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
