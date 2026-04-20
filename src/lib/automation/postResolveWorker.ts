/**
 * HEALO AUTO-IMPROVEMENT: Post-Resolve Worker
 *
 * 상담 종료(resolve) 후 자동 실행:
 * 1. 대화 메시지 조회
 * 2. extractPattern()으로 패턴 추출 (rule-based + LLM 고도화)
 * 3. playbook_patterns에 draft로 삽입
 * 4. 품질 게이트 통과 시 자동 승인 → RAG ingest
 *
 * fire-and-forget으로 호출되므로 실패해도 resolve 자체에 영향 없음.
 * 모든 과정은 auto_job_events에 기록.
 */

import "server-only";

import { supabaseAdmin } from "../rag/supabaseAdmin";
import { extractPattern, type PatternMessage, type PatternContext } from "../playbook/extractPattern";
import { chunkText } from "../rag/chunker";
import { getEmbedding } from "../chat/generateReply";

const EMBEDDING_MODEL = "gemini-embedding-001";
const nowIso = () => new Date().toISOString();

/** 품질 게이트: 자동 승인 가능 여부 판단 */
function canAutoApprove(pattern: {
  quality_score: number;
  safety_notes: string[];
  response_template: string;
  user_intent: string;
  trigger: Record<string, any>;
}): { pass: boolean; errors: string[] } {
  const errors: string[] = [];
  if (pattern.quality_score < 70) errors.push(`quality_score ${pattern.quality_score} < 70`);
  if (!pattern.safety_notes?.length) errors.push("safety_notes is empty");
  if ((pattern.response_template?.length ?? 0) > 2000) errors.push("response_template too long");
  if (!pattern.user_intent?.trim()) errors.push("user_intent is empty");
  if (!pattern.trigger || Object.keys(pattern.trigger).length === 0) errors.push("trigger is empty");

  // 자동 승인은 더 높은 기준 적용
  if (pattern.quality_score < 80) errors.push(`auto-approve requires quality_score >= 80, got ${pattern.quality_score}`);

  return { pass: errors.length === 0, errors };
}

/** RAG ingest: pattern → rag_documents + rag_chunks */
async function ingestPatternToRag(
  patternId: string,
  pattern: {
    treatment_slug?: string;
    scope: string;
    user_intent: string;
    response_template: string;
    key_questions: string[];
    safety_notes: string[];
    language?: string;
  }
): Promise<{ ok: boolean; doc_id?: string; chunks?: number; error?: string }> {
  const title = `Playbook: ${pattern.treatment_slug || pattern.scope} | ${pattern.user_intent.slice(0, 80)}`;
  const docContent = [
    pattern.response_template,
    "", "Key questions:",
    ...pattern.key_questions.map((q) => `- ${q}`),
    "", "Safety notes:",
    ...pattern.safety_notes.map((n) => `- ${n}`),
  ].join("\n");

  let createdDocId: string | null = null;

  try {
    const { data: newDoc, error: docErr } = await supabaseAdmin
      .from("rag_documents")
      .insert({
        source_type: "playbook_pattern",
        source_id: patternId,
        lang: pattern.language || "en",
        title,
        content: docContent,
        version: 1,
        trust_tier: 2,
        source_label: "HEALO Playbook (Auto-Extracted)",
        metadata: { ingest_status: "pending" },
        created_at: nowIso(),
        updated_at: nowIso(),
      })
      .select("id")
      .single();
    if (docErr) throw docErr;
    createdDocId = newDoc.id;

    const chunks = chunkText(docContent);
    if (chunks.length > 0) {
      const embeddings: number[][] = [];
      for (const chunk of chunks) {
        const vec = await getEmbedding(chunk.content);
        if (!vec) throw new Error("Embedding failed");
        embeddings.push(vec);
      }

      const payload = chunks.map((chunk: { index: number; content: string }, i: number) => ({
        document_id: newDoc.id,
        chunk_index: chunk.index,
        content: chunk.content,
        embedding: JSON.stringify(embeddings[i]),
        embedding_model: EMBEDDING_MODEL,
        embedded_at: nowIso(),
        metadata: {
          source_type: "playbook_pattern",
          source_id: patternId,
          lang: pattern.language || "en",
          title,
          version: 1,
        },
      }));

      const { error: chunkErr } = await supabaseAdmin
        .from("rag_chunks")
        .insert(payload);
      if (chunkErr) throw chunkErr;
    }

    await supabaseAdmin
      .from("rag_documents")
      .update({ metadata: { ingest_status: "done" }, updated_at: nowIso() })
      .eq("id", newDoc.id);

    return { ok: true, doc_id: newDoc.id, chunks: chunks.length };
  } catch (err: any) {
    if (createdDocId) {
      try {
        await supabaseAdmin
          .from("rag_documents")
          .update({
            metadata: { ingest_status: "failed", ingest_error: String(err.message).slice(0, 200), failed_at: nowIso() },
            updated_at: nowIso(),
          })
          .eq("id", createdDocId);
      } catch { /* best-effort */ }
    }
    return { ok: false, error: err.message, doc_id: createdDocId || undefined };
  }
}

