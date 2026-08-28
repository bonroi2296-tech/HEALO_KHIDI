#!/usr/bin/env node
/**
 * 음성 대조(negative control) — 「검사가 «진짜» 잡는가」를 잰다.
 *
 * 왜 있나 (2026-08-28):
 *   우리 사고 기록 183건 중 58건이 재발이고, 그중 **검사기가 거짓 초록불을 준 것이 최소 3건**이다
 *   (반성문 #157·#160·#165). 즉 우리 사고의 뿌리는 「검사가 없어서」가 아니라 「검사가 있는데 거짓말해서」다.
 *   검사를 늘리는 것보다 **있는 검사가 진짜 잡는지 재는 것**이 먼저다.
 *
 *   이 장치를 처음 돌린 날 바로 2건이 나왔다:
 *     ① `check:i18n` 이 CI 에서 `--fail-on-missing` 없이 불려 러시아어 키가 사라져도 exit 0 (거짓 초록불)
 *     ② `check:cancer-i18n` 이 암 상세 페이지의 «실질 본문»인 5축(ITCRN)을 안 봐서 빈 언어 38칸이 통과
 *
 * 무엇을 하나: 검사마다 일부러 결함을 심고 → 그 검사를 돌리고 → 빨간불이 뜨는지 보고 → **반드시 원복**한다.
 *   심은 게 안 지워졌는지 매번 `git status` 로 확인하고, 하나라도 남으면 그 자리에서 멈춘다.
 *
 * ⚠️ 이 장치의 한계 — 「초록불」을 이 장치가 주지 않는다는 뜻:
 *   · 결함 견본은 **손으로 쓴 것**이라 검사가 막는 것의 일부만 흉내낸다. 여기 통과 = 그 검사가 완벽하다가 아니라
 *     **「적어도 이 한 가지는 진짜 잡는다」**는 뜻이다.
 *   · 실DB·네트워크를 무는 검사(supabase-io·ghost-columns·e2e-schema·live-meetings·ai-behavior)는 대상이 아니다.
 *   · 「심기실패(패턴불일치)」가 뜨면 **검사가 아니라 이 파일이 낡은 것**이다 — 견본을 고쳐라.
 *     (실제로 첫 실행 때 4건이 이 경우였고, 검사 탓으로 오해할 뻔했다.)
 *
 * 왜 자동 검사(CI)에 안 붙였나: 검사 하나당 두 번씩 돌려 느리고, 원본 파일을 만졌다 되돌리는 동작이라
 *   여러 작업이 겹치는 자리에서 돌리면 위험하다. **사람이 「우리 검사 믿을 만하냐」를 물을 때 돌리는 도구**다.
 *   (돌리는 법: `npm run audit:negative-control`)
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();

// [검사이름, 대상파일, 결함 심는 법, 무슨 사고를 흉내내나]
// 새 검사를 만들면 여기에 견본을 «같이» 추가해라. 견본 없는 검사 = 진짜 잡는지 아무도 모르는 검사.
const PLANTS = [
  ["autocomplete", "app/login/LoginClient.jsx",
    (s) => s.replace(/\s*autoComplete\s*=\s*"current-password"/, ""),
    "폰 비번관리자가 엉뚱한 칸을 채우던 것 (2026-08-14 PO 실기기 신고)"],

  ["pdf-tone", "src/lib/pdf/styles.js",
    (s) => s + '\nconst __planted = "Playfair Display";\n',
    "환자 메일·서류가 폐기된 옛 톤으로 되돌아간 것 (반성문 #56)"],

  ["err-exposure", "app/patient/visa/VisaClient.jsx",
    (s) => s + "\nfunction __planted(){ try{ } catch(err){ setError(err.message); } }\n",
    "환자 화면에 원시 오류 문구가 새던 것 (반성문 #52)"],

  ["locale-links", "app/hospitals/HospitalsClient.jsx",
    (s) => s + '\nconst __planted = <Link href="/treatments">x</Link>;\n',
    "언어 접두어 없는 링크 → 검색로봇이 러/카 페이지를 두 달 미색인"],

  ["cancer-i18n", "src/lib/data/immuneCancerDetails.js",
    (s) => s.replace(/(export const CANCER_DETAILS[\s\S]{0,4000}?)\bru:\s*"/, '$1ruPLANTED: "'),
    "암 상세 본문의 러시아어가 사라진 것"],

  ["visa-freshness", "src/lib/visa/visaGuide.ts",
    (s) => s.replace(/VISA_DATA_LAST_VERIFIED\s*=\s*'\d{4}-\d{2}-\d{2}'/, "VISA_DATA_LAST_VERIFIED = '2020-01-01'"),
    "낡은 비자 규정이 환자에게 그대로 나가던 것 (반성문 #57)"],

  ["content", "app/faq/FAQClient.jsx",
    (s) => s + "\n// planted: contact@healo.com\n",
    "옛 도메인·브랜드 잔재 재유입 (반성문 #49)"],

  ["legal", "src/lib/legal/privacyPolicy.js",
    (s) => s.replace(/(ru:\s*\{[\s\S]{0,3000}?")([^"]{40,})(")/, "$1$2 TODO$3"),
    "법률 문서에 미완성 표시가 남은 채 공개"],

  ["rules", "CLAUDE.md",
    (s) => s + "\n\n## 심은 죽은 참조\n상세는 `docs/rules/NO_SUCH_FILE.md` 참고.\n",
    "지침이 없어진 문서를 가리키는 것"],

  ["handoff", "docs/PROJECT_CONTEXT.md",
    (s) => s.replace(/^## 🔻 세션 종료 핸드오프/m, "## 🔻 세션 종료 핸드오프(어제)"),
    "인수인계 블록 형식 파손 (반성문 #165 부류)"],

  ["i18n", "src/lib/i18n/dictionary.js",
    (s) => {
      const m = s.match(/(\n\s+ru:\s*\{\n)(\s+"[^"]+":\s*"[^"]*",\n)/);
      return m ? s.replace(m[0], m[1]) : s;
    },
    "러시아어 번역 키가 통째로 사라진 것 — 이 견본이 거짓 초록불을 잡아냈다(2026-08-28)"],

  ["completeness", "src/lib/completeness/rubric.js",
    (s) => s.replace(/verify:\s*"(\w+)"/, 'verify: "PLANTED_BOGUS"'),
    "「완성이란 무엇인가」 채점표가 조용히 부패한 것"],

  ["hook-data", "docs/LAUNCH_GATES_PO.md",
    (s) => s.replace(/^## 🎯 지금 남은 관문/m, "## 🎯 남은 관문(제목 바뀜)"),
    "세션 훅의 관문 보채기 배선이 조용히 끊긴 것"],

  // 문지기 자신도 시험한다. 「시험 없는 새 검사」를 CI 에 몰래 넣는 상황을 흉내낸다:
  // check:parked 는 package.json 에 있지만 CI 가 안 부르고 견본도 없다 —
  // 그걸 CI 목록에 끼워 넣으면 guard-coverage 가 빨간불을 내야 한다.
  // (안 내면 이 문지기 자체가 장식이라는 뜻이고, 그게 제일 해로운 상태다.)
  ["guard-coverage", ".github/workflows/ci.yml",
    (s) => s.replace(
      /(\n\s+- name: 지침 구조[^\n]*\n\s+run: npm run check:rules\n)/,
      "$1      - run: npm run check:parked\n",
    ),
    "「진짜 잡는지 안 재본 검사」가 CI 에 몰래 들어오는 것 — 개선이 증발하던 자리"],
];

// 마이그레이션은 «새 파일»을 만들어 심는다(기존 파일을 고치는 게 아니라).
const MIGRATION_PLANT = {
  file: "migrations/9999_negative_control_planted.sql",
  body: "CREATE POLICY planted_pol ON public.profiles FOR SELECT USING (true);\nCREATE INDEX planted_idx ON public.profiles(id);\n",
  why: "재실행하면 42710 으로 깨지는 마이그레이션",
};

/**
 * 이 장치가 «견본을 가진» 검사 이름 목록 — 단일 출처다.
 * check:guard-coverage 가 글자 맞추기 대신 이걸 읽는다(정규식으로 훑으면 배열 밖 특수처리를 놓친다 —
 * 실제로 첫판이 migrations 를 «없다»고 오판했다).
 */
