/**
 * HEALO: Waiting Room — Admissions API
 *
 * GET /api/khidi/consultation/:id/admissions
 *   → 대기열 조회 (의사/관리자 전용)
 *   응답: { ok, pending: [...], approved: [...], rejected: [...] }
 *
 * PATCH /api/khidi/consultation/:id/admissions?admissionId=xxx
 *   Body: { status: 'approved' | 'rejected' }
 *   → 의사가 개별 입장 승인/거절
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireConsultationAccess } from "@/lib/auth/requireConsultationAccess";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: consultationId } = await params;

  // 의사 / 관리자 / 코디네이터 만 대기열 조회 가능
  const access = await requireConsultationAccess(request, consultationId, {
    requireRole: ["admin", "doctor", "coordinator"],
  });
  if (!access.success) return access.response;

  const { data, error } = await supabaseAdmin
    .from("consultation_admissions")
    .select(
      "id, participant_role, participant_identity, display_name, status, requested_at, decided_at, requester_ip"
    )
    .eq("consultation_id", consultationId)
    .order("requested_at", { ascending: true });

  if (error) {
    console.error("[admissions GET] error:", error.message);
    return Response.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  const rows = data ?? [];
  return Response.json({
    ok: true,
    pending: rows.filter((r: any) => r.status === "pending"),
    approved: rows.filter((r: any) => r.status === "approved"),
    rejected: rows.filter((r: any) => r.status === "rejected"),
    left: rows.filter((r: any) => r.status === "left"),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: consultationId } = await params;

  const access = await requireConsultationAccess(request, consultationId, {
    requireRole: ["admin", "doctor", "coordinator"],
  });
  if (!access.success) return access.response;

  const admissionId = request.nextUrl.searchParams.get("admissionId");
  if (!admissionId) {
    return Response.json(
      { ok: false, error: "admissionId query param required" },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const status = body.status;
  if (!["approved", "rejected", "left"].includes(status)) {
    return Response.json(
      { ok: false, error: "status must be approved/rejected/left" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("consultation_admissions")
    .update({
      status,
      decided_at: new Date().toISOString(),
      decided_by: access.userId,
      left_at: status === "left" ? new Date().toISOString() : null,
    } as any)
    .eq("id", admissionId)
    .eq("consultation_id", consultationId);

  if (error) {
    console.error("[admissions PATCH] error:", error.message);
    return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
