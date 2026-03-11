/**
 * HEALO AUTO-IMPROVEMENT: Auto-Improve Worker
 *
 * candidate 패턴 → LLM 개선 variant 생성 → safety check → 조건부 자동 승인 → AB 배정
 */

import "server-only";

import { supabaseAdmin } from "../rag/supabaseAdmin";
import { sanitizeResponse } from "../playbook/sanitize";
import { chunkText } from "../rag/chunker";
import { getEmbedding } from "../chat/generateReply";

const EMBEDDING_MODEL = "gemini-embedding-001";
const nowIso = () => new Date().toISOString();

const SAFETY_REQUIRED_PHRASES = [
  "not medical advice",
  "do not confirm specific pricing",
  "do not rank",
];

function safetyCheck(template: string, safetyNotes: string[]): { pass: boolean; errors: string[] } {
  const errors: string[] = [];
  const combined = (template + " " + safetyNotes.join(" ")).toLowerCase();

  const { flags } = sanitizeResponse(template);
  const piiFlags = flags.filter((f) => !f.startsWith("policy:"));
  if (piiFlags.length > 0) errors.push(`PII detected: ${piiFlags.join(", ")}`);

  if (safetyNotes.length < 2) errors.push("safety_notes must have at least 2 items");

  let missing = 0;
  for (const phrase of SAFETY_REQUIRED_PHRASES) {
    if (!combined.includes(phrase.toLowerCase())) missing++;
  }
  if (missing >= 2) errors.push(`Missing ${missing}/${SAFETY_REQUIRED_PHRASES.length} required safety phrases`);

  return { pass: errors.length === 0, errors };
}

function qualityGate(p: any): { pass: boolean; errors: string[] } {
  const errors: string[] = [];
  if ((p.quality_score ?? 0) < 70) errors.push(`quality_score ${p.quality_score} < 70`);
  if (!p.safety_notes?.length) errors.push("safety_notes is empty");
  if ((p.response_template?.length ?? 0) > 2000) errors.push("response_template > 2000 chars");
  if (!p.user_intent?.trim()) errors.push("user_intent is empty");
  if (!p.trigger || Object.keys(p.trigger).length === 0) errors.push("trigger is empty");
  return { pass: errors.length === 0, errors };
}

async function llmImprovePattern(pattern: any): Promise<{
  response_template: string;
  response_structure: any;
  safety_notes: string[];
  quality_score_est: number;
} | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are improving a medical tourism concierge playbook pattern.

Current pattern:
- User intent: ${pattern.user_intent}
- Scope: ${pattern.scope}
- Current response template: ${pattern.response_template?.slice(0, 800)}
- Current safety notes: ${JSON.stringify(pattern.safety_notes)}
- Current quality score: ${pattern.auto_score}/100 (needs improvement)

Problems to fix: The pattern has low usage rate or high handoff/fallback rate.

Generate an improved version as JSON:
{
  "response_template": "improved template text (max 1500 chars, must include disclaimers)",
  "response_structure": {
    "opening": "...",
    "disclaimers": ["This is not medical advice", "Final pricing depends on consultation"],
    "steps": ["step1", "step2", ...],
    "options": [{"name":"","when":"","notes":""}],
    "handoff_rule": {"when":"...","what_to_collect":["..."]},
    "closing": "..."
  },
  "safety_notes": ["Do not confirm specific pricing", "Do not rank hospitals or doctors", "Do not guarantee outcomes", ...],
  "quality_score_est": 85
}

