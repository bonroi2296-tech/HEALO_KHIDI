#!/usr/bin/env node
/**
 * 실서비스 DB 「설계도(구조)」를 파일 한 장으로 떠서 «저장소 밖»에 보관한다.
 *
 * 왜 저장소 밖인가: 이 저장소는 **공개(public)** 다. 설계도에는 표·칸 이름뿐 아니라
 *   보안 규칙(RLS 정책)과 함수 내용이 통째로 들어간다 — 공개하면 «어디를 어떻게 두드려야 하는지»를
 *   그대로 알려주는 셈이라, 굳이 올릴 이유가 없다.
 * 왜 필요한가: 평소 복제는 scripts/rebuild-test-db.mjs 가 실서비스에서 읽어와 처리한다.
 *   하지만 «실서비스가 죽어 있는» 상황에선 그 길이 막힌다. 이 파일은 그때를 위한 종이 사본이다.
 *
 * 사용: node scripts/dump-schema-snapshot.mjs [출력폴더]
 *       기본 출력 = C:/Users/user/Documents/healwith-keys/
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const OUT_DIR = process.argv[2] || "C:/Users/user/Documents/healwith-keys";
const PROD_REF = "hvwwlkawaxabhtumjhrg";
const src = new pg.Client({
  connectionString: `postgresql://postgres.${PROD_REF}:${encodeURIComponent(process.env.PROD_SUPABASE_DB_PASSWORD)}@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});
await src.connect();

const q = async (sql) => (await src.query(sql)).rows.map((r) => r.s);
const SECTIONS = [
  ["확장(extension)", `select 'create extension if not exists '||quote_ident(extname)||';' as s from pg_extension where extname<>'plpgsql'`],
  ["시퀀스", `select 'create sequence if not exists public.'||quote_ident(c.relname)||';' as s from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='S' and n.nspname='public'`],
  ["표(table)", `select 'CREATE TABLE IF NOT EXISTS public.'||quote_ident(c.relname)||' ('||
      string_agg(quote_ident(a.attname)||' '||format_type(a.atttypid,a.atttypmod)
        || coalesce(' default '||pg_get_expr(d.adbin,d.adrelid),'')
        || case when a.attnotnull then ' not null' else '' end, E',\n  ' order by a.attnum)||E'\n);' as s
    from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
    join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
    left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum
    where c.relkind='r' group by c.relname order by c.relname`],
  ["제약", `select 'alter table public.'||quote_ident(rel.relname)||' add constraint '||quote_ident(con.conname)||' '||pg_get_constraintdef(con.oid)||';' as s
    from pg_constraint con join pg_class rel on rel.oid=con.conrelid join pg_namespace n on n.oid=rel.relnamespace and n.nspname='public'
    order by case con.contype when 'p' then 1 when 'u' then 2 when 'c' then 3 else 4 end, rel.relname`],
  ["인덱스", `select indexdef||';' as s from pg_indexes where schemaname='public' order by indexname`],
  ["함수", `select pg_get_functiondef(p.oid)||';' as s from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind in ('f','p') and p.prolang <> (select oid from pg_language where lanname='c') order by p.proname`],
  ["뷰", `select 'create or replace view public.'||quote_ident(viewname)||' as '||definition as s from pg_views where schemaname='public'`],
  ["트리거", `select pg_get_triggerdef(t.oid)||';' as s from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace and n.nspname='public' where not t.tgisinternal`],
  ["RLS 켜기", `select 'alter table public.'||quote_ident(c.relname)||' enable row level security;' as s from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public' where c.relkind='r' and c.relrowsecurity`],
  ["보안정책", `select 'create policy '||quote_ident(policyname)||' on public.'||quote_ident(tablename)||' as '||permissive||' for '||cmd||' to '||array_to_string(roles,', ')
      ||coalesce(' using ('||qual||')','')||coalesce(' with check ('||with_check||')','')||';' as s
    from pg_policies where schemaname='public' order by tablename, policyname`],
];

const stamp = (await src.query("select to_char(now() at time zone 'Asia/Seoul','YYYY-MM-DD HH24:MI') t")).rows[0].t;
const out = [
  `-- HEALO 실서비스 DB 설계도 스냅샷 (구조만 · 데이터 없음)`,
  `-- 뜬 시각: ${stamp} KST · 프로젝트: ${PROD_REF}`,
  `-- ⚠️ 공개 저장소에 올리지 말 것 — 보안 규칙·함수 내용이 들어 있다.`,
  `-- 쓰는 법: 새 Supabase 프로젝트를 만들고 SQL 편집기에 순서대로 붙여넣기.`,
  ``,
];
for (const [label, sql] of SECTIONS) {
  const rows = await q(sql);
  out.push(`\n-- ══════════ ${label} (${rows.length}개) ══════════\n`, ...rows);
}
await src.end();

fs.mkdirSync(OUT_DIR, { recursive: true });
const file = path.join(OUT_DIR, `healo-db-schema-${stamp.slice(0, 10).replace(/-/g, "")}.sql`);
fs.writeFileSync(file, out.join("\n"), "utf8");
console.log(`저장: ${file}`);
console.log(`크기: ${(fs.statSync(file).size / 1024).toFixed(0)}KB`);
