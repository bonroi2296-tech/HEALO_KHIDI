/**
 * HEALO: 관리자 문의 목록 조회 API
 * 
 * 경로: /api/admin/inquiries
 * 권한: 관리자 전용
 * 
 * 목적:
 * - 관리자가 문의 목록을 조회할 때 PII를 마스킹하여 표시
 * - DB에는 암호화된 상태로 유지
 * - 평문은 단건 상세 조회(/api/admin/inquiries/[id])에서만 제공
 * 
 * 🔒 보안 정책:
 * - 관리자 권한 확인 필수
 * - decrypt 파라미터 완전 봉인 (항상 마스킹만 반환)
 * - 평문 대량 노출 가능성 원천 차단
 * - 로그에 평문 출력 금지
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../src/lib/auth/requireAdminAuth";
// 🔒 복호화 import 제거 - 목록 API는 마스킹만 제공
// import { decryptInquiriesForAdmin } from "../../../../src/lib/security/decryptForAdmin";
import { maskInquiriesForList } from "../../../../src/lib/security/maskPii";
import {
  logAdminAction,
  getIpFromRequest,
  getUserAgentFromRequest,
} from "../../../../src/lib/audit/adminAuditLog";

/**
 * GET: 문의 목록 조회 (관리자 전용, PII 마스킹 전용)
 * 
 * Query Parameters:
 * - limit: 조회 개수 (기본: 50, 최대: 200)
 * - offset: 오프셋 (페이지네이션용)
 * - status: 상태 필터 (received / normalized / error / blocked)
 * - treatment_type: 시술 타입 필터
 * - nationality: 국가 필터
 * 
 * ⚠️ 보안 정책:
 * - decrypt 파라미터는 무시됩니다 (목록은 항상 마스킹)
 * - 평문은 단건 상세 조회(/api/admin/inquiries/[id])에서만 제공
 * 
 * Response:
 * {
 *   ok: true,
 *   inquiries: [...],  // 항상 마스킹된 값만
 *   total: 100,
 *   decrypted: false,  // 항상 false
 *   masked: true       // 항상 true
 * }
 */
export async function GET(request: NextRequest) {
  // ✅ 환경변수 검증
  assertSupabaseEnv();

  // ========================================
  // 1. 관리자 권한 확인 (자동 audit log 포함)
  // ========================================
  const auth = await requireAdminAuth(request);
  if (!auth.success) {
    return auth.response; // 403 + audit log 자동 처리
  }
  const { authResult } = auth;

  // ========================================
  // 2. Query Parameters 파싱
  // ========================================
  const { searchParams } = new URL(request.url);

  const limit = Math.min(
    parseInt(searchParams.get("limit") || "50"),
    200 // 최대 200건
  );
  const offset = parseInt(searchParams.get("offset") || "0");
  const statusFilter = searchParams.get("status");
  const treatmentTypeFilter = searchParams.get("treatment_type");
  const nationalityFilter = searchParams.get("nationality");
  
  // 🔒 보안 정책: decrypt 파라미터 완전 봉인 (목록은 항상 마스킹만)
  // decrypt 파라미터가 오더라도 무시하고 항상 false로 고정
  const shouldDecrypt = false; // 🚫 ALWAYS FALSE - 평문 대량 노출 차단

  // ========================================
  // 3. DB 조회
  // ========================================
  try {
    // 🔒 보안: list API는 최소 필드만 SELECT (message/attachment 제외)
    const LIST_FIELDS = [
      "id",
      "created_at",
      "first_name",
      "last_name",
      "email",
      "treatment_type",
      "contact_method",
      "nationality",
      "status",
    ].join(",");

    let query = supabaseAdmin
      .from("inquiries")
      .select(LIST_FIELDS, { count: "exact" })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    // 필터 적용
    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }
    if (treatmentTypeFilter) {
      query = query.eq("treatment_type", treatmentTypeFilter);
    }
    if (nationalityFilter) {
      query = query.eq("nationality", nationalityFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[admin/inquiries] DB query error:", error.message);
      return Response.json(
        {
          ok: false,
          error: "db_query_failed",
          detail: error.message,
        },
        { status: 500 }
      );
    }

    // ========================================
    // 4. PII 마스킹 (항상 마스킹만 - 복호화 봉인)
    // ========================================
    let inquiries = data || [];
    // ✅ inquiry_ids는 INT4[] (number[]) - DB row의 id는 integer
    const inquiryIds: number[] = inquiries.map((inq) => inq.id);

    // 🔒 보안 정책: 목록 API는 항상 마스킹만 반환
    // 복호화 로직 자체를 제거하여 평문 대량 노출 가능성 차단
    inquiries = maskInquiriesForList(inquiries);
    console.log(`[admin/inquiries] ✅ Masked ${inquiries.length} inquiries (decrypt sealed)`);
    
    // 성능 최적화: 복호화 단계를 건너뛰므로 API 응답 속도 향상

    // ========================================
    // 5. 감사 로그 기록
    // ========================================
    // ✅ inquiry_ids는 INT4[] (number[])로 전달
    // 백그라운드로 실행 (메인 로직 블로킹 방지)
    logAdminAction({
      adminEmail: authResult.email || "unknown",
      adminUserId: authResult.userId,
      action: "LIST_INQUIRIES",
      inquiryIds, // ✅ already number[]
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
        metadata: {
          limit,
          offset,
          status: statusFilter,
          treatment_type: treatmentTypeFilter,
          nationality: nationalityFilter,
          decrypt: false, // 항상 false (봉인)
        },
    }).catch((err) => {
      // 감사 로그 실패는 조용히 처리 (메인 로직에 영향 X)
      console.error("[admin/inquiries] Audit log failed:", err.message);
    });

    // ========================================
    // 6. 응답 반환
    // ========================================
    return Response.json({
      ok: true,
      inquiries,
      total: count || 0,
      limit,
      offset,
      decrypted: false,    // 항상 false (복호화 봉인)
      masked: true,        // 항상 true (마스킹만 제공)
      _security: "list_api_always_masked", // 보안 정책 명시
    });
  } catch (error: any) {
    // 🚨 에러 로깅 시 PII 제외 (error.message만 로깅)
    console.error("[admin/inquiries] Internal error:", error.message);
    return Response.json(
      {
        ok: false,
        error: "internal_error",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}
