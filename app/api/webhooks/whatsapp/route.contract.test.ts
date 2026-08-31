/**
 * 계약 회귀 테스트 — 왓츠앱 봇 웹훅 (GET/POST /api/webhooks/whatsapp)
 *
 * 텔레그램 웹훅 계약(route.contract.test.ts)과 동일한 핵심 계약을 왓츠앱 페이로드로 잠근다:
 *  ① X-Hub-Signature-256(HMAC) 불일치 = 401, DB 무접촉
 *  ② GET 핸드셰이크: verify_token 일치 시 challenge 에코
 *  ③ PIPA: 동의 전 수신 본문 미저장 + 동의 버튼(interactive) 안내
 *  ④ 동의 버튼(button_reply): consent shape 웹·텔레그램과 동일 + 조건부 UPDATE 멱등
 *  ⑤ wamid 멱등 가드 — Meta 재전송이 중복 저장되지 않는다
 *  ⑥ 코디 인수(coordinator_active) 후 AI 침묵
 *  ⑦ 핸드오프 접수 멘트 = 채널 안(inChannel) 변형 (연락처 되묻기 금지)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";

const mockState: { thread: any | null; history: any[]; dupMsg: boolean } = {
  thread: null,
  history: [],
  dupMsg: false,
};

type Captured = { table: string; op: string; payload: any; filters: Array<[string, any]> };
const captured: Captured[] = [];

function chainable(op: string, table: string, payload: any, result: any) {
  const rec: Captured = { table, op, payload, filters: [] };
  captured.push(rec);
  const builder: any = {
    then: (resolve: any) => resolve(result),
    select: () => builder,
    single: async () => result,
    eq: (f: string, v: any) => {
      rec.filters.push([f, v]);
      return builder;
    },
    is: (f: string, v: any) => {
      rec.filters.push([`is:${f}`, v]);
      return builder;
    },
    or: (expr: string) => {
      rec.filters.push(["or", expr]);
      return builder;
    },
  };
  return builder;
}

vi.mock("@/lib/rag/supabaseAdmin", () => ({
  assertSupabaseEnv: () => {},
  supabaseAdmin: {
    from: (table: string) => ({
      select: (cols: string) => {
        const filters: Array<[string, any]> = [];
        const builder: any = {
          eq: (f: string, v: any) => {
            filters.push([f, v]);
            return builder;
          },
          not: (f: string, op: string, v: any) => {
            filters.push([`not:${f}:${op}`, v]);
            return builder;
          },
          order: () => builder,
          limit: async () => {
            if (table === "chat_threads") {
              const t = mockState.thread;
              if (!t) return { data: [], error: null };
              // status 필터 시뮬레이션 — 연속성 계약을 실제로 고정(텔레그램 하니스와 동일).
              const status = (t as any).status || "open";
              for (const [f, v] of filters) {
                if (f === "status" && status !== v) return { data: [], error: null };
                if (f === "not:status:in") {
                  const excluded = String(v)
                    .replace(/[()]/g, "")
                    .split(",")
                    .map((s) => s.trim());
                  if (excluded.includes(status)) return { data: [], error: null };
                }
              }
              return { data: [t], error: null };
            }
            if (cols === "id") {
              return { data: mockState.dupMsg ? [{ id: "m-dup" }] : [], error: null };
            }
            return { data: mockState.history, error: null };
          },
        };
        return builder;
      },
      insert: (row: any) =>
        chainable("insert", table, row, {
          data: { ...row, id: table === "chat_threads" ? "t-new" : "m-new" },
          error: null,
        }),
      update: (payload: any) =>
        chainable("update", table, payload, { data: [{ id: "row-1" }], error: null }),
    }),
  },
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimitPersistent: async () => ({ allowed: true }),
  RATE_LIMITS: { CHAT: { windowMs: 60000, maxRequests: 20, apiName: "chat" } },
}));
vi.mock("@/lib/ai/aiGuard", () => ({ checkAiGuards: async () => ({ allowed: true }) }));
vi.mock("@/lib/security/encryptionV2", () => ({
  encryptStringNullable: (v: string | null) => (v ? `enc:${v}` : null),
}));

const generateChatReply = vi.fn(async (..._args: any[]) => ({ reply: "AI 답변", ragChunks: [] as any[] }));
vi.mock("@/lib/chat/generateReply", () => ({
  generateChatReply: (...args: any[]) => generateChatReply(...args),
  detectHandOff: (text: string) =>
    /human|사람/.test(text) ? { requested: true, reason: "user_requested_human" } : { requested: false, reason: null },
  getModelName: () => "test-model",
  logPlaybookUsage: async () => {},
}));
const createDraftIntake = vi.fn(async (..._args: any[]) => {});
const pickHandoffConfirm = vi.fn((..._args: any[]) => "🔔 접수됐어요");
vi.mock("@/lib/chat/publicChatHelpers", () => ({
  INTAKE_EVERY_N_TURNS: 3,
  createDraftIntake: (...args: any[]) => createDraftIntake(...args),
  pickHandoffConfirm: (...args: any[]) => pickHandoffConfirm(...args),
  HANDOFF_RECEIVED_ACK: { en: "handoff-ack" },
}));

const sendWhatsAppPatientMessage = vi.fn(async (..._args: any[]) => ({ sent: true, windowExpired: false }));
const sendWhatsAppConsentPrompt = vi.fn(async (..._args: any[]) => true);
vi.mock("@/lib/messaging/whatsapp", () => ({
  sendWhatsAppPatientMessage: (...args: any[]) => sendWhatsAppPatientMessage(...args),
  sendWhatsAppConsentPrompt: (...args: any[]) => sendWhatsAppConsentPrompt(...args),
}));
vi.mock("@/lib/messaging/telegram", () => ({
  CONSENT_WELCOME: { en: "welcome" },
  TG_APOLOGY: { en: "sorry" },
  pickTgText: (map: Record<string, string>, lang: string) => map[lang] || map.en,
}));
const relayToStaffTopic = vi.fn(async (..._args: any[]) => {});
vi.mock("@/lib/messaging/staffRelay", () => ({
  relayToStaffTopic: (...args: any[]) => relayToStaffTopic(...args),
}));

const afterPromises: Promise<unknown>[] = [];
async function flushAfter() {
  await Promise.all(afterPromises);
}
vi.mock("next/server", () => ({
  NextRequest: class {},
  after: (fn: () => Promise<void>) => {
    afterPromises.push(Promise.resolve().then(fn));
  },
}));

const APP_SECRET = "test-app-secret";
process.env.WHATSAPP_APP_SECRET = APP_SECRET;
process.env.WHATSAPP_ACCESS_TOKEN = "test-access-token";
process.env.WHATSAPP_PHONE_NUMBER_ID = "12345";
process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "verify-me";

function sign(raw: string): string {
  return "sha256=" + createHmac("sha256", APP_SECRET).update(raw).digest("hex");
}

function makeReq(body: any, signature?: string | null): any {
  const raw = JSON.stringify(body);
  return {
    text: async () => raw,
    headers: {
      get: (h: string) =>
        h.toLowerCase() === "x-hub-signature-256" ? (signature === undefined ? sign(raw) : signature) : null,
    },
  };
}

function waUpdate(msg: any, profileName = "Aisha") {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              contacts: [{ profile: { name: profileName }, wa_id: "77471234567" }],
              messages: [msg],
            },
          },
        ],
      },
    ],
  };
}

function textMsg(body: string, id = "wamid.001") {
  return { from: "77471234567", id, timestamp: "1784800000", type: "text", text: { body } };
}

const CONSENTED_THREAD = () => ({
  id: "t-1",
  status: "open",
  channel: "whatsapp",
  metadata: {
    language: "en",
    whatsapp: { wa_id: "77471234567" },
    consent: { health_crossborder: true, version: "1.0.0", at: "2026-07-23T00:00:00Z" },
  },
});

async function loadRoute() {
  return await import("./route");
}

describe("왓츠앱 웹훅 계약", () => {
  beforeEach(() => {
    captured.length = 0;
    mockState.thread = null;
    mockState.history = [];
    mockState.dupMsg = false;
    afterPromises.length = 0;
    generateChatReply.mockClear();
    sendWhatsAppPatientMessage.mockClear();
    sendWhatsAppConsentPrompt.mockClear();
    createDraftIntake.mockClear();
    pickHandoffConfirm.mockClear();
    process.env.WHATSAPP_APP_SECRET = APP_SECRET;
    process.env.WHATSAPP_ACCESS_TOKEN = "test-access-token";
  });

  it("① 서명 불일치 → 401, DB 무접촉", async () => {
    const { POST } = await loadRoute();
    const res = await POST(makeReq(waUpdate(textMsg("hi")), "sha256=deadbeef"));
    expect(res.status).toBe(401);
    expect(captured.length).toBe(0);
  });

  it("① env 미설정 → 200 not_configured (Meta 재시도 폭주 방지)", async () => {
    const { POST } = await loadRoute();
    delete process.env.WHATSAPP_APP_SECRET;
    const res = await POST(makeReq(waUpdate(textMsg("hi"))));
    expect(res.status).toBe(200);
    expect((await res.json()).error).toBe("not_configured");
  });

  it("② GET 핸드셰이크: verify_token 일치 시 challenge 에코, 불일치 403", async () => {
    const { GET } = await loadRoute();
    const ok = await GET({
      url: "https://x/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=abc123",
    } as any);
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("abc123");

    const bad = await GET({
      url: "https://x/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123",
    } as any);
    expect(bad.status).toBe(403);
  });

  it("③ 동의 전 메시지: 본문 미저장 + 동의 버튼 안내 + 스레드 생성(이름 암호화·언어 국가번호 추정)", async () => {
    const { POST } = await loadRoute();
    const res = await POST(makeReq(waUpdate(textMsg("I have stomach cancer"))));
    expect((await res.json()).ok).toBe(true);

    expect(captured.filter((c) => c.table === "chat_messages")).toHaveLength(0);
    expect(sendWhatsAppConsentPrompt).toHaveBeenCalledTimes(1);
    expect(generateChatReply).not.toHaveBeenCalled();

    const tIns = captured.find((c) => c.table === "chat_threads" && c.op === "insert");
    expect(tIns?.payload.channel).toBe("whatsapp");
    expect(tIns?.payload.guest_name).toBe("enc:Aisha");
    expect(tIns?.payload.metadata.whatsapp.wa_id).toBe("77471234567");
    expect(tIns?.payload.metadata.language).toBe("kz"); // +7 74x → 카자흐 추정
  });

  it("④ 동의 버튼(button_reply): consent shape 동일 + 조건부 UPDATE 멱등 + 첫 동의만 환영", async () => {
    const { POST } = await loadRoute();
    mockState.thread = {
      id: "t-1",
      status: "open",
      channel: "whatsapp",
      metadata: { language: "en", whatsapp: { wa_id: "77471234567" } },
    };
    const res = await POST(
      makeReq(
        waUpdate({
          from: "77471234567",
          id: "wamid.cb1",
          type: "interactive",
          interactive: { type: "button_reply", button_reply: { id: "consent:1.0.0", title: "✅ Agree & start" } },
        })
      )
    );
    expect((await res.json()).ok).toBe(true);

    const upd = captured.find((c) => c.table === "chat_threads" && c.op === "update");
    const consent = upd?.payload?.metadata?.consent;
    expect(consent?.health_crossborder).toBe(true);
    expect(consent?.version).toBe("1.0.0");
    expect(consent?.at).toBeTruthy();
    expect(upd?.filters).toContainEqual(["is:metadata->consent->>health_crossborder", null]);
    expect(sendWhatsAppPatientMessage).toHaveBeenCalledWith("77471234567", "welcome");
  });

  it("④-2 이미 동의된 스레드의 버튼 재수신: 환영 인사 재발송 없음", async () => {
    const { POST } = await loadRoute();
    mockState.thread = CONSENTED_THREAD();
    const res = await POST(
      makeReq(
        waUpdate({
          from: "77471234567",
          id: "wamid.cb2",
          type: "interactive",
          interactive: { type: "button_reply", button_reply: { id: "consent:1.0.0", title: "✅" } },
        })
      )
    );
    expect((await res.json()).ok).toBe(true);
    expect(sendWhatsAppPatientMessage).not.toHaveBeenCalled();
  });

  it("⑤ wamid 멱등: 같은 메시지 id 저장 이력이 있으면 재저장·재응답하지 않는다", async () => {
    const { POST } = await loadRoute();
    mockState.thread = CONSENTED_THREAD();
    mockState.dupMsg = true;
    const res = await POST(makeReq(waUpdate(textMsg("retry delivery", "wamid.dup"))));
    expect((await res.json()).skipped).toBe("duplicate");
    expect(captured.filter((c) => c.table === "chat_messages" && c.op === "insert")).toHaveLength(0);
    expect(generateChatReply).not.toHaveBeenCalled();
  });

  it("정상 메시지: 저장(wamid 기록) + AI 생성 → 발신", async () => {
    const { POST } = await loadRoute();
    mockState.thread = CONSENTED_THREAD();
    const res = await POST(makeReq(waUpdate(textMsg("what hospitals do you have?", "wamid.q1"))));
    expect((await res.json()).ok).toBe(true);
    await flushAfter();

    const pIns = captured.find((c) => c.table === "chat_messages" && c.payload?.actor_type === "patient");
    expect(pIns?.payload.message_text).toBe("what hospitals do you have?");
    expect(pIns?.payload.metadata.wa_message_id).toBe("wamid.q1");
    expect(generateChatReply).toHaveBeenCalledTimes(1);
    // AI 세션 플래그: 이 채팅이 연락 채널(contactInThisChannel) — 연락처 되묻기 금지 계약
    const session = generateChatReply.mock.calls[0]?.[4];
    expect(session?.contactInThisChannel).toBe(true);
    // 채널 표시 계약(반성문 #179) — 이 한 줄이 빠지면 AI 가 왓츠앱 환자에게 «없는 기능»인
    // 「30일 브라우저 쿠키 재개」를 사실로 안내하고, 그 거짓말이 품질 판사에게 「사실 칸」으로
    // 넘어가 환각 검출까지 통과한다. buildSessionFacts 쪽 시험은 순수함수만 보므로
    // «값이 실제로 도달하는가»는 여기서만 잡힌다(2차 독립 리뷰 지적).
    expect(session?.channel).toBe("messenger");
    expect(sendWhatsAppPatientMessage).toHaveBeenCalledWith("77471234567", "AI 답변");
  });

  it("⑥ 코디 인수(coordinator_active) 후 AI 침묵: 저장은 하되 생성·발신 없음", async () => {
    const { POST } = await loadRoute();
    const t = CONSENTED_THREAD();
    (t.metadata as any).coordinator_active = true;
    mockState.thread = t;
    const res = await POST(makeReq(waUpdate(textMsg("ok thank you", "wamid.q2"))));
    expect((await res.json()).ok).toBe(true);
    await flushAfter();

    expect(captured.find((c) => c.table === "chat_messages" && c.payload?.actor_type === "patient")).toBeTruthy();
    expect(generateChatReply).not.toHaveBeenCalled();
    expect(sendWhatsAppPatientMessage).not.toHaveBeenCalled();
  });

  it("⑥-2 핸드오프 후 첫 추가 메시지: AI 침묵 유지 + 고정 수신확인 1회(ack) — 이미 보냈으면 침묵", async () => {
    const { POST } = await loadRoute();
    const t = CONSENTED_THREAD();
    (t.metadata as any).hand_off_requested = true;
    (t.metadata as any).hand_off_notified = true;
    mockState.thread = t;
    const res = await POST(makeReq(waUpdate(textMsg("my diagnosis is ...", "wamid.a1"))));
    expect((await res.json()).ok).toBe(true);
    await flushAfter();
    expect(generateChatReply).not.toHaveBeenCalled();
    expect(sendWhatsAppPatientMessage).toHaveBeenCalledTimes(1);
    expect(sendWhatsAppPatientMessage.mock.calls[0][1]).toBe("handoff-ack");

    // 이미 ack 를 보낸 스레드면 완전 침묵
    sendWhatsAppPatientMessage.mockClear();
    const t2 = CONSENTED_THREAD();
    (t2.metadata as any).hand_off_requested = true;
    (t2.metadata as any).hand_off_ack_sent = true;
    mockState.thread = t2;
    const res2 = await POST(makeReq(waUpdate(textMsg("more info", "wamid.a2"))));
    expect((await res2.json()).ok).toBe(true);
    await flushAfter();
    expect(sendWhatsAppPatientMessage).not.toHaveBeenCalled();
  });

  it("⑥-3 코디 답장으로 waiting_patient 가 된 스레드도 이어받는다 — 재동의·새 스레드 분절 금지", async () => {
    const { POST } = await loadRoute();
    const t = CONSENTED_THREAD();
    (t as any).status = "waiting_patient";
    mockState.thread = t;

    const res = await POST(makeReq(waUpdate(textMsg("another question", "wamid.w1"))));
    expect((await res.json()).ok).toBe(true);
    await flushAfter();

    expect(sendWhatsAppConsentPrompt).not.toHaveBeenCalled();
    expect(captured.find((c) => c.table === "chat_threads" && c.op === "insert")).toBeFalsy();
    expect(generateChatReply).toHaveBeenCalledTimes(1);
  });

  it("⑦ 핸드오프 요청: 접수 멘트를 채널 안(inChannel=true) 변형으로 붙인다", async () => {
    const { POST } = await loadRoute();
    mockState.thread = CONSENTED_THREAD();
    const res = await POST(makeReq(waUpdate(textMsg("connect me to a human please", "wamid.q3"))));
    expect((await res.json()).ok).toBe(true);
    await flushAfter();

    const sent = String(sendWhatsAppPatientMessage.mock.calls[0]?.[1]);
    expect(sent).toContain("🔔 접수됐어요");
    expect(pickHandoffConfirm).toHaveBeenCalledWith("en", true, true);
  });

  it("⑦-2 사람 연결 요청 턴: 3턴 규칙과 무관하게 문의 승격이 즉시 발사된다(핸드오프 플래그 전달)", async () => {
    const { POST } = await loadRoute();
    mockState.thread = CONSENTED_THREAD();
    // 환자 메시지 1개뿐(3의 배수 아님) — 기존 규칙이면 승격이 영영 안 걸리던 케이스
    mockState.history = [
      { actor_type: "patient", message_text: "connect me to a human", metadata: {} },
    ];
    const res = await POST(makeReq(waUpdate(textMsg("connect me to a human", "wamid.h1"))));
    expect((await res.json()).ok).toBe(true);
    await flushAfter();
    expect(createDraftIntake).toHaveBeenCalledTimes(1);
    expect(createDraftIntake.mock.calls[0][4]).toEqual({ handOffRequested: true });
  });

  it("한 웹훅에 실려 온 여러 메시지를 전부 처리한다 — 배치 유실 금지(독립 리뷰 CONFIRMED①)", async () => {
    const { POST } = await loadRoute();
    mockState.thread = CONSENTED_THREAD();
    const body = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: "Aisha" }, wa_id: "77471234567" }],
                messages: [textMsg("first message", "wamid.b1"), textMsg("second message", "wamid.b2")],
              },
            },
          ],
        },
      ],
    };
    const res = await POST(makeReq(body));
    expect((await res.json()).ok).toBe(true);
    await flushAfter();

    const stored = captured
      .filter((c) => c.table === "chat_messages" && c.op === "insert" && c.payload?.actor_type === "patient")
      .map((c) => c.payload.message_text);
    expect(stored).toEqual(["first message", "second message"]);
    expect(generateChatReply).toHaveBeenCalledTimes(2);
  });

  it("reaction(👍) 등 비텍스트·비첨부 유형은 조용히 무시 — 파일 안내 오발송 금지(독립 리뷰 P5)", async () => {
    const { POST } = await loadRoute();
    mockState.thread = CONSENTED_THREAD();
    const res = await POST(
      makeReq(
        waUpdate({
          from: "77471234567",
          id: "wamid.react1",
          type: "reaction",
          reaction: { message_id: "wamid.q1", emoji: "👍" },
        })
      )
    );
    expect((await res.json()).skipped).toBe("unsupported_type");
    expect(sendWhatsAppPatientMessage).not.toHaveBeenCalled();
    expect(captured.filter((c) => c.table === "chat_messages" && c.op === "insert")).toHaveLength(0);
  });

  it("배달 영수증(statuses)만 있는 웹훅은 조용히 통과", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      makeReq({
        entry: [{ changes: [{ value: { statuses: [{ id: "wamid.s", status: "delivered" }] } }] }],
      })
    );
    expect((await res.json()).skipped).toBe("no_message");
    expect(captured.length).toBe(0);
  });
});
