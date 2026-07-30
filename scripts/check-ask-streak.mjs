#!/usr/bin/env node
/**
 * 「버튼 질문 연타」 측정기 — PO 가 눌러줘도 또 묻는 짓을 기계가 잰다.
 *
 * 왜 (2026-07-30, PO 제보: *"선택지 버튼을 내가 눌러줘도 왜 자꾸 반복해서 끊임없이 계속 띄우니?"*):
 *   원인은 **알림의 비대칭**이었다.
 *   - 「물어라」 쪽: `.claude/hooks/plain-korean.sh` 3번이 **매 턴** 다시 띄운다
 *     («PO 에게 묻는 것은 전부 버튼으로»). 즉 100% 의 차례에서 등을 떠민다.
 *   - 「묻지 마라」 쪽: 🚦묻기 전 관문(①돈 ②되돌리기 어려움 ③PO 만 아는 것)은
 *     `CLAUDE.md` 에만 있고 **세션 시작 한 번**만 들어온다. 그 뒤 수만 자에 묻힌다.
 *   한쪽만 매 턴 반복되면 그쪽으로 쏠린다 — 의지 문제가 아니라 구조 문제다.
 *   (같은 진단이 이미 말투에서 한 번 났다: `scripts/check-plain-korean.mjs` 머리말)
 *
 * 그래서 재는 것 두 가지:
 *   ① 연타(streak) — PO 가 답을 준 **바로 다음 차례에 또** 버튼을 띄웠는가.
 *      PO 가 말한 「눌러줘도 또 뜬다」가 정확히 이것이다. 총량보다 이게 본체다.
 *   ② 총량(total)  — 이번 세션 누적 버튼 수. 2026-07-20 실측으로 43개 = 13분 48초
 *      (평균 19.2초/개)가 응답 지연의 최대 단일 원인이었다.
 *
 * 「차례(turn)」 세는 법: 진짜 PO 발화(type=user 이면서 tool_result 가 아닌 것)로 구간을 끊고,
 *   그 구간 안에 AskUserQuestion 이 하나라도 있으면 그 차례를 Q 로 표시한다.
 *   버튼의 답도 tool_result 로 돌아오므로 발화로 세면 안 된다(그러면 연타가 안 잡힌다).
 *
 * 쓰는 법:
 *   node scripts/check-ask-streak.mjs --transcript <대화기록.jsonl>   # 위반이면 stderr 한 줄
 *   node scripts/check-ask-streak.mjs --transcript <…> --hook         # 훅 주입용 stdout 한 줄
 *   npm run check:ask -- --selftest                                   # 측정기 자체 시험
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** 연타 2차례부터 위반 — 1차례는 「물어야 할 것을 물은 것」일 수 있다. */
export const STREAK_LIMIT = 2;
/** 세션 누적 3개부터 관문 재확인. self-check.sh 가 쓰던 기존 기준을 그대로 승계. */
export const TOTAL_LIMIT = 3;

/**
 * 대화기록 줄들을 차례 단위로 접어 Q/A 배열을 만든다.
 * @param {string[]} lines JSONL 각 줄
 * @returns {("Q"|"A")[]} PO 발화로 끊은 차례별 표시
 */
export function foldTurns(lines) {
  const turns = [];
  let open = false; // 지금 열려 있는 차례가 있나
  let asked = false; // 그 차례에서 버튼을 띄웠나

  const close = () => {
    if (open) turns.push(asked ? "Q" : "A");
    open = false;
    asked = false;
  };

  for (const line of lines) {
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    const content = o?.message?.content;
    const parts = Array.isArray(content) ? content : [];

    if (o.type === "user") {
      // 도구 결과(버튼 답 포함)는 PO 의 새 발화가 아니다 — 차례를 끊지 않는다.
      const isToolResult = parts.some((p) => p?.type === "tool_result");
      if (isToolResult) continue;
      close();
      open = true;
      continue;
    }

    if (o.type === "assistant") {
      if (!open) open = true; // 발화 없이 시작된 기록(재개 등)도 한 차례로 친다
      if (parts.some((p) => p?.type === "tool_use" && p?.name === "AskUserQuestion")) asked = true;
    }
  }
  close();
  return turns;
}

/**
 * Q/A 배열에서 끝에 붙은 연속 Q 개수와 총 Q 개수를 센다.
 * @param {("Q"|"A")[]} turns
 */
