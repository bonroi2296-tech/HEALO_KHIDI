/**
 * HEALO: Admin Chat Threads API
 *
 * POST /api/admin/chat/threads — 새 thread 생성
 * GET  /api/admin/chat/threads — thread 목록 조회
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../src/lib/auth/requireAdminAuth";

export async function POST(request: NextRequest) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { inquiry_id, normalized_inquiry_id, subject, metadata = {} } = body;

    const row: Record<string, any> = {
      status: "open",
      subject: subject || null,
      metadata,
    };
    if (inquiry_id) row.inquiry_id = inquiry_id;
    if (normalized_inquiry_id) row.normalized_inquiry_id = normalized_inquiry_id;

    const { data, error } = await (supabaseAdmin as any)
      .from("chat_threads")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      console.error("[POST /api/admin/chat/threads]", error.message);
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, thread: data });
  } catch (err: any) {
    console.error("[POST /api/admin/chat/threads] Unexpected:", err.message);
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
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    let query = (supabaseAdmin as any)
      .from("chat_threads")
      .select("*", { count: "exact" });

    if (status) query = query.eq("status", status);

    query = query
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      console.error("[GET /api/admin/chat/threads]", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, threads: data, total: count ?? 0 });
  } catch (err: any) {
    console.error("[GET /api/admin/chat/threads] Unexpected:", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
