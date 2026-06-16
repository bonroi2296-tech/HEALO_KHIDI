/**
 * healwith: Admin RAG Document Detail API
 *
 * PATCH /api/admin/rag/documents/:id — trust_tier 등 운영 필드 업데이트
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

const ALLOWED_FIELDS = [
  "trust_tier",
  "source_label",
  "source_url",
  "expires_at",
  "verified_at",
  "verified_by",
] as const;

function isValidUrl(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  assertSupabaseEnv();

  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { id } = await params;
  if (!id || id.length < 10) {
    return Response.json({ ok: false, error: "Invalid document id" }, { status: 400 });
  }

  try {
    const body = await request.json();

    const update: Record<string, any> = {};
    const errors: string[] = [];

    for (const key of ALLOWED_FIELDS) {
      if (body[key] === undefined) continue;

      if (key === "trust_tier") {
        const v = Number(body[key]);
        if (!Number.isInteger(v) || v < 1 || v > 3) {
          errors.push("trust_tier must be 1, 2, or 3");
          continue;
        }
        update[key] = v;
      } else if (key === "source_url") {
        if (body[key] !== null && body[key] !== "" && !isValidUrl(String(body[key]))) {
          errors.push("source_url must be a valid URL or null");
          continue;
        }
        update[key] = body[key] || null;
      } else if (key === "expires_at") {
        if (body[key] === null) {
          update[key] = null;
        } else {
          const d = new Date(body[key]);
          if (isNaN(d.getTime())) {
            errors.push("expires_at must be a valid ISO datetime or null");
            continue;
          }
          update[key] = d.toISOString();
        }
      } else if (key === "verified_at") {
        if (body[key] === null) {
          update[key] = null;
        } else {
          const d = new Date(body[key]);
          if (isNaN(d.getTime())) {
            errors.push("verified_at must be a valid ISO datetime or null");
            continue;
          }
          update[key] = d.toISOString();
        }
      } else {
        update[key] = body[key] ?? null;
      }
    }

    if (errors.length > 0) {
      return Response.json({ ok: false, errors }, { status: 400 });
    }

    if (Object.keys(update).length === 0) {
      return Response.json({ ok: false, error: "No valid fields to update" }, { status: 400 });
    }

    update.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("rag_documents")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[PATCH /api/admin/rag/documents/:id]", error.message);
      if (error.code === "PGRST116") {
        return Response.json({ ok: false, error: "Document not found" }, { status: 404 });
      }
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, document: data });
  } catch (err: any) {
    console.error("[PATCH /api/admin/rag/documents/:id] Unexpected:", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
