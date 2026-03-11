/**
 * Unified Hospital Enrichment API
 *
 * POST /api/admin/hospitals/enrich?id=<hospital_id>
 * Body: { sources: ["google", "kakao", "ai"] }
 *
 * GET /api/admin/hospitals/enrich/sources
 * Returns available enrichment sources manifest
 */

export const runtime = "nodejs";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../src/lib/auth/requireAdminAuth";
import { initSources, getSourceManifest, runPipeline } from "../../../../../src/lib/enrichment";
import type { HospitalRow } from "../../../../../src/lib/enrichment";

initSources();

export async function GET(request: NextRequest) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const manifest = getSourceManifest();
  return NextResponse.json({ ok: true, sources: manifest });
}

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const hospitalId = request.nextUrl.searchParams.get("id");
  if (!hospitalId) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // no body = run all available sources
  }

  const requestedSources: string[] = Array.isArray(body.sources) && body.sources.length > 0
    ? body.sources
    : ["google"];

  const { data: hospital, error: fetchErr } = await supabaseAdmin
    .from("hospitals")
    .select("*")
    .eq("id", hospitalId)
    .single();

  if (fetchErr || !hospital) {
    return NextResponse.json({ ok: false, error: "hospital_not_found" }, { status: 404 });
  }

  const hospitalRow = hospital as HospitalRow;

  try {
    const pipelineResult = await runPipeline(hospitalRow, requestedSources);

    const mergedUpdate = pipelineResult.mergedUpdate;
    mergedUpdate.enrichment_log = pipelineResult.enrichmentLog;

    const updateKeys = Object.keys(mergedUpdate);
    console.log("[enrich] Updating fields:", updateKeys.join(", "));
    if (mergedUpdate.gallery_images) {
      console.log("[enrich] gallery_images count:", (mergedUpdate.gallery_images as any[]).length);
    }

    if (updateKeys.length > 0) {
      const { error: updateErr } = await supabaseAdmin
        .from("hospitals")
        .update(mergedUpdate)
        .eq("id", hospitalId);

      if (updateErr) {
        console.error("[enrich] DB update error:", updateErr.message);
        return NextResponse.json(
          { ok: false, error: "db_update_failed", detail: updateErr.message },
          { status: 500 },
        );
      }
      console.log("[enrich] DB update success for hospital:", hospitalId);
    }

    const { data: freshHospital } = await supabaseAdmin
      .from("hospitals")
      .select("*")
      .eq("id", hospitalId)
      .single();

    console.log("[enrich] Fresh hospital gallery_images:", (freshHospital as any)?.gallery_images?.length || 0);

    const summary = pipelineResult.results.map((r) => ({
      source: r.sourceId,
      success: r.success,
      items: r.metadata.itemsCollected,
      duration: r.metadata.duration,
      error: r.error || null,
    }));

    return NextResponse.json({
      ok: true,
      hospital: freshHospital,
      results: summary,
      enriched: buildLegacySummary(pipelineResult.results),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "pipeline_error", detail: e.message },
      { status: 502 },
    );
  }
}

function buildLegacySummary(results: any[]) {
  const allItems = results.filter((r) => r.success).flatMap((r) => r.metadata?.itemsCollected || []);
  const photos = allItems.find((i: string) => i.startsWith("photos:"));
  const reviews = allItems.find((i: string) => i.startsWith("reviews:"));
  return {
    photos: photos ? parseInt(photos.split(":")[1]) : 0,
    rating: allItems.includes("rating") ? true : null,
    hasHours: allItems.includes("hours"),
    phone: allItems.includes("phone") ? true : null,
    website: allItems.includes("website") ? true : null,
    reviews: reviews ? parseInt(reviews.split(":")[1]) : 0,
    ai: allItems.filter((i: string) => i.startsWith("faq") || i.startsWith("treatments") || i.startsWith("i18n")).length > 0,
  };
}
