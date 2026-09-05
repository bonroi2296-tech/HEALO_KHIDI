/**
 * 실시간 통역 자막에 «이어 붙이기»를 걸면 문장 중간 절단이 몇 %가 되나.
 *
 * 왜 (2026-08-28):
 *   실제 회의를 흉내내 재보니 실시간 통역은 자막을 더 잘게 끊는다(71% vs 상담방 31%).
 *   조각이 잘수록 이어 붙일 게 많아지므로, 이어 붙이기가 그 71%를 얼마나 되돌리는지 잰다.
 *   ⚠️ 다시 구현하지 않고 본판 부품(transcriptStitch)을 그대로 부른다.
 *
 *   simulate_meeting.py --dump captions.json 으로 받은 파일을 먹인다.
 *
 *   npx tsx --conditions=react-server scripts/score-stitch.ts agents/live-translate/captions.json
 */
import { readFileSync } from "node:fs";
import { shouldStitch, stitch, LIVE_TRANSLATE_STITCH, type StitchOptions } from "../src/lib/consultation/transcriptStitch";

type Cap = { at: number; text: string; speaker: string; lang: string };

// 통역 자막에는 원문이 안 온다(번역문만). 그래서 source 자리에 번역문을 넣는다.
const toEntry = (c: Cap) => ({ at: c.at, source: c.text, translated: c.text, speaker: c.speaker, lang: c.lang });

const ENDED = /[.!?…。？！]["'»）)]?\s*$/;
const isCut = (t: string) => t.trim().length > 0 && !ENDED.test(t.trim());

function apply(caps: Cap[], opts: StitchOptions) {
  const out: ReturnType<typeof toEntry>[] = [];
  for (const c of caps) {
    const next = toEntry(c);
    const prev = out[out.length - 1];
    if (prev && shouldStitch({ prev, next }, opts)) {
      const j = stitch({ prev, next });
      out[out.length - 1] = { ...next, at: prev.at, source: j.source, translated: j.translated };
    } else {
      out.push(next);
    }
  }
  return out;
}

const rate = (texts: string[]) => {
  const n = texts.filter((t) => t.trim()).length;
  return { cut: texts.filter(isCut).length, n, pct: n ? (100 * texts.filter(isCut).length) / n : 0 };
};

function report(label: string, rounds: Cap[][], opts: StitchOptions) {
  const all = rounds.flatMap((caps) => apply(caps, opts).map((e) => e.source));
  const r = rate(all);
  console.log(`  ${label.padEnd(34)} ${String(r.cut).padStart(3)}/${String(r.n).padEnd(3)}  ${r.pct.toFixed(0)}%`);
  return r;
}

const file = process.argv[2] ?? "agents/live-translate/captions.json";
const rounds: Cap[][] = JSON.parse(readFileSync(file, "utf8"));

const before = rate(rounds.flat().map((c) => c.text));
console.log(`\n자막 ${before.n}조각 (${rounds.length}회차)\n`);
console.log("문장 중간에서 끊긴 비율");
console.log(`  ${"이어 붙이기 안 걸었을 때".padEnd(30)} ${String(before.cut).padStart(3)}/${String(before.n).padEnd(3)}  ${before.pct.toFixed(0)}%`);
report("기본값 그대로", rounds, {});
report("minLen 2", rounds, { minLen: 2 });
report("minLen 3", rounds, { minLen: 3 });
report("통역봇 기본값(LIVE_TRANSLATE_STITCH)", rounds, LIVE_TRANSLATE_STITCH);
report("minLen 1", rounds, { minLen: 1 });
report("  + 길이 상한 500", rounds, { minLen: 1, maxLen: 500 });

// 기본값이 왜 안 붙이는지: 막은 이유를 세어 본다
const blocked: Record<string, number> = {};
for (const caps of rounds) {
  for (let i = 1; i < caps.length; i++) {
    const prev = toEntry(caps[i - 1]);
    const next = toEntry(caps[i]);
    if (shouldStitch({ prev, next }, {})) continue;
    if (!isCut(prev.source)) blocked["앞 조각이 이미 끝난 문장"] = (blocked["앞 조각이 이미 끝난 문장"] ?? 0) + 1;
    else if (prev.source.length < 8 || next.source.length < 8) blocked["조각이 8자보다 짧음"] = (blocked["조각이 8자보다 짧음"] ?? 0) + 1;
    else if (prev.source.length + next.source.length + 1 > 220) blocked["합치면 220자 넘음"] = (blocked["합치면 220자 넘음"] ?? 0) + 1;
    else if (next.at - prev.at > 10000) blocked["10초보다 멀리 떨어짐"] = (blocked["10초보다 멀리 떨어짐"] ?? 0) + 1;
    else blocked["그 밖(화자·언어 안 맞음 등)"] = (blocked["그 밖(화자·언어 안 맞음 등)"] ?? 0) + 1;
  }
}
console.log("\n기본값이 «안 붙인» 이유");
for (const [why, n] of Object.entries(blocked).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${why.padEnd(30)} ${n}번`);
}

// 붙인 뒤 실제로 어떻게 보이는지 첫 회차만
console.log("");
console.log("짧은 조각도 붙였을 때 화면 (전 회차)");
rounds.forEach((caps, ri) => {
  console.log(`  [${ri + 1}회차]`);
  apply(caps, { minLen: 1, maxLen: 500 }).forEach((e, i) => {
    console.log(`    ${i + 1}. ${e.source.trim()}${isCut(e.source) ? "  <-- 아직 끊김" : ""}`);
  });
});
