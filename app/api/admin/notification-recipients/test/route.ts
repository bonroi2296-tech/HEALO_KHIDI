/**
 * HEALO: 관리자 알림 테스트 발송 API
 * 
 * 경로: /api/admin/notification-recipients/test
 * 권한: 관리자 전용
 * 
 * 목적:
 * - 알림 시스템 동작 확인
 * - 특정 수신자 또는 전체 수신자에게 테스트 알림 발송
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdminAuth } from "../../../../../src/lib/auth/requireAdminAuth";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../src/lib/rag/supabaseAdmin";
import { maskPhone } from "../../../../../src/lib/notifications/recipients";

// 테스트 알림 발송 함수 import
async function sendTestNotification(data: {
  recipientId?: string;
  recipientLabel: string;
  phone: string;
  channel: string;
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const startTime = Date.now();
  
  // Console 모드로 발송 (실제 SMS/알림톡은 비용 발생 방지)
  const provider = process.env.SMS_PROVIDER || "console";
  
  const testMessage = `
🧪 HEALO 알림 테스트

수신자: ${data.recipientLabel}
채널: ${data.channel}
시각: ${new Date().toLocaleString("ko-KR")}

이 메시지는 테스트 발송입니다.
실제 문의 발생 시 이 형식으로 알림이 발송됩니다.
  `.trim();
  
  try {
    if (provider === "console") {
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📱 테스트 알림 발송 (Console Mode)");
      console.log(`수신: ${maskPhone(data.phone)}`);
      console.log(`채널: ${data.channel}`);
      console.log(`내용:\n${testMessage}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      
      // DB 로깅
      const deliveryTimeMs = Date.now() - startTime;
      await supabaseAdmin.from("admin_notification_logs").insert({
        inquiry_id: null, // 테스트 발송은 inquiry 연결 없음
        normalized_inquiry_id: null,
        recipient_id: data.recipientId || null,
        recipient_label: data.recipientLabel,
        channel: data.channel,
        destination: maskPhone(data.phone),
        status: "sent",
        provider_response: { message_id: `test-${Date.now()}`, mode: "console" },
        message_preview: testMessage.substring(0, 100),
        delivery_time_ms: deliveryTimeMs,
      });
      
      return {
        success: true,
        messageId: `test-console-${Date.now()}`,
      };
    }
    
    // 실제 SMS/알림톡 발송 (프로덕션)
    // TODO: 실제 벤더 API 연결 시 구현
    return {
      success: false,
      error: "실제 발송은 구현되지 않았습니다 (console 모드만 지원)",
    };
    
  } catch (error: any) {
    console.error("[Test Notification] 발송 실패:", error.message);
    
    // 실패 로깅
    await supabaseAdmin.from("admin_notification_logs").insert({
      inquiry_id: null,
      normalized_inquiry_id: null,
      recipient_id: data.recipientId || null,
      recipient_label: data.recipientLabel,
      channel: data.channel,
      destination: maskPhone(data.phone),
      status: "failed",
      error: "notification_failed",
      message_preview: testMessage.substring(0, 100),
      delivery_time_ms: Date.now() - startTime,
    });
    
    return {
      success: false,
      error: "notification_failed",
    };
  }
}

/**
 * POST: 테스트 알림 발송
 * 
 * Body:
 * {
 *   "recipient_id": "uuid" // 선택: 특정 수신자만 (없으면 전체)
 * }
 */
export async function POST(request: NextRequest) {
  assertSupabaseEnv();
  // ✅ 관리자 인증 확인
  const auth = await requireAdminAuth(request);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const recipientId = body.recipient_id;

    // 수신자 조회
    let recipients;
    
    if (recipientId) {
      // 특정 수신자만
      const { data, error } = await supabaseAdmin
        .from("admin_notification_recipients")
        .select("id, label, phone_e164, channel, is_active")
        .eq("id", recipientId)
        .single();

      if (error || !data) {
        return Response.json(
          { ok: false, error: "수신자를 찾을 수 없습니다" },
          { status: 404 }
        );
      }

      recipients = [data];
    } else {
      // 모든 활성 수신자
      const { data, error } = await supabaseAdmin
        .from("admin_notification_recipients")
        .select("id, label, phone_e164, channel, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) {
        return Response.json(
          { ok: false, error: "query_failed" },
          { status: 500 }
        );
      }

      if (!data || data.length === 0) {
        return Response.json(
          { ok: false, error: "활성 수신자가 없습니다" },
          { status: 400 }
        );
      }

      recipients = data;
    }

    // 발송
    const results: Array<{
      recipient_id: string;
      recipient_label: string;
      phone_masked: string;
      success: boolean;
      error?: string;
      message_id?: string;
    }> = [];

    for (const recipient of recipients) {
      const result = await sendTestNotification({
        recipientId: recipient.id,
        recipientLabel: recipient.label,
        phone: recipient.phone_e164,
        channel: recipient.channel,
      });
      
      results.push({
        recipient_id: recipient.id,
        recipient_label: recipient.label,
        phone_masked: maskPhone(recipient.phone_e164),
        success: result.success,
        error: result.error,
        message_id: result.messageId,
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`[Test Notification] ${successCount} sent, ${failCount} failed`);

    return Response.json({
      ok: true,
      message: `테스트 발송 완료: ${successCount}개 성공, ${failCount}개 실패`,
      results,
    });

  } catch (error: any) {
    console.error("[Test Notification] Error:", error.message);

    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
