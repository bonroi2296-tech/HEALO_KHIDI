#!/usr/bin/env node
/**
 * 훑기 대장 — 「전체 훑어봐 / 더 확인할 건 없어?」에 «매번 같은 자리»를 보게 하는 명령.
 *
 * 왜 만들었나 (2026-08-14 PO 지시):
 *   PO 가 같은 말을 해도 세션마다 «다른 데»를 봤다.
 *     2026-08-13 클라우드 세션: 라우트 → 저장소 → 접근권한 → AI 프롬프트 → 알림
 *     2026-08-14 이 세션:       DB 표 → 접근권한 → 화면에 박힌 열쇠 → 배포 상태
 *   그날 본 자리에서만 결함이 나오니, 「훑었다」가 세션마다 다른 뜻이 됐다.
 *   PO: *"니가 바라보는 지점이 다 다르잖아? 그걸 메뉴얼화해서 매번 확인할 수 있게 만들면 좋지 않니?"*
 *
 * 왜 문서가 아니라 스크립트인가:
 *   CLAUDE.md 7번의 「만들기 전 3질문」을 적용한 결과다.
 *     ①검출이 기계적으로 명확한가 → 아래 5개는 전부 질의 한 방으로 판정된다(예/아니오가 갈린다).
 *     ②몇 %를 덮나 → 2026-08-14 실제로 나온 결함 4건 중 3건이 여기 걸린다(나머지 1건=지도 화면은 눈으로 봐야 함).
 *     ③내가 피해 가게 되진 않나 → 손으로 하는 것보다 이게 «빠르니까» 쓰게 된다. 문서였다면 안 읽었을 것이다.
 *   그래서 기계가 못 재는 것은 억지로 넣지 않고 아래 「사람이 봐야 하는 것」에 이름만 적어 둔다.
 *
 * 쓰는 법:
 *   npm run sweep              # 전부
 *   npm run sweep -- --only=pii,rls
 *
 * 필요한 것: .env.local 의 SUPABASE_SERVICE_ROLE_KEY (+ 선택: VERCEL_TOKEN)
 *   없으면 그 항목만 「못 잼」으로 뜬다 — «통과»로 위장하지 않는다(야간검사 SKIP 사고와 같은 실수 방지).
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { execSync, execFileSync } from "node:child_process";

// ── .env.local 읽기 (dotenv 없이 — 값 끝 개행/따옴표 함정 포함해 직접 처리)
for (const line of fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8").split("\n") : []) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://healwith.co.kr";

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const 지정검사 = (onlyArg || "").replace("--only=", "").split(",").map((s) => s.trim()).filter(Boolean);
const want = (id) => 지정검사.length === 0 || 지정검사.includes(id);

const rows = [];
const add = (id, 이름, 판정, 근거, 옵션 = {}) => rows.push({ id, 이름, 판정, 근거, 경보: 옵션.경보 !== false });

const sb = () =>
  SUPABASE_URL && SERVICE_KEY
    ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
    : null;

/** 서비스 열쇠로 임의 SQL 을 돌리는 창구가 없으므로, 표/칸을 직접 읽어 판정한다. */
async function scanTable(client, table, cols) {
  const { data, error } = await client.from(table).select(cols.join(","));
  if (error) throw new Error(`${table}: ${error.message}`);
  const out = {};
  for (const c of cols) out[c] = { 평문: 0, 잠김: 0 };
  for (const row of data || []) {
    for (const c of cols) {
      const v = row[c];
      if (v == null || v === "") continue;
      if (typeof v === "string" && v.startsWith('{"v":"v1"')) out[c].잠김++;
      else out[c].평문++;
    }
  }
  return out;
}

// ── 1. 평문으로 남은 환자 개인정보
//    ⚠️ 표 목록을 손으로 적지 마라 — 그게 2026-08-14 사고였다(도구가 표 2개만 봐서 3칸을 놓쳤다).
//    개인정보처럼 «생긴 이름»을 가진 칸을 전부 훑는다.
const PII_TABLES = {
  inquiries: ["email", "first_name", "last_name", "contact_id"],
  chat_threads: ["guest_email", "guest_name", "guest_phone"],
  consultation_guest_tokens: ["invitee_email", "invitee_name"],
  reminders_scheduled: ["recipient_address"],
  profiles: ["full_name"],
  cancer_patient_intakes: ["first_name"],
  chat_feedback: ["guest_email"],
};

/**
 * 「지금 어느 가지에서 재고 있나」 — 이 검사가 «맨 앞»에 있는 이유.
 *
 * 아래 검사들은 대부분 «작업 폴더의 파일»을 읽는다(사전 파일·capacitor.build.gradle·
 * KNOWN_ISSUES 표…). 그래서 폴더가 낡은 가지에 서 있으면 **이미 고친 것이 다시 뜬다.**
 *
 * 2026-08-30 실측: 본판 폴더가 8/28 19:14 부터 `docs/handoff-ai-guards`(origin/main 보다
 * 21커밋 뒤)에 서 있었다. 그 상태로 훑으니 「코디 교정 미반영 13건」이 떴는데,
 * origin/main 에서 다시 재니 **0건**이었다. 하루 전에 고쳐 합친 것이 «안 고쳐진 것»으로 보였다.
 * 더 위험한 건 그 자리에서 만든 신청서다 — 그대로 합쳤으면 21커밋이 되돌아갔다.
 *
 * ⚠️ 가지 이름으로 판정하지 마라(main 이어도 pull 을 안 했으면 낡는다). **거리로 잰다.**
 */
