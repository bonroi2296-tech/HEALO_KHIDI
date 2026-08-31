#!/usr/bin/env node
/**
 * 핸드오프 자동 보관 회전 (D) — npm run handoff:rotate
 *
 * 왜: PROJECT_CONTEXT.md 최상단엔 최신 4개 세션 핸드오프만 유지(군살 방지)인데,
 *     "3개째 쌓이면 가장 오래된 걸 archive로" 를 사람이 손으로 하면 빠뜨리거나 실수.
 *     → 기계가 회전시킨다. 기록은 docs/archive/PROJECT_CONTEXT_handoffs.md 로 보존(삭제 X).
 *
 * 동작: 최상단 "## 🔖 세션 핸드오프" 블록들 중 **최신 4개만 남기고**, 나머지는
 *       archive 파일 맨 위(헤더 다음)로 옮긴다. 핸드오프 블록이 2개 이하면 아무것도 안 함.
 *
 * 옵션: --keep N (기본 2), --dry (실제로 안 쓰고 무엇을 옮길지만 출력).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

/**
 * 블록을 docs/ 에서 docs/archive/ 로 «한 칸 내려보내면» 그 안의 상대경로가 전부 깨진다.
 *
 * 왜 필요한가 (2026-08-31 실측): 보관소에서 죽은 상대링크 7건이 나왔는데 원인이 개별 오타가
 * 아니라 «구조»였다 — 회전이 글을 옮기기만 하고 기준점이 바뀐 걸 안 고쳤다. 즉 손으로 고쳐도
 * **다음 회전에서 또 생긴다.** 그래서 옮기는 그 자리에서 고친다.
 *
 * 안전장치: «docs/ 기준으로 실제 존재하는 파일»만 고친다. 그래서
 *   `[`eed786e0`](...)` 같은 링크 모양의 딴것이나 `route.ts:157` 처럼 줄번호가 붙은 표기는
 *   손대지 않는다(그런 건 원래도 파일을 가리키는 링크가 아니다).
 */
function 상대경로내리기(text, { count } = {}) {
  let n = 0;
  const out = text.replace(/\]\(([^)\s]+)\)/g, (whole, target) => {
    if (/^(https?:|mailto:|#|\/)/.test(target)) return whole;
    const [pathPart, frag] = target.split("#");
    if (!pathPart) return whole;
    let decoded;
    try { decoded = decodeURIComponent(pathPart); } catch { return whole; }
    // docs/ 기준으로 «있는» 파일만 대상 — 없으면 링크가 아니거나 이미 다른 기준이다.
    if (!existsSync(`docs/${decoded}`)) return whole;
    n += 1;
    // `./FOO` → `../FOO` (「.././FOO」로 안 만든다 — 동작은 같지만 다음 사람이 오타로 읽는다)
    // 🛑 target 이 아니라 pathPart 를 써라 — target 엔 #앵커가 붙어 있어 「#절#절」로 두 번 붙는다
    //    (2026-08-31 시늉 시험에서 실제로 그렇게 났다).
    const 정리 = pathPart.startsWith("./") ? pathPart.slice(2) : pathPart;
    return `](../${정리}${frag ? "#" + frag : ""})`;
  });
  if (count) count.n = n;
  return out;
}


const CTX = "docs/PROJECT_CONTEXT.md";
const ARCHIVE = "docs/archive/PROJECT_CONTEXT_handoffs.md";
// ⚠️ 표식이 두 종류다 — 옛 블록은 「## 🔖 세션 핸드오프」, 요즘 `/handoff` 스킬이 쓰는 건
//    「## 🔻 세션 종료 핸드오프」. 2026-07-30 실측: 이 스크립트가 🔖 만 찾아서
//    **최상단에 🔻 블록이 5개 쌓여 있는데도 「4개, 회전 불필요」로 초록불**이었다
//    = 군살 방지 회전이 조용히 안 돌고 있었다(문서만 계속 부풀었다).
//    새 표식을 쓰기 시작할 땐 이 목록에 반드시 추가할 것.
const MARKS = ["## 🔖 세션 핸드오프", "## 🔻 세션 종료 핸드오프"];
const isMark = (line) => MARKS.some((m) => line.startsWith(m));

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const keepArg = args.indexOf("--keep");
const KEEP = keepArg !== -1 ? parseInt(args[keepArg + 1], 10) || 4 : 4;

const lines = readFileSync(CTX, "utf8").split("\n");

// 핸드오프 블록 경계 찾기: MARK 줄 ~ 다음 "## " 줄 직전
const blocks = [];
for (let i = 0; i < lines.length; i++) {
  if (isMark(lines[i])) {
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
const 링크수 = { n: 0 };
const archiveText = toArchive
  .map((b) => 상대경로내리기(lines.slice(b.start, b.end).join("\n").replace(/\n+$/, ""), { count: 링크수 }))
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
  archiveDoc = "# PROJECT_CONTEXT 핸드오프 보관 (과거 세션)\n\n> 최신 4개는 docs/PROJECT_CONTEXT.md 에 있고, 그 이전은 여기로 회전 보관된다(기록 보존).\n";
}
// 기존 첫 핸드오프 블록(MARK) 바로 앞에 삽입 → 최신 보관분이 위로(newest-first).
// MARK가 없으면(첫 보관) intro 다음(첫 빈 줄 뒤)에 삽입.
// 보관 파일에서도 표식 두 종류 중 «먼저 나오는» 자리를 찾는다.
const markAt = MARKS.map((m) => archiveDoc.indexOf(m)).filter((i) => i !== -1).sort((a, b) => a - b)[0] ?? -1;
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

if (링크수.n) console.log(`   ↳ 상대경로 ${링크수.n}개를 보관소 기준(../)으로 고쳤다.`);
console.log(`\n✅ 회전 완료: ${toArchive.length}개 블록(${lastHeader} … ${firstHeader})을 ${ARCHIVE} 로 보관. PROJECT_CONTEXT엔 최신 ${KEEP}개만 남음.`);
