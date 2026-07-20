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
  "playbook_responses", // 2026-07-20 적용 (POSTMORTEMS #97) — 플레이북 응대 원문·정제본·승인.
                        // 옛 `coordinator_responses` 는 동명의 견적 테이블과 충돌해 쓰기가 항상 실패했다
                        // → 전용 이름으로 분리. 견적용 coordinator_responses 는 그대로 남아 있음.
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

// 자기점검 — 파서가 0개를 뱉으면 **검사기 자신이 죽은 것**이다(생성타입 포맷 변경·줄바꿈
// CRLF 화 등으로 정규식이 통째로 빗나가면 조용히 0개가 되고, 아래 검사는 전부 no-op 인데
// 스크립트는 "✓ 통과"를 찍는다 — 2026-07-20 실제로 이 상태를 만들 뻔했다).
// #97 의 교훈이 정확히 이것("성공 보고 ≠ 실제로 한 일")이라 여기서 크게 실패시킨다.
if (COLUMN_MAP.size === 0) {
  console.error("\n❌ 컬럼 대조 맵이 비었다 — 검사기 자신이 고장난 상태다(조용한 no-op).");
  console.error("   원인 후보: src/types/database.types.ts 가 없거나, 줄바꿈이 CRLF 로 바뀌었거나,");
  console.error("   생성타입 포맷이 바뀌어 buildColumnMap 의 정규식이 안 맞음.");
  console.error("   → 파일 줄바꿈(LF) 확인 + 정규식 갱신. 이 검사를 건너뛰지 마라.");
  process.exit(1);
}

const colViolations = [];
const writeViolations = [];
// select 인자가 '평문 컬럼 목록'인지: 임베드/별칭/JSON/함수/동적 신호가 하나도 없어야 함.
const PLAIN_SELECT = /^[\w,\s]+$/;

// ── 쓰기 경로 컬럼 대조 (축 D 2026-07-20 — POSTMORTEMS #97) ──
// 왜: 축 C 는 `select` 문자열만 봤고, 주석에도 "insert 객체키는 이번 범위 밖"이라고 적혀 있었다.
//     그 그물 밖 통로에서 실제 사고가 났다 — `coordinator_responses`(플레이북)·`crawl_raw_items`
//     (크롤)가 **없는 컬럼에 insert/update** 해서 두 기능이 한 번도 작동하지 않았는데(각 0건)
//     select 는 멀쩡해 가드가 통과시켰다. select 만 막고 쓰기를 안 막으면 "저장이 안 되는 화면"이
//     조용히 남는다 → 여기서 닫는다.
// 오탐 0 원칙(축 C 계승): **직접 객체 리터럴만** 본다. 변수를 넘기거나(.insert(payload)),
//     스프레드(...)·계산된 키([x]:)가 있으면 통째로 건너뛴다. 그런 동적 형태는
//     @supabase/supabase-js 2.110+ 의 타입 대조가 잡는 몫(KNOWN_ISSUES).
//
// ⚠️ 파서는 **문자열·주석을 반드시 구분해야 한다**(독립 리뷰 2026-07-20 지적, 실측 재현됨):
//   · 값이 멀티라인 템플릿 리터럴이면 그 안의 `Subject: hello` 같은 줄이 컬럼으로 오인 →
//     차단 게이트라서 **정상 코드가 CI를 막는다**(오탐).
//   · 값 문자열 안의 `}` 하나가 괄호 깊이를 0으로 만들어 본문이 잘리고, 이후 키는
//     전부 무검사인데 "✓ 통과"가 찍힌다(미탐 — 이 가드가 막으려던 #97 실패 모양 그대로).
//   → 아래 maskLiterals 가 문자열/템플릿/주석 **내용만 공백으로 덮고** 길이·줄바꿈은 보존한다.
//     이후의 괄호 세기·키 추출은 전부 마스킹된 사본 위에서 한다.
function maskLiterals(src) {
  const out = src.split("");
  let i = 0;
  const blank = (from, to) => {
    for (let k = from; k < to && k < out.length; k++) {
      if (out[k] !== "\n") out[k] = " ";   // 줄 구조는 유지(줄번호·라인 파싱 보존)
    }
  };
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === "/" && next === "/") {
      let j = src.indexOf("\n", i); if (j === -1) j = src.length;
      blank(i, j); i = j; continue;
    }
    if (ch === "/" && next === "*") {
      let j = src.indexOf("*/", i + 2); j = j === -1 ? src.length : j + 2;
      blank(i, j); i = j; continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === quote) { j++; break; }
        j++;
      }
      blank(i + 1, j - 1);                  // 따옴표는 남기고 내용만 지움
      i = j; continue;
    }
    i++;
  }
  return out.join("");
}

