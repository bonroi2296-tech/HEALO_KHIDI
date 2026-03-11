/**
 * HEALO: 관리자 감사 로그 조회 API
 * 
 * 경로: /api/admin/audit-logs
 * 권한: 관리자 전용
 * 
 * 목적:
 * - 관리자의 조회 활동 기록 확인
 * - 보안 감사 및 추적
 * 
 * 보안:
 * - 관리자 권한 확인 필수
 * - PII 표시 금지 (inquiry_ids는 integer만, metadata는 sanitized)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../src/lib/auth/requireAdminAuth";

/**
 * GET: 감사 로그 목록 조회 (관리자 전용)
 * 
 * Query Parameters:
 * - limit: 조회 개수 (기본: 50, 최대: 200)
 * - offset: 오프셋 (페이지네이션용)
 * - action: 필터 - action 타입 (선택)
 * - admin_email: 필터 - 관리자 이메일 포함 검색 (선택)
 * - from_date: 필터 - 시작 날짜 (ISO 8601, 선택)
 * - to_date: 필터 - 종료 날짜 (ISO 8601, 선택)
 * 
 * Response:
 * {
 *   ok: true,
 *   logs: [...],
 *   total: number,
 *   limit: number,
 *   offset: number
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

  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
  const offset = Number(searchParams.get("offset")) || 0;
  const actionFilter = searchParams.get("action") || null;
  const emailFilter = searchParams.get("admin_email") || null;
  const fromDate = searchParams.get("from_date") || null;
  const toDate = searchParams.get("to_date") || null;

  // ========================================
  // 3. Supabase 조회
  // ========================================
  try {
    let query = supabaseAdmin
      .from("admin_audit_logs")
      .select("id, action, inquiry_ids, admin_email, metadata, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // 필터 적용
    if (actionFilter) {
      query = query.eq("action", actionFilter);
    }

    if (emailFilter) {
      query = query.ilike("admin_email", `%${emailFilter}%`);
    }

    if (fromDate) {
      query = query.gte("created_at", fromDate);
    }

    if (toDate) {
      query = query.lte("created_at", toDate);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[admin/audit-logs] DB query error:", error.message);
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
    // 4. 응답 반환 (PII 없음)
    // ========================================
    return Response.json({
      ok: true,
      logs: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("[admin/audit-logs] Internal error:", error.message);
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
