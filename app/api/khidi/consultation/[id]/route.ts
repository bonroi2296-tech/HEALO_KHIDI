/**
 * HEALO-KHIDI: Consultation Session Detail API
 *
 * GET   /api/khidi/consultation/[id] — 진료 상세 (참가자 또는 admin)
 * PATCH /api/khidi/consultation/[id] — 진료 상태/노트 수정 (의사/코디네이터/admin)
 *
 * 변경 이력:
 * - 2026-04-17 (보안): 미인증 IDOR → requireConsultationAccess.
 *   GET 은 참가자 전원, PATCH 는 doctor/coordinator/admin 만.
 *   응답에서 livekit_token_* 필드 제거.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { resolveConsultationActor } from "@/lib/auth/requireConsultationAccess";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;

    const access = await resolveConsultationActor(request, consultationId);
    if (!access.success) return access.response;

    const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");

    const { data, error } = await supabaseAdmin
      .from("consultation_sessions")
      .select(
        `
        id,
        patient_user_id,
        doctor_user_id,
        coordinator_user_id,
        translator_id,
        session_type,
        scheduled_at,
        started_at,
        ended_at,
        duration_seconds,
        status,
        patient_language,
        doctor_language,
        livekit_room_name,
        notes,
        clinical_summary,
        recommendations,
        recording_url,
        ai_summary,
        created_at,
        updated_at,
        cancer_patient_intakes(id, cancer_type, cancer_stage)
      `
      )
      .eq("id", consultationId)
      .single();

    if (error) {
      console.error(
        `[api/khidi/consultation/${consultationId}] GET error:`,
        error.message
      );
      return Response.json(
        { ok: false, error: "fetch_failed" },
        { status: 500 }
      );
    }

    if (!data) {
      return Response.json(
        { ok: false, error: "Consultation not found" },
        { status: 404 }
      );
    }

    return Response.json({ ok: true, data, viewerRole: access.role });
  } catch (error: any) {
    console.error("[api/khidi/consultation] GET exception:", error?.message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;

    // 노트/상태 수정은 의료 staff 또는 admin 만 가능 (게스트 의사/코디 포함)
    const access = await resolveConsultationActor(request, consultationId, {
      requireRole: ["admin", "doctor", "coordinator"],
    });
    if (!access.success) return access.response;

    const payload = await request.json();

    if (payload.status) {
      const validStatuses = [
        "scheduled",
        "active",
        "completed",
        "cancelled",
        "no_show",
      ];
      if (!validStatuses.includes(payload.status)) {
        return Response.json(
          { ok: false, error: "Invalid status" },
          { status: 400 }
        );
      }
    }

    const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");

    const updateData: Record<string, any> = {};
    if (payload.status) updateData.status = payload.status;
    if (payload.startedAt) updateData.started_at = payload.startedAt;
    if (payload.endedAt) updateData.ended_at = payload.endedAt;
    if (payload.durationSeconds !== undefined)
      updateData.duration_seconds = payload.durationSeconds;
    if (payload.notes !== undefined) updateData.notes = payload.notes;
    if (payload.clinicalSummary !== undefined)
      updateData.clinical_summary = payload.clinicalSummary;
    if (payload.recommendations !== undefined)
      updateData.recommendations = payload.recommendations;

    // doctor_user_id / translator_id 등 참가자 변경은 admin/coordinator 만
    if (access.role === "admin" || access.role === "coordinator") {
      if (payload.doctorId !== undefined)
        updateData.doctor_user_id = payload.doctorId;
      if (payload.translatorId !== undefined)
        updateData.translator_id = payload.translatorId;
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json(
        { ok: false, error: "no_updates" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("consultation_sessions")
      .update(updateData as any)
      .eq("id", consultationId)
      .select(
        "id, status, started_at, ended_at, duration_seconds, updated_at"
      )
      .single();

    if (error) {
      console.error(
        `[api/khidi/consultation/${consultationId}] PATCH error:`,
        error.message
      );
      return Response.json(
        { ok: false, error: "update_failed" },
        { status: 500 }
      );
    }

    // 세션이 취소/완료되면 관련 guest invite 토큰 전부 폐기
    // → 이후 아무도 그 링크로 재진입 불가
    if (payload.status === "cancelled" || payload.status === "completed") {
      try {
        const { revokeAllGuestTokensForConsultation } = await import(
          "@/lib/auth/guestToken"
        );
        const revoked = await revokeAllGuestTokensForConsultation(
          consultationId
        );
        console.log(
          `[api/khidi/consultation/${consultationId}] revoked ${revoked} guest tokens (status=${payload.status})`
        );
      } catch (revokeErr: any) {
        console.warn(
          `[api/khidi/consultation/${consultationId}] token revoke failed:`,
          revokeErr.message
        );
      }
    }

    console.log(
      `[api/khidi/consultation/${consultationId}] Updated by ${access.role} (${access.userId}):`,
      Object.keys(updateData).join(", ")
    );

    return Response.json({ ok: true, data });
  } catch (error: any) {
    console.error("[api/khidi/consultation] PATCH exception:", error?.message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
