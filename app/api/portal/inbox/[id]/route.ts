/**
 * healwith: 코디네이터 인박스 — 단일 문의 상세 (staff 전용)
 *
 * GET /api/portal/inbox/[id] → 문의 1건의 상세(연락처·의료정보·메시지).
 * inquiries 는 RLS상 service_role 전용 → 서버 경유 필수.
 * PII(이름·이메일·메시지·연락처)는 staff 인증 후 서버에서만 복호화해서 응답.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { logAdminAction, getIpFromRequest, getUserAgentFromRequest } from "@/lib/audit/adminAuditLog";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptInquiryForAdmin } from "@/lib/security/decryptForAdmin";

// detail 화면에 필요한 필드만 SELECT (불필요한 PII·내부필드 노출 최소화)
const DETAIL_FIELDS = [
  "id",
  "created_at",
  "first_name",
  "last_name",
  "email",
  "phone",
  "nationality",
  "spoken_language",
  "preferred_language",
  "contact_method",
  "contact_id",
  "preferred_date",
  "preferred_date_flex",
  "cancer_type",
  "treatment_type",
  "message",
  "status",
  "case_status",
  "case_status_note",
  "match_accuracy",
  "source",
  "short_memo",
  "step1_completed_at",
  "step2_completed_at",
  "info_requested_at",
  "intake",
  "attachments",
  // 접수 주체 구분(에이전시 vs 환자) + 에이전시명 표시
  "agency_id",
  "agencies(name)",
  // 회원/비회원 배지: 접수한 계정(user_id)으로 이메일·role·테스트여부 조회(응답엔 submitter 만 실음)
  "user_id",
].join(",");

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const rawId = params.id;

  // ID 검증: 양의 정수만
  if (!rawId || !/^\d+$/.test(rawId)) {
    return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  // staff(코디·의사·관리자) 전용
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const { data, error } = await supabaseAdmin
      .from("inquiries")
      .select(DETAIL_FIELDS)
      .eq("id", Number(rawId))
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return Response.json({ ok: false, error: "not_found" }, { status: 404 });
      }
      console.error("[portal/inbox/:id] query error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    // PII 복호화 (staff 인증 통과 후 서버에서만). 실패해도 나머지는 반환(fail-safe).
    let inquiry: any = data;
    try {
      inquiry = await decryptInquiryForAdmin(data);
    } catch (e: any) {
      console.error("[portal/inbox/:id] decrypt error:", e?.message);
    }

    // 에이전시명 평탄화(관계조인 → 단일 필드)
    inquiry.agency_name = (data as any)?.agencies?.name || null;

    // 접수 주체(회원/비회원) — user_id 로 계정 조회해 email·role·@test.com 여부만 실음(PII 최소).
    // 비번·토큰 등 절대 미노출. 조회 실패해도 본 응답은 진행(fail-safe).
    const submitterUserId = (data as any)?.user_id || null;
    inquiry.submitter = null;
    if (submitterUserId) {
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(submitterUserId);
        const email = u?.user?.email || null;
        if (email) {
          const role = (u?.user?.app_metadata as any)?.role || null;
          inquiry.submitter = { email, role, isTest: /@test\.com$/i.test(email) };
        }
      } catch (e: any) {
        console.error("[portal/inbox/:id] submitter lookup error:", e?.message);
      }
    }
    // user_id 자체는 응답에서 제거(PII 최소 — 배지엔 submitter 만 필요).
    delete (inquiry as any).user_id;

    // 감사로그: staff(코디·관리자)가 환자 PII(복호화된 이름·연락처·의료상세)를 열람했음 기록.
    // 정부 의료데이터 과제 추적성(GDPR/PIPA·복호화 열람 감사). 실패해도 본 응답은 진행.
    void logAdminAction({
      adminEmail: auth.email || `staff:${auth.userId || "unknown"}`,
      adminUserId: auth.userId,
      action: "VIEW_INQUIRY",
      inquiryIds: [Number(rawId)],
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: { surface: "coordinator_inbox_detail", role: auth.appRole || (auth.isAdmin ? "admin" : "staff") },
    });

    return Response.json({ ok: true, inquiry });
  } catch (e: any) {
    console.error("[portal/inbox/:id] internal error:", e?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
