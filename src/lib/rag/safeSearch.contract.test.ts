/**
 * 계약 회귀 테스트 — RAG 검색 관측 기록 (safeRagSearch)
 *
 * 목적: 검색이 **실패하거나 0건일 때 반드시 rag_query_events 에 한 건 남는지** 잠근다.
 *
 * 왜(2026-07-31 실측으로 드러난 구멍): ragQueryEvents.ts 는 「실패/0결과 운영 감지」를 목적으로
 *   만들어졌고 상태값(embedding_failed·rpc_failed·zero_results·ok)까지 다 정의돼 있었는데,
 *   정작 insertRagQueryEvent 를 **아무도 부르지 않아** 표가 0건이었다(AI 채팅은 666건 돌았다).
 *   세 갈래 실패가 전부 조용히 [] 를 돌려주고 console.error 만 남겼는데 실행 기록은 1시간이면
 *   사라진다 → **AI 가 근거를 하나도 못 찾고 답한 경우를 영영 알 수 없었다.** 환각이 나오는 자리다.
 *   기능을 다시 연결했으니, 다음에 누가 리팩터링하다 또 끊으면 이 테스트가 커밋 전에 잡는다.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const events: any[] = [];
vi.mock("./ragQueryEvents", async () => {
  const actual = await vi.importActual<any>("./ragQueryEvents");
  return {
    ...actual,
    // hashQuery 는 «진짜»를 쓴다 — 가짜로 바꾸면 아래 PII 검사가 원문 유출을 못 잡는다
    // (첫 시도에서 실제로 이 테스트가 가짜 해시 때문에 헛되이 빨간불이 났다).
    insertRagQueryEvent: async (p: any) => {
      events.push(p);
    },
    logRagDisabled: async (p: any) => {
      events.push({ ...p, status: "rpc_failed", detail: { reason: "disabled" } });
    },
  };
});

// 임베딩·RPC 결과를 시험마다 갈아끼운다.
const state: { embedding: any; rpc: { data: any; error: any } } = {
  embedding: [0.1, 0.2],
  rpc: { data: [], error: null },
};
vi.mock("../chat/generateReply", () => ({
  getEmbedding: async () => state.embedding,
}));
vi.mock("./supabaseAdmin", () => ({
  supabaseAdmin: { rpc: async () => state.rpc },
}));

async function load() {
  const mod = await import("./safeSearch");
  return mod.safeRagSearch;
}

describe("safeRagSearch 계약 — 실패·0건은 반드시 기록된다", () => {
  beforeEach(() => {
    events.length = 0;
    state.embedding = [0.1, 0.2];
    state.rpc = { data: [], error: null };
    delete process.env.RAG_DISABLED;
  });

  it("결과 0건 = zero_results 로 남는다 (근거 없이 답한 자리를 추적)", async () => {
    const safeRagSearch = await load();
    const out = await safeRagSearch({ query: "위암 치료", lang: "ko" });

    expect(out).toEqual([]);
    expect(events.length).toBe(1);
    expect(events[0].status).toBe("zero_results");
    expect(events[0].resultCount).toBe(0);
    // PII 금지 — 질문 원문은 절대 안 남기고 해시만 남긴다
    expect(JSON.stringify(events[0])).not.toContain("위암 치료");
  });

  it("임베딩 실패 = embedding_failed 로 남는다", async () => {
    state.embedding = null;
    const safeRagSearch = await load();
    const out = await safeRagSearch({ query: "폐암", lang: "ru" });

    expect(out).toEqual([]);
    expect(events.length).toBe(1);
    expect(events[0].status).toBe("embedding_failed");
  });

  it("검색 실패 = rpc_failed 로 남고 원인도 함께 남는다", async () => {
    state.rpc = { data: null, error: { message: "boom" } };
    const safeRagSearch = await load();
    const out = await safeRagSearch({ query: "간암", lang: "ko" });

    expect(out).toEqual([]);
    expect(events.length).toBe(1);
    expect(events[0].status).toBe("rpc_failed");
    expect(events[0].detail?.message).toBe("boom");
  });

  it("정상 검색 = ok 로 남고 건수가 맞는다", async () => {
    state.rpc = {
      data: [
        { content: "a", trust_tier: 1 },
        { content: "b", trust_tier: 2 },
      ],
      error: null,
    };
    const safeRagSearch = await load();
    const out = await safeRagSearch({ query: "대장암", lang: "ko" });

    expect(out.length).toBe(2);
    expect(events.length).toBe(1);
    expect(events[0].status).toBe("ok");
    expect(events[0].resultCount).toBe(2);
  });

  it("RAG 를 꺼둔 경우도 한 건 남는다(기존 동작 회귀 방지)", async () => {
    process.env.RAG_DISABLED = "true";
    const safeRagSearch = await load();
    const out = await safeRagSearch({ query: "유방암", lang: "kz" });

    expect(out).toEqual([]);
    expect(events.length).toBe(1);
    expect(events[0].detail?.reason).toBe("disabled");
  });
});
