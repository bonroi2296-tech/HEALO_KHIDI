/**
 * healwith: 리드 목록 조회 API
 * 
 * 경로: /api/admin/leads
 * 권한: 관리자 전용
 * 
 * 목적:
 * - 병원별 리드 현황 조회
 * - 필터링 (status, hospital, inquiry, 날짜)
 * - JOIN으로 hospital, inquiry 정보 포함
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth"; // 2026-07-24 권한 정비(A): 코디도 리드 진행 가능(staffOnly)
import {
  logAdminAction,
  getIpFromRequest,
  getUserAgentFromRequest,
} from "@/lib/audit/adminAuditLog";

/**
 * GET: 리드 목록 조회 (관리자 전용)
 * 
 * Query Parameters:
 * - status: string (optional) - "queued", "sent", "viewed", "replied", "converted", "rejected", "expired"
 * - hospital_id: uuid (optional)
 * - normalized_inquiry_id: uuid (optional)
 * - start_date: ISO date (optional) - assigned_at 기준
 * - end_date: ISO date (optional) - assigned_at 기준
 * - limit: number (optional, default: 50, max: 200)
 * - offset: number (optional, default: 0)
 * 
 * Response:
 * {
 *   ok: true,
 *   leads: [
 *     {
 *       id, created_at, updated_at,
 *       normalized_inquiry_id, hospital_id,
 *       status, assigned_at, first_response_at, last_status_at,
 *       quoted_price_min, quoted_price_max, notes, metadata,
 *       hospital: { id, name, slug },
 *       inquiry: { id, language, country, treatment_slug, objective }
 *     }
 *   ],
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */
export async function GET(request: NextRequest) {
  // ✅ 환경변수 검증
  assertSupabaseEnv();

  // ========================================
  // 1. 관리자 권한 확인
  // ========================================
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) {
    return auth.response;
  }
  const authResult = { email: auth.email, userId: auth.userId }; // requirePortalAuth 평탄 반환 → 기존 코드 호환

  // ========================================
  // 2. Query Parameters 파싱
  // ========================================
  const { searchParams } = new URL(request.url);

  const status = searchParams.get("status");
  const hospitalId = searchParams.get("hospital_id");
  const inquiryId = searchParams.get("normalized_inquiry_id");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "50"),
    200
  );
  const offset = parseInt(searchParams.get("offset") || "0");

  // ========================================
  // 3. DB 조회
  // ========================================
  try {
    // 기본 쿼리
    let query = supabaseAdmin
      .from("hospital_leads")
      .select(
        `
        id,
        created_at,
        updated_at,
        normalized_inquiry_id,
        hospital_id,
        status,
        assigned_at,
        first_response_at,
        last_status_at,
        quoted_price_min,
        quoted_price_max,
        notes,
        metadata,
        hospitals:hospital_id (
          id,
          name,
          slug
        ),
        normalized_inquiries:normalized_inquiry_id (
          id,
          language,
          country,
          treatment_slug,
          objective
        )
        `,
        { count: "exact" }
      )
      .order("assigned_at", { ascending: false });

    // 필터 적용
    if (status) {
      query = query.eq("status", status);
    }

    if (hospitalId) {
      query = query.eq("hospital_id", hospitalId);
    }

    if (inquiryId) {
      query = query.eq("normalized_inquiry_id", inquiryId);
    }

    if (startDate) {
      query = query.gte("assigned_at", startDate);
    }

    if (endDate) {
      query = query.lte("assigned_at", endDate);
    }

    // 페이지네이션
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("[admin/leads] Query error:", error.message);
      return Response.json(
        {
          ok: false,
          error: "query_failed",
        },
        { status: 500 }
      );
    }

    // ========================================
    // 4. 데이터 변환 (JOIN 결과 정리)
    // ========================================
    const leads = (data || []).map((lead: any) => ({
      id: lead.id,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      normalized_inquiry_id: lead.normalized_inquiry_id,
      hospital_id: lead.hospital_id,
      status: lead.status,
      assigned_at: lead.assigned_at,
      first_response_at: lead.first_response_at,
      last_status_at: lead.last_status_at,
      quoted_price_min: lead.quoted_price_min,
      quoted_price_max: lead.quoted_price_max,
      notes: lead.notes,
      metadata: lead.metadata,
      hospital: lead.hospitals || null,
      inquiry: lead.normalized_inquiries || null,
    }));

    // ========================================
    // 5. 감사 로그 기록
    // ========================================
    logAdminAction({
      adminEmail: authResult.email || "unknown",
      adminUserId: authResult.userId,
      action: "LIST_LEADS",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: {
        status,
        hospital_id: hospitalId,
        inquiry_id: inquiryId,
        total: count || 0,
      },
    }).catch((err) => {
      console.error("[admin/leads] Audit log failed:", err.message);
    });

    // ========================================
    // 6. 응답 반환
    // ========================================
    console.log(`[admin/leads] ✅ Listed ${leads.length} leads (total: ${count})`);

    return Response.json({
      ok: true,
      leads,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("[admin/leads] Exception:", error.message);
    return Response.json(
      {
        ok: false,
        error: "internal_error",
      },
      { status: 500 }
    );
  }
}
