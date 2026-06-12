/**
 * RAG seed: 최근 inquiries 50건 반환 (admin 전용)
 *
 * ⚠️ 과거 버전은 인증 없이 암호화 PII(ciphertext) 50건을 누구나 가져갈 수 있었음.
 *    - 공격자가 offline brute-force 대상 확보
 *    - 파이프라인 볼륨/치료 mix 정보 경쟁사 유출
 *   → requireAdminAuth 로 폐쇄.
 *
 * 런타임: Node.js (service_role + Bearer token 검증)
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../src/lib/auth/requireAdminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

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
    console.error("[rag/inquiries] error:", error?.message?.slice(0, 200));
    return Response.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 }
    );
  }
}
