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
import { fullPatientName } from "@/lib/inquiry/patientName";

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
    // 시험 문의를 «일부러» 보고 싶을 때만 켠다(?includeTest=1) — 시연·점검용.
    // 기본값은 여전히 숨김이라 평소 화면은 그대로다.
    const includeTest = new URL(request.url).searchParams.get("includeTest") === "1";

    // 모든 문의 노출. 과거엔 step1_completed_at 있는 퍼널 문의만 보여줘서
    // 메신저·에이전시 등 다른 경로로 들어온 문의(도장 없음)가 코디에게 안 보였음.
    let query = supabaseAdmin
      .from("inquiries")
      .select(
        "id, nationality, cancer_type, preferred_language, contact_method, match_accuracy, status, case_status, case_status_updated_at, step1_completed_at, step2_completed_at, created_at, first_name, last_name, agency_id, is_test, agencies(name)"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    // 테스트 문의(is_test)는 코디 화면에서 숨긴다 — 야간 자동 점검·로컬 개발 테스트가 만든 가짜 문의가
    // 진짜 환자 문의와 섞여 코디가 헛일을 한다(2026-08-14 PO 지적). not(...is true) 라 null·false 는 그대로 보인다.
    if (!includeTest) query = query.not("is_test", "is", true);

    const { data, error } = await query;

    if (error) {
      console.error("[portal/inbox] query error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    const items = (data || []).map((i: any) => ({
      id: i.id,
      name:
        fullPatientName(decryptName(i.first_name), decryptName(i.last_name)) ||
        "(이름 미상)",
      nationality: i.nationality || null,
      cancer_type: i.cancer_type || null,
      preferred_language: i.preferred_language || null,
      contact_method: i.contact_method || null,
      match_accuracy: i.match_accuracy ?? null,
      status: i.status || null,
      case_status: i.case_status || null,
      case_status_updated_at: i.case_status_updated_at || null,
      step1_completed_at: i.step1_completed_at,
      step2_completed_at: i.step2_completed_at,
      created_at: i.created_at,
      // 접수 주체: agency_id 가 있으면 에이전시 의뢰. **없다고 「환자 본인」인 것은 아니다** —
      // 공개 폼은 접수자가 본인인지 대리인인지 묻지 않고, agency_id 는 로그인한 에이전시
      // 계정일 때만 붙는다(비회원 에이전시 접수가 여기 걸린다). 화면 라벨도 단정하지 않는다.
      agency_id: i.agency_id || null,
      agency_name: i.agencies?.name || null,
      // 시험 문의는 화면에서 «시험» 표를 달아야 한다 — 켜서 봤다가 진짜로 착각하면 그게 더 나쁘다.
      is_test: i.is_test === true,
    }));

    return Response.json({ ok: true, items });
  } catch (err: any) {
    console.error("[portal/inbox] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
