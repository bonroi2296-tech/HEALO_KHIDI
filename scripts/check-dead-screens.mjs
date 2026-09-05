#!/usr/bin/env node
/**
 * check-dead-screens — 어드민 메뉴 ↔ 실DB 대조 (한 달에 한 번)
 *
 * 왜: 「이 화면 안 쓰니까 메뉴에서 내리자」는 판정이 **사람 기억으로 관리되고 있었다.**
 *     2026-07-24 에 실DB 0행으로 판정해 10개를 숨겼는데, 2026-08-25 에 다시 재보니
 *       · 자동개선 현황(/admin/automation/playbook) — 숨겨져 있는데 **매일 돌고 있었다**
 *         (auto_jobs 184건, 마지막 8/24). 연결된 표를 playbook_patterns 로 잘못 잡은 탓.
 *       · 비자·후속일정·경과기록 — 0 → 살아남(1·3·2건)
 *     즉 «죽었다»는 판정에는 유통기한이 있다. 사람이 기억할 일이 아니라 기계가 잴 일이다.
 *
 * 무엇을 보나:
 *   ① 메뉴에 «보이는데» 연결된 표가 전부 0행  → 내릴 후보
 *   ② 보관함에 «숨겨 뒀는데» 표에 행이 있음    → 되살릴 후보 (위 자동화가 이 경우였다)
 *   ③ 지도(SCREEN_TABLES)에 없는 화면          → 오류로 막는다. 지도가 낡으면 ①②가 조용히 헛돈다.
 *
 * 판정하지 않는 화면: 집계·도구 화면처럼 «자기 표»가 없는 것은 tables: [] 로 둔다(제외 명시).
 *   ⚠️ 모르면 [] 로 둬라. 잘못된 표를 갖다 붙이면 위 자동화처럼 **멀쩡한 화면이 죽은 걸로 찍힌다.**
 *
 * 사용:
 *   node scripts/check-dead-screens.mjs             # 실DB 대조 리포트
 *   node scripts/check-dead-screens.mjs --selftest  # DB 없이 지도·파서만 검사
 *
 * 필요 env (.env.local 자동 로드): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * 종료코드: 지도 누락(③)이면 1, 나머지는 리포트만 하고 0.
 *   («내릴 후보»가 있다고 빌드를 막지 않는다 — 상시 빨간불이 되면 아무도 안 본다.)
 */
import fs from "node:fs";

const NAV = "app/admin/_components/AdminNav.jsx";
const HIDDEN_GROUP_MARK = '비활성 화면 (메뉴에서 숨김)';

// 화면 → 그 화면이 실제로 읽는 표. 근거는 각 화면이 부르는 /api/admin/... 라우트의 .from("…").
const SCREEN_TABLES = {
  // ── 홈·집계 (자기 표 없음)
  "/admin": [],
  "/admin/khidi/kpi-dashboard": [],
  "/admin/khidi/north-star": [],
  "/admin/khidi/conversion": [],
  "/admin/khidi/evidence": [],
  "/admin/analytics": ["inquiries"],
  "/admin/khidi/ad-budget": [],
  "/admin/khidi/satisfaction": ["survey_responses"],
  // ── 상담·문의
  "/admin/inquiries": ["inquiries"],
  "/admin/khidi/cases": ["case_status_history"],
  "/admin/chat": ["chat_threads"],
  "/admin/agent": ["chat_threads"],
  "/admin/consultations": ["consultation_sessions"],
  "/admin/khidi/referrals": ["cotreatment_referrals"],
  "/admin/reminders": ["reminders_scheduled"],
  // ── 파트너·회원
  "/admin/staff": [], // 계정은 auth.users 의 app_metadata — public 표가 아니다
  "/admin/khidi/agencies": ["agencies"],
  "/admin/khidi/partners": ["partner_outreach"],
  "/admin/hospitals": ["hospitals"],
  "/admin/leads": ["hospital_leads"],
  "/admin/users": ["profiles"],
  // 삭제 요청은 0건이 «정상»이다(법으로 있어야 하는 창구). 표를 달면 매달 오탐이 난다.
  "/admin/account/deletion-requests": [],
  // ── 콘텐츠
  "/admin/education": ["education_contents"],
  "/admin/rag": ["rag_documents"],
  "/admin/rag/documents": ["rag_documents"],
  "/admin/treatments": ["treatments", "treatment_sources"],
  // ── AI 품질
  "/admin/ai-status": [],
  "/admin/khidi/ai-quality": ["ai_response_evaluations"],
  "/admin/khidi/ai-regression": ["ai_regression_runs"],
  "/admin/khidi/agent-analysis": [],
  "/admin/khidi/model-benchmark": [],
  "/admin/khidi/ai-feedback": ["chat_feedback"],
  "/admin/automation/playbook": ["auto_jobs"], // ⚠️ playbook_patterns 아니다 — 2026-08-25 오판의 원인
  // ── 시스템
  "/admin/audit": ["admin_audit_logs"],
  "/admin/khidi/usage": ["ai_usage_events"],
  "/admin/settings/notifications": ["admin_notification_recipients"],
  "/admin/settings/branding": ["site_settings"],
  // ── 보관함(피벗 전 도구)
  "/admin/import": [],
  "/admin/enrichment": ["hospital_offer_jobs", "hospital_offer_enrich_jobs"],
  "/admin/observability": [],
  "/admin/crawl": ["crawl_jobs"],
  "/admin/crawl/pipeline": ["crawl_jobs"],
  "/admin/crawl/review": ["crawl_raw_items"],
  "/admin/playbook": ["playbook_patterns"],
  "/admin/playbook-patterns": ["playbook_patterns"],
  "/admin/playbook-analytics": ["playbook_usage_events"],
  "/admin/doctors": ["partner_doctors", "partner_branches"],
};

