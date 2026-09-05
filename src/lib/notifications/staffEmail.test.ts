import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ recipients: [] as any[], sent: [] as any[], fail: false }));
vi.mock("./recipients", () => ({ getActiveRecipients: async () => h.recipients }));
vi.mock("@/lib/email/sendEmail", () => ({
  sendEmail: async (o: any) => { h.sent.push(o); return { ok: !h.fail }; },
}));
import { emailStaff } from "./staffEmail";

beforeEach(() => { h.recipients = []; h.sent = []; h.fail = false; });

describe("emailStaff — 종·푸시가 안 닿는 자리의 메일 보강", () => {
  it("이메일 있는 수신자에게만 보내고 보낸 수를 돌려준다", async () => {
    h.recipients = [
      { label: "PO", email: "po@example.com", channel: "email", source: "db" },
      { label: "폰만", phone: "+8210", channel: "sms", source: "db" },
    ];
    const n = await emailStaff({ subject: "s", text: "본문 <b>" });
    expect(n).toBe(1);
    expect(h.sent[0].to).toBe("po@example.com");
    expect(h.sent[0].html).toContain("&lt;b&gt;"); // html 이 없으면 text 를 이스케이프해 감싼다
  });
  it("수신자 없으면 0, 발송 실패도 0 (throw 없음)", async () => {
    expect(await emailStaff({ subject: "s", text: "t" })).toBe(0);
    h.recipients = [{ label: "PO", email: "po@example.com", channel: "email", source: "env" }];
    h.fail = true;
    expect(await emailStaff({ subject: "s", text: "t" })).toBe(0);
  });
});
