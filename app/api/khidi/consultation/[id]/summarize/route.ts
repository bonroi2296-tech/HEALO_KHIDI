/**
 * healwith: AI 상담 회의록(요약) 생성
 *
 * POST /api/khidi/consultation/[id]/summarize
 *   상담 중 쌓인 실시간 번역기록(consultation_translations)을 AI로 정리해
 *   "요약·결정사항·다음 단계" 구조의 회의록을 만들어 ai_summary(jsonb)에 저장.
 *
 * 권한: 해당 상담의 의사/코디네이터 또는 admin (resolveConsultationActor).
 *
 * 비용/프라이버시 주의:
 * - 환자-의사 대화(PII)가 입력으로 들어감. Gemini는 반드시 유료(빌링 사용설정) 티어여야
 *   데이터가 학습에 쓰이지 않음(무료 티어는 학습/사람검수 — 의료 PII 부적합).
 * - 원본 번역기록은 현재 평문 저장이므로 회의록도 ai_summary 평문 jsonb에 저장(일관).
 *   전체 파이프라인 암호화는 별도 보안 트랙.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { resolveConsultationActor } from "@/lib/auth/requireConsultationAccess";

// 입력 토큰 폭주 방지: 대화 원문 길이 상한(초과 시 뒤쪽=최근 발화 우선 보존)
const MAX_TRANSCRIPT_CHARS = 12000;

function speakerLabel(
  sourceLang: string | null,
  doctorLang: string | null,
  patientLang: string | null
): string {
  if (sourceLang && doctorLang && sourceLang === doctorLang) return "의사";
  if (sourceLang && patientLang && sourceLang === patientLang) return "환자";
  return sourceLang ? `발화(${sourceLang})` : "발화";
}

// 모델이 코드펜스(```json)로 감싸 보내도 안전하게 JSON만 추출
function parseJsonLoose(text: string): any | null {
  if (!text) return null;
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;

    const access = await resolveConsultationActor(request, consultationId, {
      requireRole: ["admin", "doctor", "coordinator"],
    });
    if (!access.success) return access.response;

    // Gemini 유료(빌링) 확인 전엔 비활성 — 환자 상담 PII가 무료티어(학습·검수 대상)로 가지 않게.
    // PO가 빌링 사용설정 후 Vercel env GEMINI_PII_BILLING_CONFIRMED=true 로 켠다(딸깍).
    if (process.env.GEMINI_PII_BILLING_CONFIRMED !== "true") {
      return Response.json({ ok: false, error: "billing_required" }, { status: 503 });
    }

    const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");

    // 1) 상담 언어 정보 (화자 추정용)
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from("consultation_sessions")
      .select("id, patient_language, doctor_language")
      .eq("id", consultationId)
      .single();

    if (sessionErr || !session) {
      return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // 2) 번역기록(대화) — 시간순
    const { data: rows, error: trErr } = await supabaseAdmin
      .from("consultation_translations")
      .select("source_lang, source_text, translated_text, created_at")
      .eq("session_id", consultationId)
      .order("created_at", { ascending: true });

    if (trErr) {
      console.error(
        `[consultation/${consultationId}/summarize] translations error:`,
        trErr.message
      );
      return Response.json({ ok: false, error: "fetch_failed" }, { status: 500 });
    }

    if (!rows || rows.length === 0) {
      // 대화 기록이 없으면 요약할 게 없음 (빈 회의록 만들지 않음)
      return Response.json({ ok: false, error: "no_transcript" }, { status: 422 });
    }

    // 3) 대화 텍스트 구성 (원문 기준 — Gemini가 다국어 이해)
    let transcript = rows
      .map((r: any) => {
        const who = speakerLabel(
          r.source_lang,
          session.doctor_language,
          session.patient_language
        );
        return `${who}: ${(r.source_text || "").trim()}`;
      })
      .filter((line: string) => line.length > 4)
      .join("\n");

    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
      transcript = transcript.slice(-MAX_TRANSCRIPT_CHARS);
    }

    // 4) Gemini 회의록 생성 (한국어 — 코디/평가 기록용)
    const prompt = `당신은 한국 병원의 원격 암 상담 회의록을 작성하는 의료 코디네이터입니다.
아래는 의사와 외국인 환자의 상담 대화(실시간 번역 기록)입니다.
이를 바탕으로 간결하고 정확한 회의록을 작성하세요. 대화에 없는 내용은 절대 지어내지 마세요.

반드시 아래 JSON 형식으로만 응답하세요(설명·코드펜스 없이):
{
  "summary": ["상담 핵심 요약 3~5줄(한국어)"],
  "decisions": ["상담에서 합의/결정된 사항(없으면 빈 배열)"],
  "next_steps": ["환자/의료진의 다음 행동·후속 조치(없으면 빈 배열)"],
  "patient_concerns": ["환자가 표현한 주요 우려·증상(없으면 빈 배열)"]
}

[상담 대화]
${transcript}`;

    let modelText = "";
    try {
      const { text } = await generateText({
        model: google("gemini-flash-latest") as any,
        prompt,
        temperature: 0.2,
      });
      modelText = text;
    } catch (aiErr: any) {
      console.error(
        `[consultation/${consultationId}/summarize] AI error:`,
        aiErr?.message
      );
      return Response.json({ ok: false, error: "ai_failed" }, { status: 502 });
    }

    const parsed = parseJsonLoose(modelText);
    if (!parsed) {
      console.error(
        `[consultation/${consultationId}/summarize] parse failed:`,
        modelText.slice(0, 200)
      );
      return Response.json({ ok: false, error: "ai_parse_failed" }, { status: 502 });
    }

    const aiSummary = {
      summary: Array.isArray(parsed.summary) ? parsed.summary : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      next_steps: Array.isArray(parsed.next_steps) ? parsed.next_steps : [],
      patient_concerns: Array.isArray(parsed.patient_concerns)
        ? parsed.patient_concerns
        : [],
      generated_at: new Date().toISOString(),
      model: "gemini-flash-latest",
      generated_by: access.role,
      source_lines: rows.length,
    };

    // 5) 저장 (ai_summary jsonb — 이미 존재하는 컬럼)
    const { error: saveErr } = await supabaseAdmin
      .from("consultation_sessions")
      .update({ ai_summary: aiSummary as any })
      .eq("id", consultationId);

    if (saveErr) {
      console.error(
        `[consultation/${consultationId}/summarize] save error:`,
        saveErr.message
      );
      return Response.json({ ok: false, error: "save_failed" }, { status: 500 });
    }

    console.log(
      `[consultation/${consultationId}/summarize] generated by ${access.role} (${rows.length} lines)`
    );

    return Response.json({ ok: true, data: aiSummary });
  } catch (error: any) {
    console.error("[consultation/summarize] exception:", error?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
