/**
 * POST /api/admin/hospitals/[id]/offers/enrich
 * Job 생성(queued) 후 즉시 반환. (재실행 또는 preview 없이 enrich만 시작할 때 사용)
 */

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../../../src/lib/auth/requireAdminAuth";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;
  const { id: hospitalId } = await params;
  if (!hospitalId) {
    return Response.json({ ok: false, error: "missing_hospital_id" }, { status: 400 });
  }

  const { data: newJob, error } = await supabaseAdmin
    .from("hospital_offer_enrich_jobs")
    .insert({
      hospital_id: hospitalId,
      status: "queued",
      payload: { hospital_id: hospitalId },
      updated_at: new Date().toISOString(),
    })
    .select("id, status")
    .single();

  if (error || !newJob) {
    return Response.json({ ok: false, error: error?.message ?? "job_insert_failed" }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  fetch(`${origin}/api/admin/offers-enrich/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: request.headers.get("cookie") ?? "" },
    body: JSON.stringify({ job_id: newJob.id }),
  }).catch(() => {});

  return Response.json({
    ok: true,
    job_id: newJob.id,
    status: (newJob.status as string) || "queued",
    enrich_job: { id: newJob.id, status: (newJob.status as "queued") || "queued" },
  });
}
