/**
 * Crawl Job Detail API
 *
 * GET    /api/admin/crawl/jobs/[id] → job detail + progress
 * DELETE /api/admin/crawl/jobs/[id] → cancel a running job
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../../src/lib/auth/requireAdminAuth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { id } = await params;
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  const { data: job, error: fetchErr } = await supabaseAdmin
    .from("crawl_jobs")
    .select("id, status")
    .eq("id", id)
    .single();

  if (fetchErr || !job) {
    return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
  }

  // action=remove: permanently delete the job record + cascade items
  if (action === "remove") {
    if (job.status === "running" || job.status === "pending") {
      return NextResponse.json({ ok: false, error: "실행 중인 잡은 삭제할 수 없습니다. 먼저 중단하세요." }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from("crawl_jobs")
      .delete()
      .eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, message: "Job deleted" });
  }

  // Default: cancel a running job
  if (job.status !== "running" && job.status !== "pending") {
    return NextResponse.json({ ok: false, error: "Job is not running" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("crawl_jobs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: "USER_CANCELLED",
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Job cancelled" });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { id } = await params;

  const { data: job, error } = await supabaseAdmin
    .from("crawl_jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !job) {
    return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
  }

  // Get item counts by status
  const { data: statusCounts } = await supabaseAdmin
    .rpc("crawl_job_status_counts", { p_job_id: id })
    .select("*");

  // Fallback: manual counts if RPC not available
  let counts: Record<string, number> = {};
  if (!statusCounts) {
    const statuses = ["new", "changed", "unchanged", "closed"];
    for (const s of statuses) {
      const { count } = await supabaseAdmin
        .from("crawl_raw_items")
        .select("id", { count: "exact", head: true })
        .eq("job_id", id)
        .eq("status", s);
      counts[s] = count || 0;
    }

    // Count reviewed
    const { count: reviewedCount } = await supabaseAdmin
      .from("crawl_raw_items")
      .select("id", { count: "exact", head: true })
      .eq("job_id", id)
      .not("review_action", "is", null);
    counts.reviewed = reviewedCount || 0;
  } else {
    counts = statusCounts;
  }

  return NextResponse.json({
    ok: true,
    job,
    counts,
    progress: job.progress_total > 0
      ? Math.round((job.progress_current / job.progress_total) * 100)
      : 0,
  });
}
