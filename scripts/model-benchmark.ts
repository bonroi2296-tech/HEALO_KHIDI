/**
 * healwith: 모델 성능 비교 벤치마크 CLI (의료특화 에이전트 vs 일반 하이엔드 모델)
 *
 * 코어 로직은 src/lib/chat/modelBenchmark.ts 단일 모듈. 이 스크립트는 CLI 래퍼
 * (콘솔 표 + evaluation_results/*.md 리포트 저장). 어드민 버튼은 같은 코어를 라우트로 호출.
 *
 * 목적/방법론/결과 해석: docs/AI_MODEL_BENCHMARK.md 참고.
 *
 * 실행 (GOOGLE 키 필요):
 *   GOOGLE_GENERATIVE_AI_API_KEY=... npm run bench:models                # 전체 문항 + 맞대결
 *   GOOGLE_GENERATIVE_AI_API_KEY=... npm run bench:models -- --quick     # 대표 문항만(빠름·저비용)
 *   GOOGLE_GENERATIVE_AI_API_KEY=... npm run bench:models -- --full      # + 하이엔드+특화 상한선
 *
 * 환경변수: BENCH_HIGHEND_MODEL(기본 gemini-2.5-pro) · BENCH_JUDGE_MODEL(기본=하이엔드) ·
 *           BENCH_OUR_MODEL(기본 gemini-flash-latest)
 */

import * as fs from "fs";
import * as path from "path";
import { runModelBenchmark, type Agg, type BenchmarkResult } from "../src/lib/chat/modelBenchmark";

function fmt(n: number, d = 2) {
  return Number.isFinite(n) ? n.toFixed(d) : "—";
}

function writeReport(result: BenchmarkResult): string {
  const { aggs, rows, pairwiseSummary, calibration, meta } = result;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join(process.cwd(), "evaluation_results");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `model-benchmark-${stamp}.md`);

  const lines: string[] = [];
  lines.push(`# 모델 성능 비교 벤치마크 — 의료특화 에이전트 vs 하이엔드`);
  lines.push("");
  lines.push(`- 실행: ${stamp} · 모드: ${meta.mode} · 문항 ${meta.scenarioCount}개 · LLM 호출 ${meta.llmCalls}회`);
  lines.push(`- 우리: \`${meta.ourModel}\` | 하이엔드: \`${meta.highendModel}\` | 채점관: \`${meta.judgeModel}\``);
  lines.push(`- 채점 가중치: 환각 0.40 / 안전 0.35 / 관련성 0.25 (qualityStandards 단일기준)`);
  lines.push("");
  lines.push(`## ① 종합 절대점수 (0~1, 높을수록 좋음)`);
  lines.push("");
  lines.push(`| 비교군 | 환각↑ | 안전↑ | 관련성↑ | 종합↑ | 통과율% | 레드라인위반 | 평균지연ms |`);
  lines.push(`|---|---|---|---|---|---|---|---|`);
  for (const a of aggs) {
    lines.push(
      `| ${a.label} | ${fmt(a.hallucination)} | ${fmt(a.safety)} | ${fmt(a.relevance)} | **${fmt(a.overall)}** | ${fmt(a.passRate, 0)} | ${a.redlineViolations}/${a.n} | ${fmt(a.avgLatency, 0)} |`
    );
  }
  lines.push("");

  if (pairwiseSummary) {
    const p = pairwiseSummary;
    lines.push(`## ② 맞대결 (우리 vs 하이엔드 맨몸, 익명 A/B 비교)`);
    lines.push("");
    lines.push(`- 우리 승 **${p.ourWins}** / 하이엔드 승 ${p.highendWins} / 무승부 ${p.ties} (총 ${p.n})`);
    lines.push(`- **우리 승률(무승부 제외): ${fmt(p.ourWinRatePct, 0)}%**`);
    lines.push("");
  }

  if (calibration.length) {
    lines.push(`## ③ 사람 검수용 표본 (AI 채점이 맞는지 직접 확인)`);
    lines.push("");
    for (const c of calibration) {
      lines.push(`### [${c.category}] ${c.scenarioId} (${c.lang})`);
      lines.push(`> ${c.query}`);
      lines.push(`- **우리** (종합 ${fmt(c.ourScores.overall)}): ${c.ourResponse.replace(/\n/g, " ").slice(0, 240)}`);
      lines.push(`- **하이엔드 맨몸**: ${c.highendResponse.replace(/\n/g, " ").slice(0, 240)}`);
      if (c.pairwise) lines.push(`- 맞대결 판정: **${c.pairwise.winner}** — ${c.pairwise.reason}`);
      lines.push("");
    }
  }

  lines.push(`## 부록: 시나리오별 상세`);
  lines.push("");
  const sids = [...new Set(rows.map((r) => r.scenarioId))];
  for (const sid of sids) {
    const srows = rows.filter((r) => r.scenarioId === sid);
    const first = srows[0];
    lines.push(`### [${first.category}] ${sid} (${first.lang})`);
    lines.push(`> ${first.query}`);
    for (const r of srows) {
      const fl = r.scores.flags.length ? ` flags=[${r.scores.flags.join(",")}]` : "";
      lines.push(`- **${r.arm}** (overall ${fmt(r.scores.overall)}${fl}): ${r.response.replace(/\n/g, " ").slice(0, 200)}`);
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
  const mode: "quick" | "full" = process.argv.includes("--quick") ? "quick" : "full";
  const judgeModel = process.env.BENCH_JUDGE_MODEL || undefined;

  console.log(`🚀 모델 성능 비교 벤치마크 (모드=${mode}, full비교군=${full})...`);
  const result = await runModelBenchmark({ full, mode, judgeModel, onProgress: (m) => console.log(`▶ ${m}`) });

  console.log("\n" + "=".repeat(78));
  console.log("📊 종합 (높을수록 좋음, 레드라인위반은 낮을수록 좋음)");
  console.log("=".repeat(78));
  console.log(["비교군", "환각", "안전", "관련성", "종합", "통과%", "위반", "지연ms"].join("\t"));
  for (const a of result.aggs as Agg[]) {
    console.log(
      [a.armKey, fmt(a.hallucination), fmt(a.safety), fmt(a.relevance), fmt(a.overall), fmt(a.passRate, 0), `${a.redlineViolations}/${a.n}`, fmt(a.avgLatency, 0)].join("\t")
    );
  }
  if (result.pairwiseSummary) {
    const p = result.pairwiseSummary;
    console.log(`\n⚔️  맞대결: 우리 ${p.ourWins}승 / 하이엔드 ${p.highendWins}승 / 무 ${p.ties} → 우리 승률 ${fmt(p.ourWinRatePct, 0)}%`);
  }

  const file = writeReport(result);
  console.log(`\n✅ 상세 리포트 저장: ${file}`);
}

main().catch((e) => {
  console.error("❌ Fatal:", e);
  process.exit(1);
});
