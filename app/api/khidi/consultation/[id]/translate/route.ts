/**
 * HEALO-KHIDI: Consultation Translation API
 *
 * POST /api/khidi/consultation/[id]/translate — Log a translation event
 * GET  /api/khidi/consultation/[id]/translate — Get translation logs
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const consultationId = parseInt(params.id);
    const payload = await request.json();

    // Validation
    if (
      !payload.originalText ||
      !payload.sourceLanguage ||
      !payload.targetLanguage
    ) {
      return Response.json(
        {
          ok: false,
          error: "originalText, sourceLanguage, and targetLanguage are required",
        },
        { status: 400 }
      );
    }

    const validLanguages = ["ru", "kz", "ko", "en"];
    if (
      !validLanguages.includes(payload.sourceLanguage) ||
      !validLanguages.includes(payload.targetLanguage)
    ) {
      return Response.json(
        { ok: false, error: "Invalid language codes" },
        { status: 400 }
      );
    }

    const validRoles = ["patient", "doctor", "coordinator"];
    if (
      payload.speakerRole &&
      !validRoles.includes(payload.speakerRole)
    ) {
      return Response.json(
        { ok: false, error: "Invalid speakerRole" },
        { status: 400 }
      );
    }

    const { getSupabaseServerClient } = await import(
      "../../../../../src/lib/data/supabaseServerClient"
    );
    const supabaseAdmin = getSupabaseServerClient();

    // Insert translation
    const { data, error } = await supabaseAdmin
      .from("consultation_translations")
      .insert([
        {
          consultation_id: consultationId,
          source_language: payload.sourceLanguage,
          target_language: payload.targetLanguage,
          original_text: payload.originalText,
          translated_text: payload.translatedText || null,
          speaker_role: payload.speakerRole || null,
          translation_confidence: payload.confidence || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[api/khidi/consultation/translate] Insert error:", error);
      return Response.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(
      `[api/khidi/consultation/${consultationId}/translate] New translation: ${payload.sourceLanguage} → ${payload.targetLanguage}`
    );

    return Response.json({
      ok: true,
      data,
    });
  } catch (error: any) {
    console.error("[api/khidi/consultation/translate] Exception:", error);
    return Response.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const consultationId = parseInt(params.id);

    const { getSupabaseServerClient } = await import(
      "../../../../../src/lib/data/supabaseServerClient"
    );
    const supabaseAdmin = getSupabaseServerClient();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const offset = parseInt(searchParams.get("offset") || "0");
    const sourceLanguage = searchParams.get("sourceLanguage");
    const targetLanguage = searchParams.get("targetLanguage");

    let query = supabaseAdmin
      .from("consultation_translations")
      .select("*", { count: "exact" })
      .eq("consultation_id", consultationId);

    if (sourceLanguage) {
      query = query.eq("source_language", sourceLanguage);
    }
    if (targetLanguage) {
      query = query.eq("target_language", targetLanguage);
    }

    const { data, count, error } = await query
      .order("timestamp", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[api/khidi/consultation/translate] GET error:", error);
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
    console.error("[api/khidi/consultation/translate] GET exception:", error);
    return Response.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
