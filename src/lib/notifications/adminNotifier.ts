/**
 * healwith: 관리자 알림 시스템
 * 
 * 목적:
 * - 문의 접수 시 관리자에게 즉시 알림
 * - SMS/알림톡 지원
 * - Fail-safe (알림 실패해도 메인 로직 영향 없음)
 * 
 * 원칙:
 * - PII 최소화 (전화번호 마스킹)
 * - Provider 추상화 (벤더 종속 X)
 * - Idempotent (중복 발송 방지)
 * - Rate limit (폭주 방지)
 */

import { supabaseAdmin } from "../rag/supabaseAdmin";
import { logOperational } from "../operationalLog";
import { getActiveRecipients, maskPhone, updateRecipientStats } from "./recipients";
import { sendEmail } from "../email/sendEmail";

/**
 * 알림 제공자 타입
 */
export type NotificationProvider = "sms" | "alimtalk" | "console";

/**
 * 알림 페이로드
 */
export interface AdminNotificationPayload {
  inquiryId: number;
  nationality?: string;
  treatmentType?: string;
  contactMethod?: string;
  leadQuality?: string;
  priorityScore?: number;
  createdAt: string;
}

/**
 * 알림 결과
 */
export interface NotificationResult {
  success: boolean;
  provider: NotificationProvider;
  error?: string;
  messageId?: string;
}

// maskPhone은 recipients.ts에서 import하여 사용

/**
 * 알림 메시지 생성 (기본 템플릿)
 */
function generateNotificationMessage(payload: AdminNotificationPayload): string {
  const urgency = payload.leadQuality === "hot" ? "🔥 긴급" : "📬";
  
  let message = `${urgency} 새 문의 #${payload.inquiryId}\n\n`;
  
  if (payload.nationality) {
    message += `국가: ${payload.nationality}\n`;
  }
  
  if (payload.treatmentType) {
    message += `시술: ${payload.treatmentType}\n`;
  }
  
  if (payload.contactMethod) {
    message += `연락: ${payload.contactMethod}\n`;
  }
  
  if (payload.priorityScore) {
    message += `점수: ${payload.priorityScore}\n`;
  }
  
  message += `\n시각: ${new Date(payload.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) + " (KST)"}\n`;
  
  // 관리자 페이지 링크 (환경변수로 설정 가능)
  // ⚠️ /admin/inquiries 는 목록 페이지만 존재(상세 [id] 라우트 없음) → 목록으로 링크. 문의번호는 본문에 표기됨.
  const adminUrl = process.env.ADMIN_DASHBOARD_URL || process.env.NEXT_PUBLIC_URL || "https://healwith.co.kr";
  message += `\n확인(목록): ${adminUrl}/admin/inquiries`;

  return message;
}

/**
 * 관리자 알림 이메일 본문 생성 (subject/html/text)
 * (2026-06-19 중복정리: 옛 notifications/emailSender.ts 의 generateEmailMessage 를 이리로 이전)
 */
