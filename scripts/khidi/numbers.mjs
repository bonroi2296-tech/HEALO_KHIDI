#!/usr/bin/env node
/**
 * 중간보고서·발표자료에 들어가는 숫자를 «그 자리에서» 다시 세어 표로 낸다.
 *
 * 왜 만들었나 (2026-08-20)
 *   숫자를 생성기 코드에 박아두니 옛 값이 그대로 남았다. 실제로 세 개가 한꺼번에 틀렸다:
 *     자막 3,481건(→3,277) · 자동시험 1,440회(→1,288) · 통과율 96.5%(→95.3)
 *   대표가 「96.5% 무슨 기준이냐」고 물어서야 드러났다. 물어보지 않았으면 그대로 제출됐다.
 *   그래서 «문서에 넣기 전에 한 번 돌려서 값을 확인하는» 자리를 만든다.
 *
 * 쓰는 법
 *   node scripts/khidi/numbers.mjs           표로 보기
 *   node scripts/khidi/numbers.mjs --json    다른 도구가 읽을 형태로
 *   node scripts/khidi/numbers.mjs --md      문서에 붙일 마크다운 표로
 *
 * 규칙
 *   · 시험 데이터(is_test)는 «항상» 뺀다. 실적에 섞이면 허위보고가 된다.
 *   · 값마다 「어디서 나왔나」를 같이 낸다. 출처 없는 숫자는 문서에 쓰지 않는다.
 *   · 여기 없는 숫자를 문서에 쓰려면 «먼저 여기에 추가»하고 쓴다.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// .env.local 에서 열쇠를 읽는다 (값 끝에 역슬래시-n 이 붙어 오는 일이 있어 잘라낸다)
function env(name) {
  if (process.env[name]) return process.env[name].trim();
  try {
    const line = readFileSync('.env.local', 'utf8')
      .split('\n')
      .find((l) => l.startsWith(name + '='));
    if (!line) return null;
    // 값이 따옴표로 감싸져 있고(Vercel CLI 가 그렇게 쓴다), 끝에 역슬래시-n 이 붙는 일도 있다
    return line
      .slice(name.length + 1)
      .trim()
      .replace(/\\n$/, '')
      .replace(/^["']|["']$/g, '');
  } catch {
    return null;
  }
}

const url = env('NEXT_PUBLIC_SUPABASE_URL');
const key = env('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !key) {
  console.error('열쇠를 못 찾았다. .env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 있어야 한다.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

async function sql(query) {
  const { data, error } = await db.rpc('exec_sql', { query });
  if (error) throw new Error(error.message);
  return data;
}

/** rpc 가 없는 환경을 위해 테이블 조회로 직접 센다 */
async function count(table, filter = (q) => q) {
  const { count: n, error } = await filter(db.from(table).select('*', { count: 'exact', head: true }));
  if (error) throw new Error(`${table}: ${error.message}`);
  return n ?? 0;
}

const rows = [];
const 경고 = [];
function put(항목, 값, 출처, 주의 = '') {
  rows.push({ 항목, 값, 출처, 주의 });
}

/** select() 로 가져온 목록이 1,000 행에 닿으면 «잘린 것»이다. 조용히 틀린 값을 내지 않도록 잡는다. */
function 잘림검사(이름, 배열) {
  if (배열.length >= 1000) {
    경고.push(`⛔ ${이름} 이 ${배열.length} 행에서 잘렸다. count 방식으로 바꿔야 한다.`);
  }
}

// ─────────────────────────── 문의
const inqAll = await count('inquiries', (q) => q.or('is_test.is.null,is_test.eq.false'));
const inqAug = await count('inquiries', (q) =>
  q.or('is_test.is.null,is_test.eq.false').gte('created_at', '2026-08-01'));
put('문의 접수 (누적)', `${inqAll} 건`, 'inquiries, is_test 제외');
put('  그중 8월', `${inqAug} 건`, 'inquiries, created_at >= 08-01');

// ─────────────────────────── 제2의료소견
const { data: ops, error: opErr } = await db
  .from('case_opinions')
  .select('id, inquiry_id, released_at, doctor_name')
  .order('created_at');
if (opErr) throw new Error(`case_opinions: ${opErr.message}`);
잘림검사('case_opinions', ops);
const released = ops.filter((o) => o.released_at);
put('제2의료소견 확보', `${ops.length} 건`, 'case_opinions 전체');
put('  환자 전달 완료', `${released.length} 건`, 'released_at 있는 것',
  released.length < ops.length ? `미전달 ${ops.length - released.length}건` : '');
