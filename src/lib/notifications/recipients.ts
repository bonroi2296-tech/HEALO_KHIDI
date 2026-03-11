/**
 * HEALO: 알림 수신자 관리
 * 
 * 목적:
 * - DB에서 활성 수신자 조회
 * - ENV fallback 지원
 * - 전화번호 마스킹 (로그용)
 * 
 * 우선순위:
 * 1. DB 활성 수신자 (is_active=true)
 * 2. ENV fallback (ADMIN_PHONE_NUMBERS)
 */

import { supabaseAdmin } from "../rag/supabaseAdmin";
import {
  formatPhoneDisplay,
  isValidKoreanMobile,
  isValidEmail,
  cleanPhone,
} from "../utils/phoneFormat";

/**
 * 알림 수신자 (sms/alimtalk/email 지원)
 */
export interface NotificationRecipient {
  id?: string; // DB에서 온 경우 UUID, ENV는 undefined
  label: string;
  phone?: string; // E.164 형식 (sms/alimtalk만)
  email?: string; // 이메일 주소 (email 채널만)
  channel: "sms" | "alimtalk" | "email";
  source: "db" | "env"; // 출처
}

/**
 * 전화번호 마스킹 (로그용) - 더 이상 사용하지 않음 (요구사항 변경)
 * 예: 01012345678 → 010-1234-5678 (마스킹 없이 포맷만)
 */
export function maskPhone(phone: string): string {
  return formatPhoneDisplay(phone);
}

/**
 * ✅ DB에서 활성 수신자 조회
 */
async function getRecipientsFromDB(): Promise<NotificationRecipient[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("admin_notification_recipients")
      .select("id, label, phone_e164, email, channel")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Recipients] DB 조회 실패:", error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.log("[Recipients] DB에 활성 수신자 없음");
      return [];
    }

    const recipients: NotificationRecipient[] = data.map((row) => ({
      id: row.id,
      label: row.label,
      phone: row.phone_e164 || undefined,
      email: row.email || undefined,
      channel: row.channel as "sms" | "alimtalk" | "email",
      source: "db",
    }));

    console.log(`[Recipients] DB에서 ${recipients.length}명 조회`);
    return recipients;
  } catch (error: any) {
    console.error("[Recipients] DB 조회 오류:", error.message);
    return [];
  }
}

/**
 * ✅ ENV에서 수신자 조회 (fallback)
 */
function getRecipientsFromEnv(): NotificationRecipient[] {
  const envPhones = process.env.ADMIN_PHONE_NUMBERS?.split(",").map((p) => p.trim()) || [];

  if (envPhones.length === 0) {
    console.warn("[Recipients] ENV ADMIN_PHONE_NUMBERS 미설정");
    return [];
  }

  const recipients: NotificationRecipient[] = envPhones.map((phone, index) => ({
    label: `ENV-${index + 1}`,
    phone,
    channel: "sms",
    source: "env",
  }));

  console.log(`[Recipients] ENV에서 ${recipients.length}명 조회`);
  return recipients;
}

/**
 * ✅ 활성 수신자 조회 (메인 함수)
 * 
 * 우선순위:
 * 1. DB 활성 수신자
 * 2. ENV fallback
 * 
 * Fail-safe:
 * - DB 오류 → ENV 사용
 * - 둘 다 없음 → 빈 배열 (알림 건너뜀)
 */
export async function getActiveRecipients(): Promise<NotificationRecipient[]> {
  // 1. DB 시도
  const dbRecipients = await getRecipientsFromDB();

  if (dbRecipients.length > 0) {
    console.log(`[Recipients] DB 사용: ${dbRecipients.length}명`);
    return dbRecipients;
  }

  // 2. ENV fallback
  console.log("[Recipients] DB 비어있음 → ENV fallback");
  const envRecipients = getRecipientsFromEnv();

  if (envRecipients.length > 0) {
    console.log(`[Recipients] ENV 사용: ${envRecipients.length}명`);
    return envRecipients;
  }

  // 3. 둘 다 없음
  console.warn("[Recipients] 수신자 없음 (DB + ENV 모두 비어있음)");
  return [];
}

/**
 * ✅ 수신자 통계 업데이트 (발송 후 호출)
 */
export async function updateRecipientStats(
  recipientId: string | undefined,
  success: boolean
): Promise<void> {
  if (!recipientId) {
    // ENV 출처는 통계 업데이트 안 함
    return;
  }

  try {
    const { error } = await supabaseAdmin.rpc("update_recipient_stats", {
      p_recipient_id: recipientId,
      p_success: success,
    });
    
    if (error) throw error;
  } catch (error: any) {
    // 통계 업데이트 실패는 무시 (메인 로직 영향 없게)
    console.error("[Recipients] 통계 업데이트 실패 (무시):", error.message);
  }
}

/**
 * ✅ 수신자 추가 (관리자 API용)
 * sms/alimtalk/email 지원, 채널별 검증 수행
 */
