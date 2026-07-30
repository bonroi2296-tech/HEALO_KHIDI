#!/usr/bin/env node
/**
 * 「버튼 질문 반복」 측정기 + **이미 답 받은 것 원장(ledger)**.
 *
 * 왜 (2026-07-30 PO 제보 두 번):
 *   1차: *"선택지 버튼을 내가 눌러줘도 왜 자꾸 반복해서 끊임없이 계속 띄우니?"*
 *   2차(정정): *"물어보는건 좋은데 대답을 해줘도 자꾸 버그처럼 같은 질문 하는거 얘기하는거야"*
 *
 *   1차만 듣고 「버튼이 너무 잦다」로 읽어 연타(streak)만 쟀는데, PO 가 아파한 본체는
 *   **「답을 줬는데 그 답을 잊고 똑같은 걸 다시 묻는 것」**이었다. 둘은 다른 고장이다:
 *     - 연타      = 다른 질문이 연달아 뜬다        → 「일이 안 끝난다」로 읽힘
 *     - 같은 질문 = 준 답이 증발한다               → 「버그」로 읽힘 (PO 표현 그대로)
 *
 *   원인: 버튼의 답은 도구 결과(tool_result)로 한 번 지나가고 끝이다. 대화가 길어지면
 *   그 줄은 뒤로 밀려 묻히고, 결정이 「없던 일」이 된다. 세는 것만으로는 절대 안 고쳐진다 —
 *   **답을 매 턴 다시 눈앞에 붙여둬야** 안 잊는다. 그래서 이 파일은 재는 일과
 *   **원장을 되돌려주는 일**을 같이 한다.
 *
 * 재는 것 셋:
 *   ① 같은 질문 반복 — 같은(정규화 후 동일) 질문을 두 번 이상 물었나. **이게 본체.**
 *   ② 연타(streak)   — PO 가 답한 바로 다음 차례에 또 버튼을 띄웠나.
 *   ③ 총량(total)    — 2026-07-20 실측 43개 = 13분 48초, 응답 지연 최대 단일 원인.
 *
 * 되돌려주는 것:
 *   ④ 원장 — 「이번 세션에서 PO 가 이미 답한 것」 질문 → 답 목록. 매 턴 재주입.
 *
 * 「차례(turn)」 세는 법: 진짜 PO 발화(type=user 이면서 tool_result 가 아닌 것)로 구간을 끊는다.
 *   버튼의 답도 tool_result 로 돌아오므로 발화로 세면 안 된다(그러면 연타가 안 잡힌다).
 *
 * 쓰는 법:
 *   node scripts/check-ask-streak.mjs --transcript <대화기록.jsonl>   # 위반이면 stderr 한 줄
 *   node scripts/check-ask-streak.mjs --transcript <…> --hook         # 훅 주입용(원장 포함)
 *   npm run check:ask                                                 # 측정기 자체 시험
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** 연타 2차례부터 위반 — 1차례는 「물어야 할 것을 물은 것」일 수 있다. */
export const STREAK_LIMIT = 2;
/** 세션 누적 3개부터 관문 재확인. self-check.sh 가 쓰던 기존 기준을 그대로 승계. */
export const TOTAL_LIMIT = 3;
/** 원장에 붙일 최대 줄 수 — 길어지면 그 자체가 잡음이 된다. 최근 것부터. */
export const LEDGER_MAX = 8;

const clip = (s, n) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/**
 * 질문을 견주기 좋게 다듬는다 — 토씨·문장부호·괄호만 다른 재탕을 같은 것으로 본다.
 * (느슨하게: 오탐 나는 검사는 사람이 무시하게 돼서 없느니만 못하다 — check-plain-korean 에서 배운 것)
 */
