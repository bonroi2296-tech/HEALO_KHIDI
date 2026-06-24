/**
 * healwith: 통합 이메일 발송 — Resend 우선, AWS SES fallback
 *
 * 환경변수 우선순위:
 * 1. `RESEND_API_KEY` + `RESEND_FROM_EMAIL` 있으면 Resend 사용
 * 2. SES 자격: `AWS_SES_*`(신규 규약) 또는 레거시 `AWS_REGION`/`AWS_ACCESS_KEY_ID`/
 *    `AWS_SECRET_ACCESS_KEY`/`SES_FROM_EMAIL`(옛 notifications/emailSender 규약) 둘 다 인식
 * 3. 둘 다 없으면 console.log 만 (개발용)
 *
 * Resend 가 Setup 훨씬 간단 (도메인 인증만 하면 바로 발송) — 권장.
 * AWS SES 는 production 승인 + IAM 키 관리 필요.
 *
 * (2026-06-19) 중복정리: 옛 `notifications/emailSender.ts`(SES 전용, 레거시 AWS_REGION/
 *   AWS_ACCESS_KEY_ID/SES_FROM_EMAIL 규약)를 이 모듈로 통합. 프로덕션이 옛 env 이름만
 *   설정돼 있어도 끊기지 않도록 레거시 이름을 fallback 으로 함께 인식한다.
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
  // 신규(AWS_SES_*) 우선, 없으면 레거시(AWS_*/SES_FROM_EMAIL) 규약으로 fallback
  const sesRegion = process.env.AWS_SES_REGION || process.env.AWS_REGION;
  const sesAccessKey = process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const sesSecretKey = process.env.AWS_SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const sesFrom = process.env.AWS_SES_FROM_EMAIL || process.env.SES_FROM_EMAIL;
  if (sesRegion && sesAccessKey && sesSecretKey && sesFrom) {
    try {
      const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");
      const client = new SESClient({
        region: sesRegion,
        credentials: {
          accessKeyId: sesAccessKey,
          secretAccessKey: sesSecretKey,
        },
      });
      const cmd = new SendEmailCommand({
        Source: sesFrom,
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

  // ── 미설정 fallback ─────────────────
  // 발송 제공자(Resend/SES)가 없으면 실제로 아무것도 안 나간다.
  // ok:true 로 보고하면 호출부가 '발송됨'으로 거짓 기록한다(과거 SMS와 동일한 함정).
  // 미설정을 정직하게 ok:false 로 반환 → admin_notification_logs 에 거짓 'sent' 안 남김.
  console.warn(
    "[email/console] no provider configured — NOT sent:",
    JSON.stringify(
      { to: toArr, subject: opts.subject, preview: opts.text?.slice(0, 200) },
      null,
      2
    )
  );
  return { ok: false, provider: "console", error: "email_not_configured" };
}
