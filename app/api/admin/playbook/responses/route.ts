/**
 * HEALO: Admin Playbook Responses API
 *
 * POST /api/admin/playbook/responses — 응대 원문 등록 (sanitize + draft)
 * GET  /api/admin/playbook/responses — 목록 조회 (필터/검색/페이지네이션)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../src/lib/auth/requireAdminAuth";
import { sanitizeResponse, computeQualityScore } from "../../../../../src/lib/playbook/sanitize";

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const {
      normalized_inquiry_id,
      language = "en",
      case_tags = [],
      response_text_raw,
    } = body;

    if (!response_text_raw || typeof response_text_raw !== "string" || !response_text_raw.trim()) {
      return Response.json({ ok: false, error: "response_text_raw is required" }, { status: 400 });
    }

    const { sanitized, flags } = sanitizeResponse(response_text_raw);
    const qualityScore = computeQualityScore(flags);

    const row: Record<string, any> = {
      language,
      case_tags: Array.isArray(case_tags) ? case_tags : [],
      response_text_raw: response_text_raw.trim(),
      response_text_sanitized: sanitized,
      quality_score: qualityScore,
      status: "draft",
      metadata: { sanitize_flags: flags },
    };

    if (normalized_inquiry_id) {
      row.normalized_inquiry_id = normalized_inquiry_id;
    }

    const { data, error } = await supabaseAdmin
      .from("coordinator_responses")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      console.error("[POST /api/admin/playbook/responses]", error.message);
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, response: data, sanitize_flags: flags });
  } catch (err: any) {
    console.error("[POST /api/admin/playbook/responses] Unexpected:", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  assertSupabaseEnv();

  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q");
    const minScore = url.searchParams.get("min_score");
    const language = url.searchParams.get("language");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    let query = supabaseAdmin
      .from("coordinator_responses")
      .select("*", { count: "exact" });

    if (status) query = query.eq("status", status);
    if (language) query = query.eq("language", language);
    if (minScore) {
      const score = Number(minScore);
      if (!isNaN(score)) query = query.gte("quality_score", score);
    }
    if (q && q.trim()) {
      const term = q.trim();
      query = query.or(
        `response_text_sanitized.ilike.%${term}%,case_tags.cs.{${term}}`
      );
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      console.error("[GET /api/admin/playbook/responses]", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, responses: data, total: count ?? 0 });
  } catch (err: any) {
    console.error("[GET /api/admin/playbook/responses] Unexpected:", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
