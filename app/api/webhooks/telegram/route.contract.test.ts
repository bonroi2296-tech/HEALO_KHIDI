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
  throttleStart: boolean; // /start 스로틀: 조건부 UPDATE 가 0행(60초 내 재수신)인 상황 재현
} = { thread: null, history: [], dupMsg: false, throttleStart: false };

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
      // /start 스로틀 계약: 60초 내 재수신이면 조건부 UPDATE 가 0행이어야 한다
      if (mockState.throttleStart && rec.payload?.metadata?.last_start_at) {
        (result as any).data = [];
      }
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
          limit: async (_n: number) => {
            if (table === "chat_threads") {
              const t = mockState.thread;
              if (!t) return { data: [], error: null };
              // status 필터를 실제로 시뮬레이션 — "waiting_patient 이어받기" 계약이
              // 코드를 .eq("status","open") 으로 되돌리면 빨간불 나게 고정(독립 리뷰 지적:
              // 필터 무시 목은 연속성 수리를 전혀 고정하지 못했다).
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
      // update 는 조건부 갱신 결과 확인용으로 .select() 후 rows 를 돌려받는다(멱등 가드).
      update: (payload: any) =>
        chainable("update", table, payload, { data: [{ id: "row-1" }], error: null }),
    }),
    // metadata 키 병합 RPC(chat_thread_merge_meta 등) — 호출 기록으로 계약 어설션.
    rpc: (fn: string, args: any) => {
      captured.push({ table: `rpc:${fn}`, op: "rpc", payload: args, filters: [] });
      return Promise.resolve({ data: 1, error: null });
    },
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

const sendTelegramPatientMessage = vi.fn(async (..._args: any[]) => true);
const sendConsentPrompt = vi.fn(async (..._args: any[]) => true);
const answerCallbackQuery = vi.fn(async (..._args: any[]) => true);
const removeInlineKeyboard = vi.fn(async (..._args: any[]) => true);
vi.mock("@/lib/messaging/telegram", () => ({
  sendTelegramPatientMessage: (...args: any[]) => sendTelegramPatientMessage(...args),
  sendConsentPrompt: (...args: any[]) => sendConsentPrompt(...args),
  answerCallbackQuery: (...args: any[]) => answerCallbackQuery(...args),
  removeInlineKeyboard: (...args: any[]) => removeInlineKeyboard(...args),
  CONSENT_WELCOME: { en: "welcome" },
  TG_WELCOME_BACK: { en: "welcome-back" },
  TG_APOLOGY: { en: "sorry" },
  pickTgText: (map: Record<string, string>, lang: string) => map[lang] || map.en,
}));

// 스태프 그룹 릴레이(B안) — server-only 모듈이라 목으로 대체. 그룹 라우팅 계약도 여기로 잠근다.
const relayToStaffTopic = vi.fn(async (..._args: any[]) => {});
const notifyStaffTopic = vi.fn(async (..._args: any[]) => {});
const findThreadByStaffTopic = vi.fn(async (_topicId: number) => null as any);
vi.mock("@/lib/messaging/staffRelay", () => ({
  staffGroupId: () => process.env.STAFF_TELEGRAM_GROUP_ID || null,
  relayToStaffTopic: (...args: any[]) => relayToStaffTopic(...args),
  notifyStaffTopic: (...args: any[]) => notifyStaffTopic(...args),
  findThreadByStaffTopic: (...args: any[]) => findThreadByStaffTopic(...(args as [number])),
}));
const sendWhatsAppPatientMessage = vi.fn(async (..._args: any[]) => ({ sent: true, windowExpired: false }));
vi.mock("@/lib/messaging/whatsapp", () => ({
  sendWhatsAppPatientMessage: (...args: any[]) => sendWhatsAppPatientMessage(...args),
}));

