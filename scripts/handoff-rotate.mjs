#!/usr/bin/env node
/**
 * 핸드오프 자동 보관 회전 (D) — npm run handoff:rotate
 *
 * 왜: PROJECT_CONTEXT.md 최상단엔 최신 2개 세션 핸드오프만 유지(군살 방지)인데,
 *     "3개째 쌓이면 가장 오래된 걸 archive로" 를 사람이 손으로 하면 빠뜨리거나 실수.
 *     → 기계가 회전시킨다. 기록은 docs/archive/PROJECT_CONTEXT_handoffs.md 로 보존(삭제 X).
 *
 * 동작: 최상단 "## 🔖 세션 핸드오프" 블록들 중 **최신 2개만 남기고**, 나머지는
 *       archive 파일 맨 위(헤더 다음)로 옮긴다. 핸드오프 블록이 2개 이하면 아무것도 안 함.
 *
 * 옵션: --keep N (기본 2), --dry (실제로 안 쓰고 무엇을 옮길지만 출력).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const CTX = "docs/PROJECT_CONTEXT.md";
const ARCHIVE = "docs/archive/PROJECT_CONTEXT_handoffs.md";
const MARK = "## 🔖 세션 핸드오프";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const keepArg = args.indexOf("--keep");
const KEEP = keepArg !== -1 ? parseInt(args[keepArg + 1], 10) || 2 : 2;

const lines = readFileSync(CTX, "utf8").split("\n");

// 핸드오프 블록 경계 찾기: MARK 줄 ~ 다음 "## " 줄 직전
const blocks = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith(MARK)) {
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].startsWith("## ")) {
        end = j;
        break;
      }
    }
    blocks.push({ start: i, end }); // [start, end)
  }
}

if (blocks.length <= KEEP) {
  console.log(`✅ 핸드오프 블록 ${blocks.length}개 (유지 기준 ${KEEP}개) — 회전 불필요.`);
  process.exit(0);
}

// 최신순 = 파일 위에서 아래. 앞 KEEP개 유지, 나머지 보관.
const toArchive = blocks.slice(KEEP);
const archiveText = toArchive
  .map((b) => lines.slice(b.start, b.end).join("\n").replace(/\n+$/, ""))
  .join("\n\n");

const firstHeader = lines[toArchive[0].start].trim();
const lastHeader = lines[toArchive[toArchive.length - 1].start].trim();
console.log(`📦 보관 대상 ${toArchive.length}개 블록:`);
toArchive.forEach((b) => console.log(`   - ${lines[b.start].trim()}`));

if (dry) {
  console.log("\n(--dry: 실제 파일은 안 바꿈)");
  process.exit(0);
}

// 1) PROJECT_CONTEXT 에서 보관 블록 제거 (뒤에서부터 잘라야 인덱스 안 밀림)
const removeFrom = toArchive[0].start;
const removeTo = toArchive[toArchive.length - 1].end;
const kept = [...lines.slice(0, removeFrom), ...lines.slice(removeTo)];
// 잘린 자리에 빈 줄 정리
const newCtx = kept.join("\n").replace(/\n{3,}/g, "\n\n");
writeFileSync(CTX, newCtx.endsWith("\n") ? newCtx : newCtx + "\n");

// 2) archive 파일 맨 위(헤더 다음)에 prepend (오래된 기록 보존)
let archiveDoc;
if (existsSync(ARCHIVE)) {
  archiveDoc = readFileSync(ARCHIVE, "utf8");
} else {
  archiveDoc = "# PROJECT_CONTEXT 핸드오프 보관 (과거 세션)\n\n> 최신 2개는 docs/PROJECT_CONTEXT.md 에 있고, 그 이전은 여기로 회전 보관된다(기록 보존).\n";
}
// 기존 첫 핸드오프 블록(MARK) 바로 앞에 삽입 → 최신 보관분이 위로(newest-first).
// MARK가 없으면(첫 보관) intro 다음(첫 빈 줄 뒤)에 삽입.
const markAt = archiveDoc.indexOf(MARK);
let head, rest;
if (markAt !== -1) {
  head = archiveDoc.slice(0, markAt);
  rest = archiveDoc.slice(markAt);
} else {
  const insertAt = archiveDoc.indexOf("\n\n");
  head = insertAt === -1 ? archiveDoc + "\n\n" : archiveDoc.slice(0, insertAt + 2);
  rest = insertAt === -1 ? "" : archiveDoc.slice(insertAt + 2);
}
const newArchive = `${head.replace(/\n+$/, "")}\n\n${archiveText}\n\n---\n\n${rest}`.replace(/\n{4,}/g, "\n\n\n");
writeFileSync(ARCHIVE, newArchive.endsWith("\n") ? newArchive : newArchive + "\n");

console.log(`\n✅ 회전 완료: ${toArchive.length}개 블록(${lastHeader} … ${firstHeader})을 ${ARCHIVE} 로 보관. PROJECT_CONTEXT엔 최신 ${KEEP}개만 남음.`);
