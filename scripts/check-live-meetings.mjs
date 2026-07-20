#!/usr/bin/env node
/**
 * check-live-meetings — 배포·머지 전 "지금 화상상담 중인가?" 기계 확인 (POSTMORTEMS #101)
 *
 * 왜: "화상회의 중 배포·머지 금지"(PO 지시 2026-07-14)는 규칙 문서에만 있었고 **사람 기억에
 *     의존**했다. 2026-07-20 실제로 뚫렸다 — 배포 전마다 확인하긴 했으나, 코디가 그 사이에
 *     만든 회의를 놓치고 배포했고 통역봇이 **실환자 상담방에 들어갔다**.
 *     "매번 확인했다"는 소용없다. 마지막 확인 이후에 생긴 회의가 항상 사각이다.
 *
 * 두 축으로 본다(둘 다 필요):
 *   ① 예정(DB)   — consultation_sessions.scheduled_at 이 앞뒤 창 안에 있는 것
 *   ② 실시간(LiveKit) — 지금 참가자가 들어있는 방. 예정에 없어도 사람이 있으면 회의 중이다.
 *     ②가 이번 사고를 잡았을 축이다(코디가 예정시각 47분 전에 이미 입장해 있었다).
 *
 * 사용:
 *   node scripts/check-live-meetings.mjs            # 위험하면 exit 1
 *   node scripts/check-live-meetings.mjs --window 90  # 앞뒤 분(기본 60)
 *
 * 필요 env (.env.local 자동 로드): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * LiveKit 축은 `lk` CLI 인증이 돼 있을 때만 동작(없으면 경고하고 DB 축만).
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

const argWindow = process.argv.indexOf("--window");
const WINDOW_MIN = argWindow !== -1 ? Number(process.argv[argWindow + 1]) : 60;

// .env.local 에서 필요한 값만 읽는다(전체 파싱 안 함 — 값에 = 가 있어도 안전).
// ⚠️ 이 저장소의 .env.local 은 값이 따옴표로 감싸져 있고 **끝에 리터럴 `\n`(역슬래시+n)이
//    붙어 있다**. 그걸 안 벗기면 JWT 가 깨져 조용히 401 이 나고, 이 검사기의 DB 축이
//    "검사 안 됨"으로 스킵된다(가드가 반만 도는 상태) — 2026-07-20 실제로 그랬다.
function envFromFile(key) {
  if (process.env[key]) return process.env[key];
  for (const f of [".env.local", ".env"]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const t = line.trim();
      if (!t.startsWith(`${key}=`)) continue;
      let v = t.slice(key.length + 1).trim();
      v = v.replace(/^["']|["']$/g, "");   // 감싼 따옴표
      v = v.replace(/(?:\\[rn])+$/g, "");  // 끝에 붙은 리터럴 \n / \r
      return v.trim();
    }
  }
  return null;
}

const url = envFromFile("NEXT_PUBLIC_SUPABASE_URL");
const key = envFromFile("SUPABASE_SERVICE_ROLE_KEY");

const problems = [];

// ── ① 예정된 상담(DB) ──
if (!url || !key) {
  console.warn("⚠️  Supabase env 없음 — 예정 상담 확인을 건너뜀(이 축은 검사 안 됨).");
} else {
  const from = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const to = new Date(Date.now() + WINDOW_MIN * 60_000).toISOString();
  const q =
    `${url}/rest/v1/consultation_sessions` +
    `?select=id,livekit_room_name,scheduled_at,status,is_test` +
    `&status=not.in.(cancelled,completed)` +
    `&scheduled_at=gte.${from}&scheduled_at=lte.${to}`;
  const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) {
    console.warn(`⚠️  상담 조회 실패(HTTP ${res.status}) — 이 축은 검사 안 됨.`);
  } else {
    const rows = await res.json();
    // 테스트 상담(is_test)은 막지 않는다 — 내가 만든 스모크 방까지 배포를 막으면 가드를 끄게 된다.
    for (const r of rows.filter((x) => !x.is_test)) {
      const mins = Math.round((new Date(r.scheduled_at) - Date.now()) / 60_000);
      problems.push(
        `예정 상담: ${r.livekit_room_name} (${mins >= 0 ? `${mins}분 후` : `${-mins}분 전 시작`}, status=${r.status})`
      );
    }
  }
}

// ── ② 지금 사람이 들어있는 방(LiveKit) ──
try {
  const out = execSync("lk room list --project healo", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  for (const line of out.split("\n")) {
    const m = line.match(/│\s*(RM_\w+)\s*│\s*(\S+)\s*│\s*(\d+)\s*│/);
    if (!m) continue;
    const [, , name, count] = m;
    if (Number(count) === 0) continue;
    if (name.startsWith("smoke-")) continue; // 내 테스트 방은 제외
    problems.push(`진행 중인 방: ${name} (참가자 ${count}명)`);
  }
} catch {
  console.warn("⚠️  lk CLI 미인증/미설치 — 실시간 방 확인을 건너뜀(가장 중요한 축이 빠짐).");
}

if (problems.length) {
  console.error(`\n🔴 화상상담이 임박/진행 중입니다 (앞뒤 ${WINDOW_MIN}분 기준) — 배포·머지 금지:\n`);
  for (const p of problems) console.error(`   · ${p}`);
  console.error(`\n→ 회의가 끝난 뒤 다시 실행하세요. 규칙 근거: CLAUDE.md "화상회의 중 배포·머지 금지"(PO 지시 2026-07-14).`);
  console.error(`   급하면 사유를 남기고 PO 승인 후 진행하되, 실환자 통화 중 재배포는 통화가 끊길 수 있습니다.`);
  process.exit(1);
}

console.log(`✓ 임박/진행 중인 화상상담 없음 (앞뒤 ${WINDOW_MIN}분) — 배포 안전`);
