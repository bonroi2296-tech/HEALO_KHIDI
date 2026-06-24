/**
 * healwith: 코디네이터 인박스 — inquiries 목록 (staff 전용)
 *
 * GET /api/portal/inbox → Step1 이상 완료 문의 200건.
 * inquiries 는 RLS상 service_role 전용 → 서버 경유 필수.
 * 이름은 복호화 후 마스킹("А***") — 평문 대량 노출 방지하되 식별 가능.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptStringNullable } from "@/lib/security/encryptionV2";

// staff(코디·관리자) 전용 인박스라 실명 표시 — 마스킹하면 문의 많을 때 식별 불가(PO 요청 2026-06-23).
function decryptName(enc: string | null | undefined): string {
  try {
    return decryptStringNullable(enc) || "";
  } catch {
    return "";
  }
}

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    // 모든 문의 노출. 과거엔 step1_completed_at 있는 퍼널 문의만 보여줘서
    // 메신저·에이전시 등 다른 경로로 들어온 문의(도장 없음)가 코디에게 안 보였음.
    const { data, error } = await supabaseAdmin
      .from("inquiries")
      .select(
        "id, nationality, cancer_type, preferred_language, contact_method, match_accuracy, status, step1_completed_at, step2_completed_at, created_at, first_name, last_name, agency_id, agencies(name)"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[portal/inbox] query error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    const items = (data || []).map((i: any) => ({
      id: i.id,
      name:
        [decryptName(i.first_name), decryptName(i.last_name)].filter(Boolean).join(" ").trim() ||
        "(이름 미상)",
      nationality: i.nationality || null,
      cancer_type: i.cancer_type || null,
      preferred_language: i.preferred_language || null,
      contact_method: i.contact_method || null,
      match_accuracy: i.match_accuracy ?? null,
      status: i.status || null,
      step1_completed_at: i.step1_completed_at,
      step2_completed_at: i.step2_completed_at,
      created_at: i.created_at,
      // 접수 주체 구분: agency_id 있으면 에이전시 의뢰, 없으면 환자 직접 접수.
      agency_id: i.agency_id || null,
      agency_name: i.agencies?.name || null,
    }));

    return Response.json({ ok: true, items });
  } catch (err: any) {
    console.error("[portal/inbox] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