function 검사_재는자리() {
  let 가지, 뒤처짐, 앞섬;
  try {
    execSync("git fetch -q origin main", { stdio: "ignore" });
    가지 = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
    뒤처짐 = Number(execSync("git rev-list --count HEAD..origin/main", { encoding: "utf8" }).trim());
    앞섬 = Number(execSync("git rev-list --count origin/main..HEAD", { encoding: "utf8" }).trim());
  } catch {
    return add("where", "지금 어느 가지에서 재나", "못 잼", "git 상태를 못 읽는다");
  }
  const 꼬리 = 앞섬 ? ` · 나만 가진 것 ${앞섬}개` : "";
  if (뒤처짐 === 0) return add("where", "지금 어느 가지에서 재나", "통과", `${가지} · origin/main 과 같은 자리${꼬리}`);
  // 작업 중이면 한두 개 뒤처지는 건 흔하다 — 아래 검사가 오판할 만큼 벌어졌을 때만 세운다.
  if (뒤처짐 < 5) return add("where", "지금 어느 가지에서 재나", "통과", `${가지} · ${뒤처짐}커밋 뒤${꼬리}`);
  return add(
    "where",
    "지금 어느 가지에서 재나",
    "볼 것",
    `${가지} 가 origin/main 보다 ${뒤처짐}커밋 뒤에 있다${꼬리} → **아래 결과를 그대로 믿지 마라**(이미 고친 것이 다시 뜬다). ` +
      "여기서 신청서를 만들면 그만큼 되돌아간다. `git checkout main && git pull` 뒤 다시 훑어라"
  );
}

async function 검사_평문개인정보() {
  const client = sb();
  if (!client) return add("pii", "평문으로 남은 개인정보", "못 잼", "SUPABASE_SERVICE_ROLE_KEY 없음");
  // 이미 알고 있고 「지금은 안 고치기로」 한 몫은 조용히 넘긴다. 안 그러면 매일 같은 경보가 울려
  // 사람이 검사 전체를 무시하게 된다. 대신 «늘어나면» 알리고, «재검토일이 지나면» 그것도 알린다.
  let 기준 = { 평문개인정보: { 허용: {}, 재검토일: null } };
  try { 기준 = JSON.parse(fs.readFileSync(path.join("docs", "sweep-baseline.json"), "utf8")); } catch { /* 없으면 전부 알린다 */ }
  const 허용 = 기준.평문개인정보?.허용 || {};
  const 재검토일 = 기준.평문개인정보?.재검토일;

  const 새로늘어난 = [];
  const 알던것 = [];
  for (const [t, cols] of Object.entries(PII_TABLES)) {
    let r;
    try {
      r = await scanTable(client, t, cols);
    } catch (e) {
      새로늘어난.push(`${t}(읽기실패: ${String(e.message).slice(0, 40)})`);
      continue;
    }
    for (const [c, n] of Object.entries(r)) {
      if (n.평문 === 0) continue;
      const 키 = `${t}.${c}`;
      if (n.평문 > (허용[키] || 0)) 새로늘어난.push(`${키}=${n.평문}건(알던 것 ${허용[키] || 0})`);
      else 알던것.push(`${키}=${n.평문}`);
    }
  }
  const 기한지남 = 재검토일 && new Date().toISOString().slice(0, 10) > 재검토일;
  if (기한지남) 새로늘어난.push(`재검토일(${재검토일}) 지남 — 이제 고칠 때`);

  add(
    "pii",
    "평문으로 남은 개인정보",
    새로늘어난.length ? "볼 것" : "통과",
    새로늘어난.length
      ? 새로늘어난.join(" · ")
      : `훑은 칸 ${Object.values(PII_TABLES).flat().length}개 — 새로 늘어난 것 0건` +
        (알던것.length ? ` (이미 아는 것 ${알던것.length}칸: ${알던것.join(", ")} · 재검토 ${재검토일})` : "")
  );
}

// ── 2. 접근권한 규칙(RLS)이 꺼졌거나 익명에게 열린 표
//    익명 열쇠로 실제 읽어본다 — 설정을 보는 게 아니라 «진짜 읽히나»를 잰다.
const ANON_MUST_NOT_READ = [
  "inquiries",
  "chat_threads",
  "profiles",
  "consultation_guest_tokens",
  "reminders_scheduled",
  "case_opinions",
  "cancer_patient_intakes",
];

async function 검사_익명읽기() {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !anon) return add("rls", "익명이 환자 표를 읽나", "못 잼", "익명 열쇠 없음");
  const client = createClient(SUPABASE_URL, anon, { auth: { persistSession: false } });

  // ⚠️ 먼저 «열쇠가 살아 있나»를 본다 — 이게 없으면 이 검사가 거짓 초록불이 된다.
  //    아래 판정은 「읽혔나」만 보므로, 열쇠가 죽어 모든 조회가 오류나면 뚫림이 0건이 되어
  //    「✅ 표 7개 전부 0건」으로 통과해 버린다. «막혀서 0건»과 «못 물어봐서 0건»은 다른 자리다.
  //    (2026-08-28: 같은 부류인 「파이프가 실패를 삼키던 것」을 고치다 이 자리도 같이 발견했다.)
  //    hospitals 는 손님이 읽어야 «정상»인 표다 — 정책 hospitals_public_read = anon SELECT.
  //    실측(진짜 anon 권한으로 조회): hospitals 8행 보임 / inquiries·profiles 0행.
  const 미끼 = await client.from("hospitals").select("id").limit(1);
  if (미끼.error || !미끼.data?.length) {
    return add(
      "rls",
      "익명이 환자 표를 읽나",
      "못 잼",
      `손님 열쇠로 «공개 표»조차 못 읽는다 — 열쇠가 죽었거나 막혔다(${미끼.error?.message || "0건"}). ` +
        "이 상태의 「환자 표 0건」은 «막혔다»는 뜻이 아니다.",
    );
  }

  const 뚫림 = [];
  for (const t of ANON_MUST_NOT_READ) {
    const { data, error } = await client.from(t).select("*").limit(1);
    if (!error && Array.isArray(data) && data.length > 0) 뚫림.push(t);
  }
  add("rls", "익명이 환자 표를 읽나", 뚫림.length ? "볼 것" : "통과", 뚫림.length ? `읽힘: ${뚫림.join(", ")}` : `표 ${ANON_MUST_NOT_READ.length}개 전부 0건`);
}