export function measure(turns) {
  let streak = 0;
  for (let i = turns.length - 1; i >= 0 && turns[i] === "Q"; i--) streak++;
  return { streak, total: turns.filter((t) => t === "Q").length, turns: turns.length };
}

/** 측정값 → 사람이 읽을 경고 (없으면 빈 문자열). */
export function warn({ streak, total }) {
  const out = [];
  if (streak >= STREAK_LIMIT) {
    out.push(
      `버튼을 ${streak}차례 연속으로 띄웠다 — PO 가 답을 줬는데 또 물었다. 이번엔 묻지 말고 실행하고 «이렇게 했음» 한 줄만 남겨라.`,
    );
  }
  if (total >= TOTAL_LIMIT) {
    out.push(
      `이번 세션 버튼 ${total}개 — 🚦관문(①돈 ②되돌리기 어려움 ③PO 만 아는 것) 다시 읽어라.`,
    );
  }
  return out.join(" / ");
}

/** 훅 주입용 한 줄 (경고가 없어도 세고 있다는 사실은 알린다). */
export function hookLine({ streak, total }) {
  const w = warn({ streak, total });
  if (w) return `⚠️ 버튼 상태: ${w}`;
  if (total > 0) return `버튼 상태: 이번 세션 ${total}개(연속 ${streak}). 관문 통과한 것만 띄워라.`;
  return "";
}

export function fromTranscript(path) {
  const lines = readFileSync(path, "utf8").trim().split("\n");
  return measure(foldTurns(lines));
}

// ── 자체 시험 ────────────────────────────────────────────────
function selftest() {
  const u = (text) => JSON.stringify({ type: "user", message: { content: [{ type: "text", text }] } });
  const tr = () => JSON.stringify({ type: "user", message: { content: [{ type: "tool_result" }] } });
  const a = () => JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "네" }] } });
  const q = () =>
    JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "AskUserQuestion" }] },
    });

  const cases = [
    ["버튼 없음", [u("안녕"), a()], { streak: 0, total: 0 }],
    ["한 번만 물음", [u("안녕"), q(), tr(), a()], { streak: 1, total: 1 }],
    // PO 제보의 그 모양: 답을 줬는데 다음 차례에 또 띄운다
    ["눌렀는데 또 물음", [u("안녕"), q(), tr(), a(), u("응"), q(), tr()], { streak: 2, total: 2 }],
    ["중간에 끊김", [u("a"), q(), tr(), u("b"), a(), u("c"), q(), tr()], { streak: 1, total: 2 }],
    // 도구 결과를 발화로 세면 연타가 1차례로 뭉개진다 — 그 회귀를 막는 시험
    ["도구결과는 차례를 안 끊는다", [u("a"), q(), tr(), a(), tr(), a()], { streak: 1, total: 1 }],
  ];

  let bad = 0;
  for (const [name, lines, want] of cases) {
    const got = measure(foldTurns(lines));
    const ok = got.streak === want.streak && got.total === want.total;
    if (!ok) bad++;
    console.log(
      `${ok ? "OK  " : "FAIL"} ${name} — 연속 ${got.streak}/${want.streak}, 총 ${got.total}/${want.total}`,
    );
  }
  if (warn({ streak: 2, total: 0 }) === "") {
    console.log("FAIL 연속 2면 경고가 나와야 한다");
    bad++;
  }
  if (warn({ streak: 1, total: 1 }) !== "") {
    console.log("FAIL 연속 1·총 1 이면 조용해야 한다");
    bad++;
  }
  console.log(bad ? `\n${bad}건 실패` : "\n전부 통과");
  process.exit(bad ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  if (argv.includes("--selftest")) selftest();

  const i = argv.indexOf("--transcript");
  const path = i >= 0 ? argv[i + 1] : null;
  if (!path) process.exit(0); // 대화기록 없이 부르면 조용히 통과 (훅에서 안전)

  let m;
  try {
    m = fromTranscript(path);
  } catch {
    process.exit(0); // 기록을 못 읽는 건 위반이 아니다
  }

  if (argv.includes("--hook")) {
    const line = hookLine(m);
    if (line) console.log(line);
    process.exit(0);
  }

  const w = warn(m);
  if (w) console.error(w);
  process.exit(0);
}
