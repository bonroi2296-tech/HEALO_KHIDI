/**
 * healwith: Admin RAG Documents API
 *
 * GET  /api/admin/rag/documents — 목록 조회 (필터/검색/페이지네이션)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

export async function GET(request: NextRequest) {
  assertSupabaseEnv();

  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const url = new URL(request.url);
    const lang = url.searchParams.get("lang");
    const sourceType = url.searchParams.get("source_type");
    const trustTier = url.searchParams.get("trust_tier");
    const expired = url.searchParams.get("expired");
    const q = url.searchParams.get("q");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    let query = supabaseAdmin
      .from("rag_documents")
      .select("*", { count: "exact" });

    if (lang) query = query.eq("lang", lang);
    if (sourceType) query = query.eq("source_type", sourceType);
    if (trustTier) {
      const tier = Number(trustTier);
      if (tier >= 1 && tier <= 3) query = query.eq("trust_tier", tier);
    }

    if (expired === "true") {
      query = query.not("expires_at", "is", null).lt("expires_at", new Date().toISOString());
    } else if (expired === "false") {
      query = query.or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);
    }

    if (q && q.trim()) {
      const term = q.trim();
      query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
    }

    query = query
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      console.error("[GET /api/admin/rag/documents]", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, documents: data, total: count ?? 0 });
  } catch (err: any) {
    console.error("[GET /api/admin/rag/documents] Unexpected:", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
