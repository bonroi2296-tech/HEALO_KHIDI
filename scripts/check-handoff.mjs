#!/usr/bin/env node
/**
 * 핸드오프 완결성 검사 (F) — npm run check:handoff
 *
 * 왜: 핸드오프(세션 인수인계)가 6칸을 다 채웠는지·날짜가 절대표기인지는
 *     사람이 매번 눈으로 보기 쉽지 않음. 형식 누락은 기계가 막는다.
 *     (내용의 정직함 — "검증 못 함을 솔직히 적었나"는 기계가 못 봄. 형식만 본다.)
 *
 * 검사 대상: docs/PROJECT_CONTEXT.md 최상단 핸드오프 블록 1개.
 *  1) 6개 섹션 헤더가 다 있는지
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

// 최상단 핸드오프 블록: 첫 "## 🔖 세션 핸드오프" 부터 다음 "## " 전까지
const startIdx = text.indexOf("## 🔖 세션 핸드오프");
if (startIdx === -1) fail("최상단 핸드오프 블록(## 🔖 세션 핸드오프)을 못 찾음");

const after = text.slice(startIdx);
const nextHeader = after.slice(3).search(/\n## /);
const block = nextHeader === -1 ? after : after.slice(0, nextHeader + 3);

// 1) 헤더 날짜 절대표기
const headerLine = block.split("\n")[0];
if (!/\d{4}-\d{2}-\d{2}/.test(headerLine)) {
  fail(`핸드오프 헤더에 절대날짜(YYYY-MM-DD)가 없음: "${headerLine.trim()}"`);
}

// 2) 6개 섹션 존재
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

console.log("✅ 핸드오프 완결성 OK — 6개 섹션·절대날짜·상대표기 없음 통과.");
