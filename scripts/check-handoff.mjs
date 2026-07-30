#!/usr/bin/env node
/**
 * 핸드오프 완결성 검사 (F) — npm run check:handoff
 *
 * 왜: 핸드오프(세션 인수인계)가 6칸을 다 채웠는지·날짜가 절대표기인지는
 *     사람이 매번 눈으로 보기 쉽지 않음. 형식 누락은 기계가 막는다.
 *     (내용의 정직함 — "검증 못 함을 솔직히 적었나"는 기계가 못 봄. 형식만 본다.)
 *
 * 검사 대상: docs/PROJECT_CONTEXT.md 최상단 핸드오프 블록 1개.
 *  1) 7개 섹션 헤더가 다 있는지
 *  2) 헤더에 절대날짜(YYYY-MM-DD)가 있는지
 *  3) 본문에 상대표기(어제·오늘·내일·지난주 등)를 쓰지 않았는지
 */
import { readFileSync } from "node:fs";

const FILE = "docs/PROJECT_CONTEXT.md";
const REQUIRED = [
  "이번 세션 한 일",
  "왜 그렇게 했는지",
  "안 끝났거나 보류",
  "주의·함정",
  "다음 세션이 먼저 할 일",
  "검증 상태",
  "다음 세션 첫 프롬프트",
];
// 상대 날짜표기 금지 (절대표기 강제 — 다음 세션은 "어제"가 언제인지 모름)
const RELATIVE = /(^|[\s(])(어제|오늘|내일|그제|모레|지난주|이번\s*주|다음\s*주|방금|아까)([\s).,]|$)/;

function fail(msg) {
  console.error(`❌ 핸드오프 검사 실패: ${msg}`);
  process.exit(1);
}

let text;
try {
  text = readFileSync(FILE, "utf8");
} catch {
  fail(`${FILE} 를 못 읽음`);
}

// 최상단 핸드오프 블록: 첫 표식 줄부터 다음 "## " 전까지
// ⚠️ 표식이 두 종류다 — 옛 블록은 「## 🔖 세션 핸드오프」, 요즘 `/handoff` 스킬이 쓰는 건
//    「## 🔻 세션 종료 핸드오프」. 2026-07-30 실측: 이 검사기가 🔖 만 찾아서 **최상단이 아니라
//    파일 한참 아래의 옛 블록을 검사하고 통과**하고 있었다(오늘 쓴 블록은 아예 안 봤다).
//    그러다 회전 보관이 마지막 🔖 블록을 옮기자 「블록을 못 찾음」으로 빨간불이 났다.
//    handoff-rotate.mjs 의 MARKS 와 같은 목록을 쓰고, **둘 중 먼저 나오는 것**을 최상단으로 본다.
const MARKS = ["## 🔖 세션 핸드오프", "## 🔻 세션 종료 핸드오프", "## 🔻 세션 종료"];
const startIdx = MARKS.map((m) => text.indexOf(m))
  .filter((i) => i !== -1)
  .sort((a, b) => a - b)[0];
if (startIdx === undefined) fail(`최상단 핸드오프 블록(${MARKS.join(" 또는 ")})을 못 찾음`);

// ⚠️ 표식 목록에 없는 제목을 쓰면 이 검사기가 **조용히 옛 블록을 검사하고 통과**한다.
//    2026-07-30 에만 두 번 났다: ①🔖 만 찾던 때 ②새 블록 제목에서 「핸드오프」가 빠졌을 때.
//    둘 다 «빨간불»이 아니라 «엉뚱한 초록불»이라 아무도 몰랐다 — 그게 제일 나쁜 고장이다.
//    그래서 표식을 늘리는 것으로 끝내지 않고, **내 위에 다른 블록이 있으면 실패**시킨다.
//    (「중간 저장」은 일부러 7칸을 다 안 채우는 블록이라 이 판정에서 뺀다 — CLAUDE.md 중간 저장 규칙)
const above = [...text.slice(0, startIdx).matchAll(/^## [🔻🔖].*/gm)]
  .map((m) => m[0])
  .filter((h) => !h.includes("중간 저장"));
if (above.length) {
  fail(
    `최상단이 아닌 블록을 검사할 뻔했다 — 위에 표식 목록에 없는 블록이 있다:\n` +
      above.map((h) => `    ${h.trim()}`).join("\n") +
      `\n  → 그 제목을 「## 🔻 세션 종료 핸드오프 — …」로 맞추거나, MARKS 에 추가해라.`,
  );
}

const after = text.slice(startIdx);
const nextHeader = after.slice(3).search(/\n## /);
const block = nextHeader === -1 ? after : after.slice(0, nextHeader + 3);

// 1) 헤더 날짜 절대표기
const headerLine = block.split("\n")[0];
if (!/\d{4}-\d{2}-\d{2}/.test(headerLine)) {
  fail(`핸드오프 헤더에 절대날짜(YYYY-MM-DD)가 없음: "${headerLine.trim()}"`);
}

// 2) 7개 섹션 존재
const missing = REQUIRED.filter((s) => !block.includes(s));
if (missing.length) {
  fail(`필수 섹션 누락 ${missing.length}개: ${missing.join(" / ")}`);
}

// 3) 상대 날짜표기 금지
const offenders = block
  .split("\n")
  .filter((l) => RELATIVE.test(l))
  .map((l) => l.trim());
if (offenders.length) {
  fail(`상대 날짜표기 발견(절대표기 YYYY-MM-DD 로):\n   - ${offenders.join("\n   - ")}`);
}

// ⚠️ 「통과」만 찍지 말고 **무엇을 검사했는지**를 같이 찍는다 — 반성문 #165.
// 이 검사기는 표식을 하나만 알아서 최상단이 아니라 옛 블록을 검사하며 계속 초록불을 주고 있었는데,
// 대상 제목을 출력하지 않았기 때문에 사람이 알아챌 방법이 아예 없었다.
console.log(`   검사 대상: ${headerLine.trim().slice(0, 90)}`);
console.log("✅ 핸드오프 완결성 OK — 7개 섹션·절대날짜·상대표기 없음 통과.");
