/**
 * healwith: 환자 재진예약(rebooking) 확정/무시 API
 *
 * PATCH /api/khidi/rebooking/[id]  body: { action: "confirm" | "dismiss" }
 *
 * 배경: 기존엔 환자가 /api/khidi/consultation/[id] PATCH 를 호출했으나 그건
 *   doctor/coordinator/admin 전용 → 환자는 403 으로 막혀 버튼이 무동작이었음.
 *   재진예약은 환자 본인의 결정이므로 본인 소유 세션이면 통과시키는 전용 경로.
 *
 * 권한: requireConsultationAccess(requireRole 없음) → 본인(환자) 또는 staff/admin.
 *       rebooking_source 가 있는 행(자동 추천 재진)만 대상으로 제한.
 *   - confirm: 추천을 수락 → rebooking_source 비움(대기목록→이력으로 이동) + 노트.
 *   - dismiss: status='cancelled'.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireConsultationAccess } from "@/lib/auth/requireConsultationAccess";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 본인 소유 세션이면 통과(환자 포함). IDOR 은 여기서 차단.
    const access = await requireConsultationAccess(request, id);
    if (!access.success) return access.response;

    const body = await request.json().catch(() => ({}));
    const action = body?.action;
    if (action !== "confirm" && action !== "dismiss") {
      return Response.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }

    const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");

    // 재진예약(rebooking_source 있는) 행만 대상으로 제한
    const { data: row } = await supabaseAdmin
      .from("consultation_sessions")
      .select("id, rebooking_source, notes")
      .eq("id", id)
      .maybeSingle();
    if (!row || !(row as any).rebooking_source) {
      return Response.json({ ok: false, error: "not_a_rebooking" }, { status: 400 });
    }

    const updateData: Record<string, any> =
      action === "confirm"
        ? {
            rebooking_source: null,
            notes: `${(row as any).notes || ""} [환자 확정]`.trim(),
          }
        : { status: "cancelled" };

    const { error } = await supabaseAdmin
      .from("consultation_sessions")
      .update(updateData as any)
      .eq("id", id);

    if (error) {
      console.error(`[api/khidi/rebooking/${id}] update error:`, error.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    console.error("[api/khidi/rebooking] exception:", error?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
