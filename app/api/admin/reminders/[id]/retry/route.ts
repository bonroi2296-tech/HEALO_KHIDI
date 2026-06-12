/**
 * HEALO: 리마인더 수동 재발송 (관리자 전용)
 *
 * POST /api/admin/reminders/:id/retry
 * Header: Authorization: Bearer <access_token>
 *
 * 동작:
 *   failed 상태인 리마인더를 pending + attempts 초기화로 리셋
 *   → 다음 dispatch-reminders 호출 시 재발송됨
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 관리자 인증
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { id } = await params;
  if (!id) {
    return Response.json({ ok: false, error: "id required" }, { status: 400 });
  }

  // 해당 리마인더 조회 (failed 인지 확인)
  const { data: reminder, error: fetchErr } = await supabaseAdmin
    .from("reminders_scheduled")
    .select("id, status, attempts")
    .eq("id", id)
    .single();

  if (fetchErr || !reminder) {
    return Response.json({ ok: false, error: "not found" }, { status: 404 });
  }

  if (reminder.status !== "failed") {
    return Response.json(
      { ok: false, error: `cannot retry status=${reminder.status}` },
      { status: 400 }
    );
  }

  // pending 으로 리셋 + attempts 초기화
  const { error: updateErr } = await supabaseAdmin
    .from("reminders_scheduled")
    .update({
      status: "pending",
      attempts: 0,
      last_error: null,
      // fire_at 은 유지 — 디스패처가 즉시 실행
    })
    .eq("id", id);

  if (updateErr) {
    console.error("[admin/reminders/retry] update error:", updateErr.message);
    return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
  }

  return Response.json({ ok: true, id });
}
