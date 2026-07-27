/**
 * healwith: Consultation Translation Log API
 *
 * POST /api/khidi/consultation/[id]/translate — 번역 로그 기록 (참가자 only)
 * GET  /api/khidi/consultation/[id]/translate — 번역 로그 조회 (참가자 only)
 *
 * 변경 이력:
 * - 2026-04-17 (보안): 미인증 → requireConsultationAccess.
 *   schema 정합성 수정 (source_lang/target_lang/source_text 사용).
 */

export const runtime = "nodejs";

import { encryptTranscriptRow, decryptTranscriptRows } from "@/lib/consultation/transcriptCrypto";
import { NextRequest } from "next/server";
import { resolveConsultationActor } from "@/lib/auth/requireConsultationAccess";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;

    const access = await resolveConsultationActor(request, consultationId);
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

    const validLanguages = ["ru", "kz", "ko", "en", "zh", "ja"];
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

    // 대화 내용은 암호문으로만 저장한다(평문 컬럼 null).
    const { data, error } = await supabaseAdmin
      .from("consultation_translations")
      .insert([
        {
          session_id: consultationId,
          source_lang: payload.sourceLanguage,
          target_lang: payload.targetLanguage,
          confidence: payload.confidence ?? null,
          ...encryptTranscriptRow({
            sourceText: payload.originalText,
            translatedText: payload.translatedText || null,
          }),
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

    // GET 과 같은 규칙 — 암호문 컬럼은 응답에서 빼고, 평문은 방금 받은 값으로 되돌려준다.
    const row: any = { ...(data || {}) };
    delete row.source_text_encrypted;
    delete row.translated_text_encrypted;
    return Response.json({
      ok: true,
      data: { ...row, source_text: payload.originalText, translated_text: payload.translatedText || null },
    });
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

    const access = await resolveConsultationActor(request, consultationId);
    if (!access.success) return access.response;

    const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const offset = parseInt(searchParams.get("offset") || "0");

    // 최신 limit 건을 가져와 오래된 순으로 되돌려준다.
    // 예전엔 오래된 순 + range(0,199) 라, 한 통화가 200줄을 넘으면 그 뒤 자막이 조용히
    // 사라졌다(2026-07-27 실회의 551줄 — 13분 뒤부터 기록 패널이 갱신을 멈춤).
    const { data, count, error } = await supabaseAdmin
      .from("consultation_translations")
      .select("*", { count: "exact" })
      .eq("session_id", consultationId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[api/khidi/consultation/translate] GET error:", error.message);
      return Response.json(
        { ok: false, error: "fetch_failed" },
        { status: 500 }
      );
    }

    // 대화 내용을 평문화해서 내보내되, **암호문 컬럼 자체는 응답에서 제거**한다.
    // (select("*") 라 그냥 두면 암호문이 그대로 클라이언트로 나간다 — 쓸모도 없고 노출면만 넓힌다.)
    const rows = decryptTranscriptRows(data as any)
      .map((r: any) => {
        const out: any = { ...r };
        delete out.source_text_encrypted;
        delete out.translated_text_encrypted;
        return out;
      })
      .reverse(); // 화면은 오래된 순으로 읽는다

    return Response.json({
      ok: true,
      data: rows,
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
