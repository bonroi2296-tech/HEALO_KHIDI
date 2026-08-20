/**
 * healwith: 관리자 — 환자 데이터 삭제요청 처리 (GDPR Art.17 / PIPA)
 *
 * GET   /api/admin/account/deletion-requests        — 요청 목록(상태 필터)
 * PATCH /api/admin/account/deletion-requests        — 요청 상태 변경(처리)
 *
 * 환자가 낸 삭제요청을 관리자가 보고 처리(pending→processing→completed/rejected).
 * ⚠️ 2026-08-20 이전에는 「완료」가 «상태 글자만» 바꿨다 — 계정을 지우는 코드가 0줄이라
 *    관리자가 눌러도 실제로는 아무것도 안 지워졌다(PO 지적). 지금은 completed 로 바꾸면
 *    그 자리에서 실제 파기가 돈다.
 * 환자는 /patient/account 에서 스스로 탈퇴할 수 있다 — 이 화면은 그 이전에 쌓인 요청과
 * 업무용 계정(스스로 못 지운다)을 위한 창구다.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { deleteAccountCompletely } from "@/lib/account/deleteAccount";
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
    // 🛑 「완료」는 «실제로 지운 뒤»에만 찍는다. 지우기가 실패했는데 완료로 적으면
    //    관리자 화면이 거짓말을 하게 된다(그게 이 화면이 여태 하던 일이다).
    let purge: Awaited<ReturnType<typeof deleteAccountCompletely>> | null = null;
    if (status === "completed") {
      const { data: row } = await (supabaseAdmin as any)
        .from("account_deletion_requests")
        .select("user_id")
        .eq("id", id)
        .maybeSingle();
      if (!row?.user_id) {
        return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
      }
      purge = await deleteAccountCompletely(row.user_id);
      if (!purge.ok) {
        console.error("[admin/deletion-requests] purge failed:", purge.failedSteps.join(","));
        return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
      }
    }

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

    return NextResponse.json({ ok: true, request: data, purged: purge });
  } catch (err: any) {
    console.error("[admin/deletion-requests] patch:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
