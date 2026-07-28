#!/usr/bin/env node
/**
 * 검사 전용 DB(healo-e2e) 재생성 — 실서비스의 «구조»와 «공개 콘텐츠»만 복사한다.
 *
 * 왜 있나: 자동 검사(E2E)가 실서비스 DB 를 물고 돌던 구조를 끊으려고 검사 전용 DB 를 만들었다
 *         (2026-07-24 DB 55분 멈춤 때 그 부하를 만든 주체가 이 검사였다).
 * 왜 마이그레이션으로 못 만드나: `migrations/` 에는 «기본 테이블을 만드는 파일이 없다».
 *         초기 스키마가 저장소 밖(대시보드)에서 만들어졌다 — 실제로 135개를 돌려보면 11개만 통하고
 *         나머지는 "relation does not exist" 로 죽는다. 그래서 실서비스에서 구조를 뜨는 것이 유일한 길이다.
 *
 * 사용:
 *   node scripts/rebuild-test-db.mjs                 구조만 복사(이미 있는 것은 건너뜀)
 *   node scripts/rebuild-test-db.mjs --seed          + 테스트 계정·공개 콘텐츠
 *   node scripts/rebuild-test-db.mjs --reset --seed  싹 비우고 처음부터(정확한 사본을 원할 때)
 *
 * .env.local 에 필요한 값:
 *   PROD_SUPABASE_DB_PASSWORD / E2E_SUPABASE_DB_PASSWORD / E2E_SUPABASE_PROJECT_REF
 *   (--seed 는 추가로) E2E_SUPABASE_URL / E2E_SUPABASE_SERVICE_ROLE_KEY
 *
 * ⚠️ 환자 개인정보(inquiries·상담·설문 등)는 한 줄도 복사하지 않는다.
 * ⚠️ 실서비스에는 SELECT 만 한다.
 */
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const FLAGS = new Set(process.argv.slice(2));
const PROD_REF = "hvwwlkawaxabhtumjhrg";
const TEST_REF = process.env.E2E_SUPABASE_PROJECT_REF;
const ssl = { rejectUnauthorized: false };
const conn = (ref, pw) =>
  `postgresql://postgres.${ref}:${encodeURIComponent(pw)}@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres`;

if (!TEST_REF || TEST_REF === PROD_REF) {
  throw new Error("안전 중단: E2E_SUPABASE_PROJECT_REF 가 비었거나 실서비스를 가리킨다");
}

const src = new pg.Client({ connectionString: conn(PROD_REF, process.env.PROD_SUPABASE_DB_PASSWORD), ssl });
const dst = new pg.Client({ connectionString: conn(TEST_REF, process.env.E2E_SUPABASE_DB_PASSWORD), ssl });
await src.connect();
await dst.connect();

// ── 0. 비우기 (--reset) ──
if (FLAGS.has("--reset")) {
  await dst.query("drop schema if exists public cascade");
  await dst.query("create schema public");
  await dst.query("grant usage on schema public to postgres, anon, authenticated, service_role");
  await dst.query("grant all on schema public to postgres, service_role");
  for (const kind of ["tables", "functions", "sequences"]) {
    await dst.query(`alter default privileges in schema public grant all on ${kind} to postgres, anon, authenticated, service_role`);
  }
  console.log("· 검사 DB public 스키마 비움");
}

