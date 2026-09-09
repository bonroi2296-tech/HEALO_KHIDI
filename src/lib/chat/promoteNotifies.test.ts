import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * 이 시험이 지키는 것: 「채팅·메신저에서 올라온 문의도 «새 문의» 알림을 울리는가」.
 *
 * 2026-09-09 실사고. 반복되는 대량 비출혈로 새벽에 텔레그램 봇으로 접수한 실환자(#328)에게
 * 알림이 «한 통도» 안 나갔다. 같은 사람이 웹 폼으로 다시 넣은 세 건(#329·#330·#331)만
 * 울렸다. 폼 경로에만 sendAdminNotification 호출이 있고 승격 경로엔 없었기 때문이다.
 *
 * 알림이 안 울리면 코디가 화면을 열 이유 자체가 없다. 그래서 「문의가 만들어졌다」가 아니라
 * 「알림 창구를 실제로 불렀다」를 잰다.
 */

const sendAdminNotification = vi.fn(async (_payload: Record<string, unknown>) => {});
const insertedRows: any[] = [];

vi.mock("@/lib/notifications/adminNotifier", () => ({ sendAdminNotification }));
vi.mock("@/lib/messaging/telegram", () => ({ sendTelegramPatientMessage: vi.fn(async () => true) }));
vi.mock("@/lib/messaging/whatsapp", () => ({ sendWhatsAppPatientMessage: vi.fn(async () => ({ sent: true })) }));
vi.mock("@/lib/security/encryptionV2", () => ({
  encryptStringNullable: (v: any) => v,
  decryptMaybe: (v: any) => v,
}));

// supabaseAdmin: insert 는 만들어진 문의를 돌려주고, 나머지 표는 조용히 성공한다.
vi.mock("@/lib/rag/supabaseAdmin", () => {
  const chain = (table: string) => ({
    insert(row: any) {
      insertedRows.push({ table, row });
      // 호출부가 두 가지로 쓴다: `.select().single()` 과 `await`/`.then(undefined, onRej)`.
      // 그래서 «진짜 Promise» 에 select 를 얹는다(직접 then 을 흉내내면 onRej 만 넘길 때 깨진다).
      return Object.assign(Promise.resolve({ data: null, error: null }), {
        select: () => ({ single: async () => ({ data: { id: 4242, public_token: "tok" }, error: null }) }),
      });
    },
    update: () => ({ eq: () => ({ is: async () => ({ error: null }) }) }),
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
  });
  return { supabaseAdmin: { from: (t: string) => chain(t) } };
});

const TELEGRAM_THREAD = {
  id: "thread-1",
  channel: "telegram",
  inquiry_id: null,
  guest_country: "UZ",
  metadata: { telegram: { chat_id: "976881368" }, consent: { health_crossborder: true, at: "2026-09-09T00:00:00Z", version: "1.0.0" } },
};

describe("promoteThreadToInquiry — 알림", () => {
  beforeEach(() => {
    sendAdminNotification.mockClear();
    insertedRows.length = 0;
  });

  it("🔴 텔레그램에서 올라온 문의도 «새 문의» 알림 창구를 부른다", async () => {
    const { promoteThreadToInquiry } = await import("./publicChatHelpers");
    await promoteThreadToInquiry(TELEGRAM_THREAD as any, { body_part: "nose" }, "enc", "ru", null);

    expect(sendAdminNotification).toHaveBeenCalledTimes(1);
    expect(sendAdminNotification.mock.calls[0][0]).toMatchObject({
      inquiryId: 4242,
      nationality: "UZ",
      contactMethod: "telegram",
    });
  });

  it("이미 승격된 스레드는 문의도 알림도 다시 만들지 않는다", async () => {
    const { promoteThreadToInquiry } = await import("./publicChatHelpers");
    await promoteThreadToInquiry({ ...TELEGRAM_THREAD, inquiry_id: 99 } as any, {}, null, "ru", null);

    expect(sendAdminNotification).not.toHaveBeenCalled();
    expect(insertedRows.filter((r) => r.table === "inquiries")).toHaveLength(0);
  });

  it("알림 창구가 터져도 접수 자체는 성공한다", async () => {
    sendAdminNotification.mockRejectedValueOnce(new Error("boom"));
    const { promoteThreadToInquiry } = await import("./publicChatHelpers");

    await expect(
      promoteThreadToInquiry(TELEGRAM_THREAD as any, { body_part: "nose" }, "enc", "ru", null)
    ).resolves.toBeUndefined();
    expect(insertedRows.some((r) => r.table === "inquiries")).toBe(true);
  });
});
