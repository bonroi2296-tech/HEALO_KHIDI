/**
 * HEALO: 통합 이메일 발송 — Resend 우선, AWS SES fallback
 *
 * 환경변수 우선순위:
 * 1. `RESEND_API_KEY` + `RESEND_FROM_EMAIL` 있으면 Resend 사용
 * 2. `AWS_SES_REGION` + `AWS_SES_ACCESS_KEY_ID` 있으면 SES 사용
 * 3. 둘 다 없으면 console.log 만 (개발용)
 *
 * Resend 가 Setup 훨씬 간단 (도메인 인증만 하면 바로 발송) — 권장.
 * AWS SES 는 production 승인 + IAM 키 관리 필요.
 */

import "server-only";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;               // HTML 클라이언트 미지원 시 대체
  replyTo?: string;
  tags?: Record<string, string>; // 추적용 메타데이터
}

export interface SendEmailResult {
  ok: boolean;
  provider: "resend" | "ses" | "console";
  messageId?: string;
  error?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const toArr = Array.isArray(opts.to) ? opts.to : [opts.to];

  // ── Resend ──────────────────────────
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: toArr,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        replyTo: opts.replyTo,
        tags: opts.tags
          ? Object.entries(opts.tags).map(([name, value]) => ({ name, value }))
          : undefined,
      });
      if (error) {
        console.error("[email/resend] error:", error.message);
        return { ok: false, provider: "resend", error: error.message };
      }
      return { ok: true, provider: "resend", messageId: data?.id };
    } catch (err: any) {
      console.error("[email/resend] exception:", err.message);
      // Resend 실패 시 SES 로 fallback 시도
    }
  }

  // ── AWS SES ─────────────────────────
  if (
    process.env.AWS_SES_REGION &&
    process.env.AWS_SES_ACCESS_KEY_ID &&
    process.env.AWS_SES_SECRET_ACCESS_KEY &&
    process.env.AWS_SES_FROM_EMAIL
  ) {
    try {
      const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");
      const client = new SESClient({
        region: process.env.AWS_SES_REGION,
        credentials: {
          accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
        },
      });
      const cmd = new SendEmailCommand({
        Source: process.env.AWS_SES_FROM_EMAIL,
        Destination: { ToAddresses: toArr },
        Message: {
          Subject: { Data: opts.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: opts.html, Charset: "UTF-8" },
            Text: opts.text
              ? { Data: opts.text, Charset: "UTF-8" }
              : undefined,
          },
        },
        ReplyToAddresses: opts.replyTo ? [opts.replyTo] : undefined,
      });
      const out = await client.send(cmd);
      return { ok: true, provider: "ses", messageId: out.MessageId };
    } catch (err: any) {
      console.error("[email/ses] exception:", err.message);
      return { ok: false, provider: "ses", error: err.message };
    }
  }

  // ── 개발용 fallback ─────────────────
  console.log(
    "[email/console] no provider configured — would send:",
    JSON.stringify(
      { to: toArr, subject: opts.subject, preview: opts.text?.slice(0, 200) },
      null,
      2
    )
  );
  return { ok: true, provider: "console" };
}
