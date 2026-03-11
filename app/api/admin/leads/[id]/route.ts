/**
 * HEALO: 개별 리드 업데이트 API
 * 
 * 경로: /api/admin/leads/[id]
 * 권한: 관리자 전용
 * 
 * 목적:
 * - 리드 상태 변경 (queued → sent → replied 등)
 * - 병원 응답 정보 업데이트 (가격, 노트)
 * - first_response_at 자동 설정
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
  LeadUpdateSchema,
  validationErrorResponse,
} from "../../../../../src/lib/validation/admin";

/**
 * PATCH: 리드 상태/정보 업데이트
 * 
 * Query Parameters:
 * - id: lead ID (required)
 * 
 * Body:
 * {
 *   status?: "queued" | "sent" | "viewed" | "replied" | "converted" | "rejected" | "expired",
 *   quoted_price_min?: number,
 *   quoted_price_max?: number,
 *   notes?: string,
 *   metadata?: object
 * }
 * 
 * Response:
 * {
 *   ok: true,
 *   lead: {...}
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  // 2. Path Parameters 파싱
  // ========================================
  const { id } = await params;

  if (!id) {
    return Response.json(
      { ok: false, error: "id_required", detail: "리드 ID가 필요합니다." },
      { status: 400 }
    );
  }

  // ========================================
  // 3. Body 파싱 및 검증
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
  const validation = LeadUpdateSchema.safeParse(body);
  if (!validation.success) {
    return validationErrorResponse(validation.error);
  }

  const validatedData = validation.data;

  // ========================================
  // 4. 기존 리드 조회
  // ========================================
  try {
    const { data: existingLead, error: fetchError } = await supabaseAdmin
      .from("hospital_leads")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingLead) {
      return Response.json(
        { ok: false, error: "lead_not_found", detail: "리드를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // ========================================
    // 5. Payload 구성
    // ========================================
    const now = new Date().toISOString();
    const payload: any = {};

    // Status 변경
    if (validatedData.status !== undefined) {
      payload.status = validatedData.status;
      payload.last_status_at = now;

      // Status가 replied로 변경되고 first_response_at이 null이면 설정
      if (
        validatedData.status === "replied" &&
        !existingLead.first_response_at
      ) {
        payload.first_response_at = now;
      }
    }

    // 가격 정보
    if (validatedData.quoted_price_min !== undefined) {
      payload.quoted_price_min = validatedData.quoted_price_min;
    }
    if (validatedData.quoted_price_max !== undefined) {
      payload.quoted_price_max = validatedData.quoted_price_max;
    }

    // 노트
    if (validatedData.notes !== undefined) {
      payload.notes = validatedData.notes;
    }

    // 메타데이터 (병합)
    if (validatedData.metadata !== undefined) {
      payload.metadata = {
        ...(existingLead.metadata || {}),
        ...validatedData.metadata,
      };
    }

    // updated_at은 trigger에서 자동 설정됨

    // ========================================
    // 6. DB 업데이트
    // ========================================
    const { data: updatedLead, error: updateError } = await supabaseAdmin
      .from("hospital_leads")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[admin/leads/[id]] Update error:", updateError.message);
      return Response.json(
        {
          ok: false,
          error: "update_failed",
          detail: updateError.message,
        },
        { status: 500 }
      );
    }

    // ========================================
    // 7. 감사 로그 기록
    // ========================================
    logAdminAction({
      adminEmail: authResult.email || "unknown",
      adminUserId: authResult.userId,
      action: "UPDATE_LEAD",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: {
        lead_id: id,
        changes: Object.keys(payload),
        old_status: existingLead.status,
        new_status: validatedData.status,
      },
    }).catch((err) => {
      console.error("[admin/leads/[id]] Audit log failed:", err.message);
    });

    // ========================================
    // 8. 응답 반환
    // ========================================
    console.log(
      `[admin/leads/[id]] ✅ Updated lead ${id}: ${Object.keys(payload).join(", ")}`
    );

    return Response.json({
      ok: true,
      lead: updatedLead,
    });
  } catch (error: any) {
    console.error("[admin/leads/[id]] Exception:", error.message);
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
