#!/usr/bin/env node
/**
 * 말투 검사 — 「쉬운 말 + 원어 병기」를 기계가 잰다.
 *
 * 왜 (2026-07-28, PO 가 한 세션에서 세 번 지적):
 *   말투 규칙은 이미 ①CLAUDE.md 에 있고 ②훅(plain-korean.sh)이 **매 턴 다시 띄운다.**
 *   그런데도 어겼다. PO 가 *"규칙 그렇게 해놔도 오늘 쉽게 설명하라고 한 것도 안 지키잖아"* 라고
 *   되물었고, 그 말이 맞다 — **알려주는 것과 재는 것은 다르다.**
 *   훅은 "이렇게 말해라"라고 알려주기만 했고, **어겼는지는 아무도 안 재고 있었다.**
 *   지침 7번(「기계로 잴 수 있으면 훅·자동검사로 박아라」)을 말투 자신에게는 적용 안 한 것.
 *
 * 판정 방식 (일부러 느슨하게 — 오탐 나는 검사는 사람이 무시하게 돼서 없느니만 못하다):
 *   «원어가 나왔는데, 그 뜻을 풀어주는 한국어 낱말이 **그 응답 어디에도 없다**» 만 잡는다.
 *   - "합치기 신청서(PR)" → 「신청서」가 있으니 통과.
 *   - "PR 올렸다"          → 「신청서」가 어디에도 없으니 위반.
 *   같은 응답 안에서 한 번만 풀어주면 그 뒤로는 원어만 써도 통과 — 사람이 실제로 읽는 방식과 같다.
 *
 * 코드블록·`인라인 코드`·URL 은 검사 대상에서 뺀다.
 *   거긴 파일 이름·명령어가 들어가는 자리라 한국어로 풀 수 없다(`daily-deploy.yml` 을
 *   「매일 배포」로 바꿔 쓰면 그건 틀린 정보가 된다).
 *
 * 쓰는 법:
 *   node scripts/check-plain-korean.mjs --transcript <대화기록.jsonl>   # 마지막 응답 검사
 *   echo "본문" | node scripts/check-plain-korean.mjs                   # 표준입력 검사
 *   npm run check:talk -- --self-test                                   # 검사기 자체 시험
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// 원어 → 그 뜻을 풀어주는 한국어 낱말(하나라도 있으면 통과)
const RULES = [
  { re: /\bPRs?\b|pull request/i, need: /신청서/, say: "합치기 신청서(PR)" },
  { re: /\bCI\b/, need: /검사/, say: "자동 검사(CI)" },
  { re: /머지|\bmerges?\b|\bmerged\b/i, need: /합치|본판/, say: "본판에 합침(머지)" },
  { re: /\bdeploys?\b|\bdeployment\b/i, need: /실서비스|배포/, say: "실서비스 반영(배포)" },
  { re: /브랜치|\bbranch(es)?\b/i, need: /작업본/, say: "작업본(브랜치)" },
  { re: /롤백|\brollback\b/i, need: /되돌리/, say: "되돌리기(롤백)" },
  { re: /\bRLS\b/, need: /접근권한/, say: "접근권한 규칙(RLS)" },
  { re: /\benvs?\b/i, need: /환경변수/, say: "환경변수(env)" },
  { re: /커밋|\bcommits?\b/i, need: /저장|올리/, say: "저장 올리기(커밋)" },
  {
    re: /typecheck|eslint|vitest|playwright|\blint\b|\btsc\b/i,
    need: /검사|시험|테스트/,
    say: "…검사(typecheck·lint 등)",
  },
  { re: /\bhooks?\b|훅/i, need: /자동 ?실행|자동으로|알림|가로채/, say: "자동 실행 장치(훅)" },
];

/** 코드블록·인라인 코드·URL 제거 — 거긴 원어가 정상이다. */
export function stripCode(text) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/https?:\/\/\S+/g, " ");
}

/** 본문 하나를 검사해 위반 목록을 돌려준다. */
export function findViolations(text) {
  const body = stripCode(text);
  const out = [];
  for (const r of RULES) {
    const m = body.match(r.re);
    if (m && !r.need.test(body)) out.push({ hit: m[0], say: r.say });
  }
  return out;
}

/** 대화기록에서 마지막 어시스턴트 응답의 본문만 뽑는다. */
function lastAssistantText(path) {
  const lines = readFileSync(path, "utf8").trim().split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    let o;
    try {
      o = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (o.type !== "assistant") continue;
    const t = (o.message?.content || [])
      .filter((x) => x.type === "text")
      .map((x) => x.text)
      .join("\n");
    if (t.trim()) return t;
  }
  return "";
}

// ── 검사기 자체 시험 (이 검사가 진짜 잡는지) ──────────────────────
function selfTest() {
  const cases = [
    ["PR 올렸는데 CI가 안 붙는다", 2, "풀이 없는 원어 = 잡아야 함"],
    ["합치기 신청서(PR) 올렸는데 자동 검사(CI)가 안 붙는다", 0, "병기했으면 통과"],
    ["신청서 3개를 봤다. PR 마다 검사가 달랐다.", 0, "앞에서 한 번 풀었으면 뒤는 원어만 써도 통과"],
    ["`daily-deploy.yml` 파일을 고쳤다", 0, "코드블록 안 파일명은 검사 제외"],
    ["브랜치 6개가 동시에 떴다", 1, "「작업본」 없으면 위반"],
  ];
  let bad = 0;
  for (const [text, want, why] of cases) {
    const got = findViolations(text).length;
    const ok = got === want;
    if (!ok) bad++;
    console.log(`${ok ? "✅" : "❌"} ${why} — 기대 ${want} / 실제 ${got}  «${text}»`);
  }
  if (bad) {
    console.error(`\n❌ 검사기 자체 시험 ${bad}건 실패`);
    process.exit(1);
  }
  console.log("\n✅ 검사기 자체 시험 통과");
}

// ── 실행 ────────────────────────────────────────────────────────
// ⚠️ 다른 파일이 findViolations 만 가져다 쓸 때 아래가 같이 돌면 안 된다.
//    (그러면 표준입력을 기다리며 영원히 멈춘다 — 2026-07-28 실제로 2분 멈춰서 발견.)
//    그래서 «이 파일을 직접 실행했을 때»만 아래를 돈다.
const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (!isMain) {
  // 라이브러리로 불러온 것 — 아무것도 실행하지 않는다.
} else {
const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  selfTest();
  process.exit(0);
}

const ti = args.indexOf("--transcript");
let text = "";
if (ti >= 0 && args[ti + 1]) {
  try {
    text = lastAssistantText(args[ti + 1]);
  } catch {
    process.exit(0); // 기록을 못 읽으면 조용히 통과 — 검사가 세션을 막지 않는다
  }
} else {
  text = readFileSync(0, "utf8");
}

if (!text.trim()) process.exit(0);

const v = findViolations(text);
if (!v.length) {
  if (!args.includes("--quiet")) console.log("✅ 말투 검사 통과 — 풀이 없는 원어 0건");
  process.exit(0);
}

console.error(`❌ 말투 위반 ${v.length}건 — 풀이 없이 원어만 썼다:`);
for (const x of v) console.error(`   · «${x.hit}» → 「${x.say}」 처럼 한 번은 풀어라`);
process.exit(1);
}
