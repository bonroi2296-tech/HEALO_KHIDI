/**
 * HEALO-KHIDI: Consultation Session API
 *
 * POST /api/khidi/consultation — 신규 진료 세션 생성 (인증 필요)
 *   - 환자 본인은 자기 자신의 세션을 생성 가능
 *   - admin/coordinator 는 임의 환자 세션 생성 가능
 * GET  /api/khidi/consultation — 세션 목록 (admin only). 일반 사용자는 자기 세션만.
 *
 * 변경 이력:
 * - 2026-04-17 (보안):
 *   * POST: 미인증 → requireAuthenticatedUser. 환자 ID 강제 (본인 user.id 와
 *     일치 또는 admin/coordinator 만 임의 patientId 지정 가능)
 *   * GET: 미인증 → admin only (목록 dump 차단). 환자/의사는 본인 ID 필터 강제.
 *   * 응답에 livekit_token_patient/doctor 노출 제거 (별도 token endpoint 사용)
 *   * Schema drift 수정: patient_user_id, doctor_user_id 사용
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  requireAuthenticatedUser,
} from "@/lib/auth/requireConsultationAccess";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (!auth.success) return auth.response;

    const payload = await request.json();

    // 입력 정규화: 어드민 폼은 snake_case(session_type 등), 일부 호출부는 camelCase 를
    // 보낸다. 과거엔 API 가 camelCase 만 읽어 폼 생성이 400 으로 실패했음 → 양쪽 모두 수용.
    const sessionType = payload.sessionType ?? payload.session_type;
    const scheduledAt = payload.scheduledAt ?? payload.scheduled_at;
    const patientId = payload.patientId ?? payload.patient_user_id;
    const doctorId = payload.doctorId ?? payload.doctor_user_id;
    const coordinatorId = payload.coordinatorId ?? payload.coordinator_user_id;
    const translatorId = payload.translatorId ?? payload.translator_id;
    const patientLanguage = payload.patientLanguage ?? payload.patient_language;
    const doctorLanguage = payload.doctorLanguage ?? payload.doctor_language;
    const notes = payload.notes;
    // 유치 전환 깔때기의 핵심: 상담을 원래 문의(inquiry)와 연결해야 자동 집계가 동작.
    const inquiryIdRaw =
      payload.inquiryId ?? payload.inquiry_id ?? payload.selected_inquiry_id;
    const inquiryId =
      inquiryIdRaw === undefined || inquiryIdRaw === null || inquiryIdRaw === ""
        ? null
        : Number(inquiryIdRaw);

    // Validation
    if (sessionType === undefined || sessionType === null) {
      return Response.json(
        { ok: false, error: "sessionType is required" },
        { status: 400 }
      );
    }
    if (scheduledAt === undefined || scheduledAt === null) {
      return Response.json(
        { ok: false, error: "scheduledAt is required" },
        { status: 400 }
      );
    }
    if (inquiryId !== null && !Number.isFinite(inquiryId)) {
      return Response.json(
        { ok: false, error: "Invalid inquiryId" },
        { status: 400 }
      );
    }

    const validSessionTypes = [
      "pre_consultation",
      "follow_up",
      "emergency",
      "diagnostic",
    ];
    if (!validSessionTypes.includes(sessionType)) {
      return Response.json(
        { ok: false, error: "Invalid sessionType" },
        { status: 400 }
      );
    }

    const validLanguages = ["ru", "kz", "en"];
    if (
      patientLanguage &&
      !validLanguages.includes(patientLanguage)
    ) {
      return Response.json(
        { ok: false, error: "Invalid patientLanguage" },
        { status: 400 }
      );
    }

    // 환자 ID 결정:
    // - admin: payload.patientId 임의 지정 가능
    // - 일반 사용자: 본인 user.id 강제 (남의 ID 로 세션 생성 불가)
    const patientUserId = auth.isAdmin
      ? patientId || auth.userId
      : auth.userId;

    const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");

    // LiveKit room name (토큰은 별도 /token 엔드포인트에서 참가자 본인이 발급)
    const liveroomName = `khidi-${uuidv4()}`;

    const insertData: Record<string, any> = {
      patient_user_id: patientUserId,
      inquiry_id: inquiryId,
      doctor_user_id: doctorId || null,
      coordinator_user_id: coordinatorId || null,
      translator_id: translatorId || null,
      session_type: sessionType,
      scheduled_at: scheduledAt,
      patient_language: patientLanguage || "ru",
      doctor_language: doctorLanguage || "ko",
      status: "scheduled",
      livekit_room_name: liveroomName,
      // ⚠ livekit_token_*  필드는 더 이상 사전 발급하지 않음.
      //    참가자가 /api/khidi/consultation/token 에서 본인 인증으로 받음.
      notes: notes || null,
    };

    const { data, error } = await supabaseAdmin
      .from("consultation_sessions")
      .insert([insertData] as any)
      .select(
        "id, patient_user_id, session_type, scheduled_at, status, livekit_room_name, created_at"
      )
      .single();

    if (error) {
      console.error("[api/khidi/consultation] Insert error:", error.message);
      return Response.json(
        { ok: false, error: "create_failed" },
        { status: 500 }
      );
    }

    console.log(
      `[api/khidi/consultation] New session: ${data.id} (${data.session_type}) by ${auth.userId}`
    );

    return Response.json({ ok: true, data });
  } catch (error: any) {
    console.error("[api/khidi/consultation] Exception:", error?.message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");

    const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");

    let query = supabaseAdmin
      .from("consultation_sessions")
      .select(
        `
        id,
        patient_user_id,
        doctor_user_id,
        coordinator_user_id,
        session_type,
        scheduled_at,
        started_at,
        ended_at,
        status,
        patient_language,
        doctor_language,
        livekit_room_name,
        hospital_id,
        partner_doctor_id,
        created_at,
        notes,
        cancer_patient_intakes(id, cancer_type, cancer_stage),
        hospitals(id, name, address),
        partner_doctors(id, name_ko, name_en, subspecialty, position_ko)
      `,
        { count: "exact" }
      );

    if (status) query = query.eq("status", status);

    // 일반 사용자: 본인 관여 세션만 조회 (admin 은 전부)
    if (!auth.isAdmin) {
      // patient_user_id, doctor_user_id, coordinator_user_id, translator_id 중 하나가 본인
      query = query.or(
        `patient_user_id.eq.${auth.userId},doctor_user_id.eq.${auth.userId},coordinator_user_id.eq.${auth.userId},translator_id.eq.${auth.userId}`
      );
    }

    const { data, count, error } = await query
      .order("scheduled_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[api/khidi/consultation] GET error:", error.message);
      return Response.json(
        { ok: false, error: "list_failed" },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      data: data || [],
      total: count,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("[api/khidi/consultation] GET exception:", error?.message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
