#!/usr/bin/env node
/**
 * check-enum-values — 코드가 «넣는 값»이 DB 검사규칙(CHECK ... IN (...))에 있는 값인지 대조.
 *
 * 왜 필요한가(2026-08-20 하루에 두 번 터짐):
 *   ① app/api/portal/symptoms/route.ts 가 report_type 기본값으로 "self" 를 넣었다.
 *      symptom_reports_report_type_check 는 scheduled/ad_hoc/emergency 만 받는다
 *      → 환자 증상 제출이 «전부» 저장 실패. 화면엔 분석 결과가 떠서 아무도 몰랐다.
 *   ② src/lib/automation/postResolveWorker.ts 가 auto_status 에 "auto_extracted" 를 넣었다.
 *      playbook_patterns_auto_status_check 에 없는 값 → insert 통째 거부(아직 0건이라 미발견).
 *
 * 이 부류는 tsc 도 빌드도 못 잡는다(그냥 문자열이다). 실행하면 DB 가 거부하는데,
 * 대개 catch 로 삼켜져 «조용히 아무것도 안 저장되는» 상태가 된다. 그래서 기계로 막는다.
 *
 * 기존 check-schema-refs 와의 차이: 그쪽은 «테이블·컬럼 이름»이 실재하는지 본다.
 * 여기는 그 컬럼에 «넣는 값»이 허용 목록 안인지 본다.
 *
 * 오탐 0 정책: `.from("테이블")` 체인 안에서 그 테이블에 실제로 규칙이 걸린 컬럼만 본다.
 * (문맥 없이 컬럼명만 훑으면 supabase signOut 의 scope:"local" 같은 것이 줄줄이 걸린다.)
 *
 * 규칙 스냅샷 갱신(DB 가 바뀌면):
 *   select conrelid::regclass::text, conname, pg_get_constraintdef(oid)
 *   from pg_constraint where contype='c' and connamespace='public'::regnamespace
 *     and pg_get_constraintdef(oid) ilike '%= ANY (ARRAY[%' order by 1;
 */
import fs from "node:fs";
import path from "node:path";

const ROOTS = ["src", "app", "scripts"];
const EXT = /\.(ts|tsx|js|jsx|mjs)$/;
const CHAIN = 1200; // `.from(` 뒤로 이 만큼만 같은 쿼리로 본다