// after() 는 테스트에서 즉시 실행하되 promise 를 모아둔다 — 핸드오프 턴처럼 동적 import 가
// 끼는 경로는 어설션 전에 `await flushAfter()` 로 완료를 기다려야 한다(아니면 경합 오탐).
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
    mockState.throttleStart = false;
    generateChatReply.mockClear();
    sendTelegramPatientMessage.mockClear();
    sendConsentPrompt.mockClear();
    answerCallbackQuery.mockClear();
    removeInlineKeyboard.mockClear();
    createDraftIntake.mockClear();
    pickHandoffConfirm.mockClear();
    afterPromises.length = 0;
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
          message: { message_id: 4, chat: { id: 777, type: "private" } },
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
    // 병렬 더블탭 방어: "consent 가 아직 없을 때만" 조건이 UPDATE 에 걸려 있어야 한다
    expect(upd?.filters).toContainEqual(["is:metadata->consent->>health_crossborder", null]);
    expect(answerCallbackQuery).toHaveBeenCalledWith("cb-1");
    // 첫 동의: 버튼 제거 + 환영 인사 발송
    expect(removeInlineKeyboard).toHaveBeenCalledWith("777", 4);
    expect(sendTelegramPatientMessage).toHaveBeenCalledWith("777", "welcome");
  });

  it("③-2 이미 동의된 스레드의 콜백 재수신: 환영 인사를 다시 보내지 않는다(실기기 중복 발송 재발 방지)", async () => {
    const POST = await loadPost();
    mockState.thread = CONSENTED_THREAD(); // consent 이미 기록됨
    const res = await POST(
      makeReq({
        update_id: 12,
        callback_query: {
          id: "cb-2",
          data: "consent:1.0.0",
          from: { id: 777, language_code: "en" },
          message: { message_id: 5, chat: { id: 777, type: "private" } },
        },
      })
    );
    expect((await res.json()).ok).toBe(true);
    // 스피너 해제 + 버튼 제거는 하되
    expect(answerCallbackQuery).toHaveBeenCalledWith("cb-2");
    expect(removeInlineKeyboard).toHaveBeenCalledWith("777", 5);
    // 환영 인사 재발송·동의 재기록은 없다
    expect(sendTelegramPatientMessage).not.toHaveBeenCalled();
    expect(captured.filter((c) => c.table === "chat_threads" && c.op === "update")).toHaveLength(0);
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
    // 채널 표시 계약(반성문 #179) — 이 한 줄이 빠지면 AI 가 텔레그램 환자에게 «없는 기능»인
    // 「30일 브라우저 쿠키 재개」를 사실로 안내하고, 그 거짓말이 품질 판사에게 「사실 칸」으로
    // 넘어가 환각 검출까지 통과한다. buildSessionFacts 쪽 시험은 순수함수만 보므로
    // «값이 실제로 도달하는가»는 여기서만 잡힌다(2차 독립 리뷰 지적).
    expect((generateChatReply.mock.calls[0] as any)[4]?.channel).toBe("messenger");
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

  it("핸드오프 요청: 접수 멘트를 '채널 안(inChannel)' 변형으로 붙인다 — 텔레그램에서 연락처 되묻기 금지", async () => {
    const POST = await loadPost();
    mockState.thread = CONSENTED_THREAD();
    const res = await POST(makeReq(msgUpdate("connect me to a human please", 15)));
    expect((await res.json()).ok).toBe(true);
    await flushAfter(); // 핸드오프 턴은 after() 안에 동적 import 가 있어 완료를 기다려야 함

    // 접수 멘트가 답변 뒤에 붙어 발신되고
    const sent = String(sendTelegramPatientMessage.mock.calls[0]?.[1]);
    expect(sent).toContain("🔔 접수됐어요");
    // 텔레그램 = 이 채팅이 연락 채널 → inChannel=true 로 선택돼야 한다(채널 되묻기 금지 계약)
    expect(pickHandoffConfirm).toHaveBeenCalledWith("en", true, true);
  });

  it("⑤ 코디 인수 후 AI 침묵 + 첫 추가 메시지엔 고정 수신확인 1회(사전질문 답 dead-air 방지)", async () => {
    const POST = await loadPost();
    const t = CONSENTED_THREAD();
    (t.metadata as any).hand_off_requested = true;
    (t.metadata as any).hand_off_notified = true;
    mockState.thread = t;

    const res = await POST(makeReq(msgUpdate("ok thank you", 10)));
    expect((await res.json()).ok).toBe(true);
    await flushAfter();

    // 환자 메시지는 코디가 봐야 하므로 저장된다
    const pIns = captured.find(
      (c) => c.table === "chat_messages" && c.payload.actor_type === "patient"
    );
    expect(pIns).toBeTruthy();
    // AI 는 침묵(재개입 아님) — 발신은 고정 ack 1건뿐
    expect(generateChatReply).not.toHaveBeenCalled();
    expect(sendTelegramPatientMessage).toHaveBeenCalledTimes(1);
    expect(sendTelegramPatientMessage).toHaveBeenCalledWith("777", "handoff-ack");
    // ack 클레임은 조건부 UPDATE(아직 안 보냈을 때만) — 병렬 배달 중복 발송 방지
    const upd = captured.find(
      (c) => c.table === "chat_threads" && c.op === "update" && c.payload?.metadata?.hand_off_ack_sent === true
    );
    expect(upd?.filters.some(([f]) => f === "is:metadata->>hand_off_ack_sent")).toBe(true);
  });

  it("⑤-2 수신확인은 스레드당 1회 — 이미 보냈으면(hand_off_ack_sent) 완전 침묵", async () => {
    const POST = await loadPost();
    const t = CONSENTED_THREAD();
    (t.metadata as any).hand_off_requested = true;
    (t.metadata as any).hand_off_notified = true;
    (t.metadata as any).hand_off_ack_sent = true;
    mockState.thread = t;

    const res = await POST(makeReq(msgUpdate("here are my symptoms", 11)));
    expect((await res.json()).ok).toBe(true);
    await flushAfter();
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

  it("동의된 스레드의 재입장 /start: 전체 환영문 대신 한 줄 인사 + 스로틀 조건부 UPDATE (실기기 소음 재발 방지)", async () => {
    const POST = await loadPost();
    mockState.thread = CONSENTED_THREAD();
    const res = await POST(makeReq(msgUpdate("/start inq_human", 20)));
    expect((await res.json()).ok).toBe(true);

    // 전체 환영문(welcome)이 아니라 한 줄 인사(welcome-back)
    expect(sendTelegramPatientMessage).toHaveBeenCalledWith("777", "welcome-back");
    expect(sendTelegramPatientMessage.mock.calls.every((c: any[]) => c[1] !== "welcome")).toBe(true);
    // /start 본문 미저장 + AI 미호출은 기존 계약 그대로
    expect(captured.filter((c) => c.table === "chat_messages" && c.op === "insert")).toHaveLength(0);
    expect(generateChatReply).not.toHaveBeenCalled();
    // 스로틀이 조건부 UPDATE(or: last_start_at null 또는 60초 이전)로 걸려 있어야 한다
    const upd = captured.find(
      (c) => c.table === "chat_threads" && c.op === "update" && c.payload?.metadata?.last_start_at
    );
    const orFilter = upd?.filters.find(([f]) => f === "or");
    expect(String(orFilter?.[1])).toContain("metadata->>last_start_at.is.null");
  });

  it("60초 내 연속 /start(더블탭·재진입 연타): 조건부 UPDATE 0행이면 침묵한다", async () => {
    const POST = await loadPost();
    mockState.thread = CONSENTED_THREAD();
    mockState.throttleStart = true;
    const res = await POST(makeReq(msgUpdate("/start inq_human", 21)));
    expect((await res.json()).ok).toBe(true);
    expect(sendTelegramPatientMessage).not.toHaveBeenCalled();
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

  it("사람 연결 요청 턴: 3턴 규칙과 무관하게 문의 승격이 즉시 발사된다(핸드오프 플래그 전달)", async () => {
    const POST = await loadPost();
    mockState.thread = CONSENTED_THREAD();
    // 환자 메시지 1개뿐(3의 배수 아님) — 기존 규칙이면 승격이 영영 안 걸리던 케이스
    mockState.history = [
      { actor_type: "patient", message_text: "connect me to a human", metadata: {} },
    ];
    const res = await POST(makeReq(msgUpdate("connect me to a human", 14)));
    expect((await res.json()).ok).toBe(true);
    await flushAfter();
    expect(createDraftIntake).toHaveBeenCalledTimes(1);
    expect(createDraftIntake.mock.calls[0][4]).toEqual({ handOffRequested: true });
  });

  it("코디 답장으로 waiting_patient 가 된 스레드도 이어받는다 — 재동의·새 스레드 분절 금지(2026-07-24 실기기 재현)", async () => {
    const POST = await loadPost();
    const t = CONSENTED_THREAD();
    (t as any).status = "waiting_patient";
    mockState.thread = t;

    const res = await POST(makeReq(msgUpdate("another question", 15)));
    expect((await res.json()).ok).toBe(true);
    await flushAfter();

    // 동의를 다시 묻지 않고, 새 스레드도 만들지 않으며, AI 가 정상 응답한다
    expect(sendConsentPrompt).not.toHaveBeenCalled();
    expect(captured.find((c) => c.table === "chat_threads" && c.op === "insert")).toBeFalsy();
    expect(generateChatReply).toHaveBeenCalledTimes(1);
  });

  it("TEST_TELEGRAM_CHAT_IDS 에 등록된 계정은 딥링크 없이도 테스트 표식(is_test) — 실적 오염 방지", async () => {
    const POST = await loadPost();
    process.env.TEST_TELEGRAM_CHAT_IDS = "999, 777";
    try {
      const res = await POST(makeReq(msgUpdate("hello", 16)));
      expect((await res.json()).ok).toBe(true);
      const tIns = captured.find((c) => c.table === "chat_threads" && c.op === "insert");
      expect(tIns?.payload.metadata.is_test).toBe(true);
    } finally {
      delete process.env.TEST_TELEGRAM_CHAT_IDS;
    }
  });

  it("그룹 채팅 메시지는 무시한다(스태프 그룹 미설정 시 — 1:1 상담 전용)", async () => {
    const POST = await loadPost();
    delete process.env.STAFF_TELEGRAM_GROUP_ID;
    const u = msgUpdate("hello", 10);
    (u.message.chat as any).type = "group";
    const res = await POST(makeReq(u));
    expect((await res.json()).skipped).toBe("non_private");
    expect(captured.length).toBe(0);
  });

  function staffGroupUpdate(text: string, topicId: number | null, updateId = 90) {
    return {
      update_id: updateId,
      message: {
        message_id: 500,
        text,
        ...(topicId ? { message_thread_id: topicId } : {}),
        chat: { id: -100999, type: "supergroup" },
        from: { id: 42, username: "coordinator_kim", is_bot: false },
      },
    };
  }

  it("스태프 그룹 주제 답장: 스레드로 역매핑 → 환자 발신 + admin 저장(via telegram_staff) + AI 침묵 플래그 (B안)", async () => {
    const POST = await loadPost();
    process.env.STAFF_TELEGRAM_GROUP_ID = "-100999";
    findThreadByStaffTopic.mockResolvedValueOnce({
      ...CONSENTED_THREAD(),
      metadata: { ...CONSENTED_THREAD().metadata, staff_topic_id: 55 },
    });
    const res = await POST(makeReq(staffGroupUpdate("네, 예약 도와드릴게요", 55)));
    expect((await res.json()).ok).toBe(true);

    // 환자 텔레그램으로 발신
    expect(sendTelegramPatientMessage).toHaveBeenCalledWith("777", "네, 예약 도와드릴게요");
    // admin 메시지로 저장 + 출처 표식
    const ins = captured.find((c) => c.table === "chat_messages" && c.op === "insert");
    expect(ins?.payload.actor_type).toBe("admin");
    expect(ins?.payload.metadata.via).toBe("telegram_staff");
    expect(ins?.payload.metadata.staff_username).toBe("coordinator_kim");
    // 사람 답장 시작 → coordinator_active(이후 AI 침묵) — 키 병합 RPC 로(전체 덮어쓰기 금지, C2)
    const merge = captured.find(
      (c) => c.table === "rpc:chat_thread_merge_meta" && c.payload?.p_patch?.coordinator_active === true
    );
    expect(merge).toBeTruthy();
    // 이중 발신 차단: 저장(클레임)이 발신보다 먼저여야 한다(재배달이 유니크 인덱스에 걸리게)
    const insIdx = captured.findIndex((c) => c.table === "chat_messages" && c.op === "insert");
    expect(insIdx).toBeGreaterThanOrEqual(0);
    expect(sendTelegramPatientMessage.mock.invocationCallOrder[0]).toBeGreaterThan(0);
    delete process.env.STAFF_TELEGRAM_GROUP_ID;
  });

  it("스태프 그룹: gid 가 설정돼 있어도 다른 그룹의 메시지는 무시한다(보안 — 임의 그룹 초대 공격 차단)", async () => {
    const POST = await loadPost();
    process.env.STAFF_TELEGRAM_GROUP_ID = "-100999";
    const u = staffGroupUpdate("try to reply", 55, 95);
    (u.message.chat as any).id = -100777; // 다른 그룹
    const res = await POST(makeReq(u));
    expect((await res.json()).skipped).toBe("non_private");
    expect(sendTelegramPatientMessage).not.toHaveBeenCalled();
    expect(captured.filter((c) => c.op === "insert")).toHaveLength(0);
    delete process.env.STAFF_TELEGRAM_GROUP_ID;
  });

  it("스태프 그룹: 매핑 안 되는 주제엔 발신하지 않고 주제에 안내만 남긴다", async () => {
    const POST = await loadPost();
    process.env.STAFF_TELEGRAM_GROUP_ID = "-100999";
    findThreadByStaffTopic.mockResolvedValueOnce(null);
    const res = await POST(makeReq(staffGroupUpdate("어디로 가나요", 77)));
    expect((await res.json()).skipped).toBe("staff_topic_unmapped");
    expect(sendTelegramPatientMessage).not.toHaveBeenCalled();
    expect(notifyStaffTopic).toHaveBeenCalledTimes(1);
    delete process.env.STAFF_TELEGRAM_GROUP_ID;
  });

  it("환자 메시지는 스태프 주제로 릴레이된다(🧑 환자)", async () => {
    const POST = await loadPost();
    mockState.thread = CONSENTED_THREAD();
    const res = await POST(makeReq(msgUpdate("what hospitals?", 91)));
    expect((await res.json()).ok).toBe(true);
    await flushAfter();
    expect(relayToStaffTopic).toHaveBeenCalledWith(expect.anything(), "🧑 환자", "what hospitals?");
  });
});