// ── 1. 구조 복사 ──
const q = async (sql) => (await src.query(sql)).rows.map((r) => r.s);
const PARTS = [
  ["확장", `select 'create extension if not exists '||quote_ident(extname)||' with schema '||quote_ident(n.nspname) as s
            from pg_extension e join pg_namespace n on n.oid=e.extnamespace where extname <> 'plpgsql'`],
  ["시퀀스", `select 'create sequence if not exists public.'||quote_ident(c.relname)||';' as s
              from pg_class c join pg_namespace n on n.oid=c.relnamespace
              where c.relkind='S' and n.nspname='public'`],
  ["테이블", `select 'CREATE TABLE IF NOT EXISTS public.'||quote_ident(c.relname)||' ('||
       string_agg(quote_ident(a.attname)||' '||format_type(a.atttypid,a.atttypmod)
         || coalesce(' default '||pg_get_expr(d.adbin,d.adrelid),'')
         || case when a.attnotnull then ' not null' else '' end, ', ' order by a.attnum)||');' as s
     from pg_class c
     join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
     left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum
     where c.relkind='r' group by c.relname order by c.relname`],
  // PK·UNIQUE 를 FK 보다 먼저 만든다(참조 대상이 있어야 FK 가 붙는다)
  ["제약", `select 'alter table public.'||quote_ident(rel.relname)||' add constraint '||quote_ident(con.conname)||' '||
       pg_get_constraintdef(con.oid)||';' as s
     from pg_constraint con join pg_class rel on rel.oid=con.conrelid
     join pg_namespace n on n.oid=rel.relnamespace and n.nspname='public'
     order by case con.contype when 'p' then 1 when 'u' then 2 when 'c' then 3 else 4 end, rel.relname`],
  // 제약이 자동으로 만든 인덱스는 제외(중복 생성 오류가 난다)
  ["인덱스", `select replace(indexdef,'CREATE INDEX','CREATE INDEX IF NOT EXISTS')||';' as s
     from pg_indexes i where schemaname='public'
       and not exists (select 1 from pg_constraint c join pg_class ic on ic.oid=c.conindid where ic.relname=i.indexname)`],
  // 확장이 설치한 C 언어 함수는 «권한 없음»으로 실패한다 — 정상이다(확장 설치가 이미 만들어 놨다).
  ["함수", `select pg_get_functiondef(p.oid)||';' as s
     from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.prokind in ('f','p')
       and p.prolang <> (select oid from pg_language where lanname='c')`],
  ["뷰", `select 'create or replace view public.'||quote_ident(viewname)||' as '||definition as s
          from pg_views where schemaname='public'`],
  ["트리거", `select pg_get_triggerdef(t.oid)||';' as s
     from pg_trigger t join pg_class c on c.oid=t.tgrelid
     join pg_namespace n on n.oid=c.relnamespace and n.nspname='public' where not t.tgisinternal`],
  // RLS 는 «보안 규칙»이라 빠지면 검사에선 통과하고 실서비스에서 막히는 차이가 생긴다 — 반드시 같이 옮긴다.
  ["RLS", `select 'alter table public.'||quote_ident(c.relname)||' enable row level security;' as s
     from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     where c.relkind='r' and c.relrowsecurity`],
  ["보안정책", `select 'create policy '||quote_ident(policyname)||' on public.'||quote_ident(tablename)
       ||' as '||permissive||' for '||cmd||' to '||array_to_string(roles,', ')
       ||coalesce(' using ('||qual||')','')||coalesce(' with check ('||with_check||')','')||';' as s
     from pg_policies where schemaname='public'`],
];

for (const [label, sql] of PARTS) {
  const stmts = await q(sql);
  let ok = 0, skipped = 0;
  const errs = [];
  for (const stmt of stmts) {
    try {
      await dst.query(stmt);
      ok++;
    } catch (e) {
      const msg = String(e.message).split("\n")[0];
      // 두 번째 실행에서 나는 «이미 있다» 류는 실패가 아니다(이 스크립트는 여러 번 돌려도 안전해야 한다)
      if (/already exists|multiple primary keys/i.test(msg)) skipped++;
      else errs.push(msg.slice(0, 100));
      try { await dst.query("ROLLBACK"); } catch {}
    }
  }
  const tail = [skipped ? `이미있음 ${skipped}` : "", errs.length ? "실패: " + errs.slice(0, 2).join(" | ") : ""]
    .filter(Boolean).join("  ");
  console.log(`${label}: ${ok}/${stmts.length}${tail ? "  " + tail : ""}`);
}

