#!/usr/bin/env node
/**
 * 세션훅 데이터 소스 검사 — npm run check:hook-data
 *
 * 왜: 세션시작 훅(.claude/hooks/session-orient.sh)은 두 문서를 파싱해
 *     「PO 대기 관문 보채기」와 「PO 취향」을 매 세션 자동 주입한다.
 *     문서 형식이 바뀌면(헤더 문구 수정·마커 삭제·표 제거) 훅은 에러 없이
 *     그냥 그 섹션을 안 띄운다 = **보채기·취향 주입이 조용히 죽는다**.
 *     (2026-07-03 세션 알람이 소리 없이 죽었던 것과 같은 부류 — 침묵 실패는 기계가 막는다.)
 *
 * 검사:
 *  1) LAUNCH_GATES_PO.md — 「## 🎯 지금 남은 관문」 헤더 존재 + 그 섹션에 표 데이터 행 ≥1
 *     (관문이 전부 닫혀 표가 비면 이 검사를 섹션 헤더만으로 완화할 것 — 그때 이 파일 수정)
 *  2) PO_PREFERENCES.md — ACTIVE:START/END 마커 존재 + 사이에 취향 항목(불릿) ≥1
 *  3) session-orient.sh 가 두 파일 경로를 실제로 참조하는지 (파일 이동/개명 시 크게 실패)
 */
import { readFileSync } from "node:fs";

let failed = false;
const fail = (msg) => {
  console.error(`❌ check:hook-data — ${msg}`);
  failed = true;
};
const read = (p) => {
  try {
    return readFileSync(p, "utf8");
  } catch {
    fail(`${p} 를 못 읽음`);
    return null;
  }
};

// ── 1) LAUNCH_GATES_PO.md 「지금 남은 관문」 ─────────────────────
const GATES = "docs/LAUNCH_GATES_PO.md";
const gates = read(GATES);
if (gates != null) {
  const m = gates.match(/^## 🎯 지금 남은 관문.*$/m);
  if (!m) {
    fail(`${GATES} 에 「## 🎯 지금 남은 관문」 헤더가 없음 — 훅 보채기가 조용히 죽는다`);
  } else {
    // 훅과 동일한 경계: 헤더부터 다음 "## " 전까지, 그 안의 표 행(|로 시작)
    const start = gates.indexOf(m[0]) + m[0].length;
    const rest = gates.slice(start);
    const end = rest.search(/^## /m);
    const section = end === -1 ? rest : rest.slice(0, end);
    const dataRows = section
      .split("\n")
      .filter((l) => l.trim().startsWith("|"))
      .filter((l) => !/^\|\s*-{2,}/.test(l.replace(/\|/g, "|").trim()) && !/^\|[-\s|:]+\|$/.test(l.trim()))
      .filter((l) => !/^\|\s*순위\s*\|/.test(l.trim()));
    if (dataRows.length < 1) {
      fail(
        `${GATES} 「지금 남은 관문」 섹션에 표 데이터 행이 0개 — 관문을 전부 닫았다면 이 검사 규칙(check-hook-data.mjs 주석 참조)을 함께 갱신할 것`
      );
    }
  }
}

// ── 2) PO_PREFERENCES.md ACTIVE 마커 ────────────────────────────
const PREFS = "docs/PO_PREFERENCES.md";
const prefs = read(PREFS);
if (prefs != null) {
  const s = prefs.indexOf("<!-- ACTIVE:START -->");
  const e = prefs.indexOf("<!-- ACTIVE:END -->");
  if (s === -1 || e === -1 || e < s) {
    fail(`${PREFS} 의 ACTIVE:START/END 마커가 깨짐 — 훅 취향 주입이 조용히 죽는다`);
  } else {
    const active = prefs.slice(s, e);
    const bullets = active.split("\n").filter((l) => l.trim().startsWith("- "));
    if (bullets.length < 1) fail(`${PREFS} 「활성 취향」이 비어 있음(불릿 0개)`);
  }
}

// ── 3) 훅이 두 파일을 참조하는지 ────────────────────────────────
const HOOK = ".claude/hooks/session-orient.sh";
const hook = read(HOOK);
if (hook != null) {
  if (!hook.includes("LAUNCH_GATES_PO.md"))
    fail(`${HOOK} 가 LAUNCH_GATES_PO.md 를 참조하지 않음 — 보채기 배선이 끊김`);
  if (!hook.includes("PO_PREFERENCES.md"))
    fail(`${HOOK} 가 PO_PREFERENCES.md 를 참조하지 않음 — 취향 주입 배선이 끊김`);
}

if (failed) process.exit(1);
console.log("✅ check:hook-data — 훅 데이터 소스(관문 표·취향 마커·배선) 정상.");
