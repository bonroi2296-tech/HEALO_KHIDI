/**
 * 시험용 데이터베이스가 «코드가 아는 스키마»와 어긋나지 않는지 대조한다.
 *
 * 왜 (2026-08-04 실제 사고):
 *   inquiries 에 컬럼 4개를 새로 만들고 실서비스 데이터베이스엔 적용했는데, 동작 시험은
 *   **별도 데이터베이스**(E2E_SUPABASE_URL)를 쓴다. 거기엔 그 컬럼이 없었다.
 *   그런데 «컬럼이 없다»는 조용히 넘어가지 않는다 — 그 컬럼을 포함한 select 는 **통째로**
 *   실패하고, 화면은 「조회 중 문제가 발생했습니다」 한 장이 된다.
 *   시험은 「버튼을 못 찾음」이라고만 말해서, 원인을 찾는 데 두 번 헛짚었다.
 *
 * 그래서 이 검사는 **시험을 돌리기 전에** 어긋난 컬럼의 «이름»을 대준다.
 *
 * 어떻게: 생성타입(src/types/database.types.ts)에서 테이블별 컬럼을 뽑아,
 *   시험용 데이터베이스에 `select=<컬럼들>&limit=0` 을 한 번씩 던진다.
 *   없는 컬럼이 있으면 PostgREST 가 그 이름을 대며 400 을 준다 — 그걸 그대로 보여준다.
 *   행은 한 건도 안 받으므로(limit=0) 데이터를 읽지 않는다.
 *
 * 열쇠가 없으면(로컬 등) 조용히 건너뛴다 — 이 검사는 자동 검사 안에서만 의미가 있다.
 */

import fs from "node:fs";
import path from "node:path";

const URL_ = process.env.E2E_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !KEY) {
  console.log("· 시험용 데이터베이스 열쇠가 없어 건너뛴다(로컬에서는 정상).");
  process.exit(0);
}

