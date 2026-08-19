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
  /**
   * 첨부파일 (예: 일정 파일 .ics).
   * ⚠️ Resend 경로에서만 나간다 — SES 는 단순 발송(SendEmail) 이라 첨부를 못 싣는다.
   *    SES 로 떨어지면 첨부는 조용히 빠지고 경고만 남는다(본문은 정상 발송).
   */
  attachments?: { filename: string; content: string; contentType?: string }[];
}

export interface SendEmailResult {
  ok: boolean;
  provider: "resend" | "ses" | "console";
  messageId?: string;
  error?: string;
}

/**
 * 「받는 사람이 존재할 수 없는 주소」 — 여기로 보내면 100% 반송(하드 바운스)된다.
 *
 * 🛑 왜 막나 (2026-08-19 실측): 자동 검사·수동 시험이 만든 문의에도 「접수 확인」 메일이 그대로 나가고 있었다.
 *    하루에만 26건. 받는 곳이 없는 주소라 전부 반송되는데, 반송률이 높아지면 발송사(Resend·SES)가
 *    **우리 계정을 제한**하고 진짜 환자 메일이 스팸함으로 간다. 코디 알림은 이미 시험 문의를 걸렀는데
 *    (adminNotifier) 환자 확인 메일만 안 걸러져 있었다.
 * · .invalid/.test/.example/.localhost 는 «절대 실존하지 않는» 예약 이름(RFC 2606)이다.
 * · test.com 은 남의 실제 도메인이다 — 우리 시험 계정이 쓰는 주소라 더더욱 보내면 안 된다.
 */
const UNDELIVERABLE = /@([\w-]+\.)*(invalid|test|example|localhost)$|@test\.com$/i;

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const toArr = (Array.isArray(opts.to) ? opts.to : [opts.to]).filter(Boolean);

  const blocked = toArr.filter((a) => UNDELIVERABLE.test(String(a).trim()));
  if (blocked.length === toArr.length && toArr.length > 0) {
    // 조용히 «성공»이라고 하지 않는다 — 기록은 남겨 「왜 안 왔지」를 3초에 풀 수 있게.
    console.log(`[Email] 시험 주소라 보내지 않음(반송 방지): ${toArr.join(", ")} / ${opts.subject}`);
    return { ok: true, provider: "console", messageId: "skipped_test_recipient" };
  }

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
        attachments: opts.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, "utf8"),
          contentType: a.contentType,
        })),
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
      if (opts.attachments?.length) {
        console.warn(
          `[email/ses] 첨부 ${opts.attachments.length}건은 SES 단순 발송으로 못 싣는다 — 본문만 나간다`
        );
      }
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
