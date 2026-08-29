#!/usr/bin/env node
/**
 * check:rules — 지침이 다시 한 통으로 불어나는 것을 기계가 막는다.
 *
 * 왜(2026-07-28): 활성 취향을 75,756자 → 10,746자로 줄였는데 **반나절 만에 14,797자로 되찼다**.
 * 「짧게 유지」를 문서에 적어두는 것만으로는 안 지켜진다(같은 실패가 07-15 에도 있었다).
 * → CLAUDE.md 「규칙은 문서에 적었다로 끝나지 않는다. 기계로 잴 수 있으면 CI로 박아라」 적용.
 *
 * 검사 6가지:
 *   1. CLAUDE.md 상한 (항상 주입되는 문서라 여기만 조인다)
 *   2. 분류 대기실 상한 (항목 수·글자 수) — 넘치면 지우는 게 아니라 제자리로 내려보내라는 신호
 *   3. 대기실 모든 항목에 분류 태그 필수 (분류 없이 쌓는 것을 막는 핵심 검사)
 *   4. CLAUDE.md 트리거 표가 가리키는 문서가 실제로 존재하는지 (죽은 링크)
 *   5. docs/rules/*.md 가 트리거 표에 등재돼 있는지 (아무도 안 읽는 고아 문서)
 *   6. 옮겨간 섹션을 아직 CLAUDE.md 에서 찾게 하는 죽은 참조 (이 재구성 자신이 낸 사고)
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

/**
 * 글자 수를 세기 전에 줄바꿈을 통일한다.
 *
 * 왜: 깃이 윈도우로 체크아웃할 때 줄바꿈을 늘리므로(줄마다 캐리지리턴 1자 추가)
 * **같은 파일인데 윈도우에서만 글자 수가 더 나온다.** 2026-08-28 실측 —
 * 저장소 원본 CLAUDE.md 는 10,853자(상한 이내)인데 윈도우 디스크에서는 11,056자로 읽혀
 * 「본판이 상한을 넘었다」고 오진했다. CI(리눅스)는 통과하는데 로컬만 빨간불이라
 * 원인을 찾는 데도 시간이 걸린다. 세는 자를 파일이 아니라 «내용»에 맞춘다.
 */
const CR = String.fromCharCode(13);
const readNormalized = (p) => fs.readFileSync(p, "utf8").split(CR).join("");

const errors = [];
const warns = [];
const ok = [];

// ── 1. CLAUDE.md 상한 ────────────────────────────────────────────────
const claude = readNormalized(CLAUDE_MD);
if (claude.length > LIMIT_CLAUDE_CHARS) {
  errors.push(
    `CLAUDE.md 가 ${claude.length.toLocaleString()}자 (상한 ${LIMIT_CLAUDE_CHARS.toLocaleString()}자).\n` +
      `   → 지우지 말고 docs/rules/ 로 옮기고 트리거 표에 한 줄 추가해라.`
  );
} else {
  ok.push(`CLAUDE.md ${claude.length.toLocaleString()}자 / 상한 ${LIMIT_CLAUDE_CHARS.toLocaleString()}자`);
}

// ── 2·3. 분류 대기실 ─────────────────────────────────────────────────
const prefs = readNormalized(PREFS);
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

// ── 6. 살아있는 문서·코드가 «옮겨간 섹션»을 아직 CLAUDE.md 에서 찾게 하나 ────
// 왜(2026-07-28, 이 재구성 자신이 낸 사고): 섹션을 docs/rules/ 로 옮기자 다른 문서·스크립트
// 6곳이 「CLAUDE.md 「출시 전 self-QA」」처럼 사라진 자리를 계속 가리켰다. 죽은 참조는
// «안 지켜지는 것»이 아니라 «엉뚱한 곳을 찾게 만드는 것»이다(PREVIEW.md 의 없는 도구 이름 사례).
//
// 일부러 좁게 잡는다: 「실제로 옮긴 섹션」만 본다. 이름을 추측해 넓게 잡으면 멀쩡한 참조까지
// 빨간불이 되고, 그러면 사람이 검사를 무시하게 된다 = 없느니만 못하다.
const MOVED = {
  "출시 전 self-QA": "docs/rules/SELF_QA.md",
  "상시 루틴": "docs/rules/BUG_ROUTINE.md",
  "자동 운영 규칙": "docs/rules/AUTOMERGE.md",
  "병렬 세션 규칙": "docs/PARALLEL_SESSIONS.md",
  "AI 품질": "docs/rules/AI_QUALITY.md",
  "계층별 백오피스 사용설명서": "docs/rules/MANUALS.md",
  "프리뷰 팁": "docs/rules/PREVIEW.md",
  "주요 라우트": "docs/rules/PROJECT_MAP.md",
  "주요 시스템": "docs/rules/PROJECT_MAP.md",
};
const LIVING = ["docs", "scripts", ".claude", "src", "e2e"];
// 과거 기록(반성문·보관·정부과제 대장·리뷰)은 «그때 그랬다»는 사실이라 고치지 않는다.
// 이관 문서 자신과 이 검사기도 제외(자기 참조).
const SKIP =
  /^docs\/(archive|reviews|government-project)\/|^docs\/POSTMORTEMS\.md|^docs\/rules\/|^docs\/PO_PREFERENCES\.md|^scripts\/check-rules\.mjs$/;
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    // .claude/worktrees = 다른 세션의 작업 폴더(추적 안 함). 저장소 밖 남의 사본을 세면
    // 로컬에서만 수십 건이 뜨고 CI 에선 0 건이라 「내 잘못인가」 헷갈린다.
    if (d.name === "node_modules" || d.name.startsWith(".git")) return [];
    if (path.relative(ROOT, p).split(path.sep).join("/") === ".claude/worktrees") return [];
    return d.isDirectory() ? walk(p) : /\.(md|mjs|js|ts|tsx|sh)$/.test(d.name) ? [p] : [];
  });
