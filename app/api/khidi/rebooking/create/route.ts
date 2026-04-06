/**
 * HEALO: Rebooking Create API
 *
 * POST /api/khidi/rebooking/create — 재예약 세션 생성
 * Body: { inquiryId, patientId, source, reason, sessionType?, daysFromNow?, parentConsultationId? }
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { defaultLimiter } from "../../../../../src/lib/api/rateLimiter";
import { sanitizeString } from "../../../../../src/lib/api/sanitize";

export async function POST(request: NextRequest) {
  const limited = defaultLimiter.check(request);
  if (limited) return limited;

  try {
    const raw = await request.json();
    const payload = {
      ...raw,
      reason: sanitizeString(raw.reason, 1000),
    };

    if (!payload.patientId || !payload.source || !payload.reason) {
      return Response.json(
        { ok: false, error: "patientId, source, and reason are required" },
        { status: 400 }
      );
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
      "../../../../../src/lib/data/supabaseServerClient"
    );
    const supabase = getSupabaseServerClient();

    const insertData: Record<string, any> = {
      patient_id: payload.patientId,
      session_type: sessionType,
      scheduled_at: scheduledAt.toISOString(),
      status: 'scheduled',
      livekit_room_name: `khidi-rebook-${uuidv4()}`,
      patient_language: payload.patientLanguage || 'ru',
      doctor_language: payload.doctorLanguage || 'ko',
      rebooking_source: payload.source,
      parent_consultation_id: payload.parentConsultationId || null,
      notes: `[Auto-rebooking] ${payload.reason}`,
    };

    const { data, error } = await supabase
      .from("consultation_sessions")
      .insert([insertData])
      .select("id, patient_id, session_type, scheduled_at, status, rebooking_source, parent_consultation_id, created_at")
      .single();

    if (error) {
      console.error("[api/khidi/rebooking/create] Insert error:", error);
      return Response.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(
      `[api/khidi/rebooking/create] Rebooking ${data.id}: source=${payload.source}, ` +
      `type=${sessionType}, scheduled=${scheduledAt.toISOString()}`
    );

    return Response.json({
      ok: true,
      data,
    });
  } catch (error: any) {
    console.error("[api/khidi/rebooking/create] Exception:", error);
    return Response.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
