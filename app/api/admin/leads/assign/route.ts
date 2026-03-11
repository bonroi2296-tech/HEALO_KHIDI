/**
 * HEALO: 병원에 리드 할당 API
 * 
 * 경로: /api/admin/leads/assign
 * 권한: 관리자 전용
 * 
 * 목적:
 * - 하나의 inquiry를 여러 병원에 동시 할당
 * - 중복 할당 방지 (upsert)
 * - 할당 이력 감사 로그 기록
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../src/lib/auth/requireAdminAuth";
import {
  logAdminAction,
  getIpFromRequest,
  getUserAgentFromRequest,
} from "../../../../../src/lib/audit/adminAuditLog";
import {
  LeadAssignSchema,
  validationErrorResponse,
} from "../../../../../src/lib/validation/admin";

/**
 * POST: 병원에 리드 할당
 * 
 * Body:
 * {
 *   normalized_inquiry_id: string (uuid),
 *   hospital_ids: string[] (uuid array)
 * }
 * 
 * Response:
 * {
 *   ok: true,
 *   assigned: number,
 *   leads: [...],
 *   skipped: number (중복)
 * }
 */
export async function POST(request: NextRequest) {
  // ✅ 환경변수 검증
  assertSupabaseEnv();

  // ========================================
  // 1. 관리자 권한 확인
  // ========================================
  const auth = await requireAdminAuth(request);
  if (!auth.success) {
    return auth.response;
  }
  const { authResult } = auth;

  // ========================================
  // 2. Body 파싱 및 검증
  // ========================================
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  // ✅ Zod 검증
  const validation = LeadAssignSchema.safeParse(body);
  if (!validation.success) {
    return validationErrorResponse(validation.error);
  }

  const { normalized_inquiry_id, hospital_ids } = validation.data;

  // ========================================
  // 🔍 DEBUG: Supabase 연결 정보 로그 출력
  // ========================================
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const projectRef = supabaseUrl?.split("//")[1]?.split(".")[0] || "unknown";
  
  // 🔒 키 타입 진단 (RLS 문제 확인)
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const serviceRolePrefix = process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 6) || "N/A";
  const keyType = hasServiceRoleKey ? "service_role" : "anon_or_missing";
  
  if (process.env.NODE_ENV !== "production") {
    console.log("[leads/assign] keyType:", keyType, "| id:", normalized_inquiry_id);
  }

  // ========================================
  // 3. Inquiry 존재 확인
  // ========================================
  try {
    const { data: inquiry, error: inquiryError } = await supabaseAdmin
      .from("normalized_inquiries")
      .select("id")
      .eq("id", normalized_inquiry_id)
      .maybeSingle();

    if (inquiryError || !inquiry) {
      // TODO: 프로덕션에서는 디버깅 정보 제거
      const debugInfo = process.env.NODE_ENV !== "production" ? {
        supabase_url: supabaseUrl,
        project_ref: projectRef,
        queried_table: "public.normalized_inquiries",
        queried_id: normalized_inquiry_id,
        key_type: keyType,
        has_service_role_key: hasServiceRoleKey,
        service_role_prefix: serviceRolePrefix,
        error_code: inquiryError?.code,
        error_message: inquiryError?.message,
        error_details: inquiryError?.details,
      } : undefined;

      return Response.json(
        {
          ok: false,
          error: "inquiry_not_found",
          detail: "해당 inquiry를 찾을 수 없습니다.",
          debug: debugInfo,
        },
        { status: 404 }
      );
    }

    // ========================================
    // 4. 병원 존재 확인
    // ========================================
    const { data: hospitals, error: hospitalsError } = await supabaseAdmin
      .from("hospitals")
      .select("id, name")
      .in("id", hospital_ids);

    if (hospitalsError) {
      console.error("[admin/leads/assign] Hospital fetch error:", hospitalsError.message);
      return Response.json(
        {
          ok: false,
          error: "hospital_fetch_failed",
          detail: hospitalsError.message,
        },
        { status: 500 }
      );
    }

    if (!hospitals || hospitals.length === 0) {
      return Response.json(
        {
          ok: false,
          error: "no_hospitals_found",
          detail: "유효한 병원을 찾을 수 없습니다.",
        },
        { status: 404 }
      );
    }

    const foundHospitalIds = hospitals.map(h => h.id);
    const notFoundIds = hospital_ids.filter(id => !foundHospitalIds.includes(id));

    if (notFoundIds.length > 0 && process.env.NODE_ENV !== "production") {
      console.warn("[leads/assign] Hospitals not found:", notFoundIds);
    }

    // ========================================
    // 5. 리드 할당 (upsert - 중복 방지)
    // ========================================
    const now = new Date().toISOString();
    const leadsToInsert = foundHospitalIds.map(hospital_id => ({
      normalized_inquiry_id,
      hospital_id,
      status: "sent",
      assigned_at: now,
      last_status_at: now,
    }));

    // Upsert: 중복이면 업데이트, 아니면 삽입
    const { data: insertedLeads, error: insertError } = await supabaseAdmin
      .from("hospital_leads")
      .upsert(leadsToInsert, {
        onConflict: "normalized_inquiry_id,hospital_id",
        ignoreDuplicates: false, // 중복 시 업데이트
      })
      .select();

    if (insertError) {
      console.error("[admin/leads/assign] Insert error:", insertError.message);
      return Response.json(
        {
          ok: false,
          error: "insert_failed",
          detail: insertError.message,
        },
        { status: 500 }
      );
    }

    const assignedCount = insertedLeads?.length || 0;
    const skippedCount = foundHospitalIds.length - assignedCount;

    // ========================================
    // 6. 감사 로그 기록
    // ========================================
    logAdminAction({
      adminEmail: authResult.email || "unknown",
      adminUserId: authResult.userId,
      action: "ASSIGN_LEADS",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: {
        normalized_inquiry_id,
        hospital_ids: foundHospitalIds,
        assigned_count: assignedCount,
        skipped_count: skippedCount,
      },
    }).catch((err) => {
      console.error("[admin/leads/assign] Audit log failed:", err.message);
    });

    // ========================================
    // 7. 응답 반환
    // ========================================
    return Response.json({
      ok: true,
      assigned: assignedCount,
      skipped: skippedCount,
      leads: insertedLeads || [],
      hospitals: hospitals.map(h => ({ id: h.id, name: h.name })),
    });
  } catch (error: any) {
    console.error("[admin/leads/assign] Exception:", error.message);
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
