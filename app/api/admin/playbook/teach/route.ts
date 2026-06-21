/**
 * healwith: AI 가르치기 (Teach) API
 *
 * POST /api/admin/playbook/teach
 * - 관리자(PO)가 "이 질문엔 이렇게 답했어야 해"를 직접 입력 → 즉시 승인된 playbook 패턴으로
 *   저장하고 RAG에 ingest → AI가 다음부터 이 답변을 참고한다.
 * - PII는 sanitize로 제거. 의료 안전선은 답변 생성 시 시스템 프롬프트 가드가 최종 보장.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { sanitizeResponse, computeQualityScore } from "@/lib/playbook/sanitize";
import { ingestPatternToRag } from "@/lib/automation/postResolveWorker";

// 모든 가르친 패턴에 기본으로 박는 의료 안전 노트(시스템과 일관 — 환각/가격/순위/완치 단정 금지)
const DEFAULT_SAFETY_NOTES = [
  "This is not medical advice — licensed Korean doctors make the final decision.",
  "Do not confirm specific pricing — give ranges from verified data only.",
  "Do not rank or guarantee hospitals/doctors or outcomes.",
];

const SUPPORTED_LANGS = ["ko", "en", "ru", "kz", "zh", "ja"];

// 질문/답변 텍스트로 언어 간단 추정(RAG 검색이 언어로 필터하므로 맞춰 저장).
function detectLang(text: string): string {
  if (/[가-힣]/.test(text)) return "ko";
  if (/[Ѐ-ӿ]/.test(text)) return "ru"; // 키릴(러시아/카자흐 — ru로 통일 저장)
  if (/[぀-ヿ]/.test(text)) return "ja";
  if (/[一-鿿]/.test(text)) return "zh";
  return "en";
}

// 질문에서 트리거 키워드 추출(2자 이상, 최대 8개) — 검색/매칭 보조.
function extractKeywords(q: string): string[] {
  return Array.from(
    new Set(
      q
        .replace(/[?？！!。.,，:：;；~()[\]"'`]/g, " ")
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 2)
    )
  ).slice(0, 8);
}

export async function POST(request: NextRequest) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const question = String(body?.question ?? "").trim();
    const answerRaw = String(body?.answer ?? "").trim();
    const evaluationId = body?.evaluation_id ? String(body.evaluation_id) : null;
    const threadId = body?.thread_id ? String(body.thread_id) : null;

    if (!question || !answerRaw) {
      return Response.json({ ok: false, error: "question and answer are required" }, { status: 400 });
    }
    if (answerRaw.length > 2000) {
      return Response.json({ ok: false, error: "answer too long (max 2000)" }, { status: 400 });
    }

    // 언어: 클라이언트가 주면 우선, 아니면 답변에서 추정
    let language = String(body?.language ?? "").trim();
    if (!SUPPORTED_LANGS.includes(language)) language = detectLang(answerRaw);

    // PII 제거 + 정책 플래그 → 품질점수
    const { sanitized, flags } = sanitizeResponse(answerRaw);
    const qualityScore = computeQualityScore(flags);

    const userIntent = question.slice(0, 200);
    const trigger = { keywords: extractKeywords(question) };

    // 1) 승인된 패턴으로 즉시 저장 (관리자가 직접 가르친 것이므로 approved)
    const { data: pattern, error: insErr } = await (supabaseAdmin as any)
      .from("playbook_patterns")
      .insert({
        source_thread_id: threadId,
        language,
        scope: "general",
        trigger,
        user_intent: userIntent,
        key_questions: [],
        response_template: sanitized,
        safety_notes: DEFAULT_SAFETY_NOTES,
        quality_score: qualityScore,
        status: "approved",
        approved_at: new Date().toISOString(),
        auto_status: "none",
        is_active: true,
        metadata: {
          taught_by_admin: true,
          admin_email: auth.authResult.email ?? null,
          evaluation_id: evaluationId,
          sanitize_flags: flags,
        },
      })
      .select("id")
      .single();

    if (insErr || !pattern) {
      console.error("[teach] pattern insert failed:", insErr?.message);
      return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    // 2) RAG ingest → AI가 검색해서 참고
    const ingest = await ingestPatternToRag(pattern.id, {
      scope: "general",
      user_intent: userIntent,
      response_template: sanitized,
      key_questions: [],
      safety_notes: DEFAULT_SAFETY_NOTES,
      language,
    });

    if (!ingest.ok) {
      // 패턴은 남기되 RAG 미반영 표시(추후 재시도/수동 처리 가능)
      await (supabaseAdmin as any)
        .from("playbook_patterns")
        .update({ metadata: { taught_by_admin: true, ingest_failed: true, ingest_error: String(ingest.error).slice(0, 200) } })
        .eq("id", pattern.id);
      console.error("[teach] ingest failed:", ingest.error);
      return Response.json({ ok: false, error: "ingest_failed", pattern_id: pattern.id }, { status: 500 });
    }

    await (supabaseAdmin as any)
      .from("playbook_patterns")
      .update({ rag_document_id: ingest.doc_id })
      .eq("id", pattern.id);

    return Response.json({ ok: true, pattern_id: pattern.id, language, chunks: ingest.chunks });
  } catch (err: any) {
    console.error("[POST /api/admin/playbook/teach] Unexpected:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
