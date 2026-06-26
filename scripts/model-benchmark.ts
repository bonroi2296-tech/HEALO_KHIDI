/**
 * healwith: 모델 성능 비교 벤치마크 CLI (의료특화 에이전트 vs 일반 하이엔드 모델)
 *
 * 코어 로직은 src/lib/chat/modelBenchmark.ts 단일 모듈. 이 스크립트는 CLI 래퍼
 * (콘솔 표 + evaluation_results/*.md 리포트 저장). 어드민 버튼은 같은 코어를 라우트로 호출.
 *
 * 목적/방법론/결과 해석: docs/AI_MODEL_BENCHMARK.md 참고.
 *
 * 실행 (GOOGLE 키 필요):
 *   GOOGLE_GENERATIVE_AI_API_KEY=... npm run bench:models
 *   GOOGLE_GENERATIVE_AI_API_KEY=... npm run bench:models -- --full   # 하이엔드+특화 상한선까지
 *
 * 환경변수: BENCH_HIGHEND_MODEL(기본 gemini-2.5-pro) · BENCH_JUDGE_MODEL(기본=하이엔드) ·
 *           BENCH_OUR_MODEL(기본 gemini-flash-latest)
 */

import * as fs from "fs";
import * as path from "path";
import { runModelBenchmark, SCENARIOS, type Agg, type Row } from "../src/lib/chat/modelBenchmark";

function fmt(n: number, d = 2) {
  return Number.isFinite(n) ? n.toFixed(d) : "—";
}

function writeReport(aggs: Agg[], rows: Row[], meta: any): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join(process.cwd(), "evaluation_results");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `model-benchmark-${stamp}.md`);

  const lines: string[] = [];
  lines.push(`# 모델 성능 비교 벤치마크 — 의료특화 에이전트 vs 하이엔드`);
  lines.push("");
  lines.push(`- 실행: ${stamp}`);
  lines.push(`- 우리: \`${meta.ourModel}\` | 하이엔드: \`${meta.highendModel}\` | 채점관: \`${meta.judgeModel}\``);
  lines.push(`- 시나리오 ${meta.scenarioCount}개 × 비교군 ${meta.armCount}개 (레드라인+컨시어지+환각유도, ko/en/ru)`);
  lines.push(`- 채점 가중치: 환각 0.40 / 안전 0.35 / 관련성 0.25 (qualityStandards 단일기준)`);
  lines.push("");
  lines.push(`## 종합 (점수 0~1, 높을수록 좋음)`);
  lines.push("");
  lines.push(`| 비교군 | 환각↑ | 안전↑ | 관련성↑ | 종합↑ | 통과율% | 레드라인위반 | 평균지연ms |`);
  lines.push(`|---|---|---|---|---|---|---|---|`);
  for (const a of aggs) {
    lines.push(
      `| ${a.label} | ${fmt(a.hallucination)} | ${fmt(a.safety)} | ${fmt(a.relevance)} | **${fmt(a.overall)}** | ${fmt(a.passRate, 0)} | ${a.redlineViolations}/${a.n} | ${fmt(a.avgLatency, 0)} |`
    );
  }
  lines.push("");
  lines.push(`> 핵심: "우리(our)"의 **안전·환각 점수**와 **레드라인 위반 건수**를 "하이엔드 맨몸(highend_raw)"과 비교.`);
  lines.push("");
  lines.push(`## 시나리오별 상세`);
  lines.push("");
  for (const sc of SCENARIOS) {
    lines.push(`### [${sc.category}] ${sc.id} (${sc.lang})`);
    lines.push(`> ${sc.query}`);
    lines.push("");
    for (const a of aggs) {
      const r = rows.find((x) => x.arm === a.armKey && x.scenarioId === sc.id);
      if (!r) continue;
      const fl = r.scores.flags.length ? ` flags=[${r.scores.flags.join(",")}]` : "";
      lines.push(`- **${a.armKey}** (overall ${fmt(r.scores.overall)}${fl}): ${r.response.replace(/\n/g, " ").slice(0, 220)}`);
    }
    lines.push("");
  }
  fs.writeFileSync(file, lines.join("\n"), "utf-8");
  return file;
}

async function main() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error("❌ GOOGLE_GENERATIVE_AI_API_KEY 가 필요합니다. (PO 환경에서 키를 넣고 실행)");
    process.exit(1);
  }
  const full = process.argv.includes("--full");
  const judgeModel = process.env.BENCH_JUDGE_MODEL || undefined;

  console.log("🚀 모델 성능 비교 벤치마크 시작...");
  const result = await runModelBenchmark({
    full,
    judgeModel,
    onProgress: (m) => console.log(`▶ ${m}`),
  });

  console.log("\n" + "=".repeat(78));
  console.log("📊 종합 (높을수록 좋음, 레드라인위반은 낮을수록 좋음)");
  console.log("=".repeat(78));
  console.log(["비교군", "환각", "안전", "관련성", "종합", "통과%", "위반", "지연ms"].join("\t"));
  for (const a of result.aggs) {
    console.log(
      [a.armKey, fmt(a.hallucination), fmt(a.safety), fmt(a.relevance), fmt(a.overall), fmt(a.passRate, 0), `${a.redlineViolations}/${a.n}`, fmt(a.avgLatency, 0)].join("\t")
    );
  }

  const file = writeReport(result.aggs, result.rows, result.meta);
  console.log(`\n✅ 상세 리포트 저장: ${file}`);
  console.log("   (KHIDI 중간평가 근거자료로 docs/AI_MODEL_BENCHMARK.md 와 함께 사용)");
}

main().catch((e) => {
  console.error("❌ Fatal:", e);
  process.exit(1);
});
