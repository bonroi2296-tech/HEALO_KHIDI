#!/usr/bin/env node
/**
 * check:rules — 지침이 다시 한 통으로 불어나는 것을 기계가 막는다.
 *
 * 왜(2026-07-28): 활성 취향을 75,756자 → 10,746자로 줄였는데 **반나절 만에 14,797자로 되찼다**.
 * 「짧게 유지」를 문서에 적어두는 것만으로는 안 지켜진다(같은 실패가 07-15 에도 있었다).
 * → CLAUDE.md 「규칙은 문서에 적었다로 끝나지 않는다. 기계로 잴 수 있으면 CI로 박아라」 적용.
 *
 * 검사 5가지:
 *   1. CLAUDE.md 상한 (항상 주입되는 문서라 여기만 조인다)
 *   2. 분류 대기실 상한 (항목 수·글자 수) — 넘치면 지우는 게 아니라 제자리로 내려보내라는 신호
 *   3. 대기실 모든 항목에 분류 태그 필수 (분류 없이 쌓는 것을 막는 핵심 검사)
 *   4. CLAUDE.md 트리거 표가 가리키는 문서가 실제로 존재하는지 (죽은 링크)
 *   5. docs/rules/*.md 가 트리거 표에 등재돼 있는지 (아무도 안 읽는 고아 문서)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CLAUDE_MD = path.join(ROOT, "CLAUDE.md");
const PREFS = path.join(ROOT, "docs/PO_PREFERENCES.md");
const RULES_DIR = path.join(ROOT, "docs/rules");

// 상한 — 올리고 싶으면 PO 승인 후 여기를 고쳐라(조용히 넘기지 말 것)
const LIMIT_CLAUDE_CHARS = 11000;
const LIMIT_WAITING_CHARS = 12000;
const LIMIT_WAITING_ITEMS = 25;
const LIMIT_UNCLASSIFIED = 5;
const VALID_TAGS = new Set(["CI", "문서", "말투", "규칙", "기록", "미분류"]);

const errors = [];
const warns = [];
const ok = [];

// ── 1. CLAUDE.md 상한 ────────────────────────────────────────────────
const claude = fs.readFileSync(CLAUDE_MD, "utf8");
if (claude.length > LIMIT_CLAUDE_CHARS) {
  errors.push(
    `CLAUDE.md 가 ${claude.length.toLocaleString()}자 (상한 ${LIMIT_CLAUDE_CHARS.toLocaleString()}자).\n` +
      `   → 지우지 말고 docs/rules/ 로 옮기고 트리거 표에 한 줄 추가해라.`
  );
} else {
  ok.push(`CLAUDE.md ${claude.length.toLocaleString()}자 / 상한 ${LIMIT_CLAUDE_CHARS.toLocaleString()}자`);
}

// ── 2·3. 분류 대기실 ─────────────────────────────────────────────────
const prefs = fs.readFileSync(PREFS, "utf8");
const start = prefs.indexOf("<!-- ACTIVE:START -->");
const end = prefs.indexOf("<!-- ACTIVE:END -->");
if (start === -1 || end === -1) {
  errors.push("docs/PO_PREFERENCES.md 에 ACTIVE:START/END 표식이 없다 (훅이 대기실을 못 뽑는다).");
} else {
  const waiting = prefs.slice(start, end);
  const items = waiting.split("\n").filter((l) => l.startsWith("- "));

  if (waiting.length > LIMIT_WAITING_CHARS) {
    errors.push(
      `분류 대기실이 ${waiting.length.toLocaleString()}자 (상한 ${LIMIT_WAITING_CHARS.toLocaleString()}자).\n` +
        `   → 태그가 가리키는 자리로 옮기고 「보관」으로 내려라. 삭제가 아니다.`
    );
  }
  if (items.length > LIMIT_WAITING_ITEMS) {
    errors.push(`분류 대기실 항목이 ${items.length}개 (상한 ${LIMIT_WAITING_ITEMS}개). → 제자리로 내려보내라.`);
  }

  const untagged = [];
  const badTag = [];
  let unclassified = 0;
  for (const line of items) {
    const m = line.match(/^- `\[(.+?)\]`/);
    if (!m) {
      untagged.push(line.slice(0, 70));
      continue;
    }
    if (!VALID_TAGS.has(m[1])) badTag.push(`${m[1]} — ${line.slice(0, 60)}`);
    if (m[1] === "미분류") unclassified++;
  }
  if (untagged.length) {
    errors.push(
      `분류 태그가 없는 대기실 항목 ${untagged.length}건.\n` +
        untagged.map((t) => `     ${t}…`).join("\n") +
        `\n   → 맨 앞에 \`[CI]\`/\`[문서]\`/\`[말투]\`/\`[규칙]\`/\`[기록]\`/\`[미분류]\` 중 하나를 붙여라.`
    );
  }
  if (badTag.length) errors.push(`모르는 태그: ${badTag.join(" / ")}`);
  if (unclassified > LIMIT_UNCLASSIFIED) {
    errors.push(`[미분류] 항목이 ${unclassified}건 (상한 ${LIMIT_UNCLASSIFIED}건). → 판정해서 제자리로.`);
  }
  if (!untagged.length && !badTag.length) {
    ok.push(`분류 대기실 ${items.length}개 / ${waiting.length.toLocaleString()}자 — 전부 태그 있음`);
  }
}

// ── 4·5. 트리거 표 ↔ 실제 문서 대조 ──────────────────────────────────
const referenced = new Set();
for (const m of claude.matchAll(/`(docs\/[^`]+\.md|DESIGN\.md)`/g)) {
  if (!m[1].includes("*")) referenced.add(m[1]); // `docs/rules/*.md` 같은 총칭 표기는 제외
}
for (const ref of referenced) {
  if (!fs.existsSync(path.join(ROOT, ref))) {
    errors.push(`CLAUDE.md 가 가리키는 문서가 없다: ${ref} (죽은 링크 — 엉뚱한 시도를 하게 만든다)`);
  }
}
if (fs.existsSync(RULES_DIR)) {
  const orphans = fs
    .readdirSync(RULES_DIR)
    .filter((f) => f.endsWith(".md") && f !== "MIGRATION_MAP.md")
    .filter((f) => !claude.includes(`docs/rules/${f}`));
  if (orphans.length) {
    warns.push(`트리거 표에 없는 docs/rules 문서 (아무도 안 읽는다): ${orphans.join(", ")}`);
  } else {
    ok.push(`docs/rules/*.md 전부 트리거 표에 등재됨`);
  }
}

// ── 출력 ─────────────────────────────────────────────────────────────
for (const o of ok) console.log(`  ✅ ${o}`);
for (const w of warns) console.log(`  ⚠️  ${w}`);
if (errors.length) {
  console.error("\n❌ 지침 구조 검사 실패\n");
  for (const e of errors) console.error(`  • ${e}\n`);
  console.error("규칙을 지우라는 게 아니다 — 「어디에 쓸지」를 정하라는 검사다. (CLAUDE.md 「새 규칙이 생겼을 때」)\n");
  process.exit(1);
}
console.log("\n✅ 지침 구조 검사 통과");