put('  문의번호', released.map((o) => `#${o.inquiry_id}`).join(' · '), 'released_at 순');

// ─────────────────────────── 화상상담
const { data: sess, error: sErr } = await db
  .from('consultation_sessions')
  .select('id, is_test');
if (sErr) throw new Error(`consultation_sessions: ${sErr.message}`);
잘림검사('consultation_sessions', sess);
const realSess = sess.filter((s) => !s.is_test);
const { data: adm, error: aErr } = await db
  .from('consultation_admissions')
  .select('consultation_id, participant_identity, status')
  .eq('status', 'approved');
if (aErr) throw new Error(`consultation_admissions: ${aErr.message}`);
잘림검사('consultation_admissions', adm);
const realIds = new Set(realSess.map((s) => s.id));
const byRoom = new Map();
for (const a of adm) {
  if (!realIds.has(a.consultation_id)) continue;
  if (!byRoom.has(a.consultation_id)) byRoom.set(a.consultation_id, new Set());
  byRoom.get(a.consultation_id).add(a.participant_identity);
}
const twoPlus = [...byRoom.values()].filter((v) => v.size >= 2).length;
put('화상상담 방 (시험 제외)', `${realSess.length} 개`, 'consultation_sessions, is_test 제외');
put('  2명 이상 실제 입장', `${twoPlus} 회`, 'consultation_admissions, status=approved',
  '「방을 열었다」가 아니라 「사람이 둘 이상 들어왔다」로 센다');

// ─────────────────────────── 실시간 통역 자막
// ⚠️ select() 로 다 가져와서 세면 1,000 행에서 잘린다(실제로 3,277 을 998 로 셌다). count 로만 센다.
const realIdList = [...realIds];
const { count: trReal, error: tErr } = await db
  .from('consultation_translations')
  .select('*', { count: 'exact', head: true })
  .in('session_id', realIdList);
if (tErr) throw new Error(`consultation_translations: ${tErr.message}`);
put('통역 자막 (시험 제외)', `${trReal} 건`, 'consultation_translations × 방 is_test=false',
  '⚠️ 「몇 줄 만들었나」일 뿐 번역이 맞았는지는 재지 않는다. 성과로 쓰지 말 것');

// ─────────────────────────── AI 품질 자동시험
const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
const regAll = await count('ai_regression_runs', (q) => q.gte('run_date', since));
const regPass = await count('ai_regression_runs', (q) => q.gte('run_date', since).eq('passed', true));
const regCure = await count('ai_regression_runs', (q) => q.gte('run_date', since).contains('flags', ['cure_claim']));
const regDiag = await count('ai_regression_runs', (q) => q.gte('run_date', since).contains('flags', ['diagnosis_attempt']));
put('AI 자동시험 (최근 30일)', `${regAll} 회`, 'ai_regression_runs');
put('  통과율', regAll ? `${((regPass / regAll) * 100).toFixed(1)} %` : '-', '같은 표 passed 비율',
  '⚠️ 우리가 낸 문제를 우리 AI 가 풀고 우리 AI 가 채점한 값이다. 성과로 쓰지 말 것');
put('  의료 레드라인 검출', `${regCure + regDiag} 건`, 'flags 에 cure_claim / diagnosis_attempt');

// ─────────────────────────── 출력
const 기준 = new Date().toISOString().slice(0, 10);
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ 기준일: 기준, 항목: rows }, null, 2));
} else if (process.argv.includes('--md')) {
  console.log(`# 중간보고 숫자 (${기준} 실측)\n`);
  console.log('| 항목 | 값 | 출처 | 주의 |');
  console.log('|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.항목} | **${r.값}** | ${r.출처} | ${r.주의} |`);
} else {
  console.log(`\n  중간보고 숫자  ·  ${기준} 실측\n`);
  const w = Math.max(...rows.map((r) => [...r.항목].length));
  for (const r of rows) {
    console.log(`  ${r.항목.padEnd(w)}  ${String(r.값).padStart(10)}   ${r.출처}`);
    if (r.주의) console.log(`  ${' '.repeat(w)}  ${' '.repeat(10)}   ${r.주의}`);
  }
  console.log('');
}
if (경고.length) {
  console.error(['', ...경고, ''].join('\n'));
  process.exitCode = 1;
}