// ── 3. 실서비스 화면에 박혀서 나가는 열쇠
//    ⚠️ 로그인은 /login 이다 — /ko/login 이 아니다(login 은 proxy.ts PUBLIC_PREFIXES 에 없어 언어 접두사가
//    안 붙는다 → /ko/login 은 실서비스에서 «항상 404»였다). 2026-08-30 까지는 fetch 실패·오류를 삼키는
//    바람에 이 검사가 로그인 화면 대신 404 페이지를 훑고도 조용히 「통과」로 찍혀 아무도 몰랐다.
const PAGES = ["/ko", "/ko/inquiry", "/ko/hospitals", "/login"];

async function 검사_화면에박힌열쇠() {
  // ⚠️ fetch 실패를 삼키지 않는다 (2026-08-30 감사): 예전엔 실패한 페이지를 그냥 continue 해서,
  //    사이트가 안 열리는 날(DNS 오류·다운·CI 네트워크 차단)에도 「통과: 0건」이 찍혔다 —
  //    «못 물어봐서 0건»이 «없어서 0건»으로 위장하는, 아래 rls 검사가 미끼 조회로 막아 둔 바로 그 함정이
  //    이 검사에만 남아 있었다. HTTP 오류(res.ok 아님)도 같은 이유로 «본 것»으로 안 친다 —
  //    짧은 오류 페이지엔 열쇠가 없으니 «진짜 화면은 안 보고» 통과가 되기 때문.
  const 발견 = new Set();
  const 못본페이지 = [];
  for (const p of PAGES) {
    let html;
    try {
      const res = await fetch(SITE + p);
      if (!res.ok) {
        못본페이지.push(`${p}(HTTP ${res.status})`);
        continue;
      }
      html = await res.text();
    } catch {
      못본페이지.push(`${p}(응답 없음)`);
      continue;
    }
    for (const m of html.matchAll(/AIza[0-9A-Za-z_-]{35}/g)) 발견.add(m[0].slice(0, 10) + "…");
    for (const m of html.matchAll(/\bsk-[A-Za-z0-9]{20,}/g)) 발견.add("sk-… (매우 위험)");
    for (const m of html.matchAll(/service_role/g)) 발견.add("service_role 문자열");
  }
  // 지도 열쇠 1개는 원래 브라우저로 나가는 값이라 정상 — 2개 이상이거나 sk-/service_role 이면 볼 것.
  const 위험 = [...발견].filter((k) => !k.startsWith("AIza"));
  if (위험.length === 0 && 못본페이지.length > 0) {
    return add(
      "keys",
      "화면에 박혀 나가는 열쇠",
      "못 잼",
      `${PAGES.length}개 중 ${못본페이지.length}개 페이지를 못 봤다: ${못본페이지.join(", ")} — 못 본 «0건»은 «없음»이 아니다`
    );
  }
  add(
    "keys",
    "화면에 박혀 나가는 열쇠",
    위험.length ? "볼 것" : "통과",
    (발견.size ? `발견: ${[...발견].join(", ")} (구글 지도 열쇠 1개는 정상)` : `${PAGES.length}개 페이지 전부 확인, 0건`) +
      (위험.length && 못본페이지.length ? ` · 못 본 페이지 ${못본페이지.length}개: ${못본페이지.join(", ")}` : "")
  );
}

// ── 4. 코드가 읽는 환경변수 이름 ↔ 실제 있는 이름 대조
//    2026-08-14 에 이 부류로 «두 번» 당했다(지도 열쇠·암호화 열쇠). 검사기가 없는 이름을 보고 있었다.
async function 검사_환경변수이름() {
  let 코드가읽는이름;
  try {
    const out = execSync(
      `git grep -hoE "process\\.env\\.[A-Z_][A-Z0-9_]+" -- src app scripts`,
      { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }
    );
    코드가읽는이름 = new Set(out.split("\n").filter(Boolean).map((s) => s.replace("process.env.", "")));
  } catch {
    return add("env", "코드가 읽는 환경변수 이름", "못 잼", "git grep 실패");
  }
  // check-env.js 가 요구하는 이름이 실제로 코드에 있나 (반대 방향 = 오늘의 사고)
  const src = fs.readFileSync(path.join("scripts", "check-env.js"), "utf8");
  const 검사기가보는이름 = [...src.matchAll(/^\s{2}([A-Z_][A-Z0-9_]+):/gm)].map((m) => m[1]);
  // 일부러 안 쓰는 이름 — 여기 적는 건 「왜 안 쓰는지」가 검사기 주석에 이미 적혀 있는 것만.
  // (헛경보를 남겨두면 다음 사람이 경고 전체를 무시하게 된다. 그게 이 검사를 죽이는 길이다.)
  const 일부러안씀 = new Set(["NEXT_PUBLIC_GA_MEASUREMENT_ID"]); // 측정ID는 src/lib/ga.ts 상수가 단일 진실원천
  const 유령 = 검사기가보는이름.filter((k) => !코드가읽는이름.has(k) && !일부러안씀.has(k));
  add(
    "env",
    "검사기가 «없는» 환경변수를 보나",
    유령.length ? "볼 것" : "통과",
    유령.length ? `코드 어디서도 안 읽는 이름: ${유령.join(", ")}` : `검사기 항목 ${검사기가보는이름.length}개 전부 코드에 존재`
  );
}