Rules:
- MUST include "not medical advice" disclaimer
- MUST include "do not confirm specific pricing" in safety notes
- MUST include "do not rank" in safety notes
- No PII, no definitive claims
- Keep the same user_intent and scope`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 3000 },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    let jsonStr = text.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);
    return {
      response_template: String(parsed.response_template || "").slice(0, 2000),
      response_structure: parsed.response_structure || {},
      safety_notes: Array.isArray(parsed.safety_notes) ? parsed.safety_notes.map(String) : [],
      quality_score_est: Number(parsed.quality_score_est) || 70,
    };
  } catch (err) {
    console.error("[autoImprove] LLM error:", err);
    return null;
  }
}

async function approveAndIngest(patternId: string, pattern: any): Promise<{ ok: boolean; error?: string; chunks?: number; doc_id?: string }> {
  const title = `Playbook: ${pattern.treatment_slug || pattern.scope} | ${pattern.user_intent?.slice(0, 80)}`;
  const docContent = [
    pattern.response_template,
    "", "Key questions:",
    ...(pattern.key_questions || []).map((q: string) => `- ${q}`),
    "", "Safety notes:",
    ...(pattern.safety_notes || []).map((n: string) => `- ${n}`),
  ].join("\n");

  // Policy: 실패 시 삭제하지 않고 ingest_status='failed'로 남김 (감사/분석 가능)
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
        version: pattern.auto_version || 1,
        trust_tier: 2,
        source_label: "HEALO Playbook (Auto-Approved)",
        metadata: { ingest_status: "pending" },
        created_at: nowIso(),
        updated_at: nowIso(),
      })
      .select("id")
      .single();
    if (docErr) throw docErr;
    createdDocId = newDoc.id;

    const chunks = chunkText(docContent);
    const chunkIds: string[] = [];

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
        metadata: { source_type: "playbook_pattern", source_id: patternId, lang: pattern.language || "en", title, version: 1 },
      }));

      const { data: inserted, error: chunkErr } = await supabaseAdmin
        .from("rag_chunks").insert(payload).select("id");
      if (chunkErr) throw chunkErr;
      chunkIds.push(...(inserted || []).map((c: any) => c.id));
    }

    await supabaseAdmin
      .from("rag_documents")
      .update({ metadata: { ingest_status: "done" }, updated_at: nowIso() })
      .eq("id", newDoc.id);

    await supabaseAdmin
      .from("playbook_patterns")
      .update({ rag_document_id: newDoc.id, status: "approved", approved_at: nowIso(), updated_at: nowIso() })
      .eq("id", patternId);

    return { ok: true, chunks: chunks.length, doc_id: newDoc.id };
  } catch (err: any) {
    if (createdDocId) {
      try {
        await supabaseAdmin
          .from("rag_documents")
          .update({
            metadata: {
              ingest_status: "failed",
              ingest_error: String(err.message || "unknown").slice(0, 200),
              failed_at: nowIso(),
            },
            updated_at: nowIso(),
          })
          .eq("id", createdDocId);
      } catch (markErr: any) {
        console.error("[approveAndIngest] failed to mark doc as failed:", markErr.message);
      }
    }
    return { ok: false, error: err.message, doc_id: createdDocId || undefined };
  }
}

export async function runAutoImprove(jobId: string): Promise<{ processed: number; improved: number; blocked: number }> {
  const { data: candidates } = await supabaseAdmin
    .from("playbook_patterns")
    .select("*")
    .eq("auto_status", "candidate")
    .eq("is_active", true)
    .eq("status", "approved")
    .is("canonical_id", null)
    .order("auto_score", { ascending: true })
    .limit(10);

  let processed = 0, improved = 0, blocked = 0;

  for (const parent of candidates || []) {
    processed++;

    const llmResult = await llmImprovePattern(parent);
    if (!llmResult) {
      await supabaseAdmin.from("auto_job_events").insert({
        job_id: jobId, pattern_id: parent.id, action: "auto_improve",
        result: "skipped", detail: { reason: "LLM unavailable or failed" },
      });
      continue;
    }

    const { sanitized: cleanTemplate } = sanitizeResponse(llmResult.response_template);

    const variantData = {
      source_thread_id: parent.source_thread_id,
      source_message_ids: parent.source_message_ids || [],
      language: parent.language,
      scope: parent.scope,
      treatment_slug: parent.treatment_slug,
      country: parent.country,
      trigger: parent.trigger,
      user_intent: parent.user_intent,
      key_questions: parent.key_questions || [],
      response_structure: llmResult.response_structure,
      response_template: cleanTemplate,
      safety_notes: llmResult.safety_notes,
      quality_score: llmResult.quality_score_est,
      status: "draft" as const,
      auto_parent_id: parent.id,
      auto_version: (parent.auto_version || 1) + 1,
      auto_status: "drafted",
      metadata: { auto_generated: true, parent_auto_score: parent.auto_score },
    };

    const { data: variant, error: vErr } = await supabaseAdmin
      .from("playbook_patterns")
      .insert(variantData)
      .select("*")
      .single();

    if (vErr || !variant) {
      await supabaseAdmin.from("auto_job_events").insert({
        job_id: jobId, pattern_id: parent.id, action: "auto_improve",
        result: "insert_failed", detail: { error: vErr?.message },
      });
      continue;
    }

    const safety = safetyCheck(cleanTemplate, llmResult.safety_notes);
    const gate = qualityGate(variant);
    const autoScoreEst = llmResult.quality_score_est;
    const canAutoApprove = safety.pass && gate.pass && autoScoreEst >= 90;

    if (!canAutoApprove) {
      const rejectReason = [...safety.errors, ...gate.errors, autoScoreEst < 90 ? `score_est ${autoScoreEst} < 90` : ""].filter(Boolean).join("; ");
      await supabaseAdmin.from("playbook_patterns").update({
        auto_status: "blocked",
        reject_reason: rejectReason,
        quality_gate: { safety_pass: safety.pass, gate_pass: gate.pass, score_est: autoScoreEst, errors: [...safety.errors, ...gate.errors] },
        last_auto_action_at: nowIso(),
        updated_at: nowIso(),
      }).eq("id", variant.id);

      await supabaseAdmin.from("auto_job_events").insert({
        job_id: jobId, pattern_id: variant.id, action: "auto_improve",
        result: "blocked", detail: { parent_id: parent.id, safety, gate, score_est: autoScoreEst },
      });
      blocked++;
      continue;
    }

    const ingest = await approveAndIngest(variant.id, variant);
    if (!ingest.ok) {
      await supabaseAdmin.from("playbook_patterns").update({
        auto_status: "blocked",
        reject_reason: `ingest failed: ${String(ingest.error).slice(0, 200)}`,
        last_auto_action_at: nowIso(),
        updated_at: nowIso(),
      }).eq("id", variant.id);
      await supabaseAdmin.from("auto_job_events").insert({
        job_id: jobId, pattern_id: variant.id, action: "ingest_failed",
        result: "failed",
        detail: { parent_id: parent.id, doc_id: ingest.doc_id ?? null, error: String(ingest.error).slice(0, 300) },
      });
      blocked++;
      continue;
    }

    const splitPct = 20;
    await supabaseAdmin.from("playbook_patterns").update({
      auto_status: "ab_testing", ab_bucket: "variant", traffic_split: splitPct, last_auto_action_at: nowIso(), updated_at: nowIso(),
    }).eq("id", variant.id);

    await supabaseAdmin.from("playbook_patterns").update({
      auto_status: "ab_testing", ab_bucket: "control", traffic_split: splitPct, last_auto_action_at: nowIso(), updated_at: nowIso(),
    }).eq("id", parent.id);

    await supabaseAdmin.from("auto_job_events").insert({
      job_id: jobId, pattern_id: variant.id, action: "auto_improve",
      result: "auto_approved_ab_started",
      detail: { parent_id: parent.id, doc_id: ingest.doc_id, chunks: ingest.chunks, traffic_split: splitPct, score_est: autoScoreEst },
    });
    improved++;
  }

  return { processed, improved, blocked };
}
