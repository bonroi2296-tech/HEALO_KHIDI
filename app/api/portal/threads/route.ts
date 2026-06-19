/**
 * healwith: 채팅 스레드 목록 — 환자(본인) / staff(전체)
 *
 * GET /api/portal/threads?status=open
 * - staff(coordinator/doctor/admin): 모든 스레드 (status 필터 가능)
 * - 일반 사용자: 본인(user_id) 스레드만
 *
 * chat_threads 는 RLS상 service_role 전용 → 서버 경유 필수.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptMaybe } from "@/lib/security/encryptionV2";

const VALID_STATUS = ["open", "waiting_coordinator", "waiting_patient", "resolved"];

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  try {
    const status = request.nextUrl.searchParams.get("status");

    let q = supabaseAdmin
      .from("chat_threads")
      .select(
        "id, subject, status, channel, guest_name, guest_country, inquiry_id, user_id, created_at, updated_at, last_active_at, resolved_at, metadata"
      )
      .order("updated_at", { ascending: false })
      .limit(200);

    if (!auth.isStaff) {
      // 환자: 본인 스레드만 (IDOR 차단)
      q = q.eq("user_id", auth.userId);
    }
    if (status && VALID_STATUS.includes(status)) {
      q = q.eq("status", status);
    }

    const { data, error } = await q;
    if (error) {
      console.error("[portal/threads] query error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    // guest_name 은 암호화 저장 → 표시 전 복호화(옛 평문 행은 그대로)
    const threads = (data || []).map((t: any) => ({
      ...t,
      guest_name: decryptMaybe(t.guest_name),
    }));

    return Response.json({ ok: true, threads });
  } catch (err: any) {
    console.error("[portal/threads] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