// ── 5. 본판에 합쳤는데 아직 실서비스에 안 나간 것
async function 검사_미배포() {
  let live;
  try {
    live = (await (await fetch(SITE + "/api/health")).json()).commit;
  } catch {
    return add("deploy", "본판 ↔ 실서비스 차이", "못 잼", "/api/health 응답 없음");
  }
  let 목록;
  try {
    execSync("git fetch -q origin", { stdio: "ignore" });
    목록 = execSync(`git log --oneline ${live}..origin/main`, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  } catch {
    return add("deploy", "본판 ↔ 실서비스 차이", "못 잼", `실서비스 커밋 ${String(live).slice(0, 8)} 을 이 저장소에서 못 찾음`);
  }
  // 「안 나간 게 있다」는 «정상»이다 — 배포는 하루 한 번이라 합친 직후엔 늘 차이가 난다.
  // 이걸 경보로 삼으면 매일 울려서 사람이 곧 무시하게 된다.
  // 진짜 이상은 «창구가 멈춘 것» → 제일 오래된 미배포 커밋이 이틀을 넘었나로 판정한다.
  let 오래된일수 = 0;
  if (목록.length) {
    try {
      const 가장오래된 = execSync(`git log -1 --format=%ct ${live}..origin/main --reverse`, { encoding: "utf8" }).trim();
      const t = Number(execSync(`git log --format=%ct ${live}..origin/main`, { encoding: "utf8" }).trim().split("\n").pop());
      오래된일수 = Math.floor((Date.now() / 1000 - (t || Number(가장오래된))) / 86400);
    } catch { /* 못 재면 0 으로 둔다 — 아래에서 「볼 것」이 안 된다 */ }
  }
  add(
    "deploy",
    "본판 ↔ 실서비스 차이",
    오래된일수 > 2 ? "볼 것" : "통과",
    목록.length
      ? `아직 안 나간 것 ${목록.length}건, 가장 오래된 것 ${오래된일수}일째` +
        (오래된일수 > 2 ? " ← 창구가 멈춘 것 아닌지 확인" : " (창구 = 매일 15:00 KST, 정상)")
      : "차이 없음"
  );
}

// ── 6. 예약 작업이 «돌고 있나»
//    반복 사고 부류 1위다 — 과거 반성문 180건 중 «조용히 0건/안 나감/가짜 성공»이 22건으로 최다인데
//    그때까지 이걸 상시로 보는 검사가 하나도 없었다(2026-08-14 실측).
//
//    🛑 함정: 「결과물 표」가 아니라 「실행 기록 표」를 봐라.
//    2026-08-14 에 `auto_job_events` 가 14일간 0건이길래 「자동작업이 죽었다」고 쓸 뻔했다.
//    그 표는 «고칠 게 있었을 때만» 쌓인다. 실제 실행 기록은 `auto_jobs` 에 있었고 14일 14회 정상이었다.
//    → 새 항목을 추가할 땐 «작업이 돌면 «무조건» 한 줄 남는 표»를 골라라.
const 예약작업 = [
  { 이름: "일별 점수판", 표: "kpi_snapshots", 날짜칸: "snapshot_date", 주기일: 1 },
  // ⚠️ 주기일은 vercel.json 의 crons 와 맞춰라. AI 자가시험은 «매일»이 아니라 월·목이다
  //    (`/api/cron/run-regression-tests`, `0 18 * * 1,4`) → 목→월 사이가 4일.
  //    1 로 두면 정상인데도 매주 「볼 것」이 떠서 훑기가 늑대소년이 된다(2026-08-20 실제 오탐).
  { 이름: "AI 자가시험", 표: "ai_regression_runs", 날짜칸: "run_date", 주기일: 4 },
  { 이름: "자동 개선작업", 표: "auto_jobs", 날짜칸: "started_at", 주기일: 1 },
];

async function 검사_예약작업() {
  const client = sb();
  if (!client) return add("cron", "예약 작업이 돌고 있나", "못 잼", "SUPABASE_SERVICE_ROLE_KEY 없음");
  const 멈춤 = [];
  const 정상 = [];
  for (const j of 예약작업) {
    const { data, error } = await client.from(j.표).select(j.날짜칸).order(j.날짜칸, { ascending: false }).limit(1);
    if (error) {
      멈춤.push(`${j.이름}(읽기실패)`);
      continue;
    }
    const 마지막 = data?.[0]?.[j.날짜칸];
    if (!마지막) {
      멈춤.push(`${j.이름}(기록 0건)`);
      continue;
    }
    const 지난일 = Math.floor((Date.now() - new Date(마지막).getTime()) / 86400000);
    // 주기 + 1일까지는 정상(오늘 것이 아직 안 돌았을 수 있다)
    if (지난일 > j.주기일 + 1) 멈춤.push(`${j.이름}=${지난일}일째 없음`);
    else 정상.push(`${j.이름} ${지난일}일 전`);
  }
  add("cron", "예약 작업이 돌고 있나", 멈춤.length ? "볼 것" : "통과", 멈춤.length ? 멈춤.join(" · ") : 정상.join(" · "));
}

// ── 7. 폰 앱에 «안 들어간» 네이티브 고침
//    왜: 이 앱은 라이브 로드라 «웹은 고치면 즉시 폰에 반영»된다. 그래서 앱 고침도 그럴 거라고
//    착각하기 쉬운데, 캡시터 부품(플러그인)·AndroidManifest·capacitor.config 같은 «네이티브»는
//    앱 파일(AAB)을 새로 구워 스토어에 올려야만 폰에 간다.
//    2026-08-19 PO 제보가 정확히 이것이었다 — 뒤로가기 고침(8/5, `@capacitor/app` 부품 추가)을
//    합치고 배포까지 했는데 폰은 그대로였다. 스토어 판(빌드 7)이 8/4 소스라 부품 자체가 없었다.
//
//    🛑 «커밋을 세지» 않는다 (2026-08-20 정정 — 첫 판이 그렇게 만들었다가 헛것을 셌다).
//       이 저장소는 2026-08-10 에 역사가 한 번 정리돼서, 출시본을 구운 커밋이 본판 역사에
//       «없을 수» 있다. 그러면 `git log 기준..본판` 이 아무것도 안 걸러내고 본판 전체를 센다
//       (실측: 기준 2c6b555d 와 본판의 공통 조상 0개, 범위 = 본판 53커밋 전부).
//       버전코드 비교도 안 된다 — 8/5 의 그 뒤로가기 고침은 «버전코드를 안 올리고» 부품만 넣었다.
//    ✅ 그래서 **출시본에 실린 부품 목록과 지금 부품 목록을 직접 맞대 본다.** 역사가 갈려도,
//       버전코드를 안 올려도 잡힌다. 실제로 이 방식이면 8/5 그 고침이 그날 바로 걸렸다.
const 네이티브경로 = ["capacitor.config.ts", "android", "ios"];

/**
 * capacitor.build.gradle 에서 실제로 «앱에 박히는» 부품 이름을 뽑는다.
 *
 * 🔴 **2026-08-30: 여기에 `capacitor-` 접두사 제한이 걸려 있어 2년치 «서드파티» 부품을 통째로 놓쳤다.**
 *   공식 부품은 `capacitor-app` 처럼 시작하지만, 남이 만든 것은 만든 곳 이름이 앞에 붙는다 —
 *   `capawesome-capacitor-apple-sign-in`(애플 로그인) · `capgo-capacitor-social-login`(구글 로그인).
 *   즉 **하필 「새로 넣어서 폰에 아직 안 간」 부품만 골라서 안 보였다.** 8/28 애플 로그인을 넣었을 때도
 *   이 검사는 「부품 5개 전부 출시본에 있음」이라며 조용했다.
 *   → 이 파일은 캡시터가 «부품만» 적어 생성하므로 접두사로 거를 이유가 없다. 전부 잡는다.
 */
function 부품목록(gradleText) {
  return [...gradleText.matchAll(/project\(['"]:([a-z0-9-]+)['"]\)/g)].map((m) => m[1]).sort();
}

async function 검사_앱미반영() {
  let 기준;
  try {
    기준 = JSON.parse(fs.readFileSync(path.join("docs", "sweep-baseline.json"), "utf8")).앱출시?.안드로이드;
  } catch {
    /* 아래에서 「못 잼」 */
  }
  if (!기준?.versionCode || !Array.isArray(기준.부품)) {
    return add("app", "폰 앱에 안 들어간 고침", "못 잼", "docs/sweep-baseline.json 의 「앱출시」 칸이 비었거나 부품 목록이 없다");
  }

  const gradle = fs.readFileSync(path.join("android", "app", "build.gradle"), "utf8");
  const 저장소 = Number((gradle.match(/versionCode\s+(\d+)/) || [])[1] || 0);
  const 저장소이름 = (gradle.match(/versionName\s+"([^"]+)"/) || [])[1] || "?";
  const 폰 = `${기준.versionCode}(${기준.versionName}, ${기준.게시일} 게시)`;

  // ① 부품 대조 — 가장 확실한 신호. 저장소엔 있는데 출시본엔 없는 부품 = 폰에서 «그 기능이 죽어 있다».
  const 현재부품 = 부품목록(fs.readFileSync(path.join("android", "app", "capacitor.build.gradle"), "utf8"));
  const 안실린부품 = 현재부품.filter((p) => !기준.부품.includes(p));

  // ② 커밋 목록 — «기준 커밋이 본판 역사에 실제로 있을 때만» 의미가 있다(위 🛑 참고).
  let 커밋 = null;
  let 범위못씀 = null;
  if (기준.빌드한소스) {
    try {
      let 끝 = "HEAD";
      try {
        끝 = execSync("git rev-parse --verify -q origin/main", { encoding: "utf8" }).trim() || "HEAD";
      } catch {
        /* 원격 사본이 없으면 지금 자리 기준 */
      }
      execSync(`git merge-base --is-ancestor ${기준.빌드한소스} ${끝}`, { stdio: "ignore" });
      커밋 = execSync(`git log --oneline ${기준.빌드한소스}..${끝} -- ${네이티브경로.join(" ")}`, { encoding: "utf8" })
        .trim()
        .split("\n")
        .filter(Boolean);
    } catch {
      범위못씀 = `기준 커밋 ${String(기준.빌드한소스).slice(0, 8)} 이 본판 역사에 없다 — 커밋 세기는 건너뛴다(부품 대조로만 판정). 다음 판을 구우면 «본판» 커밋으로 다시 잡아라`;
    }
  }

  const 볼것 = 안실린부품.length > 0 || (커밋 && 커밋.length > 0);
  const 조각 = [`스토어 판 ${폰} · 저장소 ${저장소}(${저장소이름})`];
  if (안실린부품.length) 조각.push(`⚠️ 출시본에 «없는» 부품 ${안실린부품.length}개: ${안실린부품.join(", ")} → 그 기능은 폰에서 죽어 있다`);
  else 조각.push(`부품 ${현재부품.length}개 전부 출시본에 있음`);
  if (커밋?.length) 조각.push(`그 뒤 네이티브 고침 ${커밋.length}건: ${커밋.slice(0, 3).join(" / ")}`);
  if (범위못씀) 조각.push(범위못씀);
  if (볼것) 조각.push("앱 파일을 새로 굽기 «전»에는 폰에 안 간다");

  // 경보에서는 뺀다: 「네이티브 고침이 아직 안 나갔다」는 몇 주씩 이어지는 «정상» 상태라
  // 매일 메일이 나가면 사람이 검사 전체를 무시하게 된다(같은 이유로 미배포 검사도 안 울린다).
  add("app", "폰 앱에 안 들어간 고침", 볼것 ? "볼 것" : "통과", 조각.join(" · "), { 경보: false });
}

/**
 * 아이폰판도 같은 방식으로 대조한다 (2026-08-28 추가).
 *
 * 왜 따로 있나: 이 검사는 오랫동안 «안드로이드만» 봤다. 그래서 2026-08-28 에
 *   아이폰 빌드 3 에 `@capacitor/app` 이 안 실려 있었는데도 훑기는 「통과」로 나왔고,
 *   그날 애플 로그인이 실기기에서 죽는 것을 끝내 못 잡았다. 안드로이드와 아이폰은
 *   **부품이 따로 실린다** — 한쪽이 통과라고 다른 쪽이 통과인 게 아니다.
 *
 * ⚠️ 기준을 `ios/App/CapApp-SPM/Package.swift` 로 잡지 마라. 그 파일은 `npx cap sync ios`
 *    를 돌려야 갱신되는데, 안 돌리면 낡은 채로 남아 **거짓 통과**가 된다.
 *    `package.json` 은 부품을 넣는 순간 바뀌므로 항상 최신이다.
 *
 * 🔴 **2026-08-30: 안드로이드 쪽(#1536)과 «같은 사고»가 여기엔 그대로 남아 있었다.**
 *   `@capacitor/`·`@capawesome/` 접두사만 잡아서 `@capgo/capacitor-social-login`(구글 로그인, 8/29 도입)이
 *   대조 대상에서 통째로 빠졌고, 그 부품이 출시본(빌드 4)에 없는 «지금» 상태를
 *   「부품 6개 전부 그 판에 있음」이라며 통과로 찍었다 — 하필 「새로 넣어서 폰에 아직 안 간」
 *   부품만 골라서 안 보이는, #1536 이 안드로이드에서 잡은 바로 그 부류다.
 *   → 이름 접두사로 거르지 않는다. **«실체»로 판정한다**: 캡시터 부품은 제 package.json 에
 *     `capacitor` 칸을 갖고, 아이폰에 실리는 부품은 제 뿌리에 Package.swift(SPM)도 갖는다
 *     (2026-08-30 실측 — 부품 7개 전부 둘 다 있고, core/cli/android/ios 는 둘 다 없어 자연히 빠진다.
 *     제외 목록은 만약을 위한 이중 안전벨트로만 남긴다).
 *   ⚠️ node_modules 를 못 읽으면 «부품 0개 = 전부 실림»이 아니라 throw 로 세운다(호출부가 «못 잼»으로
 *     보고) — 반쪽 목록으로 답하는 것이 정확히 이 검사가 잡으려는 「거짓 통과」이기 때문이다.
 */
function 아이폰부품목록() {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const 제외 = new Set(["@capacitor/core", "@capacitor/cli", "@capacitor/android", "@capacitor/ios"]);
  const 부품 = [];
  const 못읽음 = [];
  for (const n of Object.keys(pkg.dependencies || {})) {
    if (제외.has(n)) continue;
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(path.join("node_modules", n, "package.json"), "utf8"));
    } catch {
      못읽음.push(n);
      continue;
    }
    if (manifest.capacitor && fs.existsSync(path.join("node_modules", n, "Package.swift"))) 부품.push(n);
  }
  if (못읽음.length)
    throw new Error(
      `node_modules 에서 ${못읽음.length}개 패키지를 못 읽었다(${못읽음.slice(0, 3).join(", ")}${못읽음.length > 3 ? " …" : ""}) — npm install 뒤 다시 훑어라. 반쪽 목록으로 판정하면 거짓 통과가 된다`
    );
  if (부품.length === 0)
    throw new Error(
      "캡시터 부품을 하나도 못 찾았다 — 판정 표식(부품 package.json 의 capacitor 칸 + Package.swift)이 낡았는지 확인해라. 0개로 답하면 「전부 실림」이라는 거짓 통과가 된다"
    );
  return 부품.sort();
}

async function 검사_아이폰미반영() {
  let 기준;
  try {
    기준 = JSON.parse(fs.readFileSync(path.join("docs", "sweep-baseline.json"), "utf8")).앱출시?.아이폰;
  } catch {
    /* 아래에서 「못 잼」 */
  }
  if (!기준?.build || !Array.isArray(기준.부품)) {
    return add("app", "아이폰 앱에 안 들어간 고침", "못 잼", "docs/sweep-baseline.json 의 「앱출시.아이폰」 칸이 비었거나 부품 목록이 없다");
  }

  let 현재부품;
  try {
    현재부품 = 아이폰부품목록();
  } catch (e) {
    // 부품 목록을 «반쪽»으로 얻었을 때 통과로 위장하지 않는다 — 위 함수 주석의 🔴 참고.
    return add("app", "아이폰 앱에 안 들어간 고침", "못 잼", String(e.message));
  }
  const 안실린부품 = 현재부품.filter((p) => !기준.부품.includes(p));
  const 폰 = `빌드 ${기준.build}(${기준.versionName}, ${기준.게시일})`;

  const 볼것 = 안실린부품.length > 0;
  const 조각 = [`TestFlight·스토어 판 ${폰}`];
  if (안실린부품.length) {
    조각.push(`⚠️ 그 판에 «없는» 부품 ${안실린부품.length}개: ${안실린부품.join(", ")} → 그 기능은 아이폰에서 죽어 있다`);
    조각.push("아이폰 앱 파일을 새로 굽기 «전»에는 폰에 안 간다");
  } else {
    조각.push(`부품 ${현재부품.length}개 전부 그 판에 있음`);
  }

  // 안드로이드 쪽과 같은 이유로 경보에서는 뺀다 — 몇 주씩 이어지는 «정상» 상태다.
  add("app", "아이폰 앱에 안 들어간 고침", 볼것 ? "볼 것" : "통과", 조각.join(" · "), { 경보: false });
}

/**
 * 코디네이터가 화면에서 고친 문구가 «코드로 돌아왔나».
 * 안 돌아오면 다음에 그 화면을 손대는 순간 코드 값이 이겨서 교정이 통째로 되돌아간다
 * (2026-08-20 실측: 262건 중 259건이 그 상태로 몇 달 쌓여 있었다).
 *
 * ⚠️ 2026-08-28 정정: 여기 원래 「CI 에는 못 붙인다」고 적혀 있었는데 사실과 달랐다 —
 *   매일 도는 창구(.github/workflows/sweep.yml)가 이미 service_role 열쇠를 넣어 이 파일을 돌린다.
 *   그런데 이 검사만 «주소»를 NEXT_PUBLIC_SUPABASE_URL 에서만 찾았다. 이 저장소의 비밀값은
 *   그 이름이 «비어 있고» 실제 주소는 SUPABASE_URL 에 있다(sweep.yml 주석에도 적혀 있다).
 *   그래서 열쇠가 다 있는데도 매일 「못 잼」으로 찍혔다 — 위 38번 줄의 SUPABASE_URL 을 쓴다.
 */
async function 검사_번역역류() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    add("i18nback", "코디 교정이 코드에 반영됐나", "못 잼", "DB 주소·열쇠가 없다(SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)");
    return;
  }
  let out = "";
  let 어긋남 = 0;
  try {
    // 자식도 주소를 봐야 한다 — 그쪽은 NEXT_PUBLIC_ 이름만 읽으므로 여기서 채워 넘긴다.
    out = execSync("node scripts/i18n-backport-overrides.mjs --check", {
      encoding: "utf8",
      env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL },
    });
  } catch (e) {
    out = String(e.stdout || "") + String(e.stderr || "");
  }
  const m = out.match(/코드와 어긋남 (\d+)건/);
  if (m) 어긋남 = Number(m[1]);
  const 밖 = (out.match(/사전 밖 키 (\d+)건/) || [])[1];
  add(
    "i18nback",
    "코디 교정이 코드에 반영됐나",
    어긋남 > 0 ? "볼 것" : "통과",
    어긋남 > 0
      ? `코디가 고쳤는데 코드엔 안 온 문구 ${어긋남}건 → \`node scripts/i18n-backport-overrides.mjs\` 로 되돌려라` +
        (밖 && Number(밖) > 0 ? ` · 사전 밖 키 ${밖}건은 손으로` : "")
      : `어긋남 0건${밖 ? ` · 사전 밖 키 ${밖}건은 다른 파일 소관` : ""}`,
  );
}

