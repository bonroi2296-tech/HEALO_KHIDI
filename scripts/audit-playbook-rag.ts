/**
 * playbook_patterns ↔ rag_documents/rag_chunks 정합성 일괄 점검
 * 출력: JSON + 콘솔 표. --fix --apply --dry-run=false 시 선택적 백필/차단.
 *
 * 사용:
 *   npm run audit:playbook-rag              # 리포트만
 *   npm run audit:playbook-rag -- --fix --apply --dry-run=false   # 실제 적용
 * 기본: --fix=false (리포트만), --dry-run=true (실제 변경 없음).
 * 실제 DB 변경은 --fix --apply --dry-run=false 모두 필요.
 */

import dotenv from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

// ---------------------------------------------------------------------------
// Env + Supabase (script 전용, server-only 미사용)
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required (e.g. .env.local)");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ---------------------------------------------------------------------------
// Embedding (로컬 호출, approve 경로와 동일 로직)
// ---------------------------------------------------------------------------
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMS = 768;

async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          taskType: "RETRIEVAL_QUERY",
          outputDimensionality: EMBEDDING_DIMS,
        }),
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.embedding?.values ?? null;
  } catch {
    return null;
  }
}

// Chunker (간단 복제로 의존성 최소화)
function chunkText(text: string, maxLength = 800): { index: number; content: string }[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks: { index: number; content: string }[] = [];
  let current = "";
  let index = 0;
  const push = (s: string) => {
    const t = s.trim();
    if (t) {
      chunks.push({ index, content: t });
      index++;
    }
  };
  for (const s of sentences) {
    if (s.length > maxLength) {
      if (current) {
        push(current);
        current = "";
      }
      for (let i = 0; i < s.length; i += maxLength) push(s.slice(i, i + maxLength));
    } else {
      const next = current ? `${current} ${s}` : s;
      if (next.length >= maxLength) {
        push(next);
        current = "";
      } else {
        current = next;
      }
    }
  }
  if (current) push(current);
  return chunks;
}

const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Audit: A ~ E
// ---------------------------------------------------------------------------
type AuditRow = { id: string; [k: string]: unknown };