/**
 * 「표에 행은 있지만 그래도 숨겨 둔다」고 사람이 이미 판단한 화면.
 * 이유를 안 적어 두면 매달 같은 줄이 떠서 결국 리포트 전체를 안 보게 된다.
 * 지울 땐 이유가 아직 유효한지부터 확인할 것.
 */
const KEEP_HIDDEN = {
  "/admin/playbook-analytics":
    "playbook_usage_events 60건이 전부 «못 맞춤»이다(used=false·retrieved=0, 2026-08-25 확인) — " +
    "응대 패턴이 0건이라 분석할 게 없다. 그중 사람 상담 요청은 /admin/chat 의 「검토요청」 딱지로 이미 보인다.",
};

/** AdminNav.jsx 를 읽어 { visible:[href], hidden:[href] } 로 가른다. */
export function parseNav(src) {
  const cut = src.indexOf(HIDDEN_GROUP_MARK);
  if (cut === -1) {
    throw new Error(`AdminNav 에서 보관함 표시("${HIDDEN_GROUP_MARK}")를 못 찾았다 — 이 검사기의 파서를 고쳐라.`);
  }
  const hrefs = (chunk) =>
    [...chunk.matchAll(/href:\s*"([^"]+)"/g)]
      .map((m) => m[1])
      // 코디 포털 화면으로 연결한 항목은 어드민 화면이 아니다(그쪽 살림은 코디 몫).
      .filter((h) => h.startsWith("/admin"));
  return {
    visible: [...new Set(hrefs(src.slice(0, cut)))],
    hidden: [...new Set(hrefs(src.slice(cut)))],
  };
}

/** .env.local 에서 한 값만 읽는다. 이 저장소 값은 따옴표 + 끝에 리터럴 \n 이 붙어 있다. */
function envFromFile(key) {
  if (process.env[key]) return process.env[key];
  for (const f of [".env.local", ".env"]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const t = line.trim();
      if (!t.startsWith(`${key}=`)) continue;
      return t.slice(key.length + 1).trim().replace(/^["']|["']$/g, "").replace(/(?:\\[rn])+$/g, "").trim();
    }
  }
  return null;
}

/** PostgREST 로 정확한 행 수(count=exact). n_live_tup 같은 추정치는 틀린다. */
async function countRows(url, key, table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
  });
  if (!res.ok) return null;
  const range = res.headers.get("content-range") || "";
  const n = Number(range.split("/")[1]);
  return Number.isFinite(n) ? n : null;
}

