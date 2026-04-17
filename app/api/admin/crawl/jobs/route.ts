/**
 * Crawl Jobs API
 *
 * GET  /api/admin/crawl/jobs  → list jobs
 * POST /api/admin/crawl/jobs  → create + start a job
 */

export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../src/lib/auth/requireAdminAuth";
import { runCrawlJob } from "../../../../../src/lib/crawl/job-runner";
import { initCrawlSources, getCrawlSourceManifest } from "../../../../../src/lib/crawl";

initCrawlSources();

// ─── GET: list jobs ─────────────────────────────────────
export async function GET(request: NextRequest) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 100);
  const offset = Number(url.searchParams.get("offset")) || 0;

  let query = supabaseAdmin
    .from("crawl_jobs")
    .select("*", { count: "exact" })
    .neq("source_id", "__schedule__")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;

  if (error) {
    console.error("[admin/crawl/jobs] GET error:", error);
    return NextResponse.json({ ok: false, error: "query_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, jobs: data || [], total: count || 0 });
}

// ─── POST: create + start job ───────────────────────────
export async function POST(request: NextRequest) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { source_id, regions, specialties, fields, keyword, mode } = body;

  if (!source_id) {
    return NextResponse.json({ ok: false, error: "source_id required" }, { status: 400 });
  }

  // Verify source exists
  const manifest = getCrawlSourceManifest();
  const src = manifest.find((s) => s.id === source_id);
  if (!src) {
    return NextResponse.json({ ok: false, error: "unknown source" }, { status: 400 });
  }
  if (!src.available) {
    return NextResponse.json(
      { ok: false, error: "source_unavailable", detail: `Missing: ${src.requiredEnvKeys.join(", ")}` },
      { status: 400 },
    );
  }

  // Create job record
  const params = {
    source_id,
    regions: regions || [],
    specialties: specialties || [],
    fields: fields || [],
    keyword: keyword || "",
    mode: mode || "full",
  };

  const { data: job, error: insertErr } = await supabaseAdmin
    .from("crawl_jobs")
    .insert({ source_id, params, status: "pending" })
    .select("id, status, created_at")
    .single();

  if (insertErr || !job) {
    console.error("[admin/crawl/jobs] insert failed:", insertErr);
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }

  // Fire-and-forget: start the job in background
  // The response returns immediately with the job ID
  runCrawlJob(job.id).catch((err) => {
    console.error("[CrawlJob] Failed:", job.id, err.message);
  });

  return NextResponse.json({ ok: true, job });
}
