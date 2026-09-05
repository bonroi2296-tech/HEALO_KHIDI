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
  if (!existsSync(MEM_DIR)) {
    // 🛑 조용히 끝내지 마라. 출력 0줄 + 종료 0 은 돌린 사람에게 「걸린 게 없다」로 읽히는데
    //    실제로는 «한 번도 안 봤다»다. 이 저장소가 반복해서 밟은 부류라 한 줄은 반드시 남긴다
    //    (2026-08-31 정리에서 실측 — 클라우드 상자에서 매번 조용히 통과하고 있었다).
    console.log(
      `⏭️  보류 결정 점검 — **못 쟀다**(이 기계엔 기억 폴더가 없다: ${MEM_DIR}).\n` +
        `   PO PC 에서 돌리거나 HEALO_MEMORY_DIR 를 지정해야 실제로 잰다.\n` +
        `   ⚠️ 이 줄이 보이면 「통과」라고 적지 마라 — 검사한 적이 없다.`
    );
    return;
  }

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
    // 「대기」 낱말은 **한 줄 요약(description)에서만** 찾는다. 본문에는 사실·함정 기록에도
    // 「대신 못 함」·「기다린다」 같은 말이 스쳐 지나가서, 본문까지 보면 헛경보가 절반이었다
    // (2026-07-31 첫 실행 6건 중 3건이 사실 기록이었다). 요약은 글쓴이가 「이게 요점」이라고
    // 적은 줄이라, 거기 「대기」가 있으면 진짜 대기일 확률이 높다.
    if (!TODO_WORDS.some((w) => desc.includes(w))) continue;
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