function checkWriteKeys(content, table, win, file, idx) {
  const cols = COLUMN_MAP.get(table);
  if (!cols) return;
  const masked = maskLiterals(win);         // 이후 판단은 전부 마스킹본 위에서
  const callRe = /\.(insert|update|upsert)\(\s*\{/g;
  let c;
  while ((c = callRe.exec(masked)) !== null) {
    const op = c[1];
    // 객체 리터럴 본문을 괄호 균형으로 잘라낸다(문자열 속 중괄호는 이미 지워졌다).
    let depth = 1, i = c.index + c[0].length;
    const from = i;
    while (i < masked.length && depth > 0) {
      const ch = masked[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      i++;
    }
    if (depth !== 0) continue;              // window 경계에서 잘림 — 판단 보류
    const body = masked.slice(from, i - 1);
    if (body.includes("...") || /\[[^\]]+\]\s*:/.test(body)) continue; // 동적 → 건너뜀

    // 최상위 키만 (중첩 객체·배열 안쪽은 jsonb 값이라 컬럼이 아님).
    // 줄 단위로 훑으면 `{ a: 1, ghost: 2 }` 처럼 **한 줄에 키가 여러 개**일 때 첫 키만 보고
    // 나머지를 놓친다(자기시험이 잡아낸 실제 구멍) → 문자 단위로 depth 를 따라가며
    // "구분자(`{` 시작 또는 `,`) 다음에 오는 식별자 + `:`" 만 키로 인정한다.
    let d = 0, expectKey = true;
    for (let k = 0; k < body.length; k++) {
      const ch = body[k];
      if (ch === "{" || ch === "[") { d++; expectKey = false; continue; }
      if (ch === "}" || ch === "]") { d--; expectKey = false; continue; }
      if (ch === ",") { expectKey = d === 0; continue; }
      if (/\s/.test(ch)) continue;
      if (expectKey && d === 0) {
        const km = /^(\w+)\s*:/.exec(body.slice(k));
        if (km) {
          if (!cols.has(km[1])) {
            const ln = content.slice(0, idx).split("\n").length;
            writeViolations.push({ table, col: km[1], op, rel: `${file}:${ln}` });
          }
          k += km[0].length - 1;
        }
      }
      expectKey = false;
    }
  }
}

// ── 자기시험 (`node scripts/check-schema-refs.mjs --selftest`) ──
// 축 D 파서는 정규식·괄호세기·마스킹이 얽혀 눈으로 맞는지 알기 어렵다. 독립 리뷰가 실제로
// 뚫었던 입력을 그대로 박아두어, 다음에 파서를 건드릴 때 같은 구멍이 다시 열리면 실패하게 한다.
if (process.argv.includes("--selftest")) {
  const cols = new Set(["response_text_raw", "response_text_sanitized", "id"]);
  COLUMN_MAP.set("__t", cols);
  const run = (code) => {
    writeViolations.length = 0;
    checkWriteKeys(code, "__t", code, "selftest.ts", 0);
    return writeViolations.map((v) => v.col);
  };
  let failed = 0;
  const expect = (label, got, want) => {
    const ok = JSON.stringify(got.sort()) === JSON.stringify(want.sort());
    if (!ok) { failed++; console.error(`  ✗ ${label}\n     기대=${JSON.stringify(want)} 실제=${JSON.stringify(got)}`); }
    else console.log(`  ✓ ${label}`);
  };

  expect("평범한 유령 컬럼을 잡는다",
    run(`.from("__t").insert({ response_text_raw: "a", ghost_col: 1 })`), ["ghost_col"]);

  expect("정상 컬럼만이면 조용하다",
    run(`.from("__t").insert({ response_text_raw: "a", response_text_sanitized: "b" })`), []);

  // 리뷰 지적 #2 — 멀티라인 템플릿 안의 "Subject:" 를 컬럼으로 오인하면 CI가 막힌다(오탐)
  expect("멀티라인 템플릿 리터럴 내부는 컬럼이 아니다",
    run('.from("__t").insert({ response_text_raw: `Dear patient\nSubject: hello world\nRegards`, response_text_sanitized: "x" })'), []);

  // 리뷰 지적 #3 — 값 문자열 속 `}` 로 본문이 잘려 뒤쪽 키가 무검사로 새면 안 된다(미탐)
  expect("값 문자열 속 중괄호가 검사를 끊지 않는다",
    run(`.from("__t").insert({ response_text_raw: "괄호 } 포함", ghost_after_brace: 1 })`), ["ghost_after_brace"]);

  expect("주석 속 중괄호가 검사를 끊지 않는다",
    run(`.from("__t").insert({ /* 여는 괄호 { 만 있는 주석 */ ghost_after_comment: 1 })`), ["ghost_after_comment"]);

  expect("스프레드가 있으면 통째로 건너뛴다(동적)",
    run(`.from("__t").insert({ ...base, ghost_ignored: 1 })`), []);

  expect("중첩 객체(jsonb) 안쪽 키는 컬럼이 아니다",
    run(`.from("__t").insert({ response_text_raw: "a", metadata: {\n  inner_key: 1\n} })`), ["metadata"]);

  writeViolations.length = 0;
  COLUMN_MAP.delete("__t");
  console.log(failed ? `\n❌ 자기시험 ${failed}건 실패` : "\n✓ 자기시험 통과");
  process.exit(failed ? 1 : 0);
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

        // 축 D: 같은 window 에서 쓰기 경로(insert/update/upsert) 객체키도 대조.
        checkWriteKeys(content, name, win, file, idx);
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

// 쓰기 경로는 **차단**. 이유: select 오류는 화면에 0/[] 로 뜨기라도 하지만, insert/update 오류는
// "저장 눌렀는데 아무 일도 안 일어남"으로 끝나 아무도 신고하지 않는다(#97 에서 두 기능이 그렇게
// 몇 달을 죽어 있었다). 축 C(select)를 비차단으로 둔 판단과 달리, 여기는 처음부터 빨갛게 만든다.
// 오탐 0 설계(직접 객체 리터럴만·스프레드/계산키 제외)라 정상 코드가 걸릴 여지가 없다.
if (writeViolations.length) {
  console.error(`\n❌ 존재하지 않는 컬럼에 쓰기 ${writeViolations.length}건 (생성타입 Row 에 없음 — 저장이 조용히 실패, 유형6-쓰기):`);
  for (const v of writeViolations) console.error(`   - ${v.table}.${v.op}({ ${v.col}: … })  ${v.rel}`);
  console.error(`\n→ 오타/옛 컬럼명이면 교정. 컬럼이 진짜 필요하면 마이그레이션으로 추가하고`);
  console.error(`  **적용 후 information_schema 로 실제 생겼는지 확인**하라 —`);
  console.error(`  CREATE TABLE IF NOT EXISTS 는 이름이 겹치면 에러 없이 no-op 이다(POSTMORTEMS #97).`);
  console.error(`  생성타입이 낡았으면 Supabase MCP generate_typescript_types 로 재생성.`);
  process.exit(1);
}

console.log(`\n✓ 스키마 참조 검사 통과 (테이블 실재 + select/쓰기 컬럼 ${COLUMN_MAP.size}개 테이블 대조 · 컬럼경고 ${colViolations.length})`);
