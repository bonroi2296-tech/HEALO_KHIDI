/**
 * Batch Hospital Enrichment API
 *
 * POST /api/admin/hospitals/enrich/batch
 * Body: { sources: ["google","ai"], filter: { is_published, is_partner, specialty, region }, limit }
 *
 * Runs enrichment for multiple hospitals matching the filter.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../../src/lib/auth/requireAdminAuth";
import { initSources, runPipeline } from "../../../../../../src/lib/enrichment";
import type { HospitalRow } from "../../../../../../src/lib/enrichment";

initSources();

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

  const { sources = ["google"], filter = {}, limit = 20 } = body;
  const maxLimit = Math.min(limit, 50);

  let query = supabaseAdmin.from("hospitals").select("*");

  if (filter.is_published !== undefined) {
    query = query.eq("is_published", filter.is_published);
  }
  if (filter.is_partner !== undefined) {
    query = query.eq("is_partner", filter.is_partner);
  }
  if (filter.specialty) {
    query = query.contains("specialties", [filter.specialty]);
  }
  if (filter.region) {
    query = query.ilike("location_kr", `%${filter.region}%`);
  }
  if (filter.has_no_images) {
    query = query.is("thumbnail_image", null);
  }

  query = query.order("created_at", { ascending: false }).limit(maxLimit);

  const { data: hospitals, error: fetchErr } = await query;

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: "db_query_failed", detail: fetchErr.message }, { status: 500 });
  }

  if (!hospitals || hospitals.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, results: [], message: "No hospitals matched the filter" });
  }

  const results: any[] = [];

  for (const hospital of hospitals) {
    try {
      const pipelineResult = await runPipeline(hospital as HospitalRow, sources);
      const mergedUpdate = pipelineResult.mergedUpdate;
      mergedUpdate.enrichment_log = pipelineResult.enrichmentLog;

      if (Object.keys(mergedUpdate).length > 0) {
        await supabaseAdmin.from("hospitals").update(mergedUpdate).eq("id", hospital.id);
      }

      results.push({
        id: hospital.id,
        name: hospital.name,
        success: true,
        sources: pipelineResult.results.map((r) => ({
          source: r.sourceId,
          success: r.success,
          items: r.metadata.itemsCollected,
          error: r.error || null,
        })),
      });
    } catch (err: any) {
      results.push({
        id: hospital.id,
        name: hospital.name,
        success: false,
        error: err.message,
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;

  return NextResponse.json({
    ok: true,
    processed: hospitals.length,
    success: successCount,
    failed: hospitals.length - successCount,
    results,
  });
}
