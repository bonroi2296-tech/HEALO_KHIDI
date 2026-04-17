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
import { checkAdminAuth } from "../../../../../src/lib/auth/checkAdminAuth";

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

    if (!payload.patientId || !payload.source || !payload.reason) {
      return Response.json(
        { ok: false, error: "patientId, source, and reason are required" },
        { status: 400 }
      );
    }

    // ── IDOR 방지: 본인 또는 어드민/코디네이터만 재예약 생성 가능 ──
    if (!auth.isAdmin && payload.patientId !== auth.userId) {
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
        { ok: false, error: "insert_failed" },
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
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
