/**
 * 좀비 방 청소 — 지켜야 할 것 두 가지.
 *   ① 진행 중인 회의를 끊으면 안 된다 (3시간 문턱 아래는 손대지 않는다)
 *   ② 이미 닫힌 방(LiveKit 이 not found)을 «실패»로 세면 안 된다 — 목표 상태는 달성된 것
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const state = {
  rows: [] as any[],
  filters: {} as Record<string, any>,
  deleted: [] as string[],
  deleteImpl: async (_room: string) => {},
  markedEnded: [] as string[],
};

vi.mock("@/lib/rag/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: () => {
      const q: any = {
        select: () => q,
        not: () => q,
        is: () => q,
        lt: (_col: string, val: string) => {
          state.filters.lt = val;
          return q;
        },
        limit: async () => ({ data: state.rows, error: null }),
        // 「끝났다」 표시 — 이걸 안 하면 같은 방을 10분마다 영원히 다시 지우려 든다(2026-08-05 실측)
        update: (_patch: any) => ({
          in: async (_col: string, ids: string[]) => {
            state.markedEnded.push(...ids);
            return { error: null };
          },
        }),
      };
      return q;
    },
  },
}));

vi.mock("livekit-server-sdk", () => ({
  RoomServiceClient: class {
    async deleteRoom(room: string) {
      await state.deleteImpl(room);
      state.deleted.push(room);
    }
  },
}));

const { closeStaleRooms } = await import("./closeStaleRooms");

const NOW = 1_785_000_000_000;

beforeEach(() => {
  state.rows = [];
  state.filters = {};
  state.deleted = [];
  state.deleteImpl = async () => {};
  state.markedEnded = [];
  process.env.LIVEKIT_URL = "wss://x";
  process.env.LIVEKIT_API_KEY = "k";
  process.env.LIVEKIT_API_SECRET = "s";
});

describe("좀비 방 청소", () => {
  it("3시간보다 «전에» 시작한 방만 고른다 — 진행 중 회의는 조회 대상이 아니다", async () => {
    await closeStaleRooms(NOW);
    expect(state.filters.lt).toBe(new Date(NOW - 3 * 60 * 60 * 1000).toISOString());
  });

  it("고른 방을 닫는다", async () => {
    state.rows = [
      { id: "a", livekit_room_name: "khidi-a" },
      { id: "b", livekit_room_name: "khidi-b" },
    ];
    const r = await closeStaleRooms(NOW);
    expect(state.deleted).toEqual(["khidi-a", "khidi-b"]);
    expect(r.closed).toHaveLength(2);
    expect(r.errors).toHaveLength(0);
  });

  it("이미 닫힌 방(not found)은 실패로 안 센다", async () => {
    state.rows = [{ id: "a", livekit_room_name: "khidi-a" }];
    state.deleteImpl = async () => {
      throw new Error("room not found");
    };
    const r = await closeStaleRooms(NOW);
    expect(r.errors).toHaveLength(0);
    expect(r.closed).toHaveLength(0);
  });

  it("열쇠가 없으면 아무것도 안 닫는다(조용히 꺼짐)", async () => {
    delete process.env.LIVEKIT_API_KEY;
    state.rows = [{ id: "a", livekit_room_name: "khidi-a" }];
    const r = await closeStaleRooms(NOW);
    expect(state.deleted).toHaveLength(0);
    expect(r.errors).toEqual(["livekit_not_configured"]);
  });
});

// ── 2026-08-05 실측으로 잡은 «내가 만든» 결함 ──
// 방을 닫고도 DB 를 안 고쳐서 같은 20건을 10분마다 영원히 다시 조회·삭제하려 들었다.
// 화상 서버 헛호출이 10분마다 20번씩 나가고, 「아직 안 닫힌 방」 숫자가 영영 안 줄어
// **진짜 좀비가 새로 생겨도 못 알아본다.** 목록에서 빼는 것까지가 청소다.
describe("닫은 뒤 「끝났다」고 표시한다 — 안 하면 무한 반복", () => {
  it("닫은 방은 목록에서 빠지도록 표시된다", async () => {
    state.rows = [
      { id: "a", livekit_room_name: "khidi-a" },
      { id: "b", livekit_room_name: "khidi-b" },
    ];
    await closeStaleRooms(NOW);
    expect([...state.markedEnded].sort()).toEqual(["a", "b"]);
  });

  it("⚠️ 이미 없는 방도 표시한다 — 안 하면 그 방이 영원히 다시 잡힌다", async () => {
    state.rows = [{ id: "gone", livekit_room_name: "khidi-gone" }];
    state.deleteImpl = async () => {
      throw new Error("room not found");
    };
    await closeStaleRooms(NOW);
    expect(state.markedEnded).toEqual(["gone"]);
  });

  it("진짜 실패한 방은 표시하지 않는다 — 다음 번에 다시 시도해야 한다", async () => {
    state.rows = [{ id: "boom", livekit_room_name: "khidi-boom" }];
    state.deleteImpl = async () => {
      throw new Error("500 upstream");
    };
    const r = await closeStaleRooms(NOW);
    expect(state.markedEnded).toEqual([]);
    expect(r.errors).toContain("khidi-boom");
  });
});
