/**
 * 스태프(관리자·코디네이터) 답장 → 환자 메신저(텔레그램·왓츠앱) 실발신 릴레이.
 *
 * 왜 공용 모듈인가: 원래 이 로직이 관리자 채팅 API에만 있어서, 코디네이터 포털
 * (/api/portal/threads/:id/messages)로 보낸 답장은 DB에만 저장되고 환자 메신저로는
 * 안 나갔다(2026-07-24 PO 실기기 발견). 같은 로직이 두 라우트에 복붙되면 또 어긋나므로
 * 단일 모듈로 뽑아 양쪽이 공유한다.
 *
 * 규칙(관리자 라우트의 기존 동작 그대로):
 * - 발신 실패해도 DB 저장은 유지, 메시지 metadata.delivery 에 'failed'|'window_expired' 기록
 *   → 코디 화면이 말풍선에 미전달 표시.
 * - 사람이 답장을 시작한 메신저 스레드는 metadata.coordinator_active=true → 이후 AI 침묵
 *   (각 웹훅이 이 플래그를 보고 응대 중단, resolve 후 새 스레드부터 AI 재개).
 */

import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

export type StaffRelayThread = {
  channel?: string | null;
  metadata?: any;
};

export type StaffRelayResult = "sent" | "failed" | "window_expired" | undefined;

/** 메신저 스레드가 아니면 undefined 를 반환하고 아무것도 하지 않는다. */
export async function relayStaffReplyToMessenger(opts: {
  threadId: string;
  messageId: string;
  messageText: string;
  thread: StaffRelayThread;
  /** 메시지 행에 이미 있던 metadata (delivery 기록 시 보존용) */
  existingMessageMetadata?: any;
}): Promise<StaffRelayResult> {
  const { threadId, messageId, messageText, thread, existingMessageMetadata } = opts;

  if (thread.channel !== "telegram" && thread.channel !== "whatsapp") return undefined;

  let delivery: StaffRelayResult;
  if (thread.channel === "telegram") {
    const tgChatId = thread.metadata?.telegram?.chat_id;
    if (tgChatId) {
      const { sendTelegramPatientMessage } = await import("@/lib/messaging/telegram");
      const sent = await sendTelegramPatientMessage(tgChatId, messageText);
      delivery = sent ? "sent" : "failed";
    } else {
      delivery = "failed";
    }
  } else {
    const waId = thread.metadata?.whatsapp?.wa_id;
    if (waId) {
      const { sendWhatsAppPatientMessage } = await import("@/lib/messaging/whatsapp");
      const r = await sendWhatsAppPatientMessage(waId, messageText);
      // 왓츠앱 24시간 창 만료(131047)는 일반 실패와 구분 — 코디에게 "환자 재응답 필요" 안내 근거.
      delivery = r.sent ? "sent" : r.windowExpired ? "window_expired" : "failed";
    } else {
      delivery = "failed";
    }
  }

  if (delivery !== "sent") {
    await (supabaseAdmin as any)
      .from("chat_messages")
      .update({
        metadata: {
          ...(existingMessageMetadata && typeof existingMessageMetadata === "object" && !Array.isArray(existingMessageMetadata)
            ? existingMessageMetadata
            : {}),
          delivery,
        },
      })
      .eq("id", messageId);
  }

  if (thread.metadata?.coordinator_active !== true) {
    await (supabaseAdmin as any)
      .from("chat_threads")
      .update({
        metadata: {
          ...(thread.metadata && typeof thread.metadata === "object" && !Array.isArray(thread.metadata)
            ? thread.metadata
            : {}),
          coordinator_active: true,
        },
      })
      .eq("id", threadId);
  }

  return delivery;
}
