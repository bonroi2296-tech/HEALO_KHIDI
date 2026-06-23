/**
 * healwith: 환자 본인 문의 목록 — 로그인 사용자 전용
 *
 * GET /api/portal/my-inquiries → 본인(user_id) 문의만.
 * inquiries 는 RLS상 service_role 전용 → 서버 경유 필수.
 * 본인 데이터라 PII 복호화 불필요(요약 필드만 반환).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { data, error } = await supabaseAdmin
      .from("inquiries")
      .select(
        "id, nationality, cancer_type, preferred_language, match_accuracy, status, step1_completed_at, step2_completed_at, created_at"
      )
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[portal/my-inquiries] query error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, items: data || [] });
  } catch (err: any) {
    console.error("[portal/my-inquiries] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