const dead = [];
for (const dir of LIVING) {
  if (!fs.existsSync(path.join(ROOT, dir))) continue;
  for (const file of walk(path.join(ROOT, dir))) {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    if (SKIP.test(rel)) continue;
    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (!line.includes("CLAUDE.md")) return;
      for (const [name, dest] of Object.entries(MOVED)) {
        if (!line.includes(name)) continue;
        // 같은 줄에 «간 곳»을 이미 적어 뒀으면 살아있는 안내다 — 통과.
        if (line.includes(dest)) continue;
        dead.push(`${rel}:${i + 1} → CLAUDE.md 「${name}」 (지금은 ${dest})`);
      }
    });
  }
}
if (dead.length) {
  errors.push(
    `옮겨간 섹션을 아직 CLAUDE.md 에서 찾게 하는 곳 ${dead.length}건:\n` +
      dead.map((d) => `     ${d}`).join("\n") +
      `\n   → 그 줄이 옮긴 곳을 같이 가리키게 고쳐라(과거 기록이면 "(… 로 이관)" 한 마디면 통과).`
  );
} else {
  ok.push("옮겨간 섹션을 가리키는 죽은 참조 0건");
}

// ── 7. 반성문 번호 중복 (병렬 세션이 같은 번호를 각자 발번하는 것) ────────
// 왜 (2026-07-28 실측): 창을 여러 개 띄우고 일하면 각 창이 «지금 최신 번호 + 1» 을 각자 계산한다.
//   서로를 못 보니 **같은 번호가 여러 개** 생긴다. 이번에도 두 작업본이 #149·#150 을 동시에 썼다.
//   반성문 #90 이 이미 같은 사고를 기록했는데(12쌍 누적) **가드를 안 만들어서** 또 났다.
//   기록 문서는 merge=union 이라 충돌 없이 양쪽 다 남는다 = 중복이 조용히 본판에 들어간다.
//   → 합쳐진 결과물(본판)에서 기계가 잡는다.
//
// ⚠️ 「0건」으로 잡으면 안 된다. 과거 12쌍이 이미 있어서 상시 빨간불이 되고,
//    오탐 나는 검사는 사람이 무시하게 돼서 없느니만 못하다(#148 에서 배운 것).
//    그래서 **지금 있는 12쌍은 기준선으로 얼려두고, 새로 늘어나면 실패**시킨다.
const KNOWN_DUP_PAIRS = 12; // 2026-07-28 기준선 (#31·32·39·42·55~62). 정당하게 정리했으면 이 숫자를 낮춰라.
const PM = path.join(ROOT, "docs/POSTMORTEMS.md");
if (fs.existsSync(PM)) {
  const nums = (fs.readFileSync(PM, "utf8").match(/^## #(\d+)/gm) || []).map((s) =>
    s.replace(/^## #/, "")
  );
  const seen = new Map();
  for (const n of nums) seen.set(n, (seen.get(n) || 0) + 1);
  const dups = [...seen.entries()].filter(([, c]) => c > 1);
  if (dups.length > KNOWN_DUP_PAIRS) {
    errors.push(
      `반성문 번호가 중복됐다 — 중복 ${dups.length}쌍 (기준선 ${KNOWN_DUP_PAIRS}쌍 초과):\n` +
        `     ${dups.map(([n, c]) => `#${n}×${c}`).join(", ")}\n` +
        `   → 병렬 세션이 같은 번호를 각자 발번한 것이다(반성문 #90 부류).\n` +
        `      새로 쓴 쪽이 «지금 파일에 있는 최대 번호 + 1» 로 다시 매기고, 그 번호를 가리키는 참조도 같이 고쳐라.`
    );
  } else if (dups.length < KNOWN_DUP_PAIRS) {
    warns.push(
      `반성문 번호 중복이 ${dups.length}쌍으로 줄었다 — check-rules.mjs 의 KNOWN_DUP_PAIRS 를 ${dups.length} 로 낮춰 기준선을 조여라.`
    );
  } else {
    ok.push(`반성문 번호 새 중복 0건 (과거 ${KNOWN_DUP_PAIRS}쌍은 기준선으로 동결)`);
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