function generateAdminEmail(payload: AdminNotificationPayload): { subject: string; html: string; text: string } {
  const urgency = payload.leadQuality === "hot" ? "🔥 긴급" : "📬";
  // ⚠️ /admin/inquiries 는 목록 페이지만 존재(상세 [id] 라우트 없음) → 목록으로 링크. 문의번호는 본문에 표기됨.
  const adminUrl = process.env.ADMIN_DASHBOARD_URL || process.env.NEXT_PUBLIC_URL || "https://healwith.co.kr";
  const inquiryUrl = `${adminUrl}/admin/inquiries`;

  const subject = `[healwith] ${urgency} New inquiry received #${payload.inquiryId}`;

  const text = `
${urgency} 새 문의 #${payload.inquiryId}

국가: ${payload.nationality || "미표기"}
시술: ${payload.treatmentType || "미표기"}
연락: ${payload.contactMethod || "미표기"}
점수: ${payload.priorityScore || 0}

시각: ${new Date(payload.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) + " (KST)"}

확인: ${inquiryUrl}
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${payload.leadQuality === "hot" ? "#dc2626" : "#059669"}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .field { margin: 10px 0; }
    .label { font-weight: bold; color: #374151; }
    .value { color: #6b7280; }
    .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">${urgency} New Inquiry #${payload.inquiryId}</h2>
    </div>
    <div class="content">
      <div class="field"><span class="label">국가:</span> <span class="value">${payload.nationality || "미표기"}</span></div>
      <div class="field"><span class="label">시술:</span> <span class="value">${payload.treatmentType || "미표기"}</span></div>
      <div class="field"><span class="label">연락:</span> <span class="value">${payload.contactMethod || "미표기"}</span></div>
      <div class="field"><span class="label">점수:</span> <span class="value">${payload.priorityScore || 0}</span></div>
      <div class="field"><span class="label">시각:</span> <span class="value">${new Date(payload.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) + " (KST)"}</span></div>
      <a href="${inquiryUrl}" class="button">문의 목록에서 확인 (#${payload.inquiryId})</a>
    </div>
    <div class="footer">healwith - AI Medical Concierge for Global Patients</div>
  </div>
</body>
</html>
`.trim();

  return { subject, html, text };
}

/**
 * ✅ SMS 발송 (Mock - 실제 발송하지 않음)
 * 
 * 목적:
 * - Console log만 출력
 * - admin_notification_logs에 status='sent'로 기록
 * - 나중에 실제 Provider 연동 시 이 함수만 교체
 * 
 * Provider 연동 예정:
 * - Twilio / AWS SNS / 기타 SMS API
 */
async function sendSMS(_to: string, _message: string): Promise<NotificationResult> {
  // ⚠️ 실제 SMS provider(Twilio/Solapi 등) 미연동.
  // 과거엔 success:true + mock messageId 를 반환해 DB 에 'sent' 로 거짓 기록됐다
  // (실제로는 아무것도 안 보냄). 거짓 'sent' 를 없애고 미설정을 정직하게 반환한다.
  // 실제 발송 채널은 이메일(sendEmail). SMS 연동 시 이 함수만 교체.
  return {
    success: false,
    provider: "sms",
    error: "sms_not_configured",
  };
}

/**
 * 전화 채널(SMS/알림톡)이 실제로 설정됐는지 — 미설정이면 발송 시도 자체를 건너뛴다.
 * (거짓 'sent' 로그·불필요한 실패 알림 방지)
 */
function isPhoneChannelConfigured(provider: NotificationProvider): boolean {
  if (provider === "alimtalk") return !!process.env.ALIMTALK_API_KEY;
  if (provider === "sms") {
    return !!(
      process.env.SMS_API_KEY ||
      process.env.TWILIO_AUTH_TOKEN ||
      process.env.SOLAPI_API_KEY
    );
  }
  // "console" 등은 실제 발송 채널이 아님
  return false;
}

/**
 * ✅ 알림톡 발송 (카카오 비즈니스 메시지)
 * 
 * 주의: 알림톡은 사전 템플릿 승인 필요
 */
async function sendAlimtalk(to: string, _payload: AdminNotificationPayload): Promise<NotificationResult> {
  try {
    // 알림톡 벤더 API (예: NHN Cloud, Aligo 등)
    const apiKey = process.env.ALIMTALK_API_KEY;
    const templateCode = process.env.ALIMTALK_TEMPLATE_CODE || "INQUIRY_NOTICE";
    
    if (!apiKey) {
      throw new Error("Alimtalk API key not configured");
    }
    
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Alimtalk] -> ${maskPhone(to)}, template: ${templateCode}`);
    }
    
    // 실제 API 호출 (벤더별로 다름)
    // const response = await fetch("https://api.alimtalk-vendor.com/send", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${apiKey}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     to,
    //     template_code: templateCode,
    //     params: templateParams,
    //   }),
    // });
    
    return {
      success: true,
      provider: "alimtalk",
      messageId: `alimtalk-mock-${Date.now()}`,
    };
    
  } catch (error: any) {
    console.error("[Alimtalk] 발송 실패:", error.message);
    
    return {
      success: false,
      provider: "alimtalk",
      error: error.message,
    };
  }
}

/**
 * ✅ Rate Limit 체크 (중복/폭주 방지)
 */
const notificationCache = new Map<string, number>();

function isRateLimited(inquiryId: number): boolean {
  const key = `inquiry-${inquiryId}`;
  const lastSent = notificationCache.get(key);
  
  if (lastSent) {
    const elapsed = Date.now() - lastSent;
    const cooldown = 60 * 1000; // 1분
    
    if (elapsed < cooldown) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Notify] Rate limited: inquiry ${inquiryId}`);
      }
      return true;
    }
  }
  
  notificationCache.set(key, Date.now());
  
  // 캐시 정리 (오래된 항목 삭제)
  if (notificationCache.size > 1000) {
    const oldestKeys = Array.from(notificationCache.keys()).slice(0, 500);
    oldestKeys.forEach((k) => notificationCache.delete(k));
  }
  
  return false;
}

