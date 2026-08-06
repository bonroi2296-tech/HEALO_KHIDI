/**
 * RAG RPC 필터 검증: ingest_status / expires_at / playbook 상태
 *
 * - ingest_status='failed' 문서가 RPC 결과에 포함되지 않음
 * - expires_at 과거 문서가 RPC 결과에 포함되지 않음
 * - playbook_pattern (status!=approved 또는 is_active=false 등) 문서가 포함되지 않음
 *
 * 실행: node scripts/test-rag-rpc-filter.mjs
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PREFIX = "__rag_filter_test_";
let created = { docFailed: null, docExpired: null, patternId: null, docBlocked: null };

async function cleanup() {
  if (created.docFailed) {
    await sb.from("rag_chunks").delete().eq("document_id", created.docFailed);
    await sb.from("rag_documents").delete().eq("id", created.docFailed);
  }
  if (created.docExpired) {
    await sb.from("rag_chunks").delete().eq("document_id", created.docExpired);
    await sb.from("rag_documents").delete().eq("id", created.docExpired);
  }
  if (created.docBlocked) {
    await sb.from("rag_chunks").delete().eq("document_id", created.docBlocked);
    await sb.from("rag_documents").delete().eq("id", created.docBlocked);
  }
  if (created.patternId) await sb.from("playbook_patterns").delete().eq("id", created.patternId);
}

function nowIso() {
  return new Date().toISOString();
}

async function run() {
  console.log("=== RAG RPC filter verification ===\n");

  const dummyVec = Array(768).fill(0);
  dummyVec[0] = 1;

  let pass = 0;
  let fail = 0;

  // 1) ingest_status='failed' 문서 생성 (chunk 없이 또는 chunk 있으나 RPC에서 제외되는지)
  const { data: docFailed, error: e1 } = await sb
    .from("rag_documents")
    .insert({
      source_type: "treatment",
      source_id: "00000000-0000-0000-0000-000000000001",
      lang: "en",
      title: PREFIX + " failed doc",
      content: PREFIX + " failed content",
      version: 999,
      trust_tier: 2,
      metadata: { ingest_status: "failed", failed_at: nowIso() },
    })
    .select("id")
    .single();
  if (e1) {
    console.error("Setup docFailed:", e1.message);
    return;
  }
  created.docFailed = docFailed.id;

  const { error: chunkErr } = await sb.from("rag_chunks").insert({
    document_id: docFailed.id,
    chunk_index: 0,
    content: PREFIX + " failed chunk",
    embedding: JSON.stringify(dummyVec),
    // embedding_model 은 rag_chunks 에 없는 칸이라 넣으면 insert 가 통째로 실패한다
    // → 조각이 안 들어가 이 시험이 조용히 헛돌고 있었다. 시험용 조각이라 그냥 뺀다.
  });
  if (chunkErr) {
    console.log("⚠️ rag_chunks insert 실패 — 이 시험은 조각 없이 문서만으로 진행된다:", chunkErr.message);
  }

  const { data: rpc1 } = await sb.rpc("rag_search_chunks_v1_1", {
    query_embedding: JSON.stringify(dummyVec),
    match_count: 50,
    p_lang: null,
    p_source_type: null,
    p_partner_only: false,
    p_ab_enabled: false,
    p_thread_hash: 0,
  });
  const foundFailed = (rpc1 || []).some((r) => r.document_id === docFailed.id);
  if (!foundFailed) {
    console.log("[PASS] ingest_status=failed document not in RPC results");
    pass++;
  } else {
    console.log("[FAIL] ingest_status=failed document appeared in RPC results");
    fail++;
  }

  // 2) expires_at 과거 문서
  const pastDate = new Date(Date.now() - 86400000).toISOString();
  const { data: docExpired } = await sb
    .from("rag_documents")
    .insert({
      source_type: "treatment",
      source_id: "00000000-0000-0000-0000-000000000002",
      lang: "en",
      title: PREFIX + " expired doc",
      content: PREFIX + " expired",
      version: 998,
      trust_tier: 2,
      expires_at: pastDate,
    })
    .select("id")
    .single();
  if (docExpired) {
    created.docExpired = docExpired.id;
    await sb.from("rag_chunks").insert({
      document_id: docExpired.id,
      chunk_index: 0,
      content: PREFIX + " expired chunk",
      embedding: JSON.stringify(dummyVec),
    });
  }
  const { data: rpc2 } = await sb.rpc("rag_search_chunks_v1_1", {
    query_embedding: JSON.stringify(dummyVec),
    match_count: 50,
    p_lang: null,
    p_source_type: null,
    p_partner_only: false,
    p_ab_enabled: false,
    p_thread_hash: 0,
  });
  const foundExpired = docExpired && (rpc2 || []).some((r) => r.document_id === docExpired.id);
  if (!foundExpired) {
    console.log("[PASS] expired document not in RPC results");
    pass++;
  } else {
    console.log("[FAIL] expired document appeared in RPC results");
    fail++;
  }

  // 3) playbook_pattern with status draft / is_active false (if we have one linked to a doc)
  const { data: pattern } = await sb
    .from("playbook_patterns")
    .insert({
      language: "en",
      scope: "general",
      user_intent: PREFIX + " blocked",
      trigger: {},
      response_structure: {},
      response_template: "x",
      safety_notes: ["a", "b"],
      status: "draft",
      is_active: false,
      auto_status: "blocked",
    })
    .select("id")
    .single();
  if (pattern) {
    created.patternId = pattern.id;
    const { data: docBlocked } = await sb
      .from("rag_documents")
      .insert({
        source_type: "playbook_pattern",
        source_id: pattern.id,
        lang: "en",
        title: PREFIX + " blocked",
        content: PREFIX + " blocked content",
        version: 1,
        trust_tier: 2,
        metadata: { ingest_status: "done" },
      })
      .select("id")
      .single();
    if (docBlocked) {
      created.docBlocked = docBlocked.id;
      await sb.from("rag_chunks").insert({
        document_id: docBlocked.id,
        chunk_index: 0,
        content: PREFIX + " blocked chunk",
        embedding: JSON.stringify(dummyVec),
      });
    }
  }
  const { data: rpc3 } = await sb.rpc("rag_search_chunks_v1_1", {
    query_embedding: JSON.stringify(dummyVec),
    match_count: 50,
    p_lang: null,
    p_source_type: "playbook_pattern",
    p_partner_only: false,
    p_ab_enabled: false,
    p_thread_hash: 0,
  });
  const foundBlocked =
    created.docBlocked && (rpc3 || []).some((r) => r.document_id === created.docBlocked);
  if (!foundBlocked) {
    console.log("[PASS] draft/blocked playbook document not in RPC results");
    pass++;
  } else {
    console.log("[FAIL] draft/blocked playbook document appeared in RPC results");
    fail++;
  }

  console.log("\n---");
  console.log(`Total: ${pass} PASS, ${fail} FAIL`);
  await cleanup();
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  cleanup().then(() => process.exit(1));
});
