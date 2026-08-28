/**
 * healwith: 병원에 리드 할당 API
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
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth"; // 2026-07-24 권한 정비(A): 코디도 리드 진행 가능(staffOnly)
import {
  logAdminAction,
  getIpFromRequest,
  getUserAgentFromRequest,
} from "@/lib/audit/adminAuditLog";
import {
  LeadAssignSchema,
  validationErrorResponse,
} from "@/lib/validation/admin";

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
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) {
    return auth.response;
  }
  const authResult = { email: auth.email, userId: auth.userId }; // requirePortalAuth 평탄 반환 → 기존 코드 호환

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
  // 3. Inquiry 존재 확인
  // ========================================
  try {
    const { data: inquiry, error: inquiryError } = await supabaseAdmin
      .from("normalized_inquiries")
      .select("id, source_inquiry_id")
      .eq("id", normalized_inquiry_id)
      .maybeSingle();

    if (inquiryError || !inquiry) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[leads/assign] Inquiry not found:", {
          queried_id: normalized_inquiry_id,
          error_code: inquiryError?.code,
          error_message: inquiryError?.message,
        });
      }
      return Response.json(
        {
          ok: false,
          error: "inquiry_not_found",
          detail: "해당 inquiry를 찾을 수 없습니다.",
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
        },
        { status: 500 }
      );
    }

    const assignedCount = insertedLeads?.length || 0;
    const skippedCount = foundHospitalIds.length - assignedCount;

    // 파트너 알림(2026-07-15): 배정된 병원 담당자에게 '새 진료 의뢰' 종 알림.
    //   종 UI는 이미 병원 상단바에 있음(ClientShell) — 백엔드 INSERT만. 본문 비-PII(이름 등 금지).
    //   ⚠️ coordinator/cases/assign 경로에도 같이 붙임(#85 '한 경로만 배선' 반쪽 방지).
    try {
      const { notifyHospitalNewLead } = await import("@/lib/notifications/inApp");
      // 병원별 리드 번호를 실어 보낸다 — 알림이 목록이 아니라 «그 의뢰»를 연다.
      const leadIdByHospital = new Map<string, string>(
        ((insertedLeads as any[]) || []).map((r) => [String(r.hospital_id), String(r.id)])
      );
      await Promise.allSettled(
        foundHospitalIds.map((hid) =>
          notifyHospitalNewLead({ hospitalId: hid, leadId: leadIdByHospital.get(String(hid)) ?? null })
        )
      );
    } catch {
      /* fail-safe */
    }

    // EDGE-4 (POSTMORTEM #18→#20): coordinator/cases/assign 와 대칭 — admin 경로로 병원
    //   배정해도 케이스 진행단계를 '병원 치료가능 검토 중'으로 전진+이력 기록(이전엔 admin
    //   배정만 하면 에이전시·환자 타임라인이 안 움직였음). source_inquiry_id 로 연결.
    if ((inquiry as any)?.source_inquiry_id) {
      try {
        const { advanceCaseStatus } = await import("@/lib/khidi/advanceCaseStatus");
        await advanceCaseStatus(
          supabaseAdmin,
          (inquiry as any).source_inquiry_id,
          "consultation",
          `병원 배정 (${assignedCount}곳, admin)`,
          authResult.userId ?? null
        );
      } catch (csErr: any) {
        console.warn("[admin/leads/assign] case_status advance failed:", csErr?.message);
      }
    }

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
      },
      { status: 500 }
    );
  }
}
