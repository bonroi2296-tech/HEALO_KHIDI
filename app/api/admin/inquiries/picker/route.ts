/**
 * HEALO: 상담 생성용 문의 선택(picker) API — admin 전용
 *
 * GET /api/admin/inquiries/picker → Step1 완료 문의를 상담 생성 드롭다운용으로 반환.
 *
 * 왜 별도: 목록 API(/api/admin/inquiries)는 암호화된 이름을 "***"로만 반환(식별 불가).
 * picker 는 이름을 복호화 후 마스킹("А***")해서 식별 가능하게 + 비PII(국적·암종·언어) 동반.
 * inquiries 는 RLS상 service_role 만 읽기 가능 → 반드시 서버에서 처리.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { createServiceRoleClient } from "../../../../../src/lib/supabase/server";
import { requireAdminAuth } from "../../../../../src/lib/auth/requireAdminAuth";
import { decryptStringNullable } from "../../../../../src/lib/security/encryptionV2";

// 복호화 후 마스킹 — 첫 글자 + ***  (평문 대량 노출 방지하되 식별 가능)
function maskedName(enc: string | null | undefined): string {
  let name = "";
  try {
    name = decryptStringNullable(enc) || "";
  } catch {
    name = "";
  }
  if (!name) return "(이름 미상)";
  if (name.length === 1) return name;
  return name[0] + "*".repeat(Math.max(1, name.length - 1));
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("inquiries")
      .select(
        "id, first_name, nationality, cancer_type, preferred_language, contact_method, status, created_at"
      )
      .not("step1_completed_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[admin/inquiries/picker] query error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    const inquiries = (data || []).map((i: any) => ({
      id: i.id,
      name: maskedName(i.first_name),
      nationality: i.nationality || null,
      cancer_type: i.cancer_type || null,
      preferred_language: i.preferred_language || null,
      contact_method: i.contact_method || null,
      status: i.status || null,
      created_at: i.created_at,
    }));

    return Response.json({ ok: true, inquiries });
  } catch (err: any) {
    console.error("[admin/inquiries/picker] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
