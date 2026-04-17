/**
 * HEALO: 관리자 알림 수신자 API
 * 
 * 경로: /api/admin/notification-recipients
 * 권한: 관리자 전용
 * 
 * ✅ P4.1 확장: DB 기반 수신자 관리
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import {
  getAllRecipients,
  addRecipient,
} from "../../../../src/lib/notifications/recipients";
import { requireAdminAuth } from "../../../../src/lib/auth/requireAdminAuth";

/**
 * GET: 수신자 목록 조회
 */
export async function GET(request: NextRequest) {
  // ✅ 관리자 인증 확인 (자동 audit log 포함)
  const auth = await requireAdminAuth(request);
  if (!auth.success) {
    return auth.response; // 403 + audit log 자동 처리
  }

  const result = await getAllRecipients();

  if (!result.success) {
    // 테이블 미존재는 503 (Service Unavailable)로 구분
    const statusCode = result.errorCode === "TABLE_NOT_FOUND" ? 503 : 500;
    
    return Response.json(
      { 
        ok: false, 
        error: result.error,
        errorCode: result.errorCode 
      },
      { status: statusCode }
    );
  }

  return Response.json({
    ok: true,
    recipients: result.recipients,
  });
}

/**
 * POST: 수신자 추가 (멀티 채널 지원)
 * 
 * Body (단일):
 * {
 *   "label": "김주영",
 *   "phone": "+821012345678",
 *   "email": "admin@healo.com",
 *   "channel": "sms" | "alimtalk" | "email",
 *   "notes": "메모"
 * }
 * 
 * Body (멀티):
 * {
 *   "label": "김주영",
 *   "phone": "+821012345678",
 *   "email": "admin@healo.com",
 *   "channels": ["sms", "alimtalk", "email"],  // 여러 채널 선택
 *   "notes": "메모"
 * }
 */
export async function POST(request: NextRequest) {
  // ✅ 관리자 인증 확인 (자동 audit log 포함)
  const auth = await requireAdminAuth(request);
  if (!auth.success) {
    return auth.response; // 403 + audit log 자동 처리
  }

  try {
    const body = await request.json();

    // label 필수
    if (!body.label) {
      return Response.json(
        { ok: false, error: "label is required" },
        { status: 400 }
      );
    }

    // 멀티 채널 처리 (channels 배열이 있으면 한 row에 저장)
    if (body.channels && Array.isArray(body.channels)) {
      const channels = body.channels;

      if (channels.length === 0) {
        return Response.json(
          { ok: false, error: "at least one channel is required" },
          { status: 400 }
        );
      }

      // 채널별 필수 필드 검증
      const hasPhoneChannel = channels.some((ch: string) => ch === "sms" || ch === "alimtalk");
      const hasEmailChannel = channels.includes("email");

      if (hasPhoneChannel && !body.phone) {
        return Response.json(
          { ok: false, error: "phone is required for sms/alimtalk channels" },
          { status: 400 }
        );
      }

      if (hasEmailChannel && !body.email) {
        return Response.json(
          { ok: false, error: "email is required for email channel" },
          { status: 400 }
        );
      }

      // 한 row에 연락처와 이메일 모두 저장
      // primary channel은 첫 번째 선택된 채널로 설정
      const primaryChannel = channels[0] as "sms" | "alimtalk" | "email";

      const result = await addRecipient({
        label: body.label,
        phone: hasPhoneChannel ? body.phone : undefined,
        email: hasEmailChannel ? body.email : undefined,
        channel: primaryChannel,
        notes: body.notes,
        is_active: body.is_active !== undefined ? body.is_active : true,
      });

      if (!result.success) {
        return Response.json(
          { ok: false, error: result.error },
          { status: 400 }
        );
      }

      return Response.json({
        ok: true,
        message: "Recipient created",
        count: 1,
      });
    }

    // 단일 채널 처리 (기존 방식)
    const channel = body.channel || "sms";
    if (!["sms", "alimtalk", "email"].includes(channel)) {
      return Response.json(
        { ok: false, error: "channel must be 'sms', 'alimtalk', or 'email'" },
        { status: 400 }
      );
    }

    // 채널별 필수 필드 검증
    if (channel === "email") {
      if (!body.email) {
        return Response.json(
          { ok: false, error: "email is required for email channel" },
          { status: 400 }
        );
      }
    } else if (channel === "sms" || channel === "alimtalk") {
      if (!body.phone) {
        return Response.json(
          { ok: false, error: "phone is required for sms/alimtalk channel" },
          { status: 400 }
        );
      }
    }

    const result = await addRecipient({
      label: body.label,
      phone: body.phone,
      email: body.email,
      channel,
      message_template: body.message_template,
      notes: body.notes,
      is_active: body.is_active !== undefined ? body.is_active : true,
    });

    if (!result.success) {
      return Response.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    return Response.json({
      ok: true,
      id: result.id,
    });
  } catch (error: any) {
    console.error("[admin/notification-recipients] POST error:", error);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
