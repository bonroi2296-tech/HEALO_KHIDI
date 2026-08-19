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

const mergedSet = new Set(
  sh("git branch -r --merged origin/main --format=%(refname:short)")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
);

const branches = sh("git branch -r --format=%(refname:short)")
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
