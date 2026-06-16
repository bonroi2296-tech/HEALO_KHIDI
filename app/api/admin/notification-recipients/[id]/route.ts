/**
 * healwith: 관리자 알림 수신자 API (개별)
 * 
 * 경로: /api/admin/notification-recipients/[id]
 * 권한: 관리자 전용
 * 
 * ✅ P4.1 확장: 수신자 수정/삭제
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import {
  updateRecipient,
  deleteRecipient,
} from "@/lib/notifications/recipients";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

/**
 * PATCH: 수신자 수정
 * 
 * label, channel, phone_e164, email, is_active, notes 모두 수정 가능
 * 
 * Body:
 * {
 *   "label": "새 이름",
 *   "channel": "sms" | "alimtalk" | "email",
 *   "phone_e164": "+821012345678",
 *   "email": "admin@healo.com",
 *   "is_active": false,
 *   "notes": "메모"
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ✅ 관리자 인증 확인 (자동 audit log 포함)
  const auth = await requireAdminAuth(request);
  if (!auth.success) {
    return auth.response; // 403 + audit log 자동 처리
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // channel 화이트리스트 검증
    if (body.channel !== undefined) {
      if (!["sms", "alimtalk", "email"].includes(body.channel)) {
        return Response.json(
          { ok: false, error: "channel must be 'sms', 'alimtalk', or 'email'" },
          { status: 400 }
        );
      }
    }

    // 화이트리스트 필드만 전달
    const updateData: any = {};
    if (body.label !== undefined) updateData.label = body.label;
    if (body.channel !== undefined) updateData.channel = body.channel;
    if (body.phone_e164 !== undefined) updateData.phone_e164 = body.phone_e164;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const result = await updateRecipient(id, updateData);

    if (!result.success) {
      return Response.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    console.error("[admin/notification-recipients/:id] PATCH error:", error);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 수신자 삭제 (Hard delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ✅ 관리자 인증 확인 (자동 audit log 포함)
  const auth = await requireAdminAuth(request);
  if (!auth.success) {
    return auth.response; // 403 + audit log 자동 처리
  }

  try {
    const { id } = await params;

    const result = await deleteRecipient(id, false); // Hard delete (실제 삭제)

    if (!result.success) {
      return Response.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    console.error("[admin/notification-recipients/:id] DELETE error:", error);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