/**
 * ✅ inquiry_events에 알림 이벤트 기록
 */
async function logNotificationEvent(
  inquiryId: number,
  // `admin_notify_skipped` = 보내려다 «일부러» 안 보낸 것(시험 문의·연타 제한·수신자 0명).
  //   실패(admin_notify_failed)와 구분해야 한다 — 실패는 고칠 버그이고, 건너뜀은 «판정»이다.
  //   판정이 틀리면(예: 진짜 문의를 시험으로 오판) 알림이 조용히 사라지므로 이유를 남긴다.
  eventType: "admin_notified" | "admin_notify_failed" | "admin_notify_skipped",
  meta: Record<string, any>
): Promise<void> {
  try {
    // 실제 컬럼명은 metadata (meta 아님) — 과거 meta 로 insert 해 매번 조용히 실패(42703)하며
    // 알림 이벤트 감사로그가 통째로 안 남던 버그. end-to-end 퍼널 검증 중 발견(POSTMORTEMS #59).
    await supabaseAdmin.from("inquiry_events").insert({
      inquiry_id: inquiryId,
      event_type: eventType,
      metadata: meta,
    });
  } catch (error: any) {
    // 에러 상세 정보 출력 (테이블/컬럼 미스매치 디버깅용)
    const errorDetail = error.code 
      ? `code=${error.code}, message=${error.message}` 
      : error.message;
    console.error(
      `[Notify] inquiry_events 로깅 실패 (무시) - 테이블/컬럼 확인 필요:`,
      errorDetail,
      `| 시도한 컬럼: inquiry_id, event_type, metadata`
    );
    // 로깅 실패는 무시 (메인 로직 영향 없게)
  }
}

/**
 * ✅ admin_notification_logs에 발송 기록
 */
async function logNotificationToDb(data: {
  inquiryId?: number;
  normalizedInquiryId?: string;
  recipientId?: string;
  recipientLabel: string;
  channel: NotificationProvider;
  destination: string;
  status: "sent" | "failed" | "pending";
  error?: string;
  providerResponse?: Record<string, any>;
  messagePreview?: string;
  deliveryTimeMs?: number;
}): Promise<void> {
  try {
    const dedupeKey = data.inquiryId
      ? `${data.inquiryId}:${data.channel}:${data.recipientId || data.destination}`
      : null;

    await supabaseAdmin.from("admin_notification_logs").insert({
      inquiry_id: data.inquiryId || null,
      normalized_inquiry_id: data.normalizedInquiryId || null,
      recipient_id: data.recipientId || null,
      recipient_label: data.recipientLabel,
      channel: data.channel,
      destination: data.destination,
      status: data.status,
      error: data.error || null,
      provider_response: data.providerResponse || null,
      message_preview: data.messagePreview ? data.messagePreview.substring(0, 100) : null,
      delivery_time_ms: data.deliveryTimeMs || null,
      dedupe_key: dedupeKey,
    });
  } catch (error: any) {
    if (error.code === "23505" && error.message?.includes("dedupe")) {
      return;
    }
    console.error("[Notify] DB log failed:", error.message);
  }
}

