#!/usr/bin/env node
/**
 * 「작업본 «안»에만 있는 인수인계」 탐지기 (2026-08-15 신설)
 *
 * 왜: 2026-08-15 어시가 `work/inquiry-redesign` 을 보고 «합치기 신청이 없다 → 방치·증발 위험»
 *   이라고 PO 에게 보고했는데 틀렸다. 그 작업본 **안에** 2026-08-12 인수인계 44줄이
 *   이미 들어 있었다(설계 근거·PO 결정 4건·실측 2건·다음 할 일 6개). 커밋 메시지에도
 *   「배포 준비 하지 말고 내일 보완하자. 합치기 신청·실서비스 반영 안 함」이 적혀 있었다.
 *   PO: *"어제 퇴근시간이라 더 고칠거 있는데 다음주에 마저하자고 해서 남겨둔 거야."*
 *
 *   원인은 게으름이 아니라 «보는 자리»였다 — 본판(main)의 PROJECT_CONTEXT 만 읽고
 *   「전부」라고 판단했다. **본판에 없는 작업본은 기록이 없는 게 아니라 기록이 그 안에 있다.**
 *
 * 무엇을 하나: 본판보다 앞선 원격 작업본 중 «본판에 아직 없는 인수인계»를 품은 것을 띄운다.
 *   (합쳐진 작업본은 뺀다 — 껍데기가 목록을 채우면 진짜 볼 것이 묻힌다.)
 *
 * 성격: **경고만 한다(항상 종료코드 0).** 「합치라」는 뜻이 아니라
 *   「방치로 단정하기 전에 이걸 읽어라」는 표지판이다.
 */
import { execSync } from "node:child_process";

