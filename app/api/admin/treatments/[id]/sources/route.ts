/**
 * HEALO: 시술 출처 조회 (treatment_sources)
 * GET /api/admin/treatments/[id]/sources
 * 권한: 관리자 전용
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../../src/lib/auth/requireAdminAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { id: treatmentId } = await params;
  if (!treatmentId) {
    return Response.json({ ok: false, error: "treatment_id_required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("treatment_sources")
    .select("id, treatment_id, hospital_id, captured_at, sources, evidence")
    .eq("treatment_id", treatmentId)
    .order("captured_at", { ascending: false });

  if (error) {
    console.error("[admin/treatments/sources] GET error:", error.message);
    return Response.json(
      { ok: false, error: "db_query_failed" },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, sources: data ?? [] });
}