/**
 * 상담 종료 후 자동 패턴 추출 파이프라인
 *
 * resolve route에서 fire-and-forget으로 호출.
 * 실패해도 상담 resolve 자체에는 영향 없음.
 */
export async function runPostResolve(threadId: string): Promise<{
  pattern_id?: string;
  auto_approved: boolean;
  rag_doc_id?: string;
  error?: string;
}> {
  const jobType = "post_resolve";

  // 1. auto_jobs에 기록
  const { data: jobRow, error: jobErr } = await supabaseAdmin
    .from("auto_jobs")
    .insert({ job_type: jobType, status: "running", started_at: nowIso(), stats: { thread_id: threadId } })
    .select("id")
    .single();

  if (jobErr || !jobRow) {
    console.error("[postResolve] Failed to create job:", jobErr?.message);
    return { auto_approved: false, error: jobErr?.message || "job creation failed" };
  }
  const jobId = jobRow.id;

  try {
    // 2. 메시지 조회
    const { data: messages, error: mErr } = await supabaseAdmin
      .from("chat_messages")
      .select("id, actor_type, message_text, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (mErr) throw mErr;
    if (!messages || messages.length < 2) {
      await supabaseAdmin
        .from("auto_jobs")
        .update({ status: "done", finished_at: nowIso(), stats: { thread_id: threadId, skipped: true, reason: "too few messages" } })
        .eq("id", jobId);
      return { auto_approved: false, error: "too few messages" };
    }

    // 3. thread 정보로 context 구성
    const { data: thread } = await supabaseAdmin
      .from("chat_threads")
      .select("normalized_inquiry_id, metadata")
      .eq("id", threadId)
      .single();

    let ctx: PatternContext = { language: "en" };
    if (thread?.normalized_inquiry_id) {
      const { data: ni } = await supabaseAdmin
        .from("normalized_inquiries")
        .select("language, country, treatment_slug")
        .eq("id", thread.normalized_inquiry_id)
        .single();
      if (ni) {
        ctx = {
          language: ni.language || "en",
          country: ni.country || undefined,
          treatment_slug: ni.treatment_slug || undefined,
        };
      }
    }

    // 4. 패턴 추출 (rule-based + LLM)
    const patternMessages: PatternMessage[] = messages.map((m: any) => ({
      id: m.id,
      actor_type: m.actor_type,
      message_text: m.message_text,
      created_at: m.created_at,
    }));

    const extracted = await extractPattern(patternMessages, ctx);

    // 5. 중복 체크: 같은 thread에서 이미 추출된 패턴 있는지
    const { data: existing } = await supabaseAdmin
      .from("playbook_patterns")
      .select("id")
      .eq("source_thread_id", threadId)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabaseAdmin
        .from("auto_jobs")
        .update({ status: "done", finished_at: nowIso(), stats: { thread_id: threadId, skipped: true, reason: "pattern already exists" } })
        .eq("id", jobId);
      return { pattern_id: existing[0].id, auto_approved: false, error: "pattern already exists for this thread" };
    }

    // 6. playbook_patterns에 삽입 (draft)
    // TODO(schema-drift): playbook_patterns 의 일부 컬럼 (source_thread_id 등) 이
    // 실제 스키마와 다를 수 있음. as any 로 캐스트.
    const { data: newPattern, error: pErr } = await supabaseAdmin
      .from("playbook_patterns")
      .insert({
        source_thread_id: threadId,
        source_message_ids: extracted.source_message_ids,
        language: ctx.language || "en",
        scope: extracted.scope,
        treatment_slug: extracted.treatment_slug,
        country: extracted.country,
        trigger: extracted.trigger,
        user_intent: extracted.user_intent,
        key_questions: extracted.key_questions,
        response_structure: extracted.response_structure,
        response_template: extracted.response_template,
        safety_notes: extracted.safety_notes,
        quality_score: extracted.quality_score,
        status: "draft",
        is_active: true,
        auto_status: "auto_extracted",
        metadata: { auto_extracted: true, job_id: jobId },
        created_at: nowIso(),
        updated_at: nowIso(),
      } as any)
      .select("id")
      .single();

    if (pErr || !newPattern) throw pErr || new Error("pattern insert failed");

    await supabaseAdmin.from("auto_job_events").insert({
      job_id: jobId,
      event_type: "auto_extract.extracted",
      step: "auto_extract",
      data: {
        pattern_id: newPattern.id,
        quality_score: extracted.quality_score,
        scope: extracted.scope,
        trigger_keys: Object.keys(extracted.trigger),
      } as any,
    });

    // 7. 품질 게이트 체크 → 자동 승인 여부
    const gate = canAutoApprove(extracted);

    if (!gate.pass) {
      // draft로 유지 — 관리자가 수동 승인할 수 있음
      await supabaseAdmin.from("auto_job_events").insert({
        job_id: jobId,
        event_type: "auto_approve_check.blocked",
        step: "auto_approve_check",
        data: { pattern_id: newPattern.id, errors: gate.errors } as any,
      });

      await supabaseAdmin
        .from("auto_jobs")
        .update({
          status: "done",
          finished_at: nowIso(),
          stats: { thread_id: threadId, pattern_id: newPattern.id, auto_approved: false, gate_errors: gate.errors },
        })
        .eq("id", jobId);

      return { pattern_id: newPattern.id, auto_approved: false };
    }

    // 8. 자동 승인 → RAG ingest
    const ingestResult = await ingestPatternToRag(newPattern.id, extracted as any);

    if (ingestResult.ok) {
      await supabaseAdmin
        .from("playbook_patterns")
        .update({
          status: "approved",
          approved_at: nowIso(),
          rag_document_id: ingestResult.doc_id,
          auto_status: "auto_approved",
          updated_at: nowIso(),
        } as any)
        .eq("id", newPattern.id);

      await supabaseAdmin.from("auto_job_events").insert({
        job_id: jobId,
        event_type: "auto_approve.approved_and_ingested",
        step: "auto_approve",
        data: { pattern_id: newPattern.id, doc_id: ingestResult.doc_id, chunks: ingestResult.chunks } as any,
      });
    } else {
      // ingest 실패 → draft로 유지
      await supabaseAdmin.from("auto_job_events").insert({
        job_id: jobId,
        event_type: "auto_approve.ingest_failed",
        step: "auto_approve",
        data: { pattern_id: newPattern.id, error: ingestResult.error } as any,
      });
    }

    await supabaseAdmin
      .from("auto_jobs")
      .update({
        status: "done",
        finished_at: nowIso(),
        stats: {
          thread_id: threadId,
          pattern_id: newPattern.id,
          auto_approved: ingestResult.ok,
          rag_doc_id: ingestResult.doc_id,
          chunks: ingestResult.chunks,
        },
      })
      .eq("id", jobId);

    return {
      pattern_id: newPattern.id,
      auto_approved: ingestResult.ok,
      rag_doc_id: ingestResult.doc_id,
    };
  } catch (err: any) {
    console.error("[postResolve] Error:", err.message);
    await supabaseAdmin
      .from("auto_jobs")
      .update({ status: "failed", finished_at: nowIso(), error: err.message })
      .eq("id", jobId);
    return { auto_approved: false, error: err.message };
  }
}
