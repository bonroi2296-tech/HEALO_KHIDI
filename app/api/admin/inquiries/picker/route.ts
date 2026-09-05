/**
 * healwith: 상담 생성용 문의 선택(picker) API — admin 전용
 *
 * GET /api/admin/inquiries/picker → Step1 완료 문의를 상담 생성 드롭다운용으로 반환.
 *
 * 왜 별도: 목록 API(/api/admin/inquiries)는 암호화된 이름을 "***"로만 반환(식별 불가).
 * picker 는 이름을 복호화 후 마스킹("А***")해서 식별 가능하게 + 비PII(국적·암종·언어) 동반.
 * inquiries 는 RLS상 service_role 만 읽기 가능 → 반드시 서버에서 처리.
 */
export const runtime = "nodejs";

import { NextRequest, after } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { decryptStringNullable } from "@/lib/security/encryptionV2";
import { fullPatientName } from "@/lib/inquiry/patientName";
import { logPiiAccess } from "@/lib/audit/logPiiAccess";

// staff(코디·관리자) 전용 화면이라 실명 표시 — 마스킹하면 문의 많을 때 식별 불가(PO 요청 2026-06-23).
function decryptName(enc: string | null | undefined): string {
  try {
    return decryptStringNullable(enc) || "";
  } catch {
    return "";
  }
}

export async function GET(request: NextRequest) {
  // 상담 생성 드롭다운용 — admin·coordinator(staff) 모두 사용(코디도 상담 생성 가능)
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("inquiries")
      .select(
        "id, first_name, last_name, nationality, cancer_type, preferred_language, contact_method, status, created_at"
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
      name:
        fullPatientName(decryptName(i.first_name), decryptName(i.last_name)) ||
        "(이름 미상)",
      nationality: i.nationality || null,
      cancer_type: i.cancer_type || null,
      preferred_language: i.preferred_language || null,
      contact_method: i.contact_method || null,
      status: i.status || null,
      created_at: i.created_at,
    }));

    // 접속기록(법정 의무): 환자 이름을 «복호화해서» 보여준 조회다 — 누가 어느 문의를 봤는지 남긴다.
    after(() =>
      logPiiAccess(request, auth, {
        action: "LIST_INQUIRIES",
        inquiryIds: inquiries.map((i) => i.id),
        metadata: { count: inquiries.length, decrypted: "patient_name" },
      })
    );

    return Response.json({ ok: true, inquiries });
  } catch (err: any) {
    console.error("[admin/inquiries/picker] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