export function normalizeQuestion(q) {
  return String(q ?? "")
    .toLowerCase()
    .replace(/[「」«»『』()[\]{}"'`]/g, "")
    .replace(/[?？!！.,·…\-—~]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/** tool_result 한 덩이에서 PO 가 고른 답을 사람이 읽을 문자열로 뽑는다. */
export function extractAnswer(part) {
  const c = part?.content;
  let text = "";
  if (typeof c === "string") text = c;
  else if (Array.isArray(c)) text = c.map((x) => (typeof x === "string" ? x : (x?.text ?? ""))).join(" ");
  else if (c && typeof c === "object") text = c.text ?? JSON.stringify(c);
  text = text.trim();
  if (!text) return "";

  // 답이 JSON 으로 오는 경우: {"answers": {"질문": "고른 것"}} 모양이면 값만 쓴다.
  try {
    const o = JSON.parse(text);
    const a = o?.answers ?? o;
    if (a && typeof a === "object" && !Array.isArray(a)) {
      const vals = Object.values(a).filter((v) => typeof v === "string" && v.trim());
      if (vals.length) return vals.join(" / ");
    }
  } catch {
    /* 그냥 평문이면 그대로 쓴다 */
  }
  return text;
}

/**
 * 대화기록에서 버튼 질문과 그 답을 짝지어 뽑는다.
 * @returns {{question:string, answer:string}[]} 물어본 순서대로
 */
export function collectAsks(lines) {
  const asks = []; // {id, question, answer}
  const byId = new Map();

  for (const line of lines) {
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    const parts = Array.isArray(o?.message?.content) ? o.message.content : [];

    if (o.type === "assistant") {
      for (const p of parts) {
        if (p?.type !== "tool_use" || p?.name !== "AskUserQuestion") continue;
        const qs = Array.isArray(p?.input?.questions) ? p.input.questions : [];
        // 한 번의 호출에 질문이 여러 개일 수 있다 — 각각을 따로 센다.
        const list = qs.length ? qs : [{ question: p?.input?.question ?? "" }];
        for (const q of list) {
          const rec = { id: p.id, question: q?.question || q?.header || "", answer: "" };
          asks.push(rec);
          if (p.id) {
            if (!byId.has(p.id)) byId.set(p.id, []);
            byId.get(p.id).push(rec);
          }
        }
      }
      continue;
    }

    if (o.type === "user") {
      for (const p of parts) {
        if (p?.type !== "tool_result") continue;
        const recs = byId.get(p?.tool_use_id);
        if (!recs) continue;
        const ans = extractAnswer(p);
        for (const r of recs) if (!r.answer) r.answer = ans;
      }
    }
  }
  return asks.map(({ question, answer }) => ({ question, answer }));
}

/**
 * 같은 질문을 두 번 이상 물었는지 찾는다. **PO 가 「버그」라고 부른 그것.**
 * 답을 이미 받은 질문을 다시 물은 경우를 특히 무겁게 본다.
 */
export function findRepeats(asks) {
  const seen = new Map(); // 정규화 질문 → {count, answered, sample}
  for (const a of asks) {
    const key = normalizeQuestion(a.question);
    if (!key) continue;
    const cur = seen.get(key) ?? { count: 0, answered: false, sample: a.question };
    cur.count++;
    if (a.answer) cur.answered = true;
    seen.set(key, cur);
  }
  return [...seen.values()].filter((v) => v.count >= 2);
}

/**
 * Q/A 배열을 만든다 — PO 발화로 끊고, 그 구간에 버튼이 있었으면 Q.
 * @returns {("Q"|"A")[]}
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

/** Q/A 배열에서 끝에 붙은 연속 Q 개수와 총 Q 개수를 센다. */
export function measure(turns) {
  let streak = 0;
  for (let i = turns.length - 1; i >= 0 && turns[i] === "Q"; i--) streak++;
  return { streak, total: turns.filter((t) => t === "Q").length, turns: turns.length };
}

/** 대화기록 한 개를 통째로 재서 필요한 것 전부 돌려준다. */
export function analyze(lines) {
  const asks = collectAsks(lines);
  return { ...measure(foldTurns(lines)), asks, repeats: findRepeats(asks) };
}

/** 측정값 → 사람이 읽을 경고 (없으면 빈 문자열). */
export function warn({ streak, total, repeats = [] }) {
  const out = [];
  for (const r of repeats) {
    out.push(
      r.answered
        ? `⛔ 「${clip(r.sample, 40)}」를 ${r.count}번 물었다 — PO 가 이미 답한 질문이다. 답은 아래 원장에 있다. 다시 묻지 말고 그 답대로 실행해라.`
        : `⛔ 「${clip(r.sample, 40)}」를 ${r.count}번 물었다 — 같은 질문 재탕이다.`,
    );
  }
  if (streak >= STREAK_LIMIT) {
    out.push(
      `버튼을 ${streak}차례 연속으로 띄웠다 — PO 가 답을 줬는데 또 물었다. 이번엔 묻지 말고 실행하고 «이렇게 했음» 한 줄만 남겨라.`,
    );
  }
  if (total >= TOTAL_LIMIT) {
    out.push(`이번 세션 버튼 ${total}개 — 🚦관문(①돈 ②되돌리기 어려움 ③PO 만 아는 것) 다시 읽어라.`);
  }
  return out.join(" / ");
}

/**
 * 훅 주입용 여러 줄 — **원장이 핵심이다.**
 * 세는 것만으로는 「같은 질문 또 하기」가 안 고쳐진다. 답을 눈앞에 다시 붙여야 안 잊는다.
 */
export function hookLines({ streak, total, asks = [], repeats = [] }) {
  const lines = [];
  const w = warn({ streak, total, repeats });
  if (w) lines.push(`⚠️ 버튼 점검: ${w}`);

  // 같은 결정은 한 줄로 접는다 — 재탕 질문 때문에 원장까지 두 줄이 되면 그게 또 잡음이다.
  // 나중 답이 이긴다(PO 가 마음을 바꿨으면 그게 최신 결정이니까).
  const answered = [...new Map(
    asks.filter((a) => a.question && a.answer).map((a) => [normalizeQuestion(a.question), a]),
  ).values()];
  if (answered.length) {
    lines.push(`[이번 세션에서 PO 가 이미 답한 것 — 다시 묻지 마라 (${answered.length}건)]`);
    for (const a of answered.slice(-LEDGER_MAX)) {
      lines.push(`  · ${clip(a.question, 60)} → 「${clip(a.answer, 40)}」`);
    }
  } else if (total > 0) {
    lines.push(`버튼 상태: 이번 세션 ${total}개(연속 ${streak}). 관문 통과한 것만 띄워라.`);
  }
  return lines;
}

export function fromTranscript(path) {
  return analyze(readFileSync(path, "utf8").trim().split("\n"));
}

// ── 자체 시험 ────────────────────────────────────────────────
function selftest() {
  const u = (text) => JSON.stringify({ type: "user", message: { content: [{ type: "text", text }] } });
  const a = () =>
    JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "네" }] } });
  const q = (id, question) =>
    JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "tool_use", id, name: "AskUserQuestion", input: { questions: [{ question }] } }] },
    });
  const ans = (id, payload) =>
    JSON.stringify({
      type: "user",
      message: { content: [{ type: "tool_result", tool_use_id: id, content: payload }] },
    });

  let bad = 0;
  const check = (name, cond, extra = "") => {
    if (!cond) bad++;
    console.log(`${cond ? "OK  " : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  };

  // ① 연타 (1차 제보)
  const streakLines = [u("시작"), q("t1", "머지할까?"), ans("t1", "머지하기"), a(), u("응"), q("t2", "배포할까?"), ans("t2", "배포")];
  const s = analyze(streakLines);
  check("연타 2차례를 잡는다", s.streak === 2, `연속 ${s.streak}`);

  // ② 같은 질문 재탕 — **PO 가 「버그」라고 부른 그것** (2차 제보)
  const repeatLines = [
    u("시작"), q("r1", "머지할까요?"), ans("r1", "머지하기"), a(),
    u("다른 얘기"), a(),
    u("또 다른 얘기"), q("r2", "「머지」 할까요"), ans("r2", "머지하기"),
  ];
  const r = analyze(repeatLines);
  check("토씨만 다른 같은 질문을 같은 것으로 본다", r.repeats.length === 1, `찾은 재탕 ${r.repeats.length}건`);
  check("연타가 아니어도(사이에 다른 차례) 잡는다", r.streak === 1 && warn(r) !== "", `연속 ${r.streak}`);
  check("이미 답 받은 질문임을 표시한다", r.repeats[0]?.answered === true);

  // ③ 원장 — 질문과 답이 짝지어 나와야 한다
  const led = hookLines(r).join("\n");
  check("원장에 답이 실린다", led.includes("이미 답한 것") && led.includes("머지하기"), clip(led, 60));

  // ④ 답이 JSON 으로 오는 모양도 읽는다
  const jsonLines = [u("시작"), q("j1", "어디까지 할까?"), ans("j1", JSON.stringify({ answers: { "어디까지 할까?": "오늘 여기까지" } }))];
  const j = analyze(jsonLines);
  check("JSON 모양 답에서 고른 것만 뽑는다", j.asks[0]?.answer === "오늘 여기까지", `답=${j.asks[0]?.answer}`);

  // ⑤ 헛경보 없음 — 서로 다른 질문 하나씩은 조용해야 한다
  const quiet = analyze([u("a"), q("q1", "머지할까?"), ans("q1", "머지"), a(), u("b"), a()]);
  check("서로 다른 질문 1개는 조용하다", warn(quiet) === "", warn(quiet));

  // ⑥ 회귀 방지 — 도구 결과를 발화로 세면 연타가 뭉개진다
  const tr = analyze([u("a"), q("x", "질문"), ans("x", "답"), a(), ans("x2", "다른 도구 결과"), a()]);
  check("도구 결과는 차례를 안 끊는다", tr.streak === 1 && tr.total === 1, `연속 ${tr.streak}, 총 ${tr.total}`);

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
    const lines = hookLines(m);
    if (lines.length) console.log(lines.join("\n"));
    process.exit(0);
  }

  const w = warn(m);
  if (w) console.error(w);
  process.exit(0);
}