export const COVERED_CHECKS = [...PLANTS.map(([c]) => c), "migrations"];

// ⚠️ 아래는 «이 파일을 직접 실행했을 때»만 돈다. check:guard-coverage 가 COVERED_CHECKS 만
//    가져다 쓸 때 결함 심기가 같이 돌면 안 된다(남의 작업본을 만지게 된다).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {

const run = (cmd) => {
  try {
    execSync(cmd, { stdio: "pipe", timeout: 300000 });
    return 0;
  } catch (e) {
    return e.status ?? 1;
  }
};
const dirty = () => execSync("git status --porcelain", { encoding: "utf8" }).trim();

if (dirty() !== "") {
  console.error("✗ 작업본에 커밋 안 한 변경이 있다. 이 장치는 파일을 만졌다 되돌리므로 깨끗한 상태에서만 돌린다.");
  process.exit(1);
}

const results = [];

for (const [check, rel, mutate, why] of PLANTS) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    results.push({ check, verdict: "대상없음", detail: rel, why });
    continue;
  }
  const before = fs.readFileSync(file, "utf8");
  const after = mutate(before);
  if (after === before) {
    results.push({ check, verdict: "심기실패", detail: "견본이 낡았다 — 이 파일의 견본을 고쳐라", why });
    continue;
  }
  fs.writeFileSync(file, after);
  const rc = run(`npm run --silent check:${check} </dev/null`);
  fs.writeFileSync(file, before);

  const left = dirty();
  if (left !== "") {
    console.error(`✗ 원복 실패 — 심은 게 남았다:\n${left}\n중단한다. 손으로 되돌려라.`);
    process.exit(2);
  }
  results.push({ check, verdict: rc !== 0 ? "잡음" : "못잡음", why });
}

