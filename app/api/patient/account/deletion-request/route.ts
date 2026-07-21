/**
 * healwith: 환자 데이터 삭제 요청 (GDPR Art.17 / PIPA 파기요청권)
 *
 * POST /api/patient/account/deletion-request  — 로그인 환자가 본인 데이터 삭제를 요청
 * GET  /api/patient/account/deletion-request  — 본인의 현재 요청 상태 조회(버튼 상태 표시용)
 *
 * 설계: 즉시 하드삭제하지 않는다(소프트 삭제 원칙·FK/기록 보존). 요청을 기록하고
 * 관리자가 소프트삭제·익명화로 처리한다. 표에는 PII를 저장하지 않는다(user_id만).
 * 처리 추적: admin_audit_logs 에 PATIENT_DELETION_REQUEST 로 남긴다.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClientFromRequest } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import {
  logAdminAction,
  getIpFromRequest,
  getUserAgentFromRequest,
} from "@/lib/audit/adminAuditLog";

const DELETION_RATE = { windowMs: 60 * 1000, maxRequests: 5, apiName: "account_deletion" };

async function getUser(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClientFromRequest(request);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

// ─── GET: 본인 요청 상태 ───
export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const { data } = await (supabaseAdmin as any)
      .from("account_deletion_requests")
      .select("status, requested_at, processed_at")
      .eq("user_id", user.id)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return NextResponse.json({ ok: true, request: data || null });
  } catch (err: any) {
    console.error("[account/deletion-request] get:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

// ─── POST: 삭제 요청 접수 ───
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientIp(request), DELETION_RATE);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  const user = await getUser(request);
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const reason =
      typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : null;

    // 이미 대기/처리중 요청이 있으면 중복 생성하지 않음(멱등)
    // 실패-닫힘: 못 읽은 걸 "요청 없음"으로 보면 같은 사람의 삭제요청이 중복 생성된다.
    const { data: existingRows, error: existingErr } = await (supabaseAdmin as any)
      .from("account_deletion_requests")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "processing"])
      .limit(1);

    if (existingErr) {
      console.error("[patient/deletion-request] lookup error:", existingErr.message);
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
    const existing = existingRows?.[0];

    if (existing) {
      return NextResponse.json({ ok: true, alreadyRequested: true, status: existing.status });
    }

    const { error } = await (supabaseAdmin as any)
      .from("account_deletion_requests")
      .insert({ user_id: user.id, reason, status: "pending" });

    if (error) {
      console.error("[account/deletion-request] insert:", error.message);
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    // 감사로그(관리자 추적용) — PII 평문 미포함
    void logAdminAction({
      adminEmail: user.email || `patient:${user.id}`,
      adminUserId: user.id,
      action: "PATIENT_DELETION_REQUEST",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
    });

    return NextResponse.json({ ok: true, alreadyRequested: false, status: "pending" });
  } catch (err: any) {
    console.error("[account/deletion-request] post:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
