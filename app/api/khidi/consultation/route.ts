/**
 * HEALO-KHIDI: Consultation Session API
 *
 * POST /api/khidi/consultation — Create/schedule a consultation session
 * GET  /api/khidi/consultation — List consultations (filtered by role)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { AccessToken } from "livekit-server-sdk";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Validation
    const requiredFields = ["patientId", "sessionType", "scheduledAt"];
    for (const field of requiredFields) {
      if (payload[field] === undefined || payload[field] === null) {
        return Response.json(
          { ok: false, error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    const validSessionTypes = [
      "pre_consultation",
      "follow_up",
      "emergency",
      "diagnostic",
    ];
    if (!validSessionTypes.includes(payload.sessionType)) {
      return Response.json(
        { ok: false, error: "Invalid sessionType" },
        { status: 400 }
      );
    }

    const validLanguages = ["ru", "kz", "en"];
    if (
      payload.patientLanguage &&
      !validLanguages.includes(payload.patientLanguage)
    ) {
      return Response.json(
        { ok: false, error: "Invalid patientLanguage" },
        { status: 400 }
      );
    }

    const { getSupabaseServerClient } = await import(
      "../../../../src/lib/data/supabaseServerClient"
    );
    const supabaseAdmin = getSupabaseServerClient();

    // Generate room name and LiveKit tokens
    const liveroomName = `khidi-${uuidv4()}`;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    let tokenPatient = "";
    let tokenDoctor = "";

    if (apiKey && apiSecret) {
      const patientToken = new AccessToken(apiKey, apiSecret, {
        identity: `patient-${payload.patientId}`,
        name: "Patient",
        metadata: JSON.stringify({ role: "patient" }),
      });
      patientToken.addGrant({ room: liveroomName, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });
      tokenPatient = await patientToken.toJwt();

      const doctorToken = new AccessToken(apiKey, apiSecret, {
        identity: `doctor-${payload.doctorId || "unassigned"}`,
        name: "Doctor",
        metadata: JSON.stringify({ role: "doctor" }),
      });
      doctorToken.addGrant({ room: liveroomName, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });
      tokenDoctor = await doctorToken.toJwt();
    }

    // Insert into consultation_sessions
    const insertData: Record<string, any> = {
      patient_id: payload.patientId,
      doctor_id: payload.doctorId || null,
      coordinator_id: payload.coordinatorId || null,
      translator_id: payload.translatorId || null,
      session_type: payload.sessionType,
      scheduled_at: payload.scheduledAt,
      patient_language: payload.patientLanguage || "ru",
      doctor_language: payload.doctorLanguage || "ko",
      status: "scheduled",
      livekit_room_name: liveroomName,
      livekit_token_patient: tokenPatient || null,
      livekit_token_doctor: tokenDoctor || null,
      notes: payload.notes || null,
    };

    const { data, error } = await supabaseAdmin
      .from("consultation_sessions")
      .insert([insertData])
      .select(
        "id, patient_id, session_type, scheduled_at, status, livekit_room_name, created_at"
      )
      .single();

    if (error) {
      console.error("[api/khidi/consultation] Insert error:", error);
      return Response.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(`[api/khidi/consultation] New session: ${data.id} (${data.session_type})`);

    return Response.json({
      ok: true,
      data: {
        id: data.id,
        patient_id: data.patient_id,
        session_type: data.session_type,
        scheduled_at: data.scheduled_at,
        status: data.status,
        livekit_room_name: data.livekit_room_name,
        created_at: data.created_at,
      },
    });
  } catch (error: any) {
    console.error("[api/khidi/consultation] Exception:", error);
    return Response.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { getSupabaseServerClient } = await import(
      "../../../../src/lib/data/supabaseServerClient"
    );
    const supabaseAdmin = getSupabaseServerClient();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status"); // 'scheduled', 'active', 'completed'
    const patientId = searchParams.get("patientId");
    const doctorId = searchParams.get("doctorId");

    let query = supabaseAdmin
      .from("consultation_sessions")
      .select(
        `
        id,
        patient_id,
        doctor_id,
        coordinator_id,
        session_type,
        scheduled_at,
        started_at,
        ended_at,
        status,
        patient_language,
        livekit_room_name,
        created_at,
        cancer_patient_intakes(id, cancer_type, cancer_stage, first_name)
      `,
        { count: "exact" }
      );

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }
    if (patientId) {
      query = query.eq("patient_id", patientId);
    }
    if (doctorId) {
      query = query.eq("doctor_id", doctorId);
    }

    const { data, count, error } = await query
      .order("scheduled_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[api/khidi/consultation] GET error:", error);
      return Response.json(
        { ok: false, error: error.message },
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
    console.error("[api/khidi/consultation] GET exception:", error);
    return Response.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
