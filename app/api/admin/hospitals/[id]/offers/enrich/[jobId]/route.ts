/**
 * GET /api/admin/hospitals/[id]/offers/enrich/[jobId]
 * Job 상태 및 result 조회 (폴링용)
 */

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../../../../src/lib/auth/requireAdminAuth";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(_request);
  if (!auth.success) return auth.response;
  const { id: hospitalId, jobId } = await params;
  if (!hospitalId || !jobId) {
    return Response.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  const { data: job, error } = await supabaseAdmin
    .from("hospital_offer_enrich_jobs")
    .select("id, hospital_id, status, result, error, updated_at")
    .eq("id", jobId)
    .eq("hospital_id", hospitalId)
    .single();

  if (error || !job) {
    return Response.json({ ok: false, error: "job_not_found" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    enrich_job: {
      id: job.id,
      status: job.status as "queued" | "running" | "done" | "error",
      result: job.result ?? undefined,
      error: job.error ?? undefined,
      updated_at: job.updated_at,
    },
  });
}
