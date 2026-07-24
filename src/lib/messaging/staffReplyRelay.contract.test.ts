/**
 * 계약 회귀 테스트 — 스태프 답장 메신저 릴레이 (staffReplyRelay)
 *
 * 과거 버그(2026-07-24 PO 실기기 발견): 이 로직이 관리자 채팅 API에만 인라인으로 있어서
 * 코디네이터 포털 답장은 DB에만 저장되고 환자 텔레그램으로 안 나갔다.
 * 이 테스트가 공용 모듈의 계약을 잠근다:
 *   ① telegram 스레드 → sendTelegramPatientMessage 실호출 + 성공 시 delivery='sent'
 *   ② 발신 실패 → delivery='failed' 가 메시지 metadata 에 기록됨
 *   ③ whatsapp 24시간 창 만료 → delivery='window_expired' 구분
 *   ④ 첫 스태프 답장 시 스레드 coordinator_active=true (AI 침묵 플래그)
 *   ⑤ 메신저 스레드가 아니면(web) 아무 발신도 안 함
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const sendTelegram = vi.fn();
const sendWhatsApp = vi.fn();
const messageUpdates: any[] = [];
const threadUpdates: any[] = [];

vi.mock("@/lib/messaging/telegram", () => ({
  sendTelegramPatientMessage: (...a: any[]) => sendTelegram(...a),
}));
vi.mock("@/lib/messaging/whatsapp", () => ({
  sendWhatsAppPatientMessage: (...a: any[]) => sendWhatsApp(...a),
}));
vi.mock("@/lib/rag/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      update: (payload: any) => ({
        eq: async (_col: string, id: string) => {
          if (table === "chat_messages") messageUpdates.push({ id, payload });
          if (table === "chat_threads") threadUpdates.push({ id, payload });
          return { error: null };
        },
      }),
    }),
  },
}));

import { relayStaffReplyToMessenger } from "./staffReplyRelay";

beforeEach(() => {
  sendTelegram.mockReset();
  sendWhatsApp.mockReset();
  messageUpdates.length = 0;
  threadUpdates.length = 0;
});

describe("staffReplyRelay 계약", () => {
  it("① telegram 스레드면 chat_id 로 실발신하고 성공 시 'sent'", async () => {
    sendTelegram.mockResolvedValue(true);
    const delivery = await relayStaffReplyToMessenger({
      threadId: "th1",
      messageId: "m1",
      messageText: "안녕하세요",
      thread: { channel: "telegram", metadata: { telegram: { chat_id: 12345 } } },
    });
    expect(sendTelegram).toHaveBeenCalledWith(12345, "안녕하세요");
    expect(delivery).toBe("sent");
    expect(messageUpdates).toHaveLength(0); // 성공이면 delivery 기록 안 함
  });

  it("② 발신 실패면 delivery='failed' 를 메시지 metadata 에 기록", async () => {
    sendTelegram.mockResolvedValue(false);
    const delivery = await relayStaffReplyToMessenger({
      threadId: "th1",
      messageId: "m1",
      messageText: "hi",
      thread: { channel: "telegram", metadata: { telegram: { chat_id: 1 } } },
      existingMessageMetadata: { keep: "me" },
    });
    expect(delivery).toBe("failed");
    expect(messageUpdates).toHaveLength(1);
    expect(messageUpdates[0].id).toBe("m1");
    expect(messageUpdates[0].payload.metadata).toEqual({ keep: "me", delivery: "failed" });
  });

  it("③ whatsapp 24시간 창 만료는 'window_expired' 로 구분", async () => {
    sendWhatsApp.mockResolvedValue({ sent: false, windowExpired: true });
    const delivery = await relayStaffReplyToMessenger({
      threadId: "th2",
      messageId: "m2",
      messageText: "hello",
      thread: { channel: "whatsapp", metadata: { whatsapp: { wa_id: "821012345678" } } },
    });
    expect(delivery).toBe("window_expired");
    expect(messageUpdates[0].payload.metadata.delivery).toBe("window_expired");
  });

  it("④ 첫 스태프 답장 시 coordinator_active=true 로 AI 침묵 플래그", async () => {
    sendTelegram.mockResolvedValue(true);
    await relayStaffReplyToMessenger({
      threadId: "th3",
      messageId: "m3",
      messageText: "제가 안내드릴게요",
      thread: { channel: "telegram", metadata: { telegram: { chat_id: 7 }, lang: "ko" } },
    });
    expect(threadUpdates).toHaveLength(1);
    expect(threadUpdates[0].id).toBe("th3");
    expect(threadUpdates[0].payload.metadata).toMatchObject({ coordinator_active: true, lang: "ko" });
  });

  it("④b 이미 coordinator_active 면 스레드를 다시 안 건드림", async () => {
    sendTelegram.mockResolvedValue(true);
    await relayStaffReplyToMessenger({
      threadId: "th3",
      messageId: "m3",
      messageText: "추가 안내",
      thread: { channel: "telegram", metadata: { telegram: { chat_id: 7 }, coordinator_active: true } },
    });
    expect(threadUpdates).toHaveLength(0);
  });

  it("⑤ 메신저 스레드가 아니면(web) 발신·기록 없이 undefined", async () => {
    const delivery = await relayStaffReplyToMessenger({
      threadId: "th4",
      messageId: "m4",
      messageText: "web msg",
      thread: { channel: "web", metadata: {} },
    });
    expect(delivery).toBeUndefined();
    expect(sendTelegram).not.toHaveBeenCalled();
    expect(sendWhatsApp).not.toHaveBeenCalled();
    expect(messageUpdates).toHaveLength(0);
    expect(threadUpdates).toHaveLength(0);
  });

  it("②b chat_id 자체가 없으면 발신 시도 없이 'failed'", async () => {
    const delivery = await relayStaffReplyToMessenger({
      threadId: "th5",
      messageId: "m5",
      messageText: "x",
      thread: { channel: "telegram", metadata: {} },
    });
    expect(delivery).toBe("failed");
    expect(sendTelegram).not.toHaveBeenCalled();
  });
});
