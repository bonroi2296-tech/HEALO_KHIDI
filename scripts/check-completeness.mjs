#!/usr/bin/env node
/**
 * 완성도 루브릭(Definition of Done) 정적 게이트 (CI — 판단 기준 SoR이 썩지 않게)
 *
 * 왜: src/lib/completeness/rubric.js 는 "완성이란 무엇인가"의 단일 SoR 이고,
 *     완성도 감사 루프의 Manager 채점표다. 이 채점표 자체가 부패하면(항목 malformed,
 *     문서와 어긋남, 죽은 가드/반성문 참조) 감사가 조용히 헛돌게 된다(유형 3 = 문서-현실
 *     드리프트를 SoR 자신에게 적용). → SoR 정합성만 기계가 매번 지킨다.
 *
 * 판정 범위(골격 단계):
 *   ❌ 실패(exit 1): 루브릭 구조 결함 / 문서(DEFINITION_OF_DONE.md) 와의 드리프트 /
 *                     죽은 가드·반성문 참조.
 *   ⚠️ 경고(exit 0): semantic·manual 항목은 여기서 판정하지 않음 — 감사 루프 몫임을 안내만.
 *   → product 코드의 '실제 완성 여부'는 감사 루프(.claude/skills/completeness-audit)가 본다.
 *      이 스크립트는 그 루프가 읽는 채점표의 무결성만 보장한다.
 *
 * 실행: node scripts/check-completeness.mjs   (npm run check:completeness)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const errors = [];
const warns = [];

// ── rubric SoR 로드 ────────────────────────────────────────────────
const rubricPath = join(ROOT, "src/lib/completeness/rubric.js");
let RUBRIC, TYPES;
try {
  const mod = await import(pathToFileURL(rubricPath).href);
  RUBRIC = mod.RUBRIC;
  TYPES = mod.TYPES;
} catch (e) {
  console.error("❌ rubric.js 를 불러올 수 없음:", e.message);
  process.exit(1);
}

// ── 1) 구조 정합성 ─────────────────────────────────────────────────
const VALID_VERIFY = new Set(["auto", "semantic", "manual"]);
const REQUIRED = ["id", "type", "title", "done", "verify", "scope", "guards", "postmortems"];
const seenIds = new Set();

if (!Array.isArray(RUBRIC) || RUBRIC.length === 0) {
  errors.push("RUBRIC 이 비어있거나 배열이 아님");
} else {
  for (const [i, r] of RUBRIC.entries()) {
    const where = r?.id || `#${i}`;
    for (const f of REQUIRED) {
      if (r[f] === undefined) errors.push(`[${where}] 필수 필드 누락: ${f}`);
    }
    if (r.id) {
      if (seenIds.has(r.id)) errors.push(`[${where}] 중복 id`);
      seenIds.add(r.id);
    }
    if (!VALID_VERIFY.has(r.verify)) errors.push(`[${where}] verify 값이 잘못됨: ${r.verify}`);
    if (!(r.type in TYPES)) errors.push(`[${where}] type ${r.type} 가 TYPES 에 없음`);
    if (Array.isArray(r.done) && r.done.length === 0) errors.push(`[${where}] done 조건이 비어있음`);
    // semantic/manual 인데 gap(구멍 설명)이 없으면 "왜 자동이 아닌지"가 불명 → 경고
    if ((r.verify === "semantic" || r.verify === "manual") && !r.gap) {
      warns.push(`[${where}] verify=${r.verify} 인데 gap(자동으로 못 잡는 이유) 미기재`);
    }
  }
}

// ── 2) 7개 유형 전부 등록됐는지 (부류 누락 방지) ────────────────────
const typeKeys = Object.keys(TYPES).map(Number);
for (const t of typeKeys) {
  if (!RUBRIC.some((r) => r.type === t)) {
    errors.push(`유형 ${t}(${TYPES[t]}) 에 대한 DoD 항목이 하나도 없음`);
  }
}

// ── 3) 참조 무결성: 가드(npm check:*)·반성문 번호가 실재하는지 ──────
let pkgScripts = {};
try {
  pkgScripts = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts || {};
} catch { /* pkg 없으면 아래에서 스킵 */ }

let postmortemText = "";
try {
  postmortemText = readFileSync(join(ROOT, "docs/POSTMORTEMS.md"), "utf8");
} catch { warns.push("docs/POSTMORTEMS.md 를 못 읽어 반성문 참조 검증 스킵"); }

for (const r of RUBRIC) {
  for (const g of r.guards || []) {
    // "check:i18n" 같은 npm 스크립트 토큰만 실재 검증(설명형 가드명은 스킵)
    const m = /^(check:[a-z-]+)$/.exec(g.trim());
    if (m && Object.keys(pkgScripts).length && !pkgScripts[m[1]]) {
      errors.push(`[${r.id}] 죽은 가드 참조: npm 스크립트 '${m[1]}' 가 package.json 에 없음`);
    }
  }
  if (postmortemText) {
    for (const n of r.postmortems || []) {
      // POSTMORTEMS 는 "#NN" 또는 "## NN." 형태로 발번 — 느슨히 대조
      const has = new RegExp(`#${n}\\b|##\\s*${n}[.\\s]`).test(postmortemText);
      if (!has) warns.push(`[${r.id}] 반성문 #${n} 참조를 POSTMORTEMS.md 에서 못 찾음(번호 확인)`);
    }
  }
}

// ── 4) 문서 짝(DEFINITION_OF_DONE.md) 과의 드리프트 ─────────────────
// 사람용 문서와 기계용 루브릭은 함께 움직여야 함 — 각 유형·각 id 가 문서에 언급되는지.
let dodText = "";
try {
  dodText = readFileSync(join(ROOT, "docs/DEFINITION_OF_DONE.md"), "utf8");
} catch {
  errors.push("docs/DEFINITION_OF_DONE.md 가 없음 — 사람용 SoR 짝이 사라짐(드리프트)");
}
if (dodText) {
  for (const r of RUBRIC) {
    if (!dodText.includes(r.id)) {
      errors.push(`[${r.id}] 가 DEFINITION_OF_DONE.md 에 없음 — 문서-루브릭 드리프트(둘을 같이 갱신할 것)`);
    }
  }
}

// ── 리포트 ─────────────────────────────────────────────────────────
const { auto, semantic, manual } = {
  auto: RUBRIC.filter((r) => r.verify === "auto"),
  semantic: RUBRIC.filter((r) => r.verify === "semantic"),
  manual: RUBRIC.filter((r) => r.verify === "manual"),
};
console.log(`\n완성도 루브릭(Definition of Done) 정적 게이트`);
console.log(`  등록 항목 ${RUBRIC.length}개 · 유형 ${typeKeys.length}종`);
console.log(`  판정 방식: auto ${auto.length} · semantic ${semantic.length} · manual ${manual.length}`);
console.log(`  ⓘ semantic/manual ${semantic.length + manual.length}개는 감사 루프(/completeness-audit) 몫 — 이 게이트는 SoR 무결성만 봄`);

if (warns.length) {
  console.log(`\n⚠️  경고 ${warns.length}건 (비차단):`);
  for (const w of warns) console.log(`   - ${w}`);
}
if (errors.length) {
  console.error(`\n❌ 루브릭 SoR 정합성 실패 ${errors.length}건:`);
  for (const e of errors) console.error(`   - ${e}`);
  console.error(`\n루브릭(src/lib/completeness/rubric.js)과 문서(docs/DEFINITION_OF_DONE.md)를 함께 고칠 것.`);
  process.exit(1);
}
console.log(`\n✅ 루브릭 SoR 정합성 통과.\n`);