// 마이그레이션
{
  const file = path.join(ROOT, MIGRATION_PLANT.file);
  fs.writeFileSync(file, MIGRATION_PLANT.body);
  const rc = run("npm run --silent check:migrations </dev/null");
  fs.unlinkSync(file);
  const left = dirty();
  if (left !== "") {
    console.error(`✗ 원복 실패 — 심은 게 남았다:\n${left}`);
    process.exit(2);
  }
  results.push({ check: "migrations", verdict: rc !== 0 ? "잡음" : "못잡음", why: MIGRATION_PLANT.why });
}

console.log("\n음성 대조 결과 — 일부러 결함을 심고 검사가 빨간불을 내는지 봤다\n");
console.log(`${"검사".padEnd(18)}${"판정".padEnd(12)}무슨 사고를 흉내냈나`);
console.log("─".repeat(96));
const missed = [];
const stale = [];
for (const r of results) {
  const mark = { 잡음: "✅ 잡음", 못잡음: "❌ 못잡음", 심기실패: "⚠️ 견본낡음", 대상없음: "⚠️ 대상없음" }[r.verdict];
  console.log(`${r.check.padEnd(18)}${mark.padEnd(12)}${r.why}`);
  if (r.verdict === "못잡음") missed.push(r);
  if (r.verdict !== "잡음" && r.verdict !== "못잡음") stale.push(r);
}
console.log("─".repeat(96));
console.log(`잡음 ${results.filter((r) => r.verdict === "잡음").length} · 못잡음 ${missed.length} · 견본 손봐야 함 ${stale.length}`);

if (missed.length) {
  console.error("\n❌ 결함을 심었는데 통과시킨 검사가 있다 = 그 검사는 «거짓 초록불»이다:");
  for (const m of missed) console.error(`   · check:${m.check} — ${m.why}`);
  console.error("\n   반성문 #157·#160·#165 와 같은 부류다. 검사를 고치기 전엔 그 검사의 초록불을 믿지 마라.");
  process.exit(1);
}
if (stale.length) {
  console.error("\n⚠️ 견본이 낡아 «재보지 못한» 검사가 있다. 검사가 통과한 게 아니라 시험 자체를 못 했다는 뜻이다.");
  process.exit(1);
}
console.log("\n✓ 견본을 심은 검사 전부가 진짜 빨간불을 냈다.");

} // isMain 끝