/**
 * 「알고도 방치한 막힘」 — `KNOWN_ISSUES.md` 의 🔴 항목이 오래 안 움직이면 잡는다.
 *
 * 왜 만들었나 (2026-08-29, PO: *"아니 이런 실수 안할거냐고"*):
 *   앱 구글 로그인은 **2026-07-28 에 원인도 해법도 문서에 다 적어 놓고 32일을 방치**했다.
 *   해법이 «두 개»(allowNavigation / 네이티브 플러그인) 적혀 있었는데 쉬운 쪽만 해보고,
 *   그게 막힌 것을 확인한 뒤에도(8/04) 나머지로 넘어가지 않았다. 그 사이 아무도
 *   「이거 아직 빨간불인데?」를 묻지 않았다 — 물어 줄 장치가 없었기 때문이다.
 *   ⚠️ 만들면서 재보니 **같은 상태가 3건 더 있었다**(1·2·3번, 7/30 이후 30일째).
 *      사람 기억으로는 못 막는다는 증거다.
 *
 * 판정 방법: 표 머리글에서 「심각도/상태」 칸 자리를 찾고, **그 칸이 🔴 로 시작하는 줄**만 센다.
 *   (제목 칸에 🔴 를 쓴 항목이 있어서 «줄 어디든 🔴» 로 재면 오탐이 난다 — 15번이 실제로 그렇다.)
 *   각 줄이 마지막으로 바뀐 날은 `git log -S<줄 전체>` 로 잰다 → 상태만 고쳐도 날짜가 갱신된다.
 *
 * ⚠️ 이 검사는 «고쳤나»를 재지 않는다. 「빨간불인 채로 오래 서 있나」만 잰다.
 *    고칠 수 없는 사정이 있으면 그 사정을 문서에 적고 🔴 를 내려라 — 방치와 보류는 다르다.
 */
