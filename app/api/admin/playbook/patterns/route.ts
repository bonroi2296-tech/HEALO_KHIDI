/**
 * HEALO: Admin Playbook Patterns List API
 *
 * GET /api/admin/playbook/patterns
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../src/lib/auth/requireAdminAuth";

export async function GET(request: NextRequest) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const language = url.searchParams.get("language");
    const treatmentSlug = url.searchParams.get("treatment_slug");
    const country = url.searchParams.get("country");
    const minScore = url.searchParams.get("min_score");
    const q = url.searchParams.get("q");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    let query = supabaseAdmin
      .from("playbook_patterns")
      .select("*", { count: "exact" });

    if (status) query = query.eq("status", status);
    if (language) query = query.eq("language", language);
    if (treatmentSlug) query = query.eq("treatment_slug", treatmentSlug);
    if (country) query = query.eq("country", country);
    if (minScore) {
      const s = Number(minScore);
      if (!isNaN(s)) query = query.gte("quality_score", s);
    }
    if (q?.trim()) {
      const term = q.trim();
      query = query.or(`user_intent.ilike.%${term}%,response_template.ilike.%${term}%`);
    }

    query = query
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      console.error("[GET patterns]", error.message);
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true, patterns: data, total: count ?? 0 });
  } catch (err: any) {
    console.error("[GET patterns] Unexpected:", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
