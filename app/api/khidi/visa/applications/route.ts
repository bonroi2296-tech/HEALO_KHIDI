/**
 * healwith: Visa Application Workflow API
 *
 * POST /api/khidi/visa/applications — 신규 비자 신청 생성 (환자 본인)
 * GET  /api/khidi/visa/applications — 목록 조회 (환자: 본인 건, 코디: 전체, admin: 전체)
 *
 * 정부 요건: KHIDI #3, #6 — 비자발급지원 정보 제공 + 진행 관리
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireVisaAuthenticatedUser } from "@/lib/auth/requireVisaAccess";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

const VALID_VISA_TYPES = ["C-3-3", "G-1-10", "M-1", "other"] as const;

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireVisaAuthenticatedUser(request);
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const payload = await request.json();

    // Validation
    if (!payload.visa_type || !VALID_VISA_TYPES.includes(payload.visa_type)) {
      return Response.json(
        { ok: false, error: "invalid_visa_type", detail: `visa_type must be one of ${VALID_VISA_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    if (!payload.nationality || typeof payload.nationality !== "string") {
      return Response.json(
        { ok: false, error: "nationality_required" },
        { status: 400 }
      );
    }

    // consultation_id/intake_id 는 있으면 본인 소유인지 검증
    if (payload.consultation_id) {
      const { data: consultation } = await supabaseAdmin
        .from("consultation_sessions")
        .select("id, patient_user_id, patient_id")
        .eq("id", payload.consultation_id)
        .maybeSingle();
      if (!consultation) {
        return Response.json({ ok: false, error: "consultation_not_found" }, { status: 404 });
      }
      const isParticipant =
        consultation.patient_user_id === userId || consultation.patient_id === userId;
      if (!isParticipant && !authResult.isAdmin) {
        return Response.json({ ok: false, error: "forbidden_consultation" }, { status: 403 });
      }
    }

    const insertData = {
      patient_user_id: userId, // 클라이언트가 지정 못하게 강제
      consultation_id: payload.consultation_id || null,
      intake_id: payload.intake_id || null,
      hospital_id: payload.hospital_id || null,
      visa_type: payload.visa_type,
      nationality: payload.nationality.toUpperCase().slice(0, 3),
      purpose: payload.purpose || null,
      duration_days: payload.duration_days ? Math.min(Math.max(parseInt(payload.duration_days), 1), 730) : null,
      planned_arrival_date: payload.planned_arrival_date || null,
      planned_departure_date: payload.planned_departure_date || null,
      status: "draft",
    };

    const { data, error } = await supabaseAdmin
      .from("visa_applications")
      .insert([insertData])
      .select("*")
      .single();

    if (error) {
      console.error("[api/khidi/visa/applications] Insert error:", error.message);
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    // 상태 이력 기록
    await supabaseAdmin.from("visa_status_history").insert({
      application_id: data.id,
      from_status: null,
      to_status: "draft",
      changed_by: userId,
      note: "신청 시작",
    });

    console.log(`[api/khidi/visa/applications] Created ${data.id} by ${userId}`);

    return Response.json({ ok: true, data });
  } catch (error: any) {
    console.error("[api/khidi/visa/applications] POST exception:", error?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireVisaAuthenticatedUser(request);
    if (!authResult.success) return authResult.response;
    const { userId, isAdmin, isCoordinator } = authResult;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");
    const statusFilter = searchParams.get("status");

    let query = supabaseAdmin
      .from("visa_applications")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    // 권한별 범위 제한
    if (!isAdmin && !isCoordinator) {
      // 환자 — 본인 건만
      query = query.eq("patient_user_id", userId);
    }
    // admin / coordinator — 전체 조회 가능

    const { data, count, error } = await query;

    if (error) {
      console.error("[api/khidi/visa/applications] GET error:", error.message);
      return Response.json({ ok: false, error: "list_failed" }, { status: 500 });
    }

    // coordinator_notes_encrypted 는 코디 전용 내부 필드 — 목록 응답에서 제거(상세 API [id] 와 일관).
    // 환자도 본인 건을 목록 조회하므로 그대로 두면 코디 노트 암호문이 환자 브라우저로 나감.
    const rows = (data || []).map(({ coordinator_notes_encrypted: _drop, ...rest }) => rest);

    return Response.json({
      ok: true,
      data: rows,
      total: count,
      limit,
      offset,
      scope: isAdmin ? "admin" : isCoordinator ? "coordinator" : "patient",
    });
  } catch (error: any) {
    console.error("[api/khidi/visa/applications] GET exception:", error?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
