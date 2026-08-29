#!/usr/bin/env node
/**
 * 「파이프 뒤에서 실패가 조용히 사라지는 것」 탐지기 (2026-08-28 신설)
 *
 * ── 왜 이게 있나 (실사고) ────────────────────────────────────────────
 * 매일 도는 「훑기 대장」(.github/workflows/sweep.yml)이 **13번 돌아 13번 다 초록**이었다.
 * 그런데 그 실행 기록을 열어보면 스크립트는 매번 이렇게 끝나 있었다:
 *
 *     볼 것 0건 / 못 잼 2건 / 통과 6건
 *     ── 이 창구는 «볼 것 또는 못 잼»이 있으면 일부러 실패로 끝난다(메일이 나가게) ──
 *       못 잼: 익명이 환자 표를 읽나 — 익명 열쇠 없음
 *
 * 즉 sweep.mjs 는 제대로 `process.exit(1)` 했는데 **작업 단계는 초록**이었고,
 * `if: failure()` 로 걸린 메일 단계는 매번 «건너뜀»이었다. 아무도 메일을 못 받았다.
 *
 * 범인은 한 글자다 — 파이프:
 *
 *     run: node scripts/sweep.mjs --alert 2>&1 | tee sweep.txt
 *
 * 깃허브 작업의 «기본» 셸은 `bash -e {0}` 다 — **`-o pipefail` 이 없다**
 * (실행 기록에 그대로 찍힌다: `shell: /usr/bin/bash -e {0}`).
 * pipefail 이 없으면 파이프의 종료코드는 «맨 끝 명령»의 것이고, `tee` 는 언제나 0 이다.
 * 앞에서 무엇이 죽든 그 단계는 성공으로 끝난다.
 *
 * 실측(이 상자에서 직접):
 *     bash -e -c 'false | tee /dev/null'                 → 0   ← 실패가 사라진다
 *     bash -e -c 'set -o pipefail; false | tee /dev/null' → 1   ← 살아난다
 *
 * ⚠️ 저장소 안에 **틀린 믿음이 문서로 박혀 있었다** — uptime.yml 머리말이
 *    「기본 셸이 `bash -eo pipefail`」이라고 적어뒀다. 그 믿음이 이 코드를 낳았다.
 *    그래서 이 검사는 «고쳤다»로 끝내지 않고 기계로 박는다.
 *
 * ── 무엇을 보나 ──────────────────────────────────────────────────────
 * 워크플로 단계의 `run:` 안에서 «맨몸 파이프»(종료코드가 판정에 쓰이는 자리)를 찾아,
 * 그 단계가 아래 «넷 중 하나»도 갖추지 않았으면 실패시킨다:
 *   ① `set -o pipefail` 이 그 블록 안에 있다
 *   ② 단계에 `shell:` 이 명시돼 있다 (`shell: bash` 는 `-eo pipefail` 로 돈다)
 *   ③ `continue-on-error: true` — 애초에 판정에 안 쓰는 단계다
 *   ④ 그 줄에 `# pipefail-ok: 왜 괜찮은지` 가 붙어 있다
 *
 * ── 오탐을 어떻게 줄였나 (이게 없으면 이 검사가 다음 «회피 대상»이 된다) ──
 * 파이프가 있어도 종료코드가 판정에 안 쓰이는 자리는 «맨몸»이 아니다. 전부 제외한다:
 *   · `if ... | ... ; then` · `while` · `until` — 종료코드를 조건으로 «쓰고 있다»
 *   · `$( ... )` · 백틱 안 — 값을 만드는 자리
 *   · 끝이 `|| true` · `|| :` — 일부러 삼킨 것
 *   · `|| `(논리합)·`||` 연산자와 YAML 블록 스칼라 표시(`run: |`)
 * 이 저장소 실측: 위 규칙으로 훑으면 진짜 결함 1건(sweep.yml)만 걸리고
 * 나머지 파이프 8곳은 전부 정상 분류됐다(오탐 0건).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WF_DIR = path.join(ROOT, ".github", "workflows");

/** 한 줄에 «맨몸 파이프»가 있나 — 종료코드가 판정에 쓰이는 파이프인가 */
export function hasBarePipe(line) {
  let s = line;

  // 주석 제거(파이프가 주석 안에 있으면 명령이 아니다)
  s = s.replace(/(^|\s)#.*$/, "");
  if (!s.trim()) return false;

  // `$( ... )` 와 백틱 안은 «값을 만드는 자리» — 통째로 지운다
  let prev;
  do {
    prev = s;
    s = s.replace(/\$\([^()]*\)/g, " ");
  } while (s !== prev);
  s = s.replace(/`[^`]*`/g, " ");

  // 일부러 삼킨 것
  if (/\|\|\s*(true|:)\s*$/.test(s.trim())) return false;

  // 조건문이 종료코드를 «쓰고 있다»
  if (/(^|\s|;)(if|elif|while|until)\s/.test(s)) return false;

  // 논리합(||)은 파이프가 아니다 → 지운 뒤에 남은 홑 파이프만 본다
  s = s.replace(/\|\|/g, " ");

  // 홑 파이프 뒤에 명령이 이어져야 파이프다 (YAML 블록 스칼라 `run: |` 는 뒤가 비어 있다)
  return /\|\s*\S/.test(s);
}

function readWorkflows() {
  if (!fs.existsSync(WF_DIR)) return [];
  return fs
    .readdirSync(WF_DIR)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => ({ file: path.join(".github/workflows", f), text: fs.readFileSync(path.join(WF_DIR, f), "utf8") }));
}

/**
 * 아주 얕은 단계 쪼개기 — YAML 파서를 안 쓴다(의존성 추가 없이 돌게).
 * 단계는 `- ` 로 시작하고, 같은 들여쓰기의 다음 `- ` 전까지가 한 단계다.
 */
function splitSteps(text) {
  const lines = text.split(/\r?\n/);
  const steps = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const m = l.match(/^(\s*)-\s+(name|uses|run|id|if):/);
    if (m) {
      if (cur) steps.push(cur);
      cur = { indent: m[1].length, start: i, lines: [l] };
      continue;
    }
    if (cur) {
      const ind = l.length - l.trimStart().length;
      if (l.trim() && ind <= cur.indent) {
        steps.push(cur);
        cur = null;
      } else {
        cur.lines.push(l);
      }
    }
  }
  if (cur) steps.push(cur);
  return steps;
}

export function scan() {
  const bad = [];
  let pipesSeen = 0;
  for (const { file, text } of readWorkflows()) {
    for (const step of splitSteps(text)) {
      const body = step.lines.join("\n");
      if (!/(^|\n)\s*(- )?run:/.test(body)) continue;

      const declared =
        /\bset\s+-o\s+pipefail\b/.test(body) ||
        /\bset\s+-[a-z]*o[a-z]*\s+pipefail\b/.test(body) ||
        /(^|\n)\s*shell:/.test(body) ||
        /(^|\n)\s*continue-on-error:\s*true/.test(body);

      step.lines.forEach((l, k) => {
        if (!hasBarePipe(l)) return;
        pipesSeen++;
        if (declared) return;
        if (/#\s*pipefail-ok:/.test(l)) return;
        bad.push({ file, line: step.start + k + 1, code: l.trim() });
      });
    }
  }
  return { bad, pipesSeen };
}

// ── 자기시험 ────────────────────────────────────────────────────────
// 이 검사가 «진짜 잡는지»를 잰다. 검사를 만들면 그 검사의 시험도 같이 만든다
// (2026-08-28 `check:guard-coverage` 로 강제되는 규칙 — 이 파일이 그 첫 손님이다).
if (process.argv.includes("--selftest")) {
  let bad = 0;
  const must = (ok, label) => {
    console.log(`${ok ? "✅" : "❌"} ${label}`);
    if (!ok) bad++;
  };

  // ① 사고를 낸 «바로 그 줄»을 잡는가
  must(hasBarePipe("          node scripts/sweep.mjs --alert 2>&1 | tee sweep.txt"), "사고를 낸 그 줄(… | tee)을 «맨몸 파이프»로 본다");

  // ② 종료코드를 안 쓰는 자리는 안 잡는가 (오탐 시험)
  must(!hasBarePipe(`          if printf '%s' "$out" | grep -q '"db":"up"'; then`), "if 조건 안의 파이프는 안 잡는다");
  must(!hasBarePipe(`          BODY=$(sed -n '/^──/,$p' sweep.txt | head -20)`), "$( ) 안의 파이프는 안 잡는다");
  must(!hasBarePipe("          grep -F x a.log | grep -F y > b.txt || true"), "|| true 로 삼킨 것은 안 잡는다");
  must(!hasBarePipe("        run: |"), "YAML 블록 스칼라 표시(run: |)는 파이프가 아니다");
  must(!hasBarePipe("          a && b || c"), "논리합(||)은 파이프가 아니다");
  must(!hasBarePipe("          # node x.mjs | tee y.txt"), "주석 안의 파이프는 안 잡는다");

  // ③ 셸이 정말 그렇게 동작하는가 — 「내 머릿속 규칙」이 아니라 실측으로 확인한다.
  //    이게 거짓이면 이 검사 자체가 존재 이유를 잃는다.
  const { spawnSync } = await import("node:child_process");
  const noPipefail = spawnSync("bash", ["-e", "-c", "false | tee /dev/null >/dev/null"]).status;
  const withPipefail = spawnSync("bash", ["-e", "-c", "set -o pipefail; false | tee /dev/null >/dev/null"]).status;
  must(noPipefail === 0, `pipefail 없으면 실패가 사라진다 (실측 종료코드 ${noPipefail})`);
  must(withPipefail === 1, `pipefail 있으면 실패가 살아난다 (실측 종료코드 ${withPipefail})`);

  // ④ 지금 저장소가 깨끗한가 (여기서 걸리면 ①~③ 이 아니라 워크플로가 문제다)
  const { bad: found } = scan();
  must(found.length === 0, `현재 워크플로에 맨몸 파이프 0건 (실측 ${found.length}건)`);

  if (bad) {
    console.error(`\n❌ 자체 시험 ${bad}건 실패 — 이 검사의 「통과」를 믿지 마라.`);
    process.exit(1);
  }
  console.log("\n✅ 파이프 실패 삼킴 탐지기 자체 시험 통과");
  process.exit(0);
}

const { bad, pipesSeen } = scan();

if (bad.length) {
  console.error(`\n❌ 파이프 뒤에서 실패가 조용히 사라질 자리 ${bad.length}건:\n`);
  for (const b of bad) console.error(`   · ${b.file}:${b.line}\n     ${b.code}`);
  console.error(`
깃허브 작업의 기본 셸은 \`bash -e {0}\` 라 **pipefail 이 꺼져 있다.**
파이프의 종료코드는 «맨 끝 명령»의 것이라, 앞에서 검사가 죽어도 그 단계는 초록으로 끝난다.
2026-08-28 실사고: 매일 도는 「훑기 대장」이 13번 돌아 13번 다 초록이었는데,
실제로는 매번 «못 잼 2건»으로 exit 1 하고 있었다. 경보 메일은 한 통도 안 나갔다.

고치는 법 — 넷 중 하나:
  ① 그 run 블록 첫 줄에  set -o pipefail  을 넣는다  (가장 눈에 보이는 방법)
  ② 그 단계에  shell: bash  를 명시한다 (그러면 -eo pipefail 로 돈다)
  ③ 판정에 안 쓰는 단계면  continue-on-error: true  를 명시한다
  ④ 정말 괜찮은 자리면 그 줄 끝에  # pipefail-ok: «왜 괜찮은지»  를 적는다
`);
  process.exit(1);
}

console.log(`✓ 워크플로 파이프 ${pipesSeen}곳 전부 종료코드가 살아 있다 (맨몸 파이프 0건)`);