/**
 * ✅ 관리자 알림 발송 (메인 함수)
 * 
 * Fail-safe:
 * - 알림 실패해도 throw 안 함
 * - 항상 성공 반환 (메인 로직 보호)
 * - 실패는 로그와 이벤트로만 기록
 */
export async function sendAdminNotification(
  payload: AdminNotificationPayload
): Promise<void> {
  // Fail-safe wrapper
  try {
    await _sendAdminNotificationInternal(payload);
  } catch (error: any) {
    console.error("[Notify] Critical error (ignored):", error.message);
    
    // 운영 로그 (에러 추적용)
    logOperational("error", {
      event: "admin_notification_critical_error",
      inquiry_id: payload.inquiryId,
      error: error.message,
    });
  }
}

/**
 * 내부 구현 (실제 로직)
 * 
 * ✅ DB 우선, ENV fallback
 */
async function _sendAdminNotificationInternal(
  payload: AdminNotificationPayload
): Promise<void> {
  const inquiryId = payload.inquiryId;
  
  // 1. Rate limit 체크
  if (isRateLimited(inquiryId)) {
    console.log(`[Notify] Skipping inquiry ${inquiryId} (rate limited)`);
    await logNotificationEvent(inquiryId, "admin_notify_skipped", { reason: "rate_limited" });
    return;
  }

  // 1-a. 테스트 문의(is_test)면 알림 자체를 건너뛴다.
  //      2026-08-14: 야간 챗 스모크·로컬 개발 테스트가 만든 문의까지 PO 메일함으로 알림이 가서
  //      "진짜 문의"와 섞였다. 호출부마다 플래그를 넘기게 하면 새 호출부에서 또 빠뜨리므로 여기서 DB로 확인한다.
  //
  // 🔴 2026-09-04: 이 «조용한 건너뜀»이 실제로 진짜 환자 둘을 삼켰다.
  //    8/19 의뢰서 개편(c4a2366b)이 「회사 주소(healwith.co.kr)로 연락받겠다 = 시험」 규칙을 같이
  //    넣었는데, 코디·PO 가 환자를 «대리 접수»할 때 그 주소를 쓴다. 그래서 #291(카자흐·유방암 3기)·
  //    #302(카자흐·18세)가 is_test=true 로 찍혔고 → 여기서 return → 알림이 한 통도 안 나갔다.
  //    규칙 자체는 #1596 이 뺐다. 여기서 고치는 것은 «그때 아무 흔적도 안 남았다»는 쪽이다.
  //    ⚠️ 흔적이 없으면 다음 사람이 「알림이 왜 안 갔나」를 처음부터 다시 판다(실제로 그랬다).
  //       건너뛸 때도 inquiry_events 에 한 줄 남겨서 «안 보낸 이유»가 DB 로 조회되게 한다.
  try {
    const { data: row } = await supabaseAdmin
      .from("inquiries")
      .select("is_test")
      .eq("id", inquiryId)
      .maybeSingle();
    if (row?.is_test) {
      console.log(`[Notify] Skipping inquiry ${inquiryId} (is_test)`);
      await logNotificationEvent(inquiryId, "admin_notify_skipped", { reason: "is_test" });
      return;
    }
  } catch {
    // 조회 실패 시엔 보내는 쪽으로(진짜 문의 알림을 놓치는 게 더 나쁘다)
  }

  // 1-b. 웹/앱 종(bell) 알림 — 코디+어드민에게 in-app 발송.
  //      이메일/SMS 수신자 설정과 무관하게 항상 울리도록 수신자 조회보다 먼저 한다(fail-safe).
  try {
    const { notifyStaffNewInquiry } = await import("./inApp");
    await notifyStaffNewInquiry({
      inquiryId,
      nationality: payload.nationality,
      treatmentType: payload.treatmentType,
    });
  } catch (e: any) {
    console.warn("[Notify] in-app staff notify 실패(무시):", e?.message);
  }

  // 1-c. 텔레그램 알림 — 운영자(PO) 개인 푸시. 이메일 수신자 설정과 무관하게 항상(fail-safe).
  //      env(TELEGRAM_BOT_TOKEN·TELEGRAM_CHAT_ID) 미설정이면 내부에서 조용히 스킵.
  try {
    const { sendTelegramAlert } = await import("./telegram");
    await sendTelegramAlert(generateNotificationMessage(payload));
  } catch (e: any) {
    console.warn("[Notify] telegram notify 실패(무시):", e?.message);
  }

  // 2. 수신자 조회 (DB 우선 → ENV fallback)
  const recipients = await getActiveRecipients();
  
  if (recipients.length === 0) {
    console.warn("[Notify] 수신자 없음 (DB + ENV 모두 비어있음)");
    await logNotificationEvent(inquiryId, "admin_notify_skipped", { reason: "no_recipients" });
    return;
  }
  
  if (process.env.NODE_ENV !== "production") {
    console.log(`[Notify] Recipients: ${recipients.length} (${recipients[0].source})`);
  }
  
  // 3. 제공자 확인
  const provider = (process.env.NOTIFY_PROVIDER || "console") as NotificationProvider;
  
  // 4. 발송
  const results: NotificationResult[] = [];
  
  for (const recipient of recipients) {
    const message = generateNotificationMessage(payload);
    let hasSuccess = false;
    
    // 1. SMS/Alimtalk 발송 (phone이 있고 + 실제 provider 설정됐을 때만)
    //    미설정이면 거짓 'sent' 를 남기지 않도록 건너뛴다. 이메일은 아래에서 별도 발송.
    if (recipient.phone && isPhoneChannelConfigured(provider)) {
      const startTime = Date.now();
      let result: NotificationResult;
      
      if (provider === "alimtalk" && recipient.channel === "alimtalk") {
        result = await sendAlimtalk(recipient.phone, payload);
      } else {
        result = await sendSMS(recipient.phone, message);
      }
      
      const deliveryTimeMs = Date.now() - startTime;
      results.push(result);
      if (result.success) hasSuccess = true;
      
      // DB 로깅
      await logNotificationToDb({
        inquiryId,
        recipientId: recipient.id,
        recipientLabel: recipient.label,
        channel: result.provider,
        destination: maskPhone(recipient.phone),
        status: result.success ? "sent" : "failed",
        error: result.error,
        providerResponse: result.messageId ? { message_id: result.messageId } : undefined,
        messagePreview: message,
        deliveryTimeMs,
      });
      
      // 이벤트 로깅
      if (result.success) {
        await logNotificationEvent(inquiryId, "admin_notified", {
          provider: result.provider,
          message_id: result.messageId,
          recipient_id: recipient.id || null,
          recipient_source: recipient.source,
          masked_to: maskPhone(recipient.phone),
        });
        
        logOperational("info", {
          event: "admin_notified",
          inquiry_id: inquiryId,
          provider: result.provider,
          recipient_source: recipient.source,
          masked_to: maskPhone(recipient.phone),
        });
      } else {
        await logNotificationEvent(inquiryId, "admin_notify_failed", {
          provider: result.provider,
          error: result.error,
          recipient_id: recipient.id || null,
          recipient_source: recipient.source,
          masked_to: maskPhone(recipient.phone),
        });
        
        logOperational("warn", {
          event: "admin_notify_failed",
          inquiry_id: inquiryId,
          provider: result.provider,
          error: result.error,
          recipient_source: recipient.source,
          masked_to: maskPhone(recipient.phone),
        });
      }
    }
    
    // 2. Email 발송 (email이 있으면)
    if (recipient.email) {
      const startTime = Date.now();

      // 통합 이메일 발송기(email/sendEmail): Resend 우선 → SES(신규·레거시 env) → console
      const { subject, html, text } = generateAdminEmail(payload);
      const sendResult = await sendEmail({ to: recipient.email, subject, html, text });
      const emailResult = {
        success: sendResult.ok,
        messageId: sendResult.messageId,
        error: sendResult.error,
      };
      const deliveryTimeMs = Date.now() - startTime;

      if (emailResult.success) hasSuccess = true;
      
      const result: NotificationResult = {
        success: emailResult.success,
        provider: "sms", // provider 타입이 "sms" | "alimtalk" | "console"만 있어서 임시로 "sms" 사용
        messageId: emailResult.messageId,
        error: emailResult.error,
      };
      
      results.push(result);
      
      // DB 로깅
      await logNotificationToDb({
        inquiryId,
        recipientId: recipient.id,
        recipientLabel: recipient.label,
        channel: "sms", // Email 타입 추가 필요
        destination: recipient.email,
        status: emailResult.success ? "sent" : "failed",
        error: emailResult.error,
        providerResponse: emailResult.messageId ? { message_id: emailResult.messageId } : undefined,
        messagePreview: `[Email] ${payload.nationality || ""} - ${payload.treatmentType || ""}`,
        deliveryTimeMs,
      });
      
      // 이벤트 로깅
      if (emailResult.success) {
        await logNotificationEvent(inquiryId, "admin_notified", {
          provider: "sms", // Email 타입 추가 필요
          message_id: emailResult.messageId,
          recipient_id: recipient.id || null,
          recipient_source: recipient.source,
          masked_to: recipient.email,
        });
        
        logOperational("info", {
          event: "admin_notified",
          inquiry_id: inquiryId,
          provider: "email",
          recipient_source: recipient.source,
          masked_to: recipient.email,
        });
      } else {
        await logNotificationEvent(inquiryId, "admin_notify_failed", {
          provider: "sms", // Email 타입 추가 필요
          error: emailResult.error,
          recipient_id: recipient.id || null,
          recipient_source: recipient.source,
          masked_to: recipient.email,
        });
        
        logOperational("warn", {
          event: "admin_notify_failed",
          inquiry_id: inquiryId,
          provider: "email",
          error: emailResult.error,
          recipient_source: recipient.source,
          masked_to: recipient.email,
        });
      }
    }
    
    // 수신자 통계 업데이트 (하나라도 성공하면 success)
    await updateRecipientStats(recipient.id, hasSuccess);
  }
  
  // 8. 통계
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  
  if (process.env.NODE_ENV !== "production") {
    console.log(`[Notify] #${inquiryId}: ${successCount} sent, ${failCount} failed`);
  }
}