// --- DB 검사규칙 스냅샷 (2026-08-20) : 테이블 → 컬럼 → 허용값 ---
const RULES = {
  account_deletion_requests: { status: ["pending", "processing", "completed", "rejected"] },
  admin_notification_recipients: { channel: ["sms", "alimtalk", "email"] },
  agencies: { partner_type: ["agency", "medical_institution"] },
  attachment_translations: { lang: ["ko", "en", "ru"] },
  chat_messages: { actor_type: ["patient", "admin", "system", "user", "coordinator", "bot", "agency", "hospital"] },
  consultation_admissions: {
    status: ["pending", "approved", "rejected", "left"],
    participant_role: ["patient", "doctor", "translator", "coordinator", "observer", "guest"],
  },
  consultation_guest_tokens: { role: ["patient", "doctor", "translator", "coordinator", "observer", "guest"] },
  consultation_messages: { sender_role: ["patient", "doctor", "coordinator", "translator", "system", "admin", "guest", "observer"] },
  consultation_recordings: { status: ["recording", "stopped", "deleted", "failed"] },
  consultation_sessions: {
    session_type: ["pre_consultation", "follow_up", "emergency", "partner_meeting"],
    status: ["scheduled", "waiting", "active", "completed", "cancelled", "no_show"],
  },
  content_overrides: { lang: ["ko", "en", "ru", "kz", "zh", "ja"] },
  cost_estimates: { status: ["auto_range", "formal_requested", "hospital_pending", "draft", "issued", "accepted", "rejected", "expired"] },
  cotreatment_referrals: { status: ["requested", "accepted", "completed", "declined", "cancelled"] },
  device_tokens: { platform: ["ios", "android", "web"] },
  education_contents: { content_type: ["article", "video", "checklist", "medication_guide", "medication", "diet", "exercise", "warning_signs", "mental_health"] },
  followup_schedules: { status: ["active", "paused", "completed", "cancelled", "pending", "proposed", "confirmed", "dismissed"] },
  funnel_events: { stage: ["page_view", "form_start", "form_step1_submit", "form_step2_view", "form_step2_submit", "form_complete", "form_blocked", "form_error", "chat_start", "chat_message", "chat_blocked", "chat_error"] },
  hospital_offer_enrich_jobs: { status: ["queued", "running", "done", "error"] },
  hospitals: { medical_institution_grade: ["tertiary", "general", "hospital", "clinic"] },
  inquiries: {
    case_status: ["intake", "consultation", "preparation", "treatment", "follow_up", "completed", "on_hold"],
    outcome: ["admitted", "lost"],
  },
  note_translations: { target_lang: ["ko", "en", "ru", "kz", "zh", "ja"] },
  partner_outreach: {
    org_type: ["agency", "hospital", "clinic", "doctor", "other"],
    status: ["prospect", "contacted", "replied", "meeting", "partnership", "rejected", "on_hold"],
  },
  patient_visa_checklist: { visa_type: ["C-3-3", "G-1-10"] },
  playbook_patterns: {
    auto_status: ["none", "candidate", "drafted", "auto_approved", "ab_testing", "promoted", "auto_retired", "blocked"],
    scope: ["treatment", "country", "general"],
    ab_bucket: ["control", "variant"],
    status: ["draft", "approved", "rejected"],
  },
  playbook_responses: { status: ["draft", "pending", "approved", "rejected"] },
  staff_requests: { status: ["open", "doing", "done", "parked"] },
  symptom_reports: { report_type: ["scheduled", "ad_hoc", "emergency"] },
  treatment_cost_benchmarks: {
    confidence: ["low", "medium", "high"],
    stage: ["1", "2", "3", "4", "unknown"],
    cancer_type: ["stomach", "liver", "lung", "breast", "thyroid", "colorectal", "other"],
    treatment_phase: ["pre_treatment", "during_treatment", "post_treatment"],
  },
  user_roles: { role: ["patient", "korean_hospital", "local_clinic", "agent", "admin"] },
  visa_applications: {
    status: ["draft", "documents_pending", "under_review", "changes_requested", "invitation_ready", "invitation_issued", "submitted_embassy", "approved", "rejected", "cancelled"],
    visa_type: ["C-3-3", "G-1-10", "M-1", "other"],
  },
  visa_documents: { review_status: ["pending", "approved", "rejected", "needs_revision"] },
};