function 검사_묵은막힘() {
  const 경로 = "docs/KNOWN_ISSUES.md";
  const 한계일 = 14;
  let 줄들;
  try {
    줄들 = fs.readFileSync(경로, "utf8").split(/\r?\n/);
  } catch {
    return add("stale", "알고도 방치한 막힘", "못 잼", 경로 + " 를 못 읽는다");
  }

  const 막힘 = [];
  let 상태칸 = -1;
  for (const 줄 of 줄들) {
    if (!줄.trim().startsWith("|")) {
      상태칸 = -1; // 표가 끝나면 초기화 — 다음 표의 칸 배치는 다를 수 있다
      continue;
    }
    const 칸 = 줄.split("|").slice(1, -1).map((c) => c.trim());
    const i = 칸.findIndex((c) => c === "심각도" || c === "상태");
    if (i >= 0) {
      상태칸 = i;
      continue;
    }
    if (칸.every((c) => /^-{2,}$/.test(c))) continue; // 구분선
    if (상태칸 < 0 || !칸[상태칸]) continue;
    if (!칸[상태칸].startsWith("🔴")) continue;
    막힘.push({ 제목: (칸[1] || 칸[0] || "").replace(/[*`]/g, "").slice(0, 40), 원문: 줄 });
  }

  if (막힘.length === 0) {
    return add("stale", "알고도 방치한 막힘", "통과", "🔴 로 남은 항목 0건");
  }
  if (막힘.length > 20) {
    return add(
      "stale",
      "알고도 방치한 막힘",
      "볼 것",
      `🔴 항목이 ${막힘.length}건이다 — 너무 많아 날짜를 안 쟀다. 먼저 정리해라`,
    );
  }

  const 지금 = Date.now() / 1000;
  const 묵은것 = [];
  for (const m of 막힘) {
    let 초 = 0;
    try {
      초 = Number(
        execFileSync("git", ["log", "-1", "--format=%ct", "-S", m.원문, "--", 경로], {
          encoding: "utf8",
        }).trim(),
      );
    } catch {
      /* 그 줄의 역사를 못 찾으면 건너뛴다(방금 쓴 줄일 수 있다) */
    }
    if (!초) continue;
    const 일 = Math.floor((지금 - 초) / 86400);
    if (일 >= 한계일) 묵은것.push({ 제목: m.제목, 일 });
  }

  if (묵은것.length === 0) {
    return add(
      "stale",
      "알고도 방치한 막힘",
      "통과",
      `🔴 ${막힘.length}건 전부 ${한계일}일 안에 움직였다`,
    );
  }
  묵은것.sort((a, b) => b.일 - a.일);
  return add(
    "stale",
    "알고도 방치한 막힘",
    "볼 것",
    `🔴 인데 ${한계일}일 넘게 안 움직인 것 ${묵은것.length}건 — ` +
      묵은것.map((m) => `${m.일}일째 「${m.제목}」`).join(" · ") +
      " → 고칠 수 없으면 «왜 못 고치나»를 적고 🔴 를 내려라(방치와 보류는 다르다)",
  );
}

const 검사들 = [
  ["where", 검사_재는자리],
  ["pii", 검사_평문개인정보],
  ["i18nback", 검사_번역역류],
  ["rls", 검사_익명읽기],
  ["keys", 검사_화면에박힌열쇠],
  ["env", 검사_환경변수이름],
  ["deploy", 검사_미배포],
  ["cron", 검사_예약작업],
  ["app", 검사_앱미반영],
  ["ios", 검사_아이폰미반영],
  ["stale", 검사_묵은막힘],
];

// --only= 오타 방어 (2026-08-30 감사): 예전엔 모르는 이름을 주면(예: --only=key ← keys 오타)
// 검사 «0개»가 조용히 돌고 「볼 것 0건 / 못 잼 0건 / 통과 0건」 + exit 0 으로 끝났다 —
// 훑지도 않았는데 훑은 척이 되는 가짜 초록이고, --alert 를 같이 줘도 그대로 초록이었다.
// 머리말의 «통과로 위장하지 않는다» 원칙대로: 모르는 이름·빈 이름은 여기서 세우고 있는 이름을 알려준다.
if (onlyArg !== undefined) {
  const 아는이름 = 검사들.map(([id]) => id);
  const 모름 = 지정검사.filter((id) => !아는이름.includes(id));
  if (모름.length > 0 || 지정검사.length === 0) {
    console.error(
      (모름.length ? `그런 검사 없음: ${모름.join(", ")}` : "--only= 에 검사 이름이 없다") +
        ` — 있는 것: ${아는이름.join(", ")}`
    );
    process.exit(1);
  }
}

for (const [id, fn] of 검사들) {
  if (!want(id)) continue;
  try {
    await fn();
  } catch (e) {
    add(id, id, "못 잼", String(e.message).slice(0, 80));
  }
}

const 아이콘 = { 통과: "✅", "볼 것": "⚠️ ", "못 잼": "❓" };
console.log("\n훑기 대장 — " + new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC\n");
for (const r of rows) console.log(`${아이콘[r.판정]} ${r.이름.padEnd(24, " ")} ${r.판정.padEnd(5)} ${r.근거}`);

console.log(`
── 기계가 못 재는 것 (이 명령이 «통과»여도 남아 있는 것) ──
 · 열쇠에 사용처 제한이 걸렸나 → 구글·외부 콘솔 화면을 사람이 봐야 한다
 · 화면이 실제로 보이나(지도·잘림·빈 상자) → 브라우저로 눈으로 봐야 한다
 · 번역이 자연스러운가 → 현지 직원 몫
 · 「알림이 진짜 갔나」 → 받은편지함 확인 몫
 · 애플 «심사에 걸린» 빌드가 최신인가 → App Store Connect 화면을 사람이 봐야 한다
   (여기 아이폰 검사는 «저장소 부품 vs 출시본 부품»만 본다. 2026-08-28 에 빌드 4 를 올려두고도
    심사 항목엔 3 이 걸려 있었다: 그대로 냈으면 재반려였다)
`);

const 볼것 = rows.filter((r) => r.판정 === "볼 것");
const 못잼 = rows.filter((r) => r.판정 === "못 잼");
console.log(`볼 것 ${볼것.length}건 / 못 잼 ${못잼.length}건 / 통과 ${rows.length - 볼것.length - 못잼.length}건\n`);

// 사람이 부를 때(기본)는 «막지 않는다» — 문지기가 아니라 훑는 자다.
// 매일 도는 창구(--alert)일 때만 실패로 끝내 메일이 나가게 한다.
//   ⚠️ 「못 잼」도 실패로 친다. 비밀값이 없어 검사가 빠졌는데 초록으로 보이는 것이
//      2026-08 야간검사 사고(8일간 조용히 실패)의 정확한 형태였다.
if (process.argv.includes("--alert")) {
  // 경보:false 로 등록한 검사는 «매일 울리면 무시하게 되는» 부류라 메일에서 뺀다(화면엔 그대로 뜬다).
  const 알릴것 = [...볼것, ...못잼].filter((r) => r.경보 !== false);
  if (알릴것.length) {
    console.log("── 이 창구는 «볼 것 또는 못 잼»이 있으면 일부러 실패로 끝난다(메일이 나가게) ──");
    for (const r of 알릴것) console.log(`  ${r.판정}: ${r.이름} — ${r.근거}`);
    process.exit(1);
  }
}
process.exit(0);
