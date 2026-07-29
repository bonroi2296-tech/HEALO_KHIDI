/**
 * healwith: Consultation Session Detail API
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
import {
  encryptSessionNotes,
  readSessionNotes,
  backfillSessionNotesEncryption,
} from "@/lib/khidi/consultationNotes";

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
        notes_encrypted,
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

    // 평문 잔존이면 조회 김에 암호문으로 이전(백필, best-effort)
    try {
      await backfillSessionNotesEncryption(supabaseAdmin, [data as any]);
    } catch {}

    // 응답: 암호문은 감추고 복호화된 notes 만 (필드명 유지)
    const { notes, notes_encrypted, ...rest } = data as any;
    const responseData = {
      ...rest,
      notes: readSessionNotes({ id: rest.id, notes, notes_encrypted }),
    };

    return Response.json({ ok: true, data: responseData, viewerRole: access.role });
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

    // EDGE-3: 완료 전환 시 case_status 전진을 위해 사전 메타(이전 상태·문의·유형) 조회.
    const { data: prevSession } = await supabaseAdmin
      .from("consultation_sessions")
      .select("status, inquiry_id, session_type")
      .eq("id", consultationId)
      .maybeSingle();
    const priorStatus = (prevSession as any)?.status ?? null;

    // 클라이언트별로 camelCase·snake_case 가 섞여 들어옴 (예: 통화 종료 시 ended_at).
    // 과거엔 camelCase 만 읽어 ended_at 이 저장되지 않아 종료시각·통화시간이 누락됐음.
    const startedAt = payload.startedAt ?? payload.started_at;
    const endedAt = payload.endedAt ?? payload.ended_at;
    const durationSeconds = payload.durationSeconds ?? payload.duration_seconds;
    const clinicalSummary = payload.clinicalSummary ?? payload.clinical_summary;

    const updateData: Record<string, any> = {};
    if (payload.status) updateData.status = payload.status;
    if (startedAt) updateData.started_at = startedAt;
    if (endedAt) updateData.ended_at = endedAt;
    if (durationSeconds !== undefined)
      updateData.duration_seconds = durationSeconds;
    if (payload.notes !== undefined) {
      // 메모는 암호문으로만 저장 + 기존 평문 잔존분도 이 기회에 제거
      updateData.notes_encrypted = encryptSessionNotes(payload.notes);
      updateData.notes = null;
    }
    if (clinicalSummary !== undefined)
      updateData.clinical_summary = clinicalSummary;
    if (payload.recommendations !== undefined)
      updateData.recommendations = payload.recommendations;

    // doctor_user_id / translator_id 등 참가자 변경은 admin/coordinator 만
    if (access.role === "admin" || access.role === "coordinator") {
      if (payload.doctorId !== undefined)
        updateData.doctor_user_id = payload.doctorId;
      if (payload.translatorId !== undefined)
        updateData.translator_id = payload.translatorId;

      // 📌 문의 «소급» 연결 (2026-07-29 신설).
      // 왜: KHIDI 실적 집계 조건이 「문의 연결 + 완료」인데, 지금까지 PATCH 가 inquiry_id 를
      //     아예 안 받아서 «만들 때 안 골랐으면 영원히 못 고치는» 상태였다. 실측 결과
      //     사전상담 방 66개가 전부 문의 미연결 → 실적이 구조적으로 0.
      // 안전: staff(admin·coordinator) 만. 빈 값(null)이면 연결 해제로 취급한다.
      const inquiryIdRaw = payload.inquiryId ?? payload.inquiry_id;
      if (inquiryIdRaw !== undefined) {
        if (inquiryIdRaw === null || inquiryIdRaw === "") {
          updateData.inquiry_id = null;
        } else {
          const n = Number(inquiryIdRaw);
          if (!Number.isInteger(n) || n <= 0) {
            return Response.json(
              { ok: false, error: "invalid_inquiry_id" },
              { status: 400 }
            );
          }
          updateData.inquiry_id = n;
        }
      }
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

    // EDGE-3 (POSTMORTEM #18→#20): 상담이 '완료'로 전환되면 케이스 진행상황을 전진시켜
    //   에이전시·코디 타임라인에 반영(이전엔 상담만 완료되고 case_status 는 정체했음).
    //   사전상담→'consultation', 사후관리→'follow_up'. 뒤로 가지 않음(advanceCaseStatus 가드).
    if (
      payload.status === "completed" &&
      priorStatus !== "completed" &&
      (prevSession as any)?.inquiry_id
    ) {
      try {
        const sType = (prevSession as any).session_type;
        const target = sType === "follow_up" ? "follow_up" : "consultation";
        const label = sType === "follow_up" ? "사후관리 완료" : "사전상담 완료";
        const { advanceCaseStatus } = await import("@/lib/khidi/advanceCaseStatus");
        await advanceCaseStatus(
          supabaseAdmin,
          (prevSession as any).inquiry_id,
          target,
          `🩺 ${label} (원격상담)`,
          access.userId ?? null
        );
      } catch (csErr: any) {
        console.warn(
          `[api/khidi/consultation/${consultationId}] case_status advance failed:`,
          csErr?.message
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
