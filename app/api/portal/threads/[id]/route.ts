/**
 * healwith: 스레드 상태 변경 — staff 전용
 *
 * PATCH /api/portal/threads/:id  Body: { status }
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

const VALID_STATUS = ["open", "waiting_coordinator", "waiting_patient", "resolved"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  const { id: threadId } = await params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const status = body?.status;
  if (!status || !VALID_STATUS.includes(status)) {
    return Response.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }

  try {
    const update: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "resolved") update.resolved_at = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("chat_threads")
      .update(update)
      .eq("id", threadId);

    if (error) {
      console.error("[portal/threads PATCH] error:", error.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, status });
  } catch (err: any) {
    console.error("[portal/threads PATCH] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
