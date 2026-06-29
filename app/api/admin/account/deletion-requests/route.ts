/**
 * healwith: 관리자 — 환자 데이터 삭제요청 처리 (GDPR Art.17 / PIPA)
 *
 * GET   /api/admin/account/deletion-requests        — 요청 목록(상태 필터)
 * PATCH /api/admin/account/deletion-requests        — 요청 상태 변경(처리)
 *
 * 환자가 낸 삭제요청을 관리자가 보고 처리(pending→processing→completed/rejected).
 * 실제 데이터 파기·익명화는 관리자가 소프트삭제로 수행하고, 그 사실을 note 로 남긴다.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import {
  logAdminAction,
  getIpFromRequest,
  getUserAgentFromRequest,
} from "@/lib/audit/adminAuditLog";

const VALID_STATUS = ["pending", "processing", "completed", "rejected"] as const;

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;
  try {
    const status = request.nextUrl.searchParams.get("status");
    let q = (supabaseAdmin as any)
      .from("account_deletion_requests")
      .select("id, user_id, reason, status, requested_at, processed_at, processed_by, note")
      .order("requested_at", { ascending: false })
      .limit(200);
    if (status && (VALID_STATUS as readonly string[]).includes(status)) {
      q = q.eq("status", status);
    }
    const { data, error } = await q;
    if (error) {
      console.error("[admin/deletion-requests] list:", error.message);
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, requests: data || [] });
  } catch (err: any) {
    console.error("[admin/deletion-requests] get:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;
  const { authResult } = auth;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const id = typeof body?.id === "string" ? body.id : null;
  const status = typeof body?.status === "string" ? body.status : null;
  const note = typeof body?.note === "string" ? body.note.slice(0, 1000) : null;

  if (!id || !status || !(VALID_STATUS as readonly string[]).includes(status)) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  try {
    const payload: Record<string, any> = { status };
    if (status === "completed" || status === "rejected") {
      payload.processed_at = new Date().toISOString();
      payload.processed_by = authResult.email || "admin";
    }
    if (note !== null) payload.note = note;

    const { data, error } = await (supabaseAdmin as any)
      .from("account_deletion_requests")
      .update(payload)
      .eq("id", id)
      .select("id, status")
      .single();

    if (error) {
      console.error("[admin/deletion-requests] update:", error.message);
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    void logAdminAction({
      adminEmail: authResult.email || "admin",
      adminUserId: authResult.userId,
      action: "PROCESS_DELETION_REQUEST",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: { request_id: id, new_status: status },
    });

    return NextResponse.json({ ok: true, request: data });
  } catch (err: any) {
    console.error("[admin/deletion-requests] patch:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
