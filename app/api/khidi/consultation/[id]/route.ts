/**
 * HEALO-KHIDI: Consultation Session Detail API
 *
 * GET  /api/khidi/consultation/[id] — Get consultation details
 * PATCH /api/khidi/consultation/[id] — Update consultation status/info
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const consultationId = parseInt(params.id);

    const { getSupabaseServerClient } = await import(
      "../../../../src/lib/data/supabaseServerClient"
    );
    const supabaseAdmin = getSupabaseServerClient();

    const { data, error } = await supabaseAdmin
      .from("consultation_sessions")
      .select(
        `
        id,
        patient_id,
        doctor_id,
        coordinator_id,
        translator_id,
        session_type,
        scheduled_at,
        started_at,
        ended_at,
        duration_minutes,
        status,
        patient_language,
        doctor_language,
        livekit_room_name,
        notes,
        clinical_summary,
        recommendations,
        created_at,
        updated_at,
        cancer_patient_intakes(id, cancer_type, cancer_stage, first_name)
      `
      )
      .eq("id", consultationId)
      .single();

    if (error) {
      console.error(
        `[api/khidi/consultation/${consultationId}] GET error:`,
        error
      );
      return Response.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return Response.json(
        { ok: false, error: "Consultation not found" },
        { status: 404 }
      );
    }

    return Response.json({
      ok: true,
      data,
    });
  } catch (error: any) {
    console.error("[api/khidi/consultation] GET exception:", error);
    return Response.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const consultationId = parseInt(params.id);
    const payload = await request.json();

    // Validate status if provided
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

    const { getSupabaseServerClient } = await import(
      "../../../../src/lib/data/supabaseServerClient"
    );
    const supabaseAdmin = getSupabaseServerClient();

    // Build update object
    const updateData: Record<string, any> = {};

    if (payload.status) updateData.status = payload.status;
    if (payload.startedAt) updateData.started_at = payload.startedAt;
    if (payload.endedAt) updateData.ended_at = payload.endedAt;
    if (payload.durationMinutes)
      updateData.duration_minutes = payload.durationMinutes;
    if (payload.notes) updateData.notes = payload.notes;
    if (payload.clinicalSummary)
      updateData.clinical_summary = payload.clinicalSummary;
    if (payload.recommendations)
      updateData.recommendations = payload.recommendations;
    if (payload.doctorId) updateData.doctor_id = payload.doctorId;
    if (payload.translatorId)
      updateData.translator_id = payload.translatorId;

    const { data, error } = await supabaseAdmin
      .from("consultation_sessions")
      .update(updateData)
      .eq("id", consultationId)
      .select()
      .single();

    if (error) {
      console.error(
        `[api/khidi/consultation/${consultationId}] PATCH error:`,
        error
      );
      return Response.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(
      `[api/khidi/consultation/${consultationId}] Updated:`,
      Object.keys(updateData).join(", ")
    );

    return Response.json({
      ok: true,
      data,
    });
  } catch (error: any) {
    console.error("[api/khidi/consultation] PATCH exception:", error);
    return Response.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
