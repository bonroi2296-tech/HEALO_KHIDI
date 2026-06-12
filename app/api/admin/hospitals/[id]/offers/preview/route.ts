/**
 * 대표 시술 Preview: 동기 heavy 로직 제거 → job 생성/폴링만.
 * POST => 즉시 job 생성 또는 기존 queued/running job 반환 (200~500ms).
 * GET ?job_id=xxx => job 상태·결과 폴링.
 */

export const runtime = "nodejs";
export const maxDuration = 10;

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../../../src/lib/auth/requireAdminAuth";

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

  const { data: hospital, error: hospitalError } = await supabaseAdmin
    .from("hospitals")
    .select("id, name, website")
    .eq("id", hospitalId)
    .single();

  if (hospitalError || !hospital) {
    return Response.json(
      { ok: false, error: "hospital_not_found" },
      { status: 404 }
    );
  }

  const website = (hospital.website || "").trim();
  if (!website) {
    const { data: newJob } = await supabaseAdmin
      .from("hospital_offer_jobs")
      .insert({
        hospital_id: hospitalId,
        status: "error",
        progress: 0,
        error: "no_website",
      } as any)
      .select("id, status")
      .single();
    return Response.json({
      ok: true,
      job_id: newJob?.id,
      status: newJob?.status ?? "error",
      hint: "no_website",
      message: "병원에 웹사이트 URL이 등록되어 있지 않습니다.",
    });
  }

  const { data: existing } = await supabaseAdmin
    .from("hospital_offer_jobs")
    .select("id, status")
    .eq("hospital_id", hospitalId)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const origin = new URL(request.url).origin;
    fetch(`${origin}/api/admin/offers-jobs/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: request.headers.get("cookie") ?? "" },
      body: JSON.stringify({ job_id: existing.id }),
    }).catch(() => {});
    return Response.json({
      ok: true,
      job_id: existing.id,
      status: existing.status,
    });
  }

  const { data: newJob, error: insertErr } = await supabaseAdmin
    .from("hospital_offer_jobs")
    .insert({
      hospital_id: hospitalId,
      status: "queued",
      progress: 0,
      updated_at: new Date().toISOString(),
    })
    .select("id, status")
    .single();

  if (insertErr || !newJob) {
    return Response.json(
      { ok: false, error: "job_insert_failed" },
      { status: 500 }
    );
  }

  const origin = new URL(request.url).origin;
  fetch(`${origin}/api/admin/offers-jobs/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: request.headers.get("cookie") ?? "" },
    body: JSON.stringify({ job_id: newJob.id }),
  }).catch(() => {});

  return Response.json({
    ok: true,
    job_id: newJob.id,
    status: (newJob.status as string) || "queued",
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;
  const { id: hospitalId } = await params;
  const jobId = request.nextUrl.searchParams.get("job_id");
  if (!hospitalId || !jobId) {
    return Response.json({ ok: false, error: "missing hospital_id or job_id" }, { status: 400 });
  }

  const { data: job, error } = await supabaseAdmin
    .from("hospital_offer_jobs")
    .select("id, hospital_id, status, progress, result_offers, debug, error, completed_at")
    .eq("id", jobId)
    .eq("hospital_id", hospitalId)
    .single();

  if (error || !job) {
    return Response.json({ ok: false, error: "job_not_found" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    job_id: job.id,
    status: job.status,
    progress: job.progress ?? 0,
    result_offers: job.result_offers ?? undefined,
    debug: job.debug ?? undefined,
    error: job.error ?? undefined,
    updated_at: job.completed_at,
  });
}
