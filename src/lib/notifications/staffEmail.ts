/**
 * 직원(코디·어드민)에게 «메일»로도 알린다 — 종(bell)·폰 푸시가 실제로 닿지 않는 자리의 보강.
 *
 * 왜 (2026-09-05 실DB 실측): 코디 계정에 등록된 폰 푸시 기기 0대(어드민 1대, 8/27 마지막 접속), 종 알림 열람률
 *   10~15%(new_inquiry 27/180 · chat_handoff 17/168). 새 문의는 이미 메일이 같이 나가서 사람이 반응하는데,
 *   환자 글·식은 문의 알림은 종+푸시뿐이라 «울렸는데 아무도 못 듣는» 구조였다.
 * 받는 사람 = 새 문의 알림과 같은 수신자(admin_notification_recipients DB → ENV 폴백, recipients.ts).
 * Fail-safe: throw 안 함. 보낸 건수를 돌려준다(0 = 수신자 없음 또는 전부 실패).
 */
import "server-only";
import { getActiveRecipients } from "./recipients";
import { sendEmail } from "@/lib/email/sendEmail";
import { escapeHtml } from "@/lib/api/sanitize";

export interface StaffEmail {
  subject: string;
  text: string;
  /** 없으면 text 를 <pre> 로 감싼다 — 알림 메일은 꾸밈보다 «그 순간 읽히는 것»이 먼저다 */
  html?: string;
  tags?: Record<string, string>;
}

export async function emailStaff(mail: StaffEmail): Promise<number> {
  try {
    const recipients = (await getActiveRecipients()).filter((r) => typeof r.email === "string" && r.email.includes("@"));
    if (recipients.length === 0) return 0;
    const html = mail.html || `<pre style="font:14px/1.6 system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(mail.text)}</pre>`;
    const results = await Promise.allSettled(
      recipients.map((r) => sendEmail({ to: r.email as string, subject: mail.subject, html, text: mail.text, tags: mail.tags }))
    );
    return results.filter((r) => r.status === "fulfilled" && (r.value as any)?.ok).length;
  } catch (e: any) {
    console.warn("[staffEmail] 실패(무시):", e?.message);
    return 0;
  }
}
