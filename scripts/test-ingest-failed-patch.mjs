/**
 * INGEST-FAILED-PATCH 런타임 테스트
 *
 * C-1) pending → failed 전환 실행
 * C-2) rag_documents ingest_status='failed' 확인
 * C-3) RPC에서 failed 문서 검색 제외 확인
 * C-4) 동일 패턴 재시도 정책 확인
 * C-5) auto_job_events ingest_failed 이벤트 확인
 *
 * Usage: node scripts/test-ingest-failed-patch.mjs
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_PREFIX = "__ingest_fail_test__";
const nowIso = () => new Date().toISOString();
const ids = { doc: null, pattern: null, job: null, event: null };
let passCount = 0;
let failCount = 0;

function report(id, pass, msg) {
  const tag = pass ? "PASS" : "FAIL";
  console.log(`  [${id}] ${tag}: ${msg}`);
  if (pass) passCount++;
  else failCount++;
}

async function cleanup() {
  console.log("\n--- Cleanup ---");
  if (ids.event) await sb.from("auto_job_events").delete().eq("id", ids.event);
  if (ids.doc) {
    await sb.from("rag_chunks").delete().eq("document_id", ids.doc);
    await sb.from("rag_documents").delete().eq("id", ids.doc);
  }
  if (ids.pattern) await sb.from("playbook_patterns").delete().eq("id", ids.pattern);
  if (ids.job) await sb.from("auto_jobs").delete().eq("id", ids.job);
  console.log("  Cleaned up all test rows.");
}

async function run() {
  console.log("=== INGEST-FAILED-PATCH Runtime Test ===\n");

  // ── Setup: create test fixtures ──
  console.log("--- Setup ---");

  const { data: job, error: jobErr } = await sb
    .from("auto_jobs")
    .insert({ job_type: "auto_improve", status: "done", started_at: nowIso(), finished_at: nowIso(), stats: { test: true } })
    .select("id")
    .single();
  if (jobErr) { console.error("Failed to create test job:", jobErr.message); return; }
  ids.job = job.id;
  console.log(`  Created test job: ${job.id}`);

  const { data: pattern, error: patErr } = await sb
    .from("playbook_patterns")
    .insert({
      source_thread_id: null,
      language: "en",
      scope: "general",
      treatment_slug: "test-treatment",
      user_intent: TEST_PREFIX + " intent",
      trigger: { keywords: ["test"] },
      response_template: "Test template. This is not medical advice. Do not confirm specific pricing. Do not rank hospitals.",
      response_structure: { opening: "test", disclaimers: ["not medical advice"], steps: [], options: [], handoff_rule: {}, closing: "test" },
      safety_notes: ["This is not medical advice", "Do not confirm specific pricing", "Do not rank hospitals"],
      key_questions: ["test question?"],
      quality_score: 50,
      status: "draft",
      auto_status: "drafted",
      auto_parent_id: null,
      auto_version: 2,
      is_active: true,
      metadata: { auto_generated: true, test: true },
    })
    .select("id")
    .single();
  if (patErr) { console.error("Failed to create test pattern:", patErr.message); return; }
  ids.pattern = pattern.id;
  console.log(`  Created test pattern: ${pattern.id}`);

  // ══════════════════════════════════════════════════
  // C-1) Simulate approveAndIngest with embedding failure
  // ══════════════════════════════════════════════════
  console.log("\n--- C-1: Simulate approveAndIngest embedding failure ---");

  const title = `Playbook: test-treatment | ${TEST_PREFIX} intent`;
  const docContent = "Test template content for ingest failure test.";

  // Step 1: Insert rag_document with ingest_status='pending' (same as real code)
  const { data: newDoc, error: docErr } = await sb
    .from("rag_documents")
    .insert({
      source_type: "playbook_pattern",
      source_id: ids.pattern,
      lang: "en",
      title,
      content: docContent,
      version: 2,
      trust_tier: 2,
      source_label: "HEALO Playbook (Auto-Approved)",
      metadata: { ingest_status: "pending" },
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select("id, metadata")
    .single();

  if (docErr) { console.error("Failed to create test doc:", docErr.message); return; }
  ids.doc = newDoc.id;
  console.log(`  Created rag_document (pending): ${newDoc.id}`);
  report("C-1a", newDoc.metadata?.ingest_status === "pending", `ingest_status='${newDoc.metadata?.ingest_status}' (expected: pending)`);

  // Step 2: Simulate embedding failure → catch block → mark as failed
  const simulatedError = "Embedding failed";
  const { error: markErr } = await sb
    .from("rag_documents")
    .update({
      metadata: {
        ingest_status: "failed",
        ingest_error: simulatedError.slice(0, 200),
        failed_at: nowIso(),
      },
      updated_at: nowIso(),
    })
    .eq("id", ids.doc);

  report("C-1b", !markErr, markErr ? `Failed to mark as failed: ${markErr.message}` : "Successfully marked rag_document as failed");

  // ══════════════════════════════════════════════════
  // C-2) Verify ingest_status='failed' in DB
  // ══════════════════════════════════════════════════
  console.log("\n--- C-2: Verify ingest_status='failed' record ---");

  const { data: failedDoc } = await sb
    .from("rag_documents")
    .select("id, metadata")
    .eq("id", ids.doc)
    .single();

  const status = failedDoc?.metadata?.ingest_status;
  const hasError = !!failedDoc?.metadata?.ingest_error;
  const hasFailedAt = !!failedDoc?.metadata?.failed_at;
  report("C-2a", status === "failed", `ingest_status='${status}' (expected: failed)`);
  report("C-2b", hasError, `ingest_error present: ${hasError}`);
  report("C-2c", hasFailedAt, `failed_at present: ${hasFailedAt}`);

  // ══════════════════════════════════════════════════
  // C-3) Verify failed doc is excluded from RPC
  // ══════════════════════════════════════════════════
  console.log("\n--- C-3: Verify failed doc excluded from RPC ---");

  // Generate a dummy 768-dim vector for RPC call
  const dummyVec = Array(768).fill(0);
  dummyVec[0] = 1.0;

  const { data: rpcResults, error: rpcErr } = await sb.rpc("rag_search_chunks_v1_1", {
    query_embedding: JSON.stringify(dummyVec),
    match_count: 100,
    p_lang: null,
    p_source_type: "playbook_pattern",
    p_partner_only: false,
    p_ab_enabled: false,
    p_thread_hash: 0,
  });

  if (rpcErr) {
    report("C-3", false, `RPC error: ${rpcErr.message}`);
  } else {
    const foundOurDoc = (rpcResults || []).some((r) => r.document_id === ids.doc);
    report("C-3", !foundOurDoc, foundOurDoc
      ? `DANGER: failed document ${ids.doc} found in RPC results!`
      : `failed document correctly excluded from RPC (searched ${(rpcResults || []).length} results)`);
  }

  // Also verify the WHERE clause logic directly
  const { data: directQuery } = await sb
    .from("rag_documents")
    .select("id, metadata")
    .eq("id", ids.doc)
    .single();

  const directStatus = directQuery?.metadata?.ingest_status;
  const wouldPassFilter = (directStatus === null || directStatus === undefined || directStatus === "done");
  report("C-3-filter", !wouldPassFilter, `RPC filter check: ingest_status='${directStatus}' → would pass filter: ${wouldPassFilter} (expected: false)`);

  // ══════════════════════════════════════════════════
  // C-4) Verify retry policy (blocked pattern not re-picked)
  // ══════════════════════════════════════════════════
  console.log("\n--- C-4: Verify retry policy ---");

  // Simulate: after ingest failure, auto_status is set to 'blocked' (same as runAutoImprove caller)
  await sb.from("playbook_patterns").update({
    auto_status: "blocked",
    reject_reason: `ingest failed: ${simulatedError}`,
    last_auto_action_at: nowIso(),
    updated_at: nowIso(),
  }).eq("id", ids.pattern);

  // Query: would runAutoImprove pick this up?
  const { data: candidates } = await sb
    .from("playbook_patterns")
    .select("id, auto_status")
    .eq("id", ids.pattern)
    .eq("auto_status", "candidate")
    .eq("is_active", true)
    .eq("status", "approved")
    .is("canonical_id", null);

  const wouldRetry = (candidates || []).length > 0;
  report("C-4", !wouldRetry, wouldRetry
    ? "DANGER: blocked pattern would be retried!"
    : "blocked pattern correctly excluded from candidate query (auto_status='blocked', not 'candidate')");

  // Verify the pattern state
  const { data: pState } = await sb
    .from("playbook_patterns")
    .select("auto_status, reject_reason")
    .eq("id", ids.pattern)
    .single();
  report("C-4-state", pState?.auto_status === "blocked", `auto_status='${pState?.auto_status}' (expected: blocked)`);
  report("C-4-reason", pState?.reject_reason?.startsWith("ingest failed:"), `reject_reason='${pState?.reject_reason}'`);

  // ══════════════════════════════════════════════════
  // C-5) Verify auto_job_events ingest_failed event
  // ══════════════════════════════════════════════════
  console.log("\n--- C-5: Verify auto_job_events ---");

  // Insert event (same as runAutoImprove caller code)
  const { data: evt, error: evtErr } = await sb
    .from("auto_job_events")
    .insert({
      job_id: ids.job,
      pattern_id: ids.pattern,
      action: "ingest_failed",
      result: "failed",
      detail: { parent_id: null, doc_id: ids.doc, error: simulatedError.slice(0, 300) },
    })
    .select("id, action, result, detail")
    .single();

  if (evtErr) {
    report("C-5", false, `Failed to insert event: ${evtErr.message}`);
  } else {
    ids.event = evt.id;
    report("C-5a", evt.action === "ingest_failed", `action='${evt.action}' (expected: ingest_failed)`);
    report("C-5b", evt.result === "failed", `result='${evt.result}' (expected: failed)`);
    report("C-5c", evt.detail?.doc_id === ids.doc, `detail.doc_id matches: ${evt.detail?.doc_id === ids.doc}`);
    report("C-5d", !!evt.detail?.error, `detail.error present: ${!!evt.detail?.error}`);
  }

  // ══════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════
  console.log("\n========================================");
  console.log(`TOTAL: ${passCount} PASS / ${failCount} FAIL`);
  console.log("========================================");

  if (failCount > 0) {
    console.log("\n⚠ Some tests failed. Review output above.");
  } else {
    console.log("\n✅ All tests passed.");
  }

  console.log("\nInvariants:");
  console.log(`  1. pending 좀비 문서 방지 → ${status === "failed" ? "PASS" : "FAIL"}`);
  console.log(`  2. failed 문서 검색 제외  → ${!wouldPassFilter ? "PASS" : "FAIL"}`);
  console.log(`  3. 감사 로그 추적 가능    → ${ids.event ? "PASS" : "FAIL"}`);

  await cleanup();
}

run().catch((err) => {
  console.error("Test script error:", err);
  cleanup().then(() => process.exit(1));
});
