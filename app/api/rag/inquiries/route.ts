/**
 * ✅ P0 수정: 런타임 명시 (Node.js)
 * 
 * 이유:
 * - DB 관리자 접근 (SERVICE_ROLE_KEY 사용)
 * - Edge 런타임에서 발생할 수 있는 예측 불가 오류 방지
 */
export const runtime = "nodejs";

import { supabaseAdmin, assertSupabaseEnv } from "../../../../src/lib/rag/supabaseAdmin";

export async function GET() {
  assertSupabaseEnv();
  try {
    const { data, error } = await supabaseAdmin
      .from("inquiries")
      .select("id, email, treatment_type, message")
      .order("id", { ascending: false })
      .limit(50);

    if (error) throw error;
    return Response.json({ ok: true, rows: data || [] });
  } catch (error: any) {
    return Response.json(
      { ok: false, error: error?.message || "fetch_failed" },
      { status: 500 }
    );
  }
}