/** 소스 한 덩어리에서 위반을 찾는다. (자기시험도 이 함수를 쓴다) */
export function findViolations(src, file = "(inline)") {
  const out = [];
  const fromRe = /\.from\(\s*["'`]([A-Za-z_]\w*)["'`]\s*\)/g;
  let m;
  while ((m = fromRe.exec(src)) !== null) {
    const table = m[1];
    const rules = RULES[table];
    if (!rules) continue;
    // 이 쿼리의 체인 = `.from(` 부터 그 «문장이 끝나는 곳»(다음 `;`)까지, 다음 `.from(` 이
    // 먼저 오면 거기까지. 넓게 잡으면 바로 뒤 다른 테이블 쿼리의 값을 이 테이블 것으로 오인한다
    // (실측 오탐 2건: auto_jobs 의 status:"done", chat_threads 의 status:"resolved").
    const after = src.slice(m.index + m[0].length);
    const stops = [after.search(/\.from\(\s*["'`]/), after.indexOf(";")]
      .filter((i) => i !== -1);
    const end =
      m.index + m[0].length + (stops.length ? Math.min(...stops, CHAIN) : CHAIN);
    const win = src.slice(m.index, end);
    for (const [col, allowed] of Object.entries(rules)) {
      // `컬럼: "값"` 또는 `컬럼: '값'` (템플릿·변수·계산식은 정적으로 못 보므로 건너뛴다)
      const kv = new RegExp('(?:^|[\\s{,(])' + col + '\\s*:\\s*["\']([^"\']*)["\']', "g");
      let k;
      while ((k = kv.exec(win)) !== null) {
        const val = k[1];
        if (!allowed.includes(val)) {
          const ln = src.slice(0, m.index + k.index).split("\n").length;
          out.push({ file, line: ln, table, col, val, allowed });
        }
      }
    }
  }
  return out;
}

// ── 자기시험: 가드가 «진짜 잡는지» 확인한다(안 잡히는 가드가 제일 해롭다) ──
if (process.argv.includes("--selftest")) {
  const bad = `await db.from("symptom_reports").insert({ report_type: "self", symptoms: [] });`;
  const good = `await db.from("symptom_reports").insert({ report_type: "ad_hoc", symptoms: [] });`;
  const unrelated = `await supabase.auth.signOut({ scope: "local" });`; // 쿼리 체인이 아님 → 무시돼야 한다
  // 앞선 쿼리 «뒤»에 다른 테이블 쿼리가 이어질 때 값이 새어 넘어오면 안 된다(실측 오탐 재현).
  const bleed = `await db.from("playbook_patterns").select("id");\nawait db.from("auto_jobs").update({ status: "done" });`;
  // 한계(의도적): 값이 `.from(` «앞» 변수에 있으면 못 잡는다. 변수 경유까지 보려면 이전 쿼리의
  // 값을 이 쿼리 것으로 오인하는 오탐이 생기는데, 오탐 1건이 가드 전체를 무력화하므로 오탐 0을 택했다.
  const viaVar = `const d = { report_type: "self" };\nawait db.from("symptom_reports").insert([d]);`;
  const checks = [
    ["잘못된 값을 잡는다", findViolations(bad).length === 1],
    ["올바른 값은 통과", findViolations(good).length === 0],
    ["쿼리 밖 동명 키는 무시", findViolations(unrelated).length === 0],
    ["뒤따르는 다른 테이블 쿼리 값이 새지 않는다", findViolations(bleed).length === 0],
    ["(한계) 변수 경유는 못 잡는다 — 오탐 0을 택한 결과", findViolations(viaVar).length === 0],
  ];
  let ok = true;
  for (const [name, pass] of checks) {
    console.log(`${pass ? "  ok" : "FAIL"}  ${name}`);
    if (!pass) ok = false;
  }
  console.log(ok ? "\n[selftest] 통과" : "\n[selftest] 실패");
  process.exit(ok ? 0 : 1);
}

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/node_modules|\.next|\.git|dist|coverage/.test(p)) continue;
      walk(p, out);
    } else if (EXT.test(e.name) && !/\.test\.|\.spec\./.test(e.name)) {
      if (e.name === "check-enum-values.mjs") continue; // 자기시험 문자열을 자기가 잡지 않도록
      out.push(p);
    }
  }
  return out;
}

const files = ROOTS.flatMap((r) => walk(r, []));
const violations = files.flatMap((f) =>
  findViolations(fs.readFileSync(f, "utf8"), f.replace(/\\/g, "/"))
);

if (violations.length === 0) {
  console.log(`[check:enum-values] OK — ${files.length}개 파일, 어긋나는 값 0건`);
  process.exit(0);
}

console.error(`[check:enum-values] DB 검사규칙에 없는 값 ${violations.length}건\n`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}`);
  console.error(`    ${v.table}.${v.col} = "${v.val}"`);
  console.error(`    허용: ${v.allowed.join(", ")}\n`);
}
console.error("이 값들은 DB 가 거부한다. 저장이 조용히 실패하고 화면은 성공처럼 보인다.");
process.exit(1);
