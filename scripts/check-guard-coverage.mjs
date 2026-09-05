#!/usr/bin/env node
/**
 * 「검사를 만들었으면 «그게 진짜 잡는지 보는 시험»도 같이 만들어라」를 강제하는 문지기.
 *
 * ── 왜 이게 있나 (2026-08-28) ──────────────────────────────────────
 * 우리 사고 기록 183건 중 재발이 58건(32%)이다. 그 32% 의 뿌리를 오늘 처음 쟀다:
 * 지금까지 재발 방지는 늘 「사고 → 반성문 → 검사 하나 추가 → 막았다」 였는데,
 * **그 검사가 진짜 잡는지는 아무도 안 쟀다.** 처음 재봤더니 12개 중 2개가 가짜였다(17%).
 *   · check:i18n — CI 가 `--fail-on-missing` 없이 불러 러시아어 키가 사라져도 exit 0
 *   · check:cancer-i18n — 암 상세의 «실질 본문»(5축)이 검사 범위 밖이라 빈 언어 38칸이 통과
 * 반성문 #157·#160·#165 도 전부 「검사기가 거짓 초록불을 준」 부류다.
 *
 * 즉 우리 문제는 「검사가 없어서」가 아니라 **「막았다고 믿는 것만 쌓이고 실제 방지력은 안 쌓여서」**다.
 * 개선이 «증발»하지 않게 하려면, 새 검사가 늘 때마다 그 검사의 «시험»도 같이 늘어야 한다.
 *
 * ── 무엇을 보나 ────────────────────────────────────────────────────
 * CI 가 부르는 모든 `npm run check:*` 에 대해, 둘 중 «하나»가 있어야 한다:
 *   ① 자기시험  — package.json 의 그 스크립트가 `--selftest`/`--self-test` 를 달고 돈다
 *   ② 결함 견본 — scripts/negative-control.mjs 의 PLANTS 에 그 검사 이름이 있다
 * 둘 다 없으면 실패. 「이 검사가 진짜 잡는지 아무도 모른다」는 뜻이기 때문이다.
 *
 * ── 이 문지기의 한계 (적어둔다, 안 적으면 이것도 다음 거짓 초록불이 된다) ──
 * 이건 «견본이 있나»만 본다. «그 견본이 진짜 빨간불을 내나»는 안 본다 — 그건 실제로 검사를
 * 두 번씩 돌려야 해서 느리고, 원본 파일을 만졌다 되돌리는 동작이라 CI 에 두면 위험하다.
 * 그쪽은 `npm run audit:negative-control` 이 사람 손으로 돌 때 확인한다.
 * 그래서 **엉터리 견본을 써서 이 문지기를 피할 수는 있다.** 다만 「견본이 아예 없는 것」은 못 피한다.
 * 피하고 싶은 유혹이 들면 그건 이 문지기가 아니라 그 검사를 의심할 때다.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();

// 견본을 못 만드는 검사 — «왜»를 반드시 같이 적는다. 이유 없이 여기 넣지 마라.
// (여기 넣는 순간 그 검사는 「진짜 잡는지 아무도 모르는 검사」가 된다 — 그 대가를 알고 넣어라.)
const EXEMPT = {
  "check:vercel": "설정 파일(vercel.json) 형식 검증이라 결함을 심으면 빌드 자체가 안 뜬다 — 심는 것과 재는 것이 분리가 안 된다",
};

function readCI() {
  const dir = path.join(ROOT, ".github", "workflows");
  if (!fs.existsSync(dir)) return "";
  return fs
    .readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
    .join("\n");
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const ci = readCI();

const ncPath = path.join(ROOT, "scripts", "negative-control.mjs");
if (!fs.existsSync(ncPath)) {
  console.error("❌ scripts/negative-control.mjs 가 없다 — 결함 견본 목록의 단일 출처다. 지웠으면 되돌려라.");
  process.exit(1);
}
// 글자 맞추기(정규식)로 훑지 않고 «목록 자체»를 가져온다.
// 첫판은 정규식으로 PLANTS 배열만 훑다가 배열 «밖» 특수처리인 migrations 를 「없다」고 오판했다.
// 그 오판은 검사 탓처럼 보였지만 실은 이 문지기의 결함이었다 — 그래서 단일 출처를 읽는 쪽으로 바꿨다.
const { COVERED_CHECKS } = await import(pathToFileURL(ncPath).href);
const planted = new Set(COVERED_CHECKS);

// CI 가 실제로 부르는 check:* 만 대상 (손으로 돌리는 도구는 강제 대상 아님)
const allChecks = Object.keys(pkg.scripts || {}).filter((s) => s.startsWith("check:"));
const inCI = allChecks.filter((c) =>
  new RegExp(`npm run ${c.replace(":", "[:]")}(?![\\w-])`).test(ci),
);

const missing = [];
const covered = { selftest: [], plant: [], exempt: [] };

for (const c of inCI) {
  const name = c.slice("check:".length);
  if (EXEMPT[c]) {
    covered.exempt.push(c);
    continue;
  }
  // 자기시험은 두 자리 중 하나에 붙어 있을 수 있다:
  //   ① package.json 스크립트 안        (예: check:enum-values)
  //   ② CI 호출부에 인자로              (예: `npm run check:talk -- --self-test`)
  // 첫판은 ①만 봐서 check:talk 을 「안 재본 검사」로 오판했다. 둘 다 본다.
  const ciCall = new RegExp(`npm run ${c.replace(":", "[:]")}\\s+--\\s+[^\\n]*--self-?test`);
  if (/--self-?test/.test(pkg.scripts[c]) || ciCall.test(ci)) {
    covered.selftest.push(c);
    continue;
  }
  if (planted.has(name)) {
    covered.plant.push(c);
    continue;
  }
  missing.push(c);
}

if (missing.length) {
  console.error(`\n❌ 「진짜 잡는지」 한 번도 안 재본 검사 ${missing.length}개가 CI 에 있다:\n`);
  for (const c of missing) console.error(`   · ${c}`);
  console.error(`
이 검사들은 초록불을 내지만 그게 «막았다»는 뜻인지 아무도 모른다.
우리 재발 58건(32%)·거짓 초록불 사고 3건(#157·#160·#165)이 정확히 이 자리에서 나왔다.

고치는 법 — 둘 중 하나:
  ① 그 검사에 자기시험을 붙이고 package.json 에서 --selftest 로 부른다
  ② scripts/negative-control.mjs 의 PLANTS 에 «일부러 심을 결함» 견본을 추가한다
     → 추가한 뒤 npm run audit:negative-control 로 진짜 빨간불이 뜨는지 확인할 것

정말 견본을 만들 수 없는 검사라면 이 파일의 EXEMPT 에 «왜 못 만드는지»와 함께 넣어라.
이유 없이 넣지 마라 — 그건 「아무도 모르는 검사」를 하나 늘리는 것이다.
`);
  process.exit(1);
}

console.log(
  `✓ CI 검사 ${inCI.length}개 전부 「진짜 잡는지」 확인됨 ` +
    `(결함 견본 ${covered.plant.length} · 자기시험 ${covered.selftest.length}` +
    (covered.exempt.length ? ` · 사유 있는 예외 ${covered.exempt.length}` : "") +
    `)`,
);