async function runAudit(supabase: SupabaseClient) {
  const out: {
    A_approved_null_rag_doc: AuditRow[];
    B_approved_doc_not_done: AuditRow[];
    C_not_approved_but_trust_tier2: AuditRow[];
    D_rag_doc_orphan_or_inactive: AuditRow[];
    E_rag_doc_zero_chunks: AuditRow[];
  } = {
    A_approved_null_rag_doc: [],
    B_approved_doc_not_done: [],
    C_not_approved_but_trust_tier2: [],
    D_rag_doc_orphan_or_inactive: [],
    E_rag_doc_zero_chunks: [],
  };

  // A: approved playbook인데 rag_document_id가 NULL
  const { data: a } = await supabase
    .from("playbook_patterns")
    .select("id, status, is_active, rag_document_id, language, user_intent")
    .eq("status", "approved")
    .is("rag_document_id", null);
  out.A_approved_null_rag_doc = (a || []).map((r) => ({
    id: r.id,
    status: r.status,
    is_active: r.is_active,
    rag_document_id: r.rag_document_id,
    language: r.language,
    user_intent: (r.user_intent || "").slice(0, 60),
  }));

  // B: approved playbook인데 연결된 rag_document의 ingest_status가 pending/failed 인 경우만 문제.
  // NULL은 정상 회수 대상이므로 audit 대상에서 제외 (RPC는 ingest_status IS NULL OR 'done' 인 문서를 정상 처리).
  const { data: approvedWithDoc } = await supabase
    .from("playbook_patterns")
    .select("id, rag_document_id, status")
    .eq("status", "approved")
    .not("rag_document_id", "is", null);
  for (const p of approvedWithDoc || []) {
    const { data: doc } = await supabase
      .from("rag_documents")
      .select("id, metadata, source_id")
      .eq("id", p.rag_document_id)
      .single();
    if (!doc) continue;
    const status = (doc.metadata as Record<string, string> | null)?.ingest_status ?? null;
    if (status === "pending" || status === "failed") {
      out.B_approved_doc_not_done.push({
        id: p.id,
        rag_document_id: doc.id,
        ingest_status: status,
      });
    }
  }

  // C: playbook.status != approved (또는 is_active=false)인데 rag_documents가 trust_tier=2로 남아있는 건
  const { data: docsTier2 } = await supabase
    .from("rag_documents")
    .select("id, source_id, trust_tier")
    .eq("source_type", "playbook_pattern")
    .eq("trust_tier", 2);
  for (const d of docsTier2 || []) {
    const patternId = d.source_id;
    const { data: pp } = await supabase
      .from("playbook_patterns")
      .select("id, status, is_active")
      .eq("id", patternId)
      .single();
    if (!pp) continue;
    const isApproved = pp.status === "approved" && pp.is_active !== false;
    if (!isApproved) {
      out.C_not_approved_but_trust_tier2.push({
        id: d.id,
        source_id: patternId,
        pattern_status: pp.status,
        is_active: pp.is_active,
        trust_tier: d.trust_tier,
      });
    }
  }

  // D: rag_documents.source_type='playbook_pattern'인데 원본 없거나 merged/retired/blocked
  const { data: playbookDocs } = await supabase
    .from("rag_documents")
    .select("id, source_id, trust_tier, metadata")
    .eq("source_type", "playbook_pattern");
  for (const d of playbookDocs || []) {
    const { data: pp } = await supabase
      .from("playbook_patterns")
      .select("id, status, is_active, merged_at, canonical_id")
      .eq("id", d.source_id)
      .maybeSingle();
    const noPattern = !pp;
    const inactive = pp && (pp.is_active === false || pp.status !== "approved" || pp.merged_at != null || pp.canonical_id != null);
    if (noPattern || inactive) {
      out.D_rag_doc_orphan_or_inactive.push({
        id: d.id,
        source_id: d.source_id,
        no_pattern: noPattern,
        pattern_status: pp?.status,
        is_active: pp?.is_active,
        merged_at: pp?.merged_at,
      });
    }
  }

  // E: rag_chunks가 0개인 rag_document
  const { data: allDocs } = await supabase.from("rag_documents").select("id, source_type, source_id");
  for (const d of allDocs || []) {
    const { count } = await supabase
      .from("rag_chunks")
      .select("id", { count: "exact", head: true })
      .eq("document_id", d.id);
    if ((count ?? 0) === 0) {
      (out.E_rag_doc_zero_chunks as AuditRow[]).push({
        id: d.id,
        source_type: d.source_type,
        source_id: d.source_id,
        chunk_count: 0,
      });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Fix: C,D = 차단 (expires_at=now 또는 metadata.ingest_status='failed')
//       A,B,E = 재생성 (doc+chunks+embedding, pattern.rag_document_id 갱신)
// ---------------------------------------------------------------------------
async function applyFix(
  supabase: SupabaseClient,
  report: Awaited<ReturnType<typeof runAudit>>,
  opts: { dryRun: boolean }
): Promise<{ fixed: string[]; errors: string[] }> {
  const fixed: string[] = [];
  const errors: string[] = [];
  const dry = opts.dryRun;

  // C, D: rag_documents 차단
  const toBlock = [
    ...report.C_not_approved_but_trust_tier2.map((r) => r.id as string),
    ...report.D_rag_doc_orphan_or_inactive.map((r) => r.id as string),
  ];
  const blockIds = [...new Set(toBlock)];
  for (const docId of blockIds) {
    if (dry) {
      fixed.push(`[dry-run] would block rag_document ${docId}`);
      continue;
    }
    const { data: cur } = await supabase.from("rag_documents").select("metadata").eq("id", docId).single();
    const meta = (cur?.metadata as Record<string, unknown>) || {};
    const { error } = await supabase
      .from("rag_documents")
      .update({
        expires_at: nowIso(),
        metadata: { ...meta, ingest_status: "failed", audit_blocked_at: nowIso() },
        updated_at: nowIso(),
      })
      .eq("id", docId);
    if (error) errors.push(`block ${docId}: ${error.message}`);
    else fixed.push(`blocked rag_document ${docId}`);
  }

  // A, B, E: 재생성 (embedding 필요)
  const hasKey = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const patternIdsToIngest = new Set<string>();
  for (const r of report.A_approved_null_rag_doc) patternIdsToIngest.add(r.id as string);
  for (const r of report.B_approved_doc_not_done) patternIdsToIngest.add(r.id as string);
  for (const r of report.E_rag_doc_zero_chunks) {
    if (r.source_type === "playbook_pattern" && r.source_id) patternIdsToIngest.add(r.source_id as string);
  }

  for (const patternId of patternIdsToIngest) {
    const { data: pattern, error: pe } = await supabase
      .from("playbook_patterns")
      .select("*")
      .eq("id", patternId)
      .single();
    if (pe || !pattern) {
      errors.push(`pattern ${patternId} not found`);
      continue;
    }
    if (pattern.status !== "approved" || pattern.is_active === false) {
      errors.push(`pattern ${patternId} not approved/active, skip ingest`);
      continue;
    }
    if (!hasKey) {
      errors.push("GOOGLE_GENERATIVE_AI_API_KEY missing, skip A/B/E backfill");
      break;
    }

    const title = `Playbook: ${pattern.treatment_slug || pattern.scope} | ${(pattern.user_intent || "").slice(0, 80)}`;
    const docContent = [
      pattern.response_template,
      "",
      "Key questions:",
      ...(pattern.key_questions || []).map((q: string) => `- ${q}`),
      "",
      "Safety notes:",
      ...(pattern.safety_notes || []).map((n: string) => `- ${n}`),
    ].join("\n");

    let ragDocId = pattern.rag_document_id as string | null;
    const existingDoc = ragDocId ? await supabase.from("rag_documents").select("id, content").eq("id", ragDocId).single() : null;

    if (ragDocId && existingDoc?.data) {
      if (!dry) {
        await supabase.from("rag_chunks").delete().eq("document_id", ragDocId);
        await supabase
          .from("rag_documents")
          .update({
            title,
            content: docContent,
            trust_tier: 2,
            metadata: { ingest_status: "pending" },
            updated_at: nowIso(),
          })
          .eq("id", ragDocId);
      }
    } else {
      if (dry) {
        fixed.push(`[dry-run] would create rag_document for pattern ${patternId}`);
        continue;
      }
      const { data: newDoc, error: docErr } = await supabase
        .from("rag_documents")
        .insert({
          source_type: "playbook_pattern",
          source_id: patternId,
          lang: pattern.language || "en",
          title,
          content: docContent,
          version: 1,
          trust_tier: 2,
          source_label: "HEALO Playbook (Approved)",
          metadata: { ingest_status: "pending" },
          created_at: nowIso(),
          updated_at: nowIso(),
        })
        .select("id")
        .single();
      if (docErr) {
        errors.push(`insert doc ${patternId}: ${docErr.message}`);
        continue;
      }
      ragDocId = newDoc.id;
    }

    const chunks = chunkText(docContent);
    if (chunks.length === 0) {
      await supabase
        .from("rag_documents")
        .update({ metadata: { ingest_status: "done" }, updated_at: nowIso() })
        .eq("id", ragDocId);
      await supabase
        .from("playbook_patterns")
        .update({ rag_document_id: ragDocId, updated_at: nowIso() })
        .eq("id", patternId);
      fixed.push(`pattern ${patternId} doc ${ragDocId} (0 chunks)`);
      continue;
    }

    const embeddings: number[][] = [];
    for (const ch of chunks) {
      const vec = await getEmbedding(ch.content);
      if (!vec) {
        errors.push(`embedding failed pattern ${patternId}`);
        await supabase
          .from("rag_documents")
          .update({
            metadata: { ingest_status: "failed", ingest_error: "embedding_failed" },
            updated_at: nowIso(),
          })
          .eq("id", ragDocId);
        break;
      }
      embeddings.push(vec);
    }
    if (embeddings.length !== chunks.length) continue;

    const payload = chunks.map((ch: { index: number; content: string }, i: number) => ({
      document_id: ragDocId,
      chunk_index: ch.index,
      content: ch.content,
      embedding: JSON.stringify(embeddings[i]),
      // 모델·시각 부기정보는 rag_chunks 에 전용 칸이 없어 metadata 로 보관한다(ingest.ts 와 같은 처방).
      // ⚠️ scripts/ 는 tsconfig 에서 제외돼 타입검사가 아예 안 돈다 — 손으로 확인해야 한다.
      metadata: {
        source_type: "playbook_pattern",
        source_id: patternId,
        lang: pattern.language || "en",
        title,
        version: 1,
        embedding_model: EMBEDDING_MODEL,
        embedded_at: nowIso(),
      },
    }));

    const { error: chunkErr } = await supabase.from("rag_chunks").insert(payload);
    if (chunkErr) {
      errors.push(`chunks ${patternId}: ${chunkErr.message}`);
      continue;
    }
    await supabase
      .from("rag_documents")
      .update({ metadata: { ingest_status: "done" }, updated_at: nowIso() })
      .eq("id", ragDocId);
    await supabase
      .from("playbook_patterns")
      .update({ rag_document_id: ragDocId, updated_at: nowIso() })
      .eq("id", patternId);
    fixed.push(`pattern ${patternId} doc ${ragDocId} chunks ${chunks.length}`);
  }

  return { fixed, errors };
}

// ---------------------------------------------------------------------------
// Unblock: audit_blocked_at 이 있는 문서 복구 (expires_at=null, ingest_status=done, audit_blocked_at 제거)
// --unblock 은 --apply 와 함께 쓸 때만 동작.
// ---------------------------------------------------------------------------
async function applyUnblock(
  supabase: SupabaseClient,
  opts: { dryRun: boolean }
): Promise<{ unblocked_count: number; errors: string[] }> {
  const errors: string[] = [];
  const dry = opts.dryRun;

  const { data: candidates } = await supabase
    .from("rag_documents")
    .select("id, metadata")
    .eq("source_type", "playbook_pattern");
  const ids = (candidates || [])
    .filter((r) => (r.metadata as Record<string, unknown>)?.audit_blocked_at != null)
    .map((r) => r.id);

  if (ids.length === 0) {
    return { unblocked_count: 0, errors: [] };
  }

  let unblocked_count = 0;
  for (const docId of ids) {
    if (dry) {
      unblocked_count++;
      continue;
    }
    const { data: cur } = await supabase.from("rag_documents").select("metadata").eq("id", docId).single();
    const meta = (cur?.metadata as Record<string, unknown>) || {};
    const { audit_blocked_at: _, ...rest } = meta;
    const newMeta = { ...rest, ingest_status: "done" as const };
    const { error } = await supabase
      .from("rag_documents")
      .update({
        expires_at: null,
        metadata: newMeta,
        updated_at: nowIso(),
      })
      .eq("id", docId);
    if (error) errors.push(`unblock ${docId}: ${error.message}`);
    else unblocked_count++;
  }
  return { unblocked_count, errors };
}

// ---------------------------------------------------------------------------
// Console table + JSON 출력
// ---------------------------------------------------------------------------
function printTable(title: string, rows: AuditRow[], cols: string[]) {
  console.log("\n" + title);
  if (rows.length === 0) {
    console.log("  (없음)");
    return;
  }
  const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)));
  const header = cols.map((c, i) => c.padEnd(widths[i])).join(" | ");
  console.log("  " + header);
  console.log("  " + widths.map((w) => "-".repeat(w)).join("-+-"));
  for (const r of rows) {
    console.log("  " + cols.map((c, i) => String(r[c] ?? "").slice(0, widths[i]).padEnd(widths[i])).join(" | "));
  }
  console.log("  총 " + rows.length + "건");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const fix = args.includes("--fix") || args.includes("--fix=true");
  const apply = args.includes("--apply") || args.includes("--apply=true");
  const dryRun = !args.includes("--dry-run=false");
  const unblock = args.includes("--unblock") || args.includes("--unblock=true");

  const supabase = getSupabase();

  console.log("[audit-playbook-rag] 옵션: fix=%s, apply=%s, dryRun=%s, unblock=%s", fix, apply, dryRun, unblock);

  const report = await runAudit(supabase);

  // JSON 출력 (unblocked_count는 unblock 실행 후 병합)
  const jsonOut: Record<string, unknown> = {
    summary: {
      A_approved_null_rag_doc: report.A_approved_null_rag_doc.length,
      B_approved_doc_not_done: report.B_approved_doc_not_done.length,
      C_not_approved_but_trust_tier2: report.C_not_approved_but_trust_tier2.length,
      D_rag_doc_orphan_or_inactive: report.D_rag_doc_orphan_or_inactive.length,
      E_rag_doc_zero_chunks: report.E_rag_doc_zero_chunks.length,
    },
    report,
  };

  // 콘솔 표
  printTable("A. approved인데 rag_document_id NULL", report.A_approved_null_rag_doc, ["id", "status", "language", "user_intent"]);
  printTable("B. approved인데 ingest_status pending/failed", report.B_approved_doc_not_done, ["id", "rag_document_id", "ingest_status"]);
  printTable("C. playbook 비승인/비활성인데 trust_tier=2", report.C_not_approved_but_trust_tier2, ["id", "source_id", "pattern_status", "is_active"]);
  printTable("D. rag_doc 원본 없음/merged/retired", report.D_rag_doc_orphan_or_inactive, ["id", "source_id", "no_pattern", "pattern_status", "is_active"]);
  printTable("E. rag_document에 chunk 0개", report.E_rag_doc_zero_chunks, ["id", "source_type", "source_id"]);

  let unblocked_count: number | undefined;
  if (unblock && apply) {
    console.log("\n--- Unblock (차단 롤백, dryRun=%s) ---", dryRun);
    const result = await applyUnblock(supabase, { dryRun });
    unblocked_count = result.unblocked_count;
    (jsonOut.summary as Record<string, unknown>).unblocked_count = unblocked_count;
    console.log("  unblocked_count: %d", unblocked_count);
    result.errors.forEach((e) => console.error("  ERR:", e));
  } else if (unblock && !apply) {
    console.log("\n[안내] --unblock 은 --apply 와 함께 쓸 때만 동작합니다. 적용하려면 --unblock --apply (및 필요 시 --dry-run=false) 를 지정하세요.");
  }

  if (fix && apply) {
    console.log("\n--- Fix 적용 (dryRun=%s) ---", dryRun);
    const { fixed, errors } = await applyFix(supabase, report, { dryRun });
    fixed.forEach((f) => console.log("  OK:", f));
    errors.forEach((e) => console.error("  ERR:", e));
  } else if (fix && !apply) {
    console.log("\n[안내] 실제 변경을 적용하려면 --apply (또는 --apply=true) 를 함께 지정하세요. 현재는 리포트만 출력했습니다.");
  }

  console.log("\n--- JSON ---");
  console.log(JSON.stringify(jsonOut, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
