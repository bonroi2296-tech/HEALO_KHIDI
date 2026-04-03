/**
 * HEALO-KHIDI: Cancer Patient Intake API
 *
 * POST /api/khidi/intake — 암환자 초기 상담 양식 제출
 * GET  /api/khidi/intake — 인테이크 목록 조회 (admin only)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Validation
    if (!payload.cancer_type) {
      return Response.json(
        { ok: false, error: "cancer_type is required" },
        { status: 400 }
      );
    }

    const validCancerTypes = ['stomach', 'liver', 'lung', 'breast', 'thyroid', 'other'];
    if (!validCancerTypes.includes(payload.cancer_type)) {
      return Response.json(
        { ok: false, error: "Invalid cancer_type" },
        { status: 400 }
      );
    }

    const { getSupabaseServerClient } = await import("../../../../src/lib/data/supabaseServerClient");
    const supabaseAdmin = getSupabaseServerClient();

    // Insert into cancer_patient_intakes
    const insertData: Record<string, any> = {
      cancer_type: payload.cancer_type,
      cancer_stage: payload.cancer_stage || null,
      diagnosis_date: payload.diagnosis_date || null,
      current_treatment: payload.current_treatment || null,
      preferred_hospitals: payload.preferred_hospitals || [],
      budget_range: payload.budget_range || null,
      travel_dates: payload.travel_dates || null,
      language_preference: payload.language_preference || 'ru',
    };

    const { data, error } = await supabaseAdmin
      .from("cancer_patient_intakes")
      .insert([insertData])
      .select("id, cancer_type, cancer_stage, language_preference, created_at")
      .single();

    if (error) {
      console.error("[api/khidi/intake] Insert error:", error);
      return Response.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(`[api/khidi/intake] New intake: ${data.id} (${data.cancer_type})`);

    return Response.json({
      ok: true,
      data: {
        id: data.id,
        cancer_type: data.cancer_type,
        cancer_stage: data.cancer_stage,
        language_preference: data.language_preference,
        created_at: data.created_at,
      },
    });
  } catch (error: any) {
    console.error("[api/khidi/intake] Exception:", error);
    return Response.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Admin auth check
    const { checkAdminAuth } = await import("../../../../src/lib/auth/checkAdminAuth");
    const authResult = await checkAdminAuth(request);

    if (!authResult.isAdmin) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 403 }
      );
    }

    const { getSupabaseServerClient } = await import("../../../../src/lib/data/supabaseServerClient");
    const supabaseAdmin = getSupabaseServerClient();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data, count, error } = await supabaseAdmin
      .from("cancer_patient_intakes")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[api/khidi/intake] GET error:", error);
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
    console.error("[api/khidi/intake] GET exception:", error);
    return Response.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