/** 생성타입에서 테이블 → 컬럼 집합. check-schema-refs.mjs 와 같은 방식(같은 파일이 기준). */
function buildColumnMap() {
  const map = new Map();
  let types;
  try {
    types = fs.readFileSync(path.join("src", "types", "database.types.ts"), "utf8");
  } catch {
    return map;
  }
  types = types.replace(/\r\n/g, "\n");
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

// 자기점검 — 파서가 빈손이면 이 검사기 자신이 죽은 것이다(조용한 통과가 제일 해롭다).
if (COLUMN_MAP.size === 0) {
  console.error("\n❌ 컬럼 목록이 비었다 — 이 검사기 자신이 고장난 상태다(생성타입 형식 변경?).");
  process.exit(1);
}

// 관계(join) 표기·뷰는 대상 밖. 실제 테이블만 던져 보고, 없는 테이블은 조용히 넘긴다.
const missing = [];
const unreachable = [];

for (const [table, cols] of COLUMN_MAP) {
  // PostgREST 는 «없는 컬럼»을 한 번에 하나만 알려준다 → 찾을 때마다 빼고 다시 묻는다.
  // 한 테이블에서 무한히 돌지 않도록 컬럼 수만큼만 반복한다.
  let remaining = [...cols];
  let unreachableHere = null;

  for (let round = 0; round <= cols.size; round++) {
    if (remaining.length === 0) break;
    const url = `${URL_}/rest/v1/${table}?select=${encodeURIComponent(remaining.join(","))}&limit=0`;
    let res;
    try {
      res = await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    } catch (e) {
      unreachableHere = `${table}: 접속 실패(${e.message})`;
      break;
    }
    if (res.ok) break;

    const body = await res.text().catch(() => "");
    // 테이블 자체가 없는 경우(PGRST205)는 «아직 안 만든 것»이라 여기서 다루지 않는다.
    if (res.status === 404 || /PGRST205|does not exist.*relation/i.test(body)) break;

    // 컬럼이 없으면 PostgREST 가 이름을 대준다: column "x" does not exist / 42703
    const raw = /column\s+"?([\w.]+)"?\s+does not exist/i.exec(body)?.[1];
    if (!raw) {
      if (res.status >= 500) unreachableHere = `${table}: ${res.status}`;
      break; // 컬럼 문제가 아닌 오류 — 더 캐지 않는다
    }
    const col = raw.includes(".") ? raw.split(".").pop() : raw;
    const key = `${table}.${col}`;
    missing.push(key);
    remaining = remaining.filter((c) => c !== col);
  }

  if (unreachableHere) unreachable.push(unreachableHere);
}

// ⚠️ 「못 물어본 것」을 「이상 없음」으로 넘기지 않는다.
// 처음 만들었을 때 주소 따옴표 하나 때문에 88개 전부 접속 실패였는데 「✓ 일치」를 찍었다 —
// 검사기가 조용히 아무것도 안 하는 상태가 제일 해롭다(#97 의 교훈이 정확히 이것).
const checked = COLUMN_MAP.size - unreachable.length;
if (unreachable.length) {
  console.error(`\n❌ 확인하지 못한 테이블 ${unreachable.length}/${COLUMN_MAP.size}개 — 대조가 성립하지 않았다.`);
  for (const u of unreachable.slice(0, 5)) console.error(`   - ${u.slice(0, 160)}`);
  console.error(`   주소·열쇠(E2E_SUPABASE_URL·E2E_SUPABASE_SERVICE_ROLE_KEY)를 확인하라.`);
  process.exit(1);
}

if (missing.length === 0) {
  console.log(`✓ 시험용 데이터베이스 스키마 일치 (테이블 ${checked}개 실제 대조)`);
  process.exit(0);
}

// ── 왜 «막지» 않고 «알리»기만 하나 ────────────────────────────────────────────
// 막으려면 「시험용 데이터베이스에 컬럼을 넣을 수단」이 있어야 하는데 지금은 없다
// (그 데이터베이스의 접속 비밀번호가 등록돼 있지 않아 자동 적용을 못 한다).
// 수단 없이 막으면 신청서가 전부 서고, 예외 목록만 계속 쌓인다 — 그건 고친 게 아니다.
//
// 이 검사의 진짜 값어치는 「막기」가 아니라 **「원인을 즉시 알려주기」**다.
// 2026-08-04 사고에서 잃은 시간은 «막지 못해서»가 아니라 «시험이 「버튼을 못 찾음」이라고만
// 말해서» 생겼다. 컬럼 이름만 보였으면 3초면 끝났다.
//
// 접속 비밀번호가 생기면 여기서 자동 적용하거나 exit(1) 로 승격하면 된다.
const NL = "\n";
const bullets = missing.map((s) => `   - ${s}`).join(NL);

console.log(
  NL +
    `⚠️  시험용 데이터베이스에 없는 컬럼 ${missing.length}건 — 실서비스에만 들어간 것들이다.` + NL + NL +
    bullets + NL + NL +
    "   이 컬럼을 «다른 컬럼과 같은 select 목록»에 넣으면 그 조회가 통째로 실패해" + NL +
    "   화면이 「조회 중 문제가 발생했습니다」 한 장이 된다(2026-08-04에 실제로 그랬다)." + NL +
    "   → 따로 읽거나(app/api/portal/inbox/[id]/route.ts 참고)," + NL +
    "     시험용 데이터베이스에 해당 마이그레이션을 넣어라." + NL
);

// 신청서 화면에서 바로 보이게 요약에도 남긴다 — 로그 깊숙이 묻히면 아무도 안 본다.
if (process.env.GITHUB_STEP_SUMMARY) {
  const fsp = await import("node:fs/promises");
  const md =
    `### ⚠️ 시험용 데이터베이스에 없는 컬럼 ${missing.length}건` + NL + NL +
    missing.map((s) => `- \`${s}\``).join(NL) + NL + NL +
    "이 컬럼을 다른 컬럼과 같은 `select` 목록에 넣으면 그 화면이 통째로 안 뜹니다." + NL;
  await fsp.appendFile(process.env.GITHUB_STEP_SUMMARY, md);
}
process.exit(0);
