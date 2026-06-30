#!/usr/bin/env node
/**
 * check-schema-refs — 코드↔실DB 스키마 대조 가드 (POSTMORTEMS #35 구조게이트 S2)
 *
 * 왜: 반성문 34건 중 8건이 "존재하지 않는 테이블/컬럼 참조"였다(#7 visit_confirmed_at·
 *     #19 khidi_intakes·#29 rebooking_source·이번 ai-feedback inquiry_messages 등).
 *     이 부류는 문자열이라 `tsc`가 못 잡고, 쿼리가 조용히 빈값을 뱉어 화면에 0/[]로 떨어진다
 *     → 결국 PO가 화면에서 발견. 그걸 막으려 코드의 `.from("테이블")` 리터럴이
 *     실재 public 테이블인지 매 PR 검사한다.
 *
 * 범위: 테이블 레벨(견고·오탐 0 목표). 컬럼 레벨 대조는 후속(생성타입 도입과 함께).
 *
 * 스냅샷 재생성(스키마 바뀌면):
 *   Supabase MCP list_tables(public) 또는
 *   select table_name from information_schema.tables where table_schema='public' order by 1;
 *   → 아래 PUBLIC_TABLES 갱신.
 */
import fs from "node:fs";
import path from "node:path";

const ROOTS = ["src", "app"];
const EXT = /\.(ts|tsx|js|jsx|mjs)$/;

// --- public 스키마 실재 테이블 (2026-06-30 스냅샷, 68개) ---
const PUBLIC_TABLES = new Set([
  "hospitals", "treatments", "site_settings", "inquiries", "chat_threads",
  "chat_messages", "inquiry_events", "admin_audit_logs", "admin_notification_logs",
  "rag_documents", "rag_chunks", "hospital_users", "hospital_leads", "crawl_jobs",
  "crawl_raw_items", "coordinator_responses", "hospital_offer_jobs", "treatment_sources",
  "auto_jobs", "auto_job_events", "cancer_patient_intakes", "hospital_cancer_capabilities",
  "consultation_sessions", "followup_schedules", "symptom_reports", "education_contents",
  "user_roles", "consultation_messages", "consultation_translations", "profiles",
  "partner_branches", "partner_doctors", "hospital_offer_enrich_jobs", "consultation_documents",
  "rag_query_events", "playbook_patterns", "normalized_inquiries", "reviews",
  "admin_notification_recipients", "playbook_usage_events", "rate_limit_buckets",
  "admin_audit_logs_archive", "consultation_guest_tokens", "consultation_admissions",
  "visa_applications", "visa_documents", "visa_status_history", "treatment_cost_benchmarks",
  "cost_estimates", "cost_estimate_history", "surveys", "survey_responses",
  "reminders_scheduled", "notifications", "symptom_alerts", "kpi_snapshots", "chat_feedback",
  "ai_response_evaluations", "ai_regression_tests", "ai_regression_runs", "cotreatment_referrals",
  "agencies", "agency_users", "case_status_history", "alert_counter_events", "device_tokens",
  "progress_records", "account_deletion_requests",
  "funnel_events", // 2026-06-30 적용 (PR #522 — 죽은 퍼널 계측 살리기). RLS=서비스롤 전용
  "ai_usage_events", // 2026-06-30 적용 — AI 토큰·비용 계측(외부 서비스 사용량 화면). RLS=서비스롤 전용
]);

// `.from()` 첫 인자가 DB 테이블이 아닌 것 — Supabase Storage 버킷(.storage.from). 오탐 제외.
const STORAGE_BUCKETS = new Set(["documents", "images", "attachments"]);

// 알려진 잔존 비존재 참조 — 즉시 안 깨지는 dead path(가드 조건이 항상 false)라
// 별도 트랙으로 수정 예정(KNOWN_ISSUES). 새 위반을 여기 추가해 숨기지 말 것.
const ALLOWLIST = new Map([
  // (비어있음) 과거 dead-path(patients/users)는 제거·교정 완료 — KNOWN_ISSUES #35-S2.
]);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.test(e.name)) out.push(p);
  }
}

const FROM_RE = /\.from\(\s*["'`]([A-Za-z_][\w]*)["'`]/g;

const violations = [];
const allowHits = [];

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  const files = [];
  walk(root, files);
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    let m;
    FROM_RE.lastIndex = 0;
    while ((m = FROM_RE.exec(content)) !== null) {
      const name = m[1];
      const idx = m.index;

      // 1) Storage 체인 제외: 매치 앞 80자에 `.storage` 가 있으면 버킷(.storage.from)
      const before = content.slice(Math.max(0, idx - 80), idx);
      if (/\.storage\s*$/.test(before) || STORAGE_BUCKETS.has(name)) continue;

      // 2) 주석 줄 제외 (// 또는 * 로 시작하거나, 같은 줄에서 // 뒤)
      const lineStart = content.lastIndexOf("\n", idx) + 1;
      const lineHead = content.slice(lineStart, idx);
      const trimmed = lineHead.trimStart();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || lineHead.includes("//")) continue;

      // 3) 실재 테이블이면 OK
      if (PUBLIC_TABLES.has(name)) continue;

      const line = content.slice(0, idx).split("\n").length;
      const rel = `${file}:${line}`;
      if (ALLOWLIST.has(name)) allowHits.push({ name, rel });
      else violations.push({ name, rel });
    }
  }
}

if (allowHits.length) {
  console.log(`ℹ️  allowlist(추적 중 dead-path) ${allowHits.length}건:`);
  for (const a of allowHits) console.log(`   - ${a.name}  (${a.rel})  — ${ALLOWLIST.get(a.name)}`);
}

if (violations.length) {
  console.error(`\n❌ 존재하지 않는 테이블 참조 ${violations.length}건 (실재 public 테이블 아님):`);
  for (const v of violations) console.error(`   - .from("${v.name}")  ${v.rel}`);
  console.error(`\n→ 오타/옛 이름이면 실재 테이블로 교정. Storage 버킷이면 .storage.from 사용.`);
  console.error(`  새 테이블이면 PUBLIC_TABLES 스냅샷 갱신(파일 상단 재생성법 참고).`);
  console.error(`  의도된 dead-path면 ALLOWLIST에 사유와 함께 등록.`);
  process.exit(1);
}

console.log("✓ 스키마 참조 검사 통과 (모든 .from(\"테이블\") 이 실재 public 테이블)");