// ───────────────────────── selftest (DB 없이) ─────────────────────────
if (process.argv.includes("--selftest")) {
  const src = fs.readFileSync(NAV, "utf8");
  const { visible, hidden } = parseNav(src);
  const fail = (m) => { console.error(`❌ selftest: ${m}`); process.exit(1); };

  if (visible.length === 0) fail("보이는 화면을 하나도 못 찾았다 — 파서가 깨졌다.");
  if (hidden.length === 0) fail("보관함 화면을 하나도 못 찾았다 — 파서가 깨졌다.");
  const overlap = visible.filter((h) => hidden.includes(h));
  if (overlap.length) fail(`같은 화면이 양쪽에 있다: ${overlap.join(", ")}`);

  const unmapped = [...visible, ...hidden].filter((h) => !(h in SCREEN_TABLES));
  if (unmapped.length) fail(`지도(SCREEN_TABLES)에 없는 화면: ${unmapped.join(", ")}`);

  const stale = Object.keys(SCREEN_TABLES).filter((h) => !visible.includes(h) && !hidden.includes(h));
  if (stale.length) fail(`메뉴에 없는데 지도에만 남은 화면: ${stale.join(", ")}`);

  // 예외는 «보관함에 있는 화면»에만 걸 수 있다. 화면이 다시 올라왔는데 예외가 남아 있으면 죽은 예외다.
  const zombie = Object.keys(KEEP_HIDDEN).filter((h) => !hidden.includes(h));
  if (zombie.length) fail(`보관함에 없는데 예외(KEEP_HIDDEN)만 남은 화면: ${zombie.join(", ")}`);

  console.log(`✅ selftest 통과 — 보이는 화면 ${visible.length} · 보관함 ${hidden.length} · 지도 ${Object.keys(SCREEN_TABLES).length}`);
  process.exit(0);
}

// ───────────────────────── 실DB 대조 ─────────────────────────
const src = fs.readFileSync(NAV, "utf8");
const { visible, hidden } = parseNav(src);

const unmapped = [...visible, ...hidden].filter((h) => !(h in SCREEN_TABLES));
if (unmapped.length) {
  console.error("❌ 지도(SCREEN_TABLES)에 없는 어드민 화면이 있다 — 넣고 다시 돌려라:");
  unmapped.forEach((h) => console.error(`   ${h}`));
  process.exit(1);
}

const url = envFromFile("NEXT_PUBLIC_SUPABASE_URL");
const key = envFromFile("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.warn("⚠️  Supabase env 없음 — 실DB 대조를 건너뛴다(지도 검사만 통과).");
  process.exit(0);
}

const tables = [...new Set(Object.values(SCREEN_TABLES).flat())];
const counts = {};
for (const t of tables) counts[t] = await countRows(url, key, t);

const unreadable = tables.filter((t) => counts[t] === null);
const sum = (hrefs) => SCREEN_TABLES[hrefs].reduce((a, t) => a + (counts[t] ?? 0), 0);
const judged = (h) => SCREEN_TABLES[h].length > 0 && SCREEN_TABLES[h].every((t) => counts[t] !== null);

const toArchive = visible.filter((h) => judged(h) && sum(h) === 0);
const toRestore = hidden.filter((h) => judged(h) && sum(h) > 0 && !(h in KEEP_HIDDEN));
const kept = hidden.filter((h) => judged(h) && sum(h) > 0 && h in KEEP_HIDDEN);

const detail = (h) => SCREEN_TABLES[h].map((t) => `${t} ${counts[t]}건`).join(" · ");

console.log(`\n📋 어드민 화면 ↔ 실DB 대조 (${new Date().toISOString().slice(0, 10)})`);
console.log(`   보이는 화면 ${visible.length} · 보관함 ${hidden.length} · 판정 제외 ${Object.values(SCREEN_TABLES).filter((v) => v.length === 0).length}\n`);

if (toArchive.length) {
  console.log("🔻 메뉴에 보이는데 데이터가 0건 — 내릴 후보:");
  toArchive.forEach((h) => console.log(`   ${h}  (${detail(h)})`));
} else {
  console.log("🔻 내릴 후보: 없음");
}

if (toRestore.length) {
  console.log("\n🔺 보관함에 숨겼는데 데이터가 쌓이는 중 — 되살릴 후보:");
  toRestore.forEach((h) => console.log(`   ${h}  (${detail(h)})`));
} else {
  console.log("🔺 되살릴 후보: 없음");
}

if (kept.length) {
  console.log("\n🗄️  행은 있지만 숨긴 채로 두기로 한 것(사람 판단):");
  kept.forEach((h) => console.log(`   ${h}  (${detail(h)})\n      ↳ ${KEEP_HIDDEN[h]}`));
}

if (unreadable.length) {
  console.log(`\n⚠️  못 읽은 표(판정에서 뺐다): ${unreadable.join(", ")}`);
}
console.log("");
