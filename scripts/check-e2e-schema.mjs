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
  const select = [...cols].join(",");
  const url = `${URL_}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=0`;
  let res;
  try {
    res = await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  } catch (e) {
    unreachable.push(`${table}: 접속 실패(${e.message})`);
    continue;
  }
  if (res.ok) continue;

  const body = await res.text().catch(() => "");
  // 테이블 자체가 없는 경우(PGRST205)는 «아직 안 만든 것»이라 여기서 다루지 않는다.
  if (res.status === 404 || /PGRST205|does not exist.*relation/i.test(body)) continue;

  // 컬럼이 없으면 PostgREST 가 이름을 대준다: column "x" does not exist / 42703
  const col = /column\s+"?([\w.]+)"?\s+does not exist/i.exec(body)?.[1];
  if (col || /42703|PGRST204/.test(body)) {
    missing.push(`${table}${col ? ` → ${col}` : ""}`);
  } else if (res.status >= 500) {
    unreachable.push(`${table}: ${res.status}`);
  }
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

console.error(`
❌ 시험용 데이터베이스에 없는 컬럼 ${missing.length}건 — 이대로 시험을 돌리면
   그 컬럼을 포함한 조회가 «통째로» 실패해 화면이 안 뜬다(원인이 안 보이는 실패가 된다).

${missing.map((s) => `   - ${s}`).join("\n")}

→ 해당 마이그레이션을 시험용 데이터베이스에도 적용하라(실서비스에만 넣으면 여기서 갈린다).
   당장 못 넣는다면, 그 컬럼은 기존 select 목록에 «섞지 말고» 따로 읽어라
   (실패해도 그 줄만 빠지게 — app/api/portal/inbox/[id]/route.ts 참고).
`);
process.exit(1);