// ── 2. 테스트 계정 + 공개 콘텐츠 (--seed) ──
if (FLAGS.has("--seed")) {
  const PASSWORD = "Healwith2026!"; // 기존 GitHub 비밀값과 동일
  // 권한은 app_metadata 기준(이 프로젝트 규칙). user_roles 는 실서비스와 동일하게 전부 patient.
  const USERS = [
    ["admin@test.com", "admin"],
    ["coordinator@test.com", "coordinator"],
    ["agency@test.com", "agency"],
    ["clinic@test.com", "agency"],
    ["patient@test.com", null],
    ["hospital@test.com", null],
    ["doctor@test.com", null],
  ];
  const admin = createClient(process.env.E2E_SUPABASE_URL, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  for (const [email, role] of USERS) {
    const { error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      app_metadata: role ? { role } : {},
    });
    if (error && !/already/i.test(error.message)) console.log(`  ✗ ${email} → ${error.message}`);
  }
  console.log(`계정: ${USERS.length}개 확인`);

  // 공개 콘텐츠만 — 환자 정보 테이블은 목록에 넣지 마라.
  for (const t of ["agencies", "hospitals", "treatments", "partner_branches", "partner_doctors", "center_menu_items", "education_contents"]) {
    const { rows } = await src.query(`select * from public.${t}`);
    if (!rows.length) continue;
    const cols = Object.keys(rows[0]);
    let ok = 0;
    for (const r of rows) {
      try {
        await dst.query(
          `insert into public.${t} (${cols.map((c) => `"${c}"`).join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")}) on conflict do nothing`,
          cols.map((c) => r[c]),
        );
        ok++;
      } catch { /* 개별 행 실패는 건너뛴다 — 전체를 멈출 이유가 없다 */ }
    }
    console.log(`콘텐츠 ${t}: ${ok}/${rows.length}`);
  }

  // 검사가 콕 집어 보는 «가짜 문의» — 실서비스에서 복사하지 않고 여기서 만든다.
  //  · e2e/coordinator-request-info.spec.ts 는 /coordinator/inbox/17 을 직접 연다.
  //  · 조건: Step1 만 완료(step2 는 비어 있어야 «추가 정보 요청» 카드가 뜬다).
  //  · 실서비스 데이터를 안 쓰므로 그쪽이 바뀌어도 검사가 흔들리지 않는다(오히려 더 안정적).
  await dst.query(
    `insert into public.inquiries (id, first_name, last_name, email, nationality, cancer_type,
        status, is_test, step1_completed_at, created_at)
     values (17, 'E2E', 'Fixture', 'e2e-fixture@test.com', 'KZ', 'test',
        'received', true, now(), now())
     on conflict (id) do update set step1_completed_at = excluded.step1_completed_at,
        step2_completed_at = null, status = 'received', is_test = true`,
  );
  await dst.query("select setval(pg_get_serial_sequence('public.inquiries','id'), greatest(100, (select max(id) from public.inquiries)))");
  console.log("고정 데이터: 문의 #17(Step1만) 준비");

  const { rows: users } = await dst.query("select id, email from auth.users where email like '%@test.com'");
  for (const u of users) {
    await dst.query("insert into public.user_roles (user_id, role, is_active) values ($1,'patient',true) on conflict do nothing", [u.id]);
  }
  for (const t of ["agency_users", "hospital_users"]) {
    const { rows } = await src.query(
      `select ur.*, u.email from public.${t} ur join auth.users u on u.id=ur.user_id where u.email like '%@test.com'`,
    );
    for (const r of rows) {
      const target = users.find((u) => u.email === r.email);
      if (!target) continue;
      const { email, ...row } = r;
      row.user_id = target.id; // 새 DB 의 계정 id 로 바꿔 넣는다
      const cols = Object.keys(row);
      try {
        await dst.query(
          `insert into public.${t} (${cols.map((c) => `"${c}"`).join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")}) on conflict do nothing`,
          cols.map((c) => row[c]),
        );
      } catch { /* 소속 행은 있으면 좋은 것 — 실패해도 계속 */ }
    }
  }
}

// ── 3. 대조 — «성공했다»가 아니라 «양쪽이 같다»로 판정한다 ──
const CHECKS = {
  테이블: `select count(*)::int n from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`,
  컬럼: `select count(*)::int n from information_schema.columns where table_schema='public'`,
  인덱스: `select count(*)::int n from pg_indexes where schemaname='public'`,
  제약: `select count(*)::int n from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace ns on ns.oid=r.relnamespace where ns.nspname='public'`,
  함수: `select count(*)::int n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
     where ns.nspname='public' and p.prolang <> (select oid from pg_language where lanname='c')
       and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')`,
  트리거: `select count(*)::int n from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='public' and not t.tgisinternal`,
  보안정책: `select count(*)::int n from pg_policies where schemaname='public'`,
};
let diff = 0;
for (const [label, sql] of Object.entries(CHECKS)) {
  const a = (await src.query(sql)).rows[0].n;
  const b = (await dst.query(sql)).rows[0].n;
  if (a !== b) diff++;
  console.log(`${a === b ? "OK " : "차이"} ${label.padEnd(6)} 실서비스 ${String(a).padStart(4)} · 검사 ${String(b).padStart(4)}`);
}
// 실환자 정보가 새어 들어갔는지 확인 — 검사용 고정 데이터(is_test=true)만 있어야 한다.
// 0 이 아니면 실서비스 문의가 복사된 것이므로 즉시 조사할 것(이 스크립트는 그런 복사를 하지 않는다).
const leaked = (await dst.query("select count(*)::int n from public.inquiries where is_test is not true")).rows[0].n;
const fixtures = (await dst.query("select count(*)::int n from public.inquiries where is_test")).rows[0].n;
console.log(leaked === 0 ? `OK  실환자 문의 0행(정상) · 검사용 고정 문의 ${fixtures}행` : `🔴 실환자 문의 ${leaked}행 — 복사되면 안 되는 것이다`);

await src.end();
await dst.end();
process.exit(diff === 0 && leaked === 0 ? 0 : 1);
