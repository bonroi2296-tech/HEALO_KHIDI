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
import { sendEmail } from "./emailSender";

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
  
  message += `\n시각: ${new Date(payload.createdAt).toLocaleString("ko-KR")}\n`;
  
  // 관리자 페이지 링크 (환경변수로 설정 가능)
  const adminUrl = process.env.ADMIN_DASHBOARD_URL || process.env.NEXT_PUBLIC_URL;
  if (adminUrl) {
    message += `\n확인: ${adminUrl}/admin/inquiries/${payload.inquiryId}`;
  }
  
  return message;
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
async function sendSMS(to: string, message: string): Promise<NotificationResult> {
  try {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[SMS Mock] -> ${maskPhone(to)}`);
    }
    
    // DB 기록을 위해 success=true 반환
    return {
      success: true,
      provider: "sms",
      messageId: `mock-sms-${Date.now()}`,
    };
  } catch (error: any) {
    console.error(`[SMS] Mock 실패: ${maskPhone(to)}`, error.message);
    
    return {
      success: false,
      provider: "sms",
      error: error.message,
    };
  }
}

/**
 * ✅ 알림톡 발송 (카카오 비즈니스 메시지)
 * 
 * 주의: 알림톡은 사전 템플릿 승인 필요
 */
async function sendAlimtalk(to: string, payload: AdminNotificationPayload): Promise<NotificationResult> {
  try {
    // 알림톡 벤더 API (예: NHN Cloud, Aligo 등)
    const apiKey = process.env.ALIMTALK_API_KEY;
    const templateCode = process.env.ALIMTALK_TEMPLATE_CODE || "INQUIRY_NOTICE";
    
    if (!apiKey) {
      throw new Error("Alimtalk API key not configured");
    }
    
    // 템플릿 파라미터
    const templateParams = {
      inquiry_id: payload.inquiryId.toString(),
      nationality: payload.nationality || "미표기",
      treatment: payload.treatmentType || "미표기",
      created_at: new Date(payload.createdAt).toLocaleString("ko-KR"),
    };
    
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
  eventType: "admin_notified" | "admin_notify_failed",
  meta: Record<string, any>
): Promise<void> {
  try {
    await supabaseAdmin.from("inquiry_events").insert({
      inquiry_id: inquiryId,
      event_type: eventType,
      meta: meta,
    });
  } catch (error: any) {
    // 에러 상세 정보 출력 (테이블/컬럼 미스매치 디버깅용)
    const errorDetail = error.code 
      ? `code=${error.code}, message=${error.message}` 
      : error.message;
    console.error(
      `[Notify] inquiry_events 로깅 실패 (무시) - 테이블/컬럼 확인 필요:`,
      errorDetail,
      `| 시도한 컬럼: inquiry_id, event_type, meta`
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
    return;
  }
  
  // 2. 수신자 조회 (DB 우선 → ENV fallback)
  const recipients = await getActiveRecipients();
  
  if (recipients.length === 0) {
    console.warn("[Notify] 수신자 없음 (DB + ENV 모두 비어있음)");
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
    
    // 1. SMS/Alimtalk 발송 (phone이 있으면)
    if (recipient.phone) {
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
      
      // AWS SES로 실제 발송
      const emailResult = await sendEmail(recipient.email, payload);
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