const sh = (c) => {
  try {
    return execSync(c, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

/**
 * 「이게 실패하면 이 검사는 아무 의미가 없다」는 명령 전용. 조용히 빈 값으로 넘기지 않는다.
 *
 * 왜 (2026-08-28 실측으로 발각 — 이 검사는 신설 이후 리눅스에서 «한 번도» 동작한 적이 없다):
 *   원래 두 줄이 `--format=%(refname:short)` 를 **따옴표 없이** 셸에 넘겼다.
 *   POSIX 셸(dash·bash)에서 괄호는 특수문자라 그 자리에서 구문 오류가 난다
 *   (`/bin/sh: Syntax error: "(" unexpected`). 그러면 위의 sh() 가 오류를 삼켜 "" 를 돌려주고,
 *   작업본 목록이 **0개**가 되어 언제나 「✅ 0건」이 찍혔다.
 *   실측 당시 제목에 「인수인계」가 든 안 합쳐진 작업본이 **12개** 있었는데도 0건이었다.
 *   게다가 부르는 쪽(.claude/hooks/session-orient.sh)이 `2>/dev/null` 로 오류 문구까지 지워
 *   «깨졌다»는 신호가 어디에도 남지 않았다. 반성문 #157(검사가 0개를 돌면서 초록불)과 같은 자리다.
 *
 * 그래서: 목록을 못 얻으면 «0건»이라 하지 말고 그 자리에서 시끄럽게 죽는다.
 *   0건과 「못 셌다」는 다른 자리다 — 둘을 같은 초록불로 뭉개면 검사가 장식이 된다.
 */
const shRequired = (c, what) => {
  try {
    return execSync(c, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (e) {
    console.error(`\n❌ ${what} 를 못 읽었다 — 이 검사는 판정을 낼 수 없다(「0건」이 아니다).`);
    console.error(`   명령: ${c}`);
    console.error(`   오류: ${String(e.stderr || e.message).trim().split("\n")[0]}`);
    console.error(`   ⚠️ 이 자리가 조용히 «0건»으로 넘어가면 검사가 장식이 된다(2026-08-28 실사고).`);
    process.exit(1);
  }
};

// ── 자기시험 ────────────────────────────────────────────────────────
// 이 검사가 «진짜 도는지»를 잰다. 2026-08-28 이전엔 이게 없어서, 셸 구문 오류로 통째로 죽은 채
// 13일간 「✅ 0건」만 찍고 있었다(실제로는 23개가 있었다). 같은 부류가 다시 나면 여기서 걸린다.
if (process.argv.includes("--selftest")) {
  let bad = 0;
  const must = (ok, label) => {
    console.log(`${ok ? "✅" : "❌"} ${label}`);
    if (!ok) bad++;
  };

  // ① 목록 뽑기 명령이 셸에서 «오류 없이» 도는가 (따옴표를 지우면 여기서 걸린다)
  let listed = null;
  try {
    listed = execSync("git branch -r --format='%(refname:short)'", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    console.error(`   오류: ${String(e.stderr || e.message).trim().split("\n")[0]}`);
  }
  must(listed !== null, "원격 작업본 목록 명령이 셸에서 정상 실행됨 (--format 따옴표 유지 확인)");

  // ② 따옴표를 «뺀» 형태는 POSIX 셸에서 반드시 실패해야 한다.
  //    실패하지 않는 환경(윈도 cmd 등)이면 이 시험은 건너뛴다 — 거기선 애초에 안 깨지므로.
  let unquotedFailed = false;
  try {
    execSync("git branch -r --format=%(refname:short)", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    unquotedFailed = true;
  }
  if (unquotedFailed) {
    must(true, "따옴표 없는 형태는 셸이 거부함 — 이게 13일간 이 검사를 죽였던 그 자리다");
  } else {
    console.log("⏭  이 셸은 따옴표 없이도 통과한다(윈도 계열) — 재현 시험 건너뜀");
  }

  // ③ 「못 셌다」를 「0건」으로 뭉개지 않는가 = shRequired 가 살아 있는가
  must(typeof shRequired === "function", "목록을 못 읽으면 «0건»이 아니라 시끄럽게 죽는 길이 있음");

  if (bad) {
    console.error(`\n❌ 자체 시험 ${bad}건 실패 — 이 검사의 「0건」을 믿지 마라.`);
    process.exit(1);
  }
  console.log("\n✅ 작업본 인수인계 탐지기 자체 시험 통과");
  process.exit(0);
}

// ⚠️ `--format` 값의 따옴표를 지우지 마라. 괄호가 셸 특수문자라 그 순간 이 검사가 통째로 죽는다.
const mergedSet = new Set(
  shRequired("git branch -r --merged origin/main --format='%(refname:short)'", "합쳐진 작업본 목록")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
);

const branches = shRequired("git branch -r --format='%(refname:short)'", "원격 작업본 목록")
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter((b) => b && !/(^origin\/HEAD|\/main$|\/production$)/.test(b));

const found = [];
for (const b of branches) {
  if (mergedSet.has(b)) continue; // 이미 본판에 들어간 것
  const ahead = Number(sh(`git rev-list --count origin/main..${b}`) || 0);
  if (!ahead) continue;
  // 본판 대비 인수인계 문서가 «아직 다른가» = 본판에 없는 기록을 품고 있나
  const differs = sh(`git diff --name-only origin/main...${b} -- docs/PROJECT_CONTEXT.md`);
  if (!differs) continue;
  found.push({
    b: b.replace(/^origin\//, ""),
    ahead,
    last: sh(`git log -1 --format=%ad --date=format:%Y-%m-%d ${b}`),
    subj: sh(`git log -1 --format=%s ${b}`).slice(0, 60),
  });
}

if (!found.length) {
  console.log("✅ 작업본 안에만 있는 인수인계 0건");
  process.exit(0);
}

console.log(`\n📌 작업본 «안»에만 인수인계가 있는 작업본 ${found.length}개 — 방치로 단정하기 전에 읽어라\n`);
for (const f of found.sort((a, z) => z.last.localeCompare(a.last))) {
  console.log(`  ${f.b}  (앞선커밋 ${f.ahead} · 마지막 ${f.last})`);
  console.log(`    최근: ${f.subj}`);
  console.log(`    읽기: git log origin/main..origin/${f.b} --format="%s%n%b"`);
  console.log(`          git diff origin/main...origin/${f.b} -- docs/PROJECT_CONTEXT.md\n`);
}
console.log("⚠️ 「합치기 신청이 없다 = 방치」로 단정하지 마라 — PO 가 «다음에 마저 하자»고 남긴 것일 수 있다.\n");
