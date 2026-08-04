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
