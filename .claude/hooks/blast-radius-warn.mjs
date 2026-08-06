#!/usr/bin/env node
/**
 * 「A 를 고치라고 했는데 파생된 B 가 고장난다」 — 고치기 «직전»에 반경을 알려주는 훅.
 *
 * 왜 (POSTMORTEMS 실측): 175건 중 「🔁 부류 재발」 40건+, 상당수가 «내가 A 를 고치다 B 를 깬 것».
 *   #106 부품을 지우며 그 안의 응급전화 동선까지 삭제 → 한 달간 0개
 *   #27  favicon.svg 를 지웠는데 sw.js 가 계속 불러 → 앱 설치 배너 소멸
 *   공통점: 손대기 «전»에 «이걸 누가 쓰나»를 안 봤다. #106 기록 원문 —
 *   "«이 라우트로 «들어오는» 링크가 있나»는 어느 가드도 안 봤다."
 *
 * 무엇을 하나: Edit/Write 직전, 그 파일이 «몇 곳에서 쓰이고 어느 화면까지 닿는지»를 계산해
 *   반경이 넓을 때만 한 번 알려준다. 막지 않는다(exit 0). 지도지 문지기가 아니다.
 *
 * 왜 «막지» 않나 (CLAUDE.md 규칙 7-③ 자문): 막으면 회피하게 되고, 그 순간
 *   「고친 것처럼 보이는데 안 고쳐진 상태」가 된다. 정보는 판단을 바꾸지만 차단은 우회를 부른다.
 *
 * 시끄럽지 않게: ①반경이 좁으면(쓰는 곳 < 임계) 침묵 ②같은 파일은 세션당 한 번만
 *   ③문서·설정 파일은 아예 안 본다.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const THRESHOLD_USERS = 3; // 쓰는 곳이 이만큼 넘으면 알린다
const THRESHOLD_ROUTES = 2; // 닿는 화면이 이만큼 넘으면 알린다

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    main(JSON.parse(raw || "{}"));
  } catch {
    process.exit(0); // 훅이 깨져서 정상 작업을 막는 일은 없어야 한다
  }
});

/** 같은 파일을 계속 고칠 때 매번 떠들지 않게 — 세션 단위 기억 */
function seenPath(sessionId) {
  return path.join(os.tmpdir(), `healo-blast-${(sessionId || "nosession").replace(/[^\w-]/g, "")}.json`);
}
function alreadyWarned(sessionId, file) {
  try {
    const seen = JSON.parse(fs.readFileSync(seenPath(sessionId), "utf8"));
    return seen.includes(file);
  } catch {
    return false;
  }
}
function markWarned(sessionId, file) {
  let seen = [];
  try {
    seen = JSON.parse(fs.readFileSync(seenPath(sessionId), "utf8"));
  } catch {}
  seen.push(file);
  try {
    fs.writeFileSync(seenPath(sessionId), JSON.stringify(seen.slice(-300)));
  } catch {}
}

function main(input) {
  const tool = input.tool_name || "";
  if (!/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(tool)) process.exit(0);

  const abs = input.tool_input?.file_path;
  if (!abs) process.exit(0);

  const cwd = input.cwd || process.cwd();
  const rel = path.relative(cwd, abs).split(path.sep).join("/");

  // 코드가 아니면 볼 것 없다. 새 파일도 볼 것 없다(아직 아무도 안 쓴다).
  if (!/^(app|src|components)\//.test(rel)) process.exit(0);
  if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(rel)) process.exit(0);
  if (!fs.existsSync(abs)) process.exit(0);
  if (alreadyWarned(input.session_id, rel)) process.exit(0);

  let data;
  try {
    const out = execFileSync("node", ["scripts/blast-radius.mjs", "--json", "--files", rel], {
      cwd,
      encoding: "utf8",
      timeout: 8000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    data = JSON.parse(out);
  } catch {
    process.exit(0); // 도구가 없거나 실패하면 조용히 통과
  }

  const users = data.hotspots?.[0]?.users ?? 0;
  const derived = (data.impactedRoutes || []).filter((r) => r.hops > 0);
  const uncovered = (data.uncovered || []).filter((r) => r.hops > 0);

  if (users < THRESHOLD_USERS && derived.length < THRESHOLD_ROUTES) process.exit(0);

  markWarned(input.session_id, rel);

  const lines = [];
  lines.push(`🎯 영향 반경 — ${rel}`);
  if (users) lines.push(`   이 파일을 ${users}곳이 쓴다.`);
  if (derived.length) {
    const shown = derived.slice(0, 8).map((r) => `     ${r.url}${r.covered ? "" : "  ← 검사 없음"}`);
    lines.push(`   여기까지 닿는다 (내가 안 열어본 화면 ${derived.length}개):`);
    lines.push(...shown);
    if (derived.length > 8) lines.push(`     … 외 ${derived.length - 8}개`);
  }
  if (uncovered.length) {
    lines.push(`   ⚠️ 그중 ${uncovered.length}개는 «자동 검사가 없다» — 고친 뒤 내 눈으로 봐야 한다.`);
  }
  lines.push(`   전부 보려면: node scripts/blast-radius.mjs`);

  const msg = lines.join("\n");
  process.stdout.write(
    JSON.stringify({
      systemMessage: msg,
      hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: msg },
    })
  );
  process.exit(0);
}
