/**
 * HEALO: Rebooking Create API
 *
 * POST /api/khidi/rebooking/create — 재예약 세션 생성
 * Body: { inquiryId, patientId, source, reason, sessionType?, daysFromNow?, parentConsultationId? }
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { defaultLimiter } from "@/lib/api/rateLimiter";
import { sanitizeString } from "@/lib/api/sanitize";
import { checkAdminAuth } from "@/lib/auth/checkAdminAuth";

export async function POST(request: NextRequest) {
  const limited = defaultLimiter.check(request);
  if (limited) return limited;

  // ── 인증 확인 ──────────────────────────────────────────────
  const auth = await checkAdminAuth(request);
  if (!auth.userId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const raw = await request.json();
    const payload = {
      ...raw,
      reason: sanitizeString(raw.reason, 1000),
    };

    // 재예약 대상: 문의(inquiry, bigint) 또는 환자계정(patient, uuid).
    // 과거엔 호출부가 inquiry_id 를 patientId 로 보내 uuid 컬럼에 bigint 를 넣어
    // insert 가 항상 실패했음 → 둘을 분리해 받는다.
    const inquiryIdRaw = payload.inquiryId ?? payload.inquiry_id;
    const inquiryId =
      inquiryIdRaw === undefined || inquiryIdRaw === null || inquiryIdRaw === ""
        ? null
        : Number(inquiryIdRaw);
    const patientIdRaw = payload.patientId ?? payload.patient_user_id ?? null;
    const isUuid =
      typeof patientIdRaw === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientIdRaw);
    const patientId = isUuid ? patientIdRaw : null;

    if ((inquiryId === null && !patientId) || !payload.source || !payload.reason) {
      return Response.json(
        { ok: false, error: "inquiry_or_patient_source_reason_required" },
        { status: 400 }
      );
    }
    if (inquiryId !== null && !Number.isFinite(inquiryId)) {
      return Response.json({ ok: false, error: "invalid_inquiryId" }, { status: 400 });
    }

    // ── IDOR 방지: 본인(환자계정) 또는 어드민/코디네이터만 재예약 생성 가능 ──
    if (!auth.isAdmin && patientId !== auth.userId) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const validSources = ['followup', 'symptom', 'doctor'];
    if (!validSources.includes(payload.source)) {
      return Response.json(
        { ok: false, error: "source must be 'followup', 'symptom', or 'doctor'" },
        { status: 400 }
      );
    }

    const sessionType = payload.sessionType || 'follow_up';
    const daysFromNow = payload.daysFromNow ?? 3;

    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + daysFromNow);
    scheduledAt.setHours(10, 0, 0, 0); // Default to 10:00 AM

    const { getSupabaseServerClient } = await import(
      "@/lib/data/supabaseServerClient"
    );
    const supabase = getSupabaseServerClient();

    const insertData: Record<string, any> = {
      inquiry_id: inquiryId,
      patient_id: patientId,
      session_type: sessionType,
      scheduled_at: scheduledAt.toISOString(),
      status: 'scheduled',
      livekit_room_name: `khidi-rebook-${uuidv4()}`,
      patient_language: payload.patientLanguage || 'ru',
      doctor_language: payload.doctorLanguage || 'ko',
      // rebooking_source / parent_consultation_id 컬럼은 스키마에 없으므로 메모에 기록.
      notes: `[Auto-rebooking · ${payload.source}] ${payload.reason}`,
    };

    const { data, error } = await supabase
      .from("consultation_sessions")
      .insert([insertData] as any)
      .select("id, patient_id, session_type, scheduled_at, status, created_at")
      .single();

    if (error) {
      console.error("[api/khidi/rebooking/create] Insert error:", error);
      return Response.json(
        { ok: false, error: "insert_failed" },
        { status: 500 }
      );
    }

    console.log(
      `[api/khidi/rebooking/create] Rebooking ${(data as any).id}: source=${payload.source}, ` +
      `type=${sessionType}, scheduled=${scheduledAt.toISOString()}`
    );

    return Response.json({
      ok: true,
      data,
    });
  } catch (error: any) {
    console.error("[api/khidi/rebooking/create] Exception:", error);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
