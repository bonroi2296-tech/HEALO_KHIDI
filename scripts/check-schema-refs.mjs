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
 * 범위: 테이블 레벨(견고·오탐 0, 차단) + 평문 select 컬럼 레벨(생성타입 대조, 비차단·경고).
 *        축 C(2026-07-15)에 컬럼 레벨 추가 — 상세는 아래 buildColumnMap 주석.
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
  "patient_visa_checklist", // 2026-07-01 적용 — 비자 서류 준비 체크 계정 저장. RLS=본인만
  "partner_outreach", // 2026-07-01 적용 (PR #567 — 파트너 아웃리치 추적기). RLS=서비스롤 전용
  "opinion_requests", // 2026-07-07 적용 — 전문의 세컨드 오피니언 요청(매직링크 토큰). RLS=서비스롤 전용
  "case_opinions", // 2026-07-07 적용 — 도착한 전문의 소견(코디·어드민 전용). RLS=서비스롤 전용
  "note_translations", // 2026-07-07 적용 — 코디 짧은 메모 자동번역 캐시(source_hash,target_lang). RLS=서비스롤 전용
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

// ── 컬럼 레벨 대조 (축 C 2026-07-15 — 유형6: cron/KPI 가 없는 컬럼 select→조용한 0) ──
// 왜: #7(visit_confirmed_at)·#35 처럼 존재하지 않는 '컬럼'을 select 하면 PostgREST 가 에러를
//     내는데 try/catch 가 삼켜 화면에 0/[] 로 떨어진다. 생성타입(src/types/database.types.ts)의
//     Row 컬럼 집합과 대조해 매 PR 차단. 오탐 0 목표라 **가장 안전한 패턴만** 본다:
//     `.from("t").select("평문,컬럼,목록")` — select 인자에 *·(·:·.·->·${…} 가 있으면(임베드/별칭/
//     JSON/동적) 통째로 건너뜀. 필터(.eq 등)·insert 객체키는 임베드·동적 위험이 커 이번 범위 밖.
function buildColumnMap() {
  const map = new Map();
  let types;
  try { types = fs.readFileSync(path.join("src", "types", "database.types.ts"), "utf8"); }
  catch { return map; }
  // "      table: {\n        Row: {\n  <cols>  \n        }" (public.Tables·Views 공통)
  const tableRe = /^ {6}(\w+): \{\n {8}Row: \{\n([\s\S]*?)\n {8}\}/gm;
  let m;
  while ((m = tableRe.exec(types)) !== null) {
    const cols = new Set();
    for (const line of m[2].split("\n")) {
      const cm = /^ {10}(\w+)\??:/.exec(line);
      if (cm) cols.add(cm[1]);
    }
    if (cols.size) map.set(m[1], cols);
  }
  return map;
}
const COLUMN_MAP = buildColumnMap();
const colViolations = [];
// select 인자가 '평문 컬럼 목록'인지: 임베드/별칭/JSON/함수/동적 신호가 하나도 없어야 함.
const PLAIN_SELECT = /^[\w,\s]+$/;

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

      // 2.5) 컬럼 레벨: `.from("t").select("평문,컬럼")` 만 대조(가장 안전한 패턴).
      //      window 를 다음 `.from(` 전까지로 잘라 이웃 쿼리의 select 를 오인하지 않게 한다.
      if (COLUMN_MAP.has(name)) {
        let win = content.slice(idx + 6, idx + 600);
        const nextFrom = win.search(/\.from\(/);
        if (nextFrom !== -1) win = win.slice(0, nextFrom);
        const sel = /\.select\(\s*(["'])([^"'`\n]*)\1/.exec(win);
        if (sel && PLAIN_SELECT.test(sel[2]) && sel[2].trim()) {
          const cols = COLUMN_MAP.get(name);
          for (const raw of sel[2].split(",")) {
            const col = raw.trim();
            if (col && /^\w+$/.test(col) && !cols.has(col)) {
              const line = content.slice(0, idx).split("\n").length;
              colViolations.push({ table: name, col, rel: `${file}:${line}` });
            }
          }
        }
      }

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

// 컬럼 레벨은 우선 **비차단(경고)** — 생성타입 재생성 직후라 파서 엣지·잔여 오탐 여지가 있어
// CI 를 빨갛게 만들지 않는다(축 C 롤아웃 정책, check:completeness 와 동일). 알려진 실버그는
// KNOWN_ISSUES 에 기록. 안정 확인 후 process.exit(1) 로 승격 예정(docs/DEFINITION_OF_DONE.md 로드맵).
if (colViolations.length) {
  console.warn(`\n⚠️  존재하지 않는 컬럼 select ${colViolations.length}건 (생성타입 Row 에 없음 — 조용한 0/[] 위험, 유형6, 비차단):`);
  for (const v of colViolations) console.warn(`   - ${v.table}.select("…${v.col}…")  ${v.rel}`);
  console.warn(`   → 오타/옛 컬럼명이면 교정. 평문 select 만 검사(임베드/별칭/JSON 은 리뷰 몫).`);
}

console.log(`\n✓ 스키마 참조 검사 통과 (테이블 실재 + 평문 select 컬럼 ${COLUMN_MAP.size}개 테이블 대조 · 컬럼경고 ${colViolations.length})`);