export async function addRecipient(data: {
  label: string;
  phone?: string;
  email?: string;
  channel?: "sms" | "alimtalk" | "email";
  notes?: string;
  is_active?: boolean;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const channel = data.channel || "sms";

    // 채널별 필수 필드 검증
    if (channel === "email") {
      if (!data.email) {
        return {
          success: false,
          error: "email is required for email channel",
        };
      }
      if (!isValidEmail(data.email)) {
        return {
          success: false,
          error: "Invalid email format (예: admin@healo.com)",
        };
      }
    } else if (channel === "sms" || channel === "alimtalk") {
      if (!data.phone) {
        return {
          success: false,
          error: "phone is required for sms/alimtalk channel",
        };
      }
      // 한국 휴대폰 검증 (010으로 시작하는 11자리)
      if (!isValidKoreanMobile(data.phone)) {
        return {
          success: false,
          error: "010으로 시작하는 11자리 숫자를 입력하세요 (예: 01012345678)",
        };
      }
    }

    // DB 저장: 전화번호는 하이픈 제거한 숫자만
    const phoneToSave = data.phone ? cleanPhone(data.phone) : null;

    const { data: result, error } = await supabaseAdmin
      .from("admin_notification_recipients")
      .insert({
        label: data.label,
        phone_e164: phoneToSave,
        email: data.email || null,
        channel: channel,
        notes: data.notes || null,
        is_active: data.is_active !== undefined ? data.is_active : true,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Recipients] 추가 실패:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }

    const identifier = data.email || (data.phone ? maskPhone(data.phone) : "unknown");
    console.log(`[Recipients] 추가 성공: ${identifier}`);
    return {
      success: true,
      id: result.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * ✅ 수신자 수정 (관리자 API용)
 * label, channel, phone_e164, email, is_active, notes 모두 수정 가능
 */
export async function updateRecipient(
  id: string,
  data: {
    label?: string;
    channel?: "sms" | "alimtalk" | "email";
    phone_e164?: string;
    email?: string;
    is_active?: boolean;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // channel 화이트리스트 검증
    if (data.channel !== undefined) {
      if (!["sms", "alimtalk", "email"].includes(data.channel)) {
        return {
          success: false,
          error: "channel must be 'sms', 'alimtalk', or 'email'",
        };
      }
    }

    // phone_e164 변경 시 한국 휴대폰 검증
    if (data.phone_e164 !== undefined && data.phone_e164 !== null) {
      if (!isValidKoreanMobile(data.phone_e164)) {
        return {
          success: false,
          error: "010으로 시작하는 11자리 숫자를 입력하세요 (예: 01012345678)",
        };
      }
    }

    // email 변경 시 이메일 형식 검증
    if (data.email !== undefined && data.email !== null) {
      if (!isValidEmail(data.email)) {
        return {
          success: false,
          error: "Invalid email format (예: admin@healo.com)",
        };
      }
    }

    const updateData: any = {};
    if (data.label !== undefined) updateData.label = data.label;
    if (data.channel !== undefined) updateData.channel = data.channel;
    // 전화번호는 하이픈 제거한 숫자만 저장
    if (data.phone_e164 !== undefined) {
      updateData.phone_e164 = data.phone_e164 ? cleanPhone(data.phone_e164) : null;
    }
    if (data.email !== undefined) updateData.email = data.email;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // updated_at은 DB 트리거/default로 자동 갱신됨
    const { error } = await supabaseAdmin
      .from("admin_notification_recipients")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("[Recipients] 수정 실패:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(`[Recipients] 수정 성공: ${id}`, updateData);
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * ✅ 수신자 삭제 (Soft Delete 권장)
 */
export async function deleteRecipient(
  id: string,
  softDelete = true
): Promise<{ success: boolean; error?: string }> {
  try {
    if (softDelete) {
      // Soft delete: is_active=false
      const { error } = await supabaseAdmin
        .from("admin_notification_recipients")
        .update({ is_active: false })
        .eq("id", id);

      if (error) {
        console.error("[Recipients] Soft delete 실패:", error.message);
        return {
          success: false,
          error: error.message,
        };
      }

      console.log(`[Recipients] Soft delete 성공: ${id}`);
    } else {
      // Hard delete: 실제 삭제
      const { error } = await supabaseAdmin
        .from("admin_notification_recipients")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("[Recipients] Hard delete 실패:", error.message);
        return {
          success: false,
          error: error.message,
        };
      }

      console.log(`[Recipients] Hard delete 성공: ${id}`);
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * ✅ 모든 수신자 조회 (관리자 UI용)
 */
export async function getAllRecipients(): Promise<{
  success: boolean;
  recipients?: Array<{
    id: string;
    label: string;
    phone_masked: string | null;
    email: string | null;
    destination: string; // 채널에 따라 phone_masked 또는 email
    channel: string;
    is_active: boolean;
    last_sent_at: string | null;
    sent_count: number;
    failed_count: number;
    created_at: string;
  }>;
  error?: string;
  errorCode?: string;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from("admin_notification_recipients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Recipients] 전체 조회 실패:", error.message);
      
      // 테이블 미존재 에러 감지
      const isTableNotFound = error.message.includes("does not exist") 
        || error.message.includes("schema cache")
        || error.code === "42P01"; // PostgreSQL: undefined_table
      
      return {
        success: false,
        error: isTableNotFound 
          ? "admin_notification_recipients 테이블이 존재하지 않습니다. 마이그레이션을 실행하세요." 
          : error.message,
        errorCode: isTableNotFound ? "TABLE_NOT_FOUND" : "QUERY_ERROR",
      };
    }

    const recipients = (data || []).map((row) => ({
      id: row.id,
      label: row.label,
      phone_masked: row.phone_e164 ? formatPhoneDisplay(row.phone_e164) : null,
      email: row.email || null,
      destination: row.channel === "email" ? row.email : (row.phone_e164 ? formatPhoneDisplay(row.phone_e164) : "-"),
      channel: row.channel,
      is_active: row.is_active,
      last_sent_at: row.last_sent_at,
      sent_count: row.sent_count,
      failed_count: row.failed_count,
      created_at: row.created_at,
    }));

    return {
      success: true,
      recipients,
    };
  } catch (error: any) {
    console.error("[Recipients] 예외 발생:", error.message);
    
    return {
      success: false,
      error: error.message,
      errorCode: "EXCEPTION",
    };
  }
}
