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
import { STT_ENGINES, normalizeSttEngine } from "@/lib/consultation/sttEngine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;

    const access = await resolveConsultationActor(request, consultationId);
    if (!access.success) return access.response;

    const payload = await request.json();
    // 실시간 통역(agents/live-translate)은 «번역된 자막»만 주고 원문을 안 준다.
    // 그래서 원문·번역 중 하나만 있어도 받는다 — 2026-08-28 이전엔 원문을 필수로 요구해
    // 통역봇 자막이 저장 자체를 못 했다(실측: 자막 3,553건 중 이 경로 0건).
    if (
      (!payload.originalText && !payload.translatedText) ||
      !payload.sourceLanguage ||
      !payload.targetLanguage
    ) {
      return Response.json(
        {
          ok: false,
          error: "originalText or translatedText, and sourceLanguage, targetLanguage are required",
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
          // 「누가 말했나」 — 이 경로(짧은 즉답 사전)에만 빠져 있었다(2026-08-07).
          // ⚠️ 평문 speaker_name 이 아니라 암호문 칸으로 넣는다(2026-08-14 감사) — 아래 스프레드에서.
          confidence: payload.confidence ?? null,
          // 「어느 받아쓰기가 만든 줄인가」 — 아는 값만 통과(모르는 값이 섞이면 이 칸으로
          // 재는 숫자가 통째로 못 쓰게 된다). 이 라우트는 맞장구 사전 경로가 기본.
          stt_engine: normalizeSttEngine(payload.sttEngine) ?? STT_ENGINES.BACKCHANNEL,
          // 「말한 시각」을 받는다. 안 주면 서버 시각(now)으로 남는데, 그러면 줄마다
          // «저장까지 걸린 시간»만큼 뒤로 밀려 회의록 순서가 어긋난다. 실시간 통역 줄은
          // 조각이 다 붙기를 기다렸다 저장하므로(최대 6초) 특히 크게 밀린다(2026-08-28).
          // ⚠️ 클라이언트 값이므로 그대로 믿지 않는다 — 지금 기준 ±10분을 벗어나면 버린다.
          ...(() => {
            const t = Date.parse(payload.spokenAt ?? "");
            const ok = Number.isFinite(t) && Math.abs(Date.now() - t) <= 10 * 60 * 1000;
            return ok ? { created_at: new Date(t).toISOString() } : {};
          })(),
          ...encryptTranscriptRow({
            sourceText: payload.originalText || null,
            translatedText: payload.translatedText || null,
            speakerName: String(payload.speakerName || "").trim().slice(0, 80) || null,
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
      data: { ...row, source_text: payload.originalText || null, translated_text: payload.translatedText || null },
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
      // 화면의 「번역 기록」은 확정 자막만 본다. 중간 자막(is_partial)은 같은 발화의
      // 앞토막이 여러 줄이라 섞으면 기록 패널이 같은 말로 도배된다 — DB 에는 남기되
      // (품질 측정용, 2026-09-01 PO 지시) 화면엔 안 올린다.
      .eq("is_partial", false)
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
