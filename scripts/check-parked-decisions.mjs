#!/usr/bin/env node
/**
 * 「기억에만 적어둔 할 일」 탐지기 (2026-07-31 신설)
 *
 * 왜: 2026-07-23 PO 가 화상상담 4건을 결정했는데 **8일 동안 아무도 손대지 않았다.**
 *   원인은 게으름이 아니라 «적어둔 자리»였다 — 어시 기억파일에만 있었고,
 *   정리 세션이 세는 모집단(작업본·신청서)에도, 남은 문제 목록(KNOWN_ISSUES)에도 없었다.
 *   기억파일은 **어떤 검사기도 안 보는 자리**다.
 *
 * 그래서: 기억파일에서 「대기·미착수」 냄새가 나는 항목을 뽑아, 저장소의 할 일 목록
 *   (docs/KNOWN_ISSUES.md · docs/PROJECT_CONTEXT.md)에 흔적이 있는지 대조한다.
 *   없으면 «기억에만 있는 할 일»로 띄운다.
 *
 * 성격: **경고만 한다(항상 종료코드 0).** 기억파일은 사람이 아니라 어시의 메모라
 *   자동 검사(CI)를 빨갛게 만들 근거로 쓰지 않는다 — 세션 시작 때 눈앞에 띄우는 게 목적.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const MEM_DIR =
  process.env.HEALO_MEMORY_DIR ||
  join(homedir(), ".claude", "projects", "C--Users-user-Desktop-HEALO-KHIDI", "memory");

const TODO_WORDS = ["대기", "미착수", "이어받아", "보류", "나중에", "구현 예정", "착수 전"];

/** 기억파일 이름(슬러그)이나 제목 낱말이 할 일 목록에 등장하는가 */
function mentioned(haystack, name, description) {
  if (haystack.includes(name)) return true;
  // 슬러그를 낱말로 쪼개, 3글자 이상 한글 낱말이 목록에 있으면 「언급됨」으로 본다.
  const words = (description || "").match(/[가-힣]{3,}/g) || [];
  return words.filter((w) => haystack.includes(w)).length >= 2;
}

function main() {
  if (!existsSync(MEM_DIR)) return; // 다른 기계·CI — 조용히 끝낸다

  const lists = ["docs/KNOWN_ISSUES.md", "docs/PROJECT_CONTEXT.md"]
    .filter(existsSync)
    .map((p) => readFileSync(p, "utf8"))
    .join("\n");
  if (!lists) return;

  const found = [];
  for (const f of readdirSync(MEM_DIR)) {
    if (!f.endsWith(".md") || f === "MEMORY.md") continue;
    const raw = readFileSync(join(MEM_DIR, f), "utf8");
    const desc = raw.match(/^description:\s*(.+)$/m)?.[1] ?? "";
    const name = f.replace(/\.md$/, "");
    const hay = `${desc}\n${raw}`;
    if (!TODO_WORDS.some((w) => hay.includes(w))) continue;
    // 「완료」라고 스스로 적어둔 건 할 일이 아니다 — 헛경보를 줄인다(설명 줄 기준).
    if (/완료|✅|해소|종결/.test(desc)) continue;
    if (mentioned(lists, name, desc)) continue;
    found.push({ name, desc: desc.slice(0, 90) });
  }

  if (!found.length) return;
  console.log("");
  console.log("## 🗃 기억에만 있는 할 일 — 목록에 옮겨라");
  console.log("  기억파일은 어떤 검사기도 안 본다. 여기 뜬 건 **8일 묻혔던 2026-07-23 화상상담 4건과 같은 자리**다.");
  for (const f of found) console.log(`  · ${f.name} — ${f.desc}`);
  console.log("  → 아직 유효하면 docs/KNOWN_ISSUES.md 에 한 줄 등재(언제 다시 볼지 날짜 포함), 끝난 거면 기억파일을 고쳐라.");
}

main();