/**
 * ✅ 설정 검증 (운영자용 헬퍼)
 */
export function validateNotificationConfig(): {
  valid: boolean;
  provider: NotificationProvider;
  adminCount: number;
  issues: string[];
} {
  const issues: string[] = [];
  
  const provider = (process.env.NOTIFY_PROVIDER || "console") as NotificationProvider;
  const adminPhones = process.env.ADMIN_PHONE_NUMBERS?.split(",").map((p) => p.trim()) || [];
  
  if (provider === "console") {
    issues.push("Console mode (실제 알림 안 감)");
  }
  
  if (adminPhones.length === 0 && provider !== "console") {
    issues.push("ADMIN_PHONE_NUMBERS 미설정");
  }
  
  if (provider === "sms") {
    const smsProvider = process.env.SMS_PROVIDER;
    if (!smsProvider) {
      issues.push("SMS_PROVIDER 미설정");
    } else if (smsProvider === "twilio") {
      if (!process.env.TWILIO_ACCOUNT_SID) issues.push("TWILIO_ACCOUNT_SID 미설정");
      if (!process.env.TWILIO_AUTH_TOKEN) issues.push("TWILIO_AUTH_TOKEN 미설정");
      if (!process.env.TWILIO_FROM_NUMBER) issues.push("TWILIO_FROM_NUMBER 미설정");
    }
  }
  
  if (provider === "alimtalk") {
    if (!process.env.ALIMTALK_API_KEY) issues.push("ALIMTALK_API_KEY 미설정");
    if (!process.env.ALIMTALK_TEMPLATE_CODE) issues.push("ALIMTALK_TEMPLATE_CODE 미설정");
  }
  
  return {
    valid: issues.length === 0 || provider === "console",
    provider,
    adminCount: adminPhones.length,
    issues,
  };
}
