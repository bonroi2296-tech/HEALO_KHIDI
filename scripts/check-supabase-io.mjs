/**
 * Supabase 디스크 I/O·성능 자동 점검 (2026-07-13 PO 승인 — "디스크 I/O 예산 부족" 경고 대응)
 *
 * 왜: Supabase 무료 플랜(Nano 컴퓨트)은 디스크 I/O 예산이 작아 경고 메일이 오는데,
 *     대시보드에 로그인해야만 원인을 볼 수 있었다. → Management API 토큰으로
 *     쿼리별 I/O 통계·성능 경고(advisors)를 기계가 뽑게 해서 PO가 화면 뒤질 일 없앰.
 *
 * 사용: node scripts/check-supabase-io.mjs   (npm run check:supabase-io)
 * 필요 env(.env.local): SUPABASE_ACCESS_TOKEN — https://supabase.com/dashboard/account/tokens
 *   에서 발급한 sbp_ 토큰. 없으면 발급 안내만 출력하고 종료(실패 아님).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_REF = "hvwwlkawaxabhtumjhrg";
const API = "https://api.supabase.com/v1";

// .env.local 로더 — dotenv 없이 (스크립트 단독 실행용, 값에 = 포함 허용)
function loadEnvLocal() {
  for (const dir of [process.cwd(), resolve(process.cwd(), "../../..")]) {
    try {
      // CRLF(윈도) 줄끝 + 따옴표 감싼 값 허용 — 독립리뷰 CONFIRMED 2건 반영
      for (const line of readFileSync(resolve(dir, ".env.local"), "utf8").split(/\r?\n/)) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
      return;
    } catch { /* 다음 후보 폴더 */ }
  }
}
loadEnvLocal();

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.log(`⚠️  SUPABASE_ACCESS_TOKEN 없음 — 점검 건너뜀.
발급: https://supabase.com/dashboard/account/tokens → "Generate new token"
      → 이름 예: healo-io-monitor → 나온 sbp_... 값을 .env.local 에
      SUPABASE_ACCESS_TOKEN=sbp_... 로 추가.`);
  process.exit(0);
}

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...opts.headers },
  });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const sql = (q) =>
  api(`/projects/${PROJECT_REF}/database/query`, { method: "POST", body: JSON.stringify({ query: q, read_only: true }) });

const fmtMs = (n) => `${Math.round(Number(n))}ms`;

async function main() {
  console.log(`\n🔍 Supabase 디스크 I/O 점검 — ${PROJECT_REF} (${new Date().toISOString()})\n`);

  // 1) 프로젝트/컴퓨트 정보
  try {
    const p = await api(`/projects/${PROJECT_REF}`);
    console.log(`■ 프로젝트: ${p.name} / region ${p.region} / status ${p.status}`);
  } catch (e) { console.log(`■ 프로젝트 정보 실패: ${e.message}`); }

  // 2) 쿼리별 I/O 상위 — pg_stat_statements (진짜 범인 찾기)
  try {
    const rows = await sql(`
      SELECT left(query, 90) AS query, calls,
             round((total_exec_time)::numeric, 0) AS total_ms,
             shared_blks_read + shared_blks_written + temp_blks_read + temp_blks_written AS disk_blks,
             round((shared_blk_read_time + shared_blk_write_time)::numeric, 0) AS io_wait_ms -- PG17 컬럼명(구 blk_read_time)
      FROM pg_stat_statements
      ORDER BY (shared_blks_read + shared_blks_written + temp_blks_read + temp_blks_written) DESC
      LIMIT 10`);
    console.log(`\n■ 디스크 블록 사용 상위 10 쿼리 (pg_stat_statements):`);
    for (const r of rows) {
      console.log(`  · [${r.disk_blks} blks, ${r.calls}회, io대기 ${fmtMs(r.io_wait_ms)}] ${r.query.replace(/\s+/g, " ")}`);
    }
  } catch (e) { console.log(`\n■ pg_stat_statements 실패: ${e.message}`); }

  // 3) 순차 스캔(인덱스 없이 통짜로 읽기) 많은 테이블
  try {
    const rows = await sql(`
      SELECT relname, seq_scan, seq_tup_read, idx_scan, n_live_tup, n_dead_tup
      FROM pg_stat_user_tables
      WHERE seq_scan > 0
      ORDER BY seq_tup_read DESC LIMIT 8`);
    console.log(`\n■ 순차 스캔 상위 테이블 (인덱스 후보 탐색):`);
    for (const r of rows) {
      console.log(`  · ${r.relname}: seq ${r.seq_scan}회/${r.seq_tup_read}행 읽음, idx ${r.idx_scan ?? 0}회, 살아있는행 ${r.n_live_tup}, 죽은행 ${r.n_dead_tup}`);
    }
  } catch (e) { console.log(`\n■ pg_stat_user_tables 실패: ${e.message}`); }

  // 4) 성능·보안 advisors (대시보드 경고와 동일 소스)
  for (const kind of ["performance", "security"]) {
    try {
      const a = await api(`/projects/${PROJECT_REF}/advisors/${kind}`);
      const lints = a.lints ?? a ?? [];
      const items = Array.isArray(lints) ? lints : [];
      console.log(`\n■ ${kind} advisors: ${items.length}건`);
      for (const l of items.slice(0, 10)) console.log(`  · [${l.level ?? l.severity ?? "?"}] ${l.title ?? l.name}: ${(l.detail ?? l.description ?? "").slice(0, 100)}`);
    } catch (e) { console.log(`\n■ ${kind} advisors 실패: ${e.message}`); }
  }

  console.log("\n끝. 이상 항목은 PO 보고 시 '개선안'과 함께 전달할 것.\n");
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
