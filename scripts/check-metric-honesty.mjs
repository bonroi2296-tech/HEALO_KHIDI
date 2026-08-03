#!/usr/bin/env node
/**
 * healwith: 성과지표 정직성 검사 — 「공식 산출물이 시험 데이터를 세고 있지 않은가」
 *
 * 왜 만들었나 (2026-08-04): 같은 사고가 세 번 났다.
 *   · 2026-07-02 — 문의 미연결 시험 상담이 K-02 로 집계됨. 세션 자체에 `is_test` 도장을 찍는
 *                  방식으로 막았다(src/lib/khidi/testData.ts detectSessionIsTest).
 *   · 2026-07-27 — 파트너 미팅 10건이 증빙 CSV 에 「사전상담」으로 실림. 유형 필터를 넣었다.
 *   · 2026-08-04 — 그런데 **그 도장을 안 보는 산출물이 아직 두 곳 남아 있었다**:
 *                  월간보고서(공식 제출물)에 시험 상담 1건, 증빙 CSV 에 시험 상담 79건
 *                  (전체 95건 중 실적은 15건). 어드민 대시보드 상담 카드도 95로 떠 있었다.
 *   매번 「고쳤다」고 끝냈고, 다음 산출물이 같은 구멍으로 새는 걸 아무도 안 막았다.
 *
 * 무엇을 잡나 (정직하게 = 이게 전부다):
 *   아래 WATCHED 목록의 파일이 `consultation_sessions` 를 조회하면서 `is_test` 를
 *   한 번도 언급하지 않으면 실패시킨다. 새 산출물을 만들면 WATCHED 에 추가하라.
 * 못 잡는 것:
 *   `is_test` 를 «언급만 하고 잘못 쓰는» 경우(예: 필터를 조건문 밖에 둬서 안 걸리는 경우)는
 *   못 잡는다. 문자열이 있는지만 본다. 실제 숫자가 맞는지는 사람이 DB 로 세어봐야 한다.
 *   또 WATCHED 에 안 올린 새 파일도 못 잡는다 — 목록을 사람이 관리해야 한다는 뜻이다.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

/** 「KHIDI 성과지표·평가 제출물·운영 현황판」으로 숫자를 내보내는 곳. */
const WATCHED = [
  { path: "src/lib/khidi/kpi.ts", what: "KPI 대시보드 집계" },
  { path: "src/lib/khidi/northStar.ts", what: "북극성 지표" },
  { path: "app/api/admin/khidi/monthly-report/route.ts", what: "월간보고서(공식 제출물)" },
  { path: "app/api/admin/khidi/evidence/route.ts", what: "증빙 산출물 CSV" },
  { path: "app/api/admin/khidi/conversion-funnel/route.ts", what: "유치 전환 대시보드" },
  { path: "app/api/admin/dashboard/overview/route.ts", what: "어드민 통합 대시보드 카드" },
  { path: "app/api/cron/kpi-snapshot/route.ts", what: "일별 KPI 스냅샷" },
];

const SOURCE = "consultation_sessions";
const STAMP = "is_test";

function check() {
  const problems = [];
  for (const w of WATCHED) {
    const abs = join(ROOT, w.path);
    if (!existsSync(abs)) {
      problems.push(
        `[사라진 산출물] ${w.path} (${w.what}) 가 없다. 파일을 옮겼거나 지웠다면 ` +
          `scripts/check-metric-honesty.mjs 의 WATCHED 목록도 같이 고쳐라.`
      );
      continue;
    }
    const src = readFileSync(abs, "utf8");
    if (!src.includes(SOURCE)) continue; // 이 산출물은 상담을 안 센다 → 검사 대상 아님
    if (!src.includes(STAMP)) {
      problems.push(
        `[시험분 미제외] ${w.path} (${w.what}) 가 ${SOURCE} 를 조회하면서 ` +
          `${STAMP} 를 한 번도 안 본다. 시험 데이터가 실적으로 집계된다. ` +
          `kpi.ts 와 같은 방식으로 제외하라.`
      );
    }
  }
  return problems;
}

if (process.argv.includes("--selftest")) {
  // 검사기가 조용히 죽지 않게: 목록이 비거나 조건이 뒤집히면 잡는다.
  let bad = 0;
  if (WATCHED.length === 0) { console.error("❌ WATCHED 목록이 비었다"); bad++; }
  const missing = WATCHED.filter((w) => !existsSync(join(ROOT, w.path)));
  if (missing.length) {
    console.error(`❌ WATCHED 에 없는 파일 ${missing.length}건: ${missing.map((m) => m.path).join(", ")}`);
    bad++;
  }
  const counted = WATCHED.filter((w) => {
    const abs = join(ROOT, w.path);
    return existsSync(abs) && readFileSync(abs, "utf8").includes(SOURCE);
  });
  if (counted.length === 0) {
    console.error(`❌ ${SOURCE} 를 보는 산출물이 하나도 없다 — 표 이름이 바뀌었을 수 있다`);
    bad++;
  }
  if (bad) process.exit(1);
  console.log(`✅ 자기시험 통과 — 감시 대상 ${WATCHED.length}곳, 그중 상담을 세는 곳 ${counted.length}곳`);
  process.exit(0);
}

const problems = check();
if (problems.length === 0) {
  console.log(`✅ 성과지표 정직성 통과 — 공식 산출물 ${WATCHED.length}곳 전부 시험분을 가린다.`);
  process.exit(0);
}
console.error(`\n❌ 성과지표 정직성 위반 ${problems.length}건\n`);
problems.forEach((p) => console.error(`  ${p}\n`));
process.exit(1);
