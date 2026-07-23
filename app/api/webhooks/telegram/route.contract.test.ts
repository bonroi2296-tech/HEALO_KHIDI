/**
 * 계약 회귀 테스트 — 텔레그램 봇 웹훅 (POST /api/webhooks/telegram)
 *
 * 잠그는 계약(각각 위반 시 실사고):
 *  ① secret_token 불일치 = 401 (위조 웹훅으로 스레드 생성·AI 호출 불가)
 *  ② PIPA: 동의 전 수신 본문은 chat_messages 에 저장되지 않는다(동의 버튼만 재안내)
 *  ③ 동의 기록 shape 가 웹 챗(start 라우트)과 동일 — {health_crossborder, version, at}
 *     (다르면 promoteThreadToInquiry 의 동의 증빙 복사가 조용히 깨진다)
 *  ④ update_id 멱등 가드 — 텔레그램 재전송이 같은 메시지를 중복 저장하지 않는다
 *  ⑤ 코디 인수(hand_off_requested) 후 AI 침묵 — 봇이 코디 대화에 끼어들지 않는다
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── 목 상태 ──────────────────────────────────────────────────────────────
const mockState: {
  thread: any | null;
  history: any[];
  dupMsg: boolean; // 같은 tg_update_id 의 기존 저장 메시지 존재 여부(멱등 가드용)
} = { thread: null, history: [], dupMsg: false };

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
          order: () => builder,
          limit: async (_n: number) => {
            if (table === "chat_threads") {
              return { data: mockState.thread ? [mockState.thread] : [], error: null };
            }
            // chat_messages: 멱등 가드의 중복 조회(select "id") vs 히스토리 조회를 구분
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
      update: (payload: any) => chainable("update", table, payload, { data: null, error: null }),
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
vi.mock("@/lib/chat/publicChatHelpers", () => ({
  INTAKE_EVERY_N_TURNS: 3,
  createDraftIntake: (...args: any[]) => createDraftIntake(...args),
  pickHandoffConfirm: () => "🔔 접수됐어요",
}));

const sendTelegramPatientMessage = vi.fn(async (..._args: any[]) => true);
const sendConsentPrompt = vi.fn(async (..._args: any[]) => true);
const answerCallbackQuery = vi.fn(async (..._args: any[]) => true);
vi.mock("@/lib/messaging/telegram", () => ({
  sendTelegramPatientMessage: (...args: any[]) => sendTelegramPatientMessage(...args),
  sendConsentPrompt: (...args: any[]) => sendConsentPrompt(...args),
  answerCallbackQuery: (...args: any[]) => answerCallbackQuery(...args),
  CONSENT_WELCOME: { en: "welcome" },
  TG_APOLOGY: { en: "sorry" },
  pickTgText: (map: Record<string, string>, lang: string) => map[lang] || map.en,
}));

// after() 는 테스트에서 동기 실행 — AI 생성·발신 분기까지 어설션 가능하게.
vi.mock("next/server", () => ({
  NextRequest: class {},
  after: (fn: () => Promise<void>) => fn(),
}));

process.env.TELEGRAM_PATIENT_BOT_TOKEN = "test-bot-token";
process.env.TELEGRAM_WEBHOOK_SECRET = "test-secret";

function makeReq(body: any, secret: string | null = "test-secret"): any {
  return {
    json: async () => body,
    headers: {
      get: (h: string) =>
        h.toLowerCase() === "x-telegram-bot-api-secret-token" ? secret : null,
    },
  };
}

async function loadPost() {
  const mod = await import("./route");
  return mod.POST;
}

const CONSENTED_THREAD = () => ({
  id: "t-1",
  status: "open",
  channel: "telegram",
  metadata: {
    language: "en",
    telegram: { chat_id: "777" },
    consent: { health_crossborder: true, version: "1.0.0", at: "2026-07-23T00:00:00Z" },
  },
});

function msgUpdate(text: string, updateId = 10) {
  return {
    update_id: updateId,
    message: {
      message_id: 1,
      text,
      chat: { id: 777, type: "private" },
      from: { id: 777, first_name: "Ivan", language_code: "ru" },
    },
  };
}

describe("텔레그램 웹훅 계약", () => {
  beforeEach(() => {
    captured.length = 0;
    mockState.thread = null;
    mockState.history = [];
    mockState.dupMsg = false;
    generateChatReply.mockClear();
    sendTelegramPatientMessage.mockClear();
    sendConsentPrompt.mockClear();
    answerCallbackQuery.mockClear();
    createDraftIntake.mockClear();
    process.env.TELEGRAM_PATIENT_BOT_TOKEN = "test-bot-token";
    process.env.TELEGRAM_WEBHOOK_SECRET = "test-secret";
  });

  it("① secret 불일치 → 401, DB 무접촉", async () => {
    const POST = await loadPost();
    const res = await POST(makeReq(msgUpdate("hi"), "wrong-secret"));
    expect(res.status).toBe(401);
    expect(captured.length).toBe(0);
  });

  it("① env 미설정 → 200 not_configured (재시도 폭주 방지)", async () => {
    const POST = await loadPost();
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    const res = await POST(makeReq(msgUpdate("hi")));
    expect(res.status).toBe(200);
    expect((await res.json()).error).toBe("not_configured");
  });

  it("② 동의 전 메시지: 본문 미저장 + 동의 버튼 안내 + 스레드는 생성", async () => {
    const POST = await loadPost();
    const res = await POST(makeReq(msgUpdate("I have stomach cancer")));
    expect((await res.json()).ok).toBe(true);

    // 민감 본문이 chat_messages 에 남지 않는다(PIPA: 동의 전 미처리)
    expect(captured.filter((c) => c.table === "chat_messages")).toHaveLength(0);
    expect(sendConsentPrompt).toHaveBeenCalledTimes(1);
    expect(generateChatReply).not.toHaveBeenCalled();

    // 스레드는 telegram 채널 + 이름 암호화로 생성
    const tIns = captured.find((c) => c.table === "chat_threads" && c.op === "insert");
    expect(tIns?.payload.channel).toBe("telegram");
    expect(tIns?.payload.guest_name).toBe("enc:Ivan");
    expect(tIns?.payload.metadata.telegram.chat_id).toBe("777");
  });

  it("③ 동의 콜백: consent shape 가 웹 챗과 동일 + 환영 메시지", async () => {
    const POST = await loadPost();
    mockState.thread = {
      id: "t-1",
      status: "open",
      channel: "telegram",
      metadata: { language: "en", telegram: { chat_id: "777" } },
    };
    const res = await POST(
      makeReq({
        update_id: 11,
        callback_query: {
          id: "cb-1",
          data: "consent:1.0.0",
          from: { id: 777, language_code: "en" },
          message: { chat: { id: 777, type: "private" } },
        },
      })
    );
    expect((await res.json()).ok).toBe(true);

    const upd = captured.find((c) => c.table === "chat_threads" && c.op === "update");
    const consent = upd?.payload?.metadata?.consent;
    // start 라우트(웹)와 동일 shape — 승격 시 동의 증빙 복사가 이 키들을 읽는다
    expect(consent?.health_crossborder).toBe(true);
    expect(consent?.version).toBe("1.0.0");
    expect(consent?.at).toBeTruthy();
    expect(answerCallbackQuery).toHaveBeenCalledWith("cb-1");
    expect(sendTelegramPatientMessage).toHaveBeenCalledWith("777", "welcome");
  });

  it("동의 후 메시지: 저장→AI 생성→텔레그램 발신→시스템 메시지 기록", async () => {
    const POST = await loadPost();
    mockState.thread = CONSENTED_THREAD();
    const res = await POST(makeReq(msgUpdate("What are treatment options?", 10)));
    expect((await res.json()).ok).toBe(true);

    const pIns = captured.find(
      (c) => c.table === "chat_messages" && c.payload.actor_type === "patient"
    );
    expect(pIns?.payload.message_text).toBe("What are treatment options?");
    expect(pIns?.payload.metadata.tg_update_id).toBe(10);

    expect(generateChatReply).toHaveBeenCalledTimes(1);
    // 텔레그램은 항상 회신 가능 — 연락처 요구 게이트 우회 계약
    expect((generateChatReply.mock.calls[0] as any)[4]?.hasReachableContact).toBe(true);
    expect(sendTelegramPatientMessage).toHaveBeenCalledWith("777", "AI 답변");

    const sIns = captured.find(
      (c) => c.table === "chat_messages" && c.payload.actor_type === "system"
    );
    expect(sIns?.payload.message_text).toBe("AI 답변");
  });

  it("④ 멱등 가드: 같은 update_id 가 이미 저장돼 있으면 재저장·재응답하지 않는다", async () => {
    const POST = await loadPost();
    mockState.thread = CONSENTED_THREAD();
    mockState.dupMsg = true; // 같은 tg_update_id 의 기존 메시지 존재(텔레그램 재전송 상황)
    const res = await POST(makeReq(msgUpdate("retry delivery", 5)));
    expect((await res.json()).skipped).toBe("duplicate");
    expect(captured.filter((c) => c.table === "chat_messages" && c.op === "insert")).toHaveLength(0);
    expect(generateChatReply).not.toHaveBeenCalled();
  });

  it("④-2 역전 도착한 '다른' update_id 는 정상 처리한다(유실 금지 — 리뷰 C1)", async () => {
    const POST = await loadPost();
    mockState.thread = CONSENTED_THREAD();
    mockState.dupMsg = false; // 저장 이력 없음 → 순서가 뒤바뀌어 왔어도 정상 메시지
    const res = await POST(makeReq(msgUpdate("late arrival", 3)));
    expect((await res.json()).ok).toBe(true);
    const pIns = captured.find(
      (c) => c.table === "chat_messages" && c.payload?.actor_type === "patient"
    );
    expect(pIns?.payload.message_text).toBe("late arrival");
    expect(generateChatReply).toHaveBeenCalledTimes(1);
  });

  it("⑤ 코디 인수 후 AI 침묵: 메시지는 저장하되 AI 생성·발신 없음", async () => {
    const POST = await loadPost();
    const t = CONSENTED_THREAD();
    (t.metadata as any).hand_off_requested = true;
    (t.metadata as any).hand_off_notified = true;
    mockState.thread = t;

    const res = await POST(makeReq(msgUpdate("ok thank you", 10)));
    expect((await res.json()).ok).toBe(true);

    // 환자 메시지는 코디가 봐야 하므로 저장된다
    const pIns = captured.find(
      (c) => c.table === "chat_messages" && c.payload.actor_type === "patient"
    );
    expect(pIns).toBeTruthy();
    // 하지만 AI 는 침묵
    expect(generateChatReply).not.toHaveBeenCalled();
    expect(sendTelegramPatientMessage).not.toHaveBeenCalled();
  });

  it("코디가 답장 중인 스레드(coordinator_active)에도 AI 는 침묵한다(리뷰 M1)", async () => {
    const POST = await loadPost();
    const t = CONSENTED_THREAD();
    (t.metadata as any).coordinator_active = true;
    mockState.thread = t;

    const res = await POST(makeReq(msgUpdate("one more question", 10)));
    expect((await res.json()).ok).toBe(true);
    expect(
      captured.find((c) => c.table === "chat_messages" && c.payload?.actor_type === "patient")
    ).toBeTruthy();
    expect(generateChatReply).not.toHaveBeenCalled();
    expect(sendTelegramPatientMessage).not.toHaveBeenCalled();
  });

  it("사진+캡션: 캡션을 질문으로 처리하고(유실 금지 — 리뷰 C4) 파일 안내를 덧붙인다", async () => {
    const POST = await loadPost();
    mockState.thread = CONSENTED_THREAD();
    const u: any = msgUpdate("", 10);
    delete u.message.text;
    u.message.caption = "Here is my CT scan, what stage is this?";
    u.message.photo = [{ file_id: "f1" }];

    const res = await POST(makeReq(u));
    expect((await res.json()).ok).toBe(true);

    const pIns = captured.find(
      (c) => c.table === "chat_messages" && c.payload?.actor_type === "patient"
    );
    expect(pIns?.payload.message_text).toBe("Here is my CT scan, what stage is this?");
    expect(pIns?.payload.metadata.tg_has_attachment).toBe(true);
    // 첨부 환각 방지 하드룰이 켜진 채 생성
    expect((generateChatReply.mock.calls[0] as any)[4]?.hasAttachments).toBe(true);
    // 답변 + 파일 미수신 정직 안내가 함께 발신
    const sent = String(sendTelegramPatientMessage.mock.calls[0]?.[1] || "");
    expect(sent).toContain("AI 답변");
    expect(sent).toContain("📎");
  });

  it("사진만(캡션 없음)이면 저장 없이 파일 안내만 보낸다", async () => {
    const POST = await loadPost();
    mockState.thread = CONSENTED_THREAD();
    const u: any = msgUpdate("", 10);
    delete u.message.text;
    u.message.photo = [{ file_id: "f1" }];

    const res = await POST(makeReq(u));
    expect((await res.json()).ok).toBe(true);
    expect(captured.filter((c) => c.table === "chat_messages" && c.op === "insert")).toHaveLength(0);
    expect(generateChatReply).not.toHaveBeenCalled();
    expect(sendTelegramPatientMessage).toHaveBeenCalledTimes(1);
    expect(String(sendTelegramPatientMessage.mock.calls[0]?.[1])).toContain("📎");
  });

  it("딥링크 ?start=test 로 시작한 스레드는 테스트 표식이 붙는다(KHIDI 실적 오염 방지 — 리뷰 C3)", async () => {
    const POST = await loadPost();
    const res = await POST(makeReq(msgUpdate("/start test", 10)));
    expect((await res.json()).ok).toBe(true);
    const tIns = captured.find((c) => c.table === "chat_threads" && c.op === "insert");
    expect(tIns?.payload.metadata.is_test).toBe(true);
    expect(tIns?.payload.metadata.utm.start_param).toBe("test");
    // /start 본문은 저장하지 않는다
    expect(captured.filter((c) => c.table === "chat_messages" && c.op === "insert")).toHaveLength(0);
  });

  it("3턴째 환자 메시지에서 문의 초안(createDraftIntake)이 발사된다(KHIDI 집계 연결)", async () => {
    const POST = await loadPost();
    mockState.thread = CONSENTED_THREAD();
    // 히스토리(방금 저장분 포함)에 환자 메시지 3개
    mockState.history = [
      { actor_type: "patient", message_text: "q1", metadata: {} },
      { actor_type: "system", message_text: "a1", metadata: {} },
      { actor_type: "patient", message_text: "q2", metadata: {} },
      { actor_type: "system", message_text: "a2", metadata: {} },
      { actor_type: "patient", message_text: "q3", metadata: {} },
    ];
    const res = await POST(makeReq(msgUpdate("q3", 12)));
    expect((await res.json()).ok).toBe(true);
    expect(createDraftIntake).toHaveBeenCalledTimes(1);
  });

  it("그룹 채팅 메시지는 무시한다(1:1 상담 전용)", async () => {
    const POST = await loadPost();
    const u = msgUpdate("hello", 10);
    (u.message.chat as any).type = "group";
    const res = await POST(makeReq(u));
    expect((await res.json()).skipped).toBe("non_private");
    expect(captured.length).toBe(0);
  });
});
