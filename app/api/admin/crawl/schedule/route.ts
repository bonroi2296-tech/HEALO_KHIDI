/**
 * Crawl Schedule API
 *
 * GET  /api/admin/crawl/schedule  → read current schedule config
 * PUT  /api/admin/crawl/schedule  → update schedule config
 *
 * Stores config as a special row in crawl_jobs (source_id = '__schedule__')
 * to avoid PostgREST schema cache issues entirely.
 * No additional migrations needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "../../../../../src/lib/auth/requireAdminAuth";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../src/lib/rag/supabaseAdmin";

const CONFIG_SOURCE_ID = "__schedule__";

const DEFAULT_SCHEDULE = {
  enabled: false,
  frequency: "monthly",
  sources: ["hira"],
  last_auto_run: null,
};

export async function GET(request: NextRequest) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { data } = await supabaseAdmin
      .from("crawl_jobs")
      .select("params")
      .eq("source_id", CONFIG_SOURCE_ID)
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      schedule: data?.params || DEFAULT_SCHEDULE,
    });
  } catch {
    return NextResponse.json({ ok: true, schedule: DEFAULT_SCHEDULE });
  }
}

export async function PUT(request: NextRequest) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { enabled, frequency, sources } = body;

  try {
    const { data: existing } = await supabaseAdmin
      .from("crawl_jobs")
      .select("id, params")
      .eq("source_id", CONFIG_SOURCE_ID)
      .limit(1)
      .maybeSingle();

    const currentSchedule: any = (existing?.params && typeof existing.params === "object" && !Array.isArray(existing.params)) ? existing.params : DEFAULT_SCHEDULE;

    const updates: any = {};
    if (typeof enabled === "boolean") updates.enabled = enabled;
    if (frequency) updates.frequency = frequency;
    if (Array.isArray(sources)) updates.sources = sources;

    const merged = { ...currentSchedule, ...updates };

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("crawl_jobs")
        .update({ params: merged })
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
      }
    } else {
      // status='completed' to satisfy CHECK constraint
      const { error } = await supabaseAdmin
        .from("crawl_jobs")
        .insert({
          source_id: CONFIG_SOURCE_ID,
          status: "completed",
          params: merged,
        });

      if (error) {
        return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, schedule: merged });
  } catch (err: any) {
    console.error("[admin/crawl/schedule] PUT error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
