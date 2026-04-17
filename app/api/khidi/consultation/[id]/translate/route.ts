/**
 * HEALO-KHIDI: Consultation Translation Log API
 *
 * POST /api/khidi/consultation/[id]/translate — 번역 로그 기록 (참가자 only)
 * GET  /api/khidi/consultation/[id]/translate — 번역 로그 조회 (참가자 only)
 *
 * 변경 이력:
 * - 2026-04-17 (보안): 미인증 → requireConsultationAccess.
 *   schema 정합성 수정 (source_lang/target_lang/source_text 사용).
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireConsultationAccess } from "@/lib/auth/requireConsultationAccess";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;

    const access = await requireConsultationAccess(request, consultationId);
    if (!access.success) return access.response;

    const payload = await request.json();
    if (!payload.originalText || !payload.sourceLanguage || !payload.targetLanguage) {
      return Response.json(
        {
          ok: false,
          error: "originalText, sourceLanguage, targetLanguage are required",
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

    const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");

    const { data, error } = await supabaseAdmin
      .from("consultation_translations")
      .insert([
        {
          session_id: consultationId,
          source_lang: payload.sourceLanguage,
          target_lang: payload.targetLanguage,
          source_text: payload.originalText,
          translated_text: payload.translatedText || null,
          confidence: payload.confidence ?? null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[api/khidi/consultation/translate] Insert error:", error.message);
      return Response.json(
        { ok: false, error: "insert_failed" },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, data });
  } catch (error: any) {
    console.error("[api/khidi/consultation/translate] Exception:", error?.message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;

    const access = await requireConsultationAccess(request, consultationId);
    if (!access.success) return access.response;

    const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data, count, error } = await supabaseAdmin
      .from("consultation_translations")
      .select("*", { count: "exact" })
      .eq("session_id", consultationId)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[api/khidi/consultation/translate] GET error:", error.message);
      return Response.json(
        { ok: false, error: "fetch_failed" },
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
    console.error("[api/khidi/consultation/translate] GET exception:", error?.message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
