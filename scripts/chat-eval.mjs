#!/usr/bin/env node
/**
 * 공개 AI 챗(/inquiry) 자동 평가 러너.
 *
 * 실제 배포 API(/api/public/chat/start·/stream)에 eval/chat-cases.json 의 다국어 멀티턴 대화를
 * 진짜로 돌려, (1)기계검사(언어·서류5개·앵무새·가격…) + (2)LLM 심판(Gemini)으로 채점하고
 * 마크다운+JSON 리포트를 남긴다. PO 가 케이스 리스트만 늘리면 됨.
 *
 * 사용:
 *   node scripts/chat-eval.mjs --base https://<preview>.vercel.app
 *   node scripts/chat-eval.mjs --base https://healwith.co.kr --langs ko,ru,kz --ids docs-consistency,no-parrot-logistics
 *   node scripts/chat-eval.mjs --base <URL> --no-judge        # 기계검사만(Gemini 키 불필요·비용 0)
 *
 * ⚠️ KHIDI 오염 방지: 케이스는 ≤2턴이어야 한다(3턴째부터 서버가 inquiry 자동승격 → 유치 대시보드 오염).
 *    러너가 3턴 이상이면 거부한다. eval 스레드는 guest_country="__EVAL__" 로 태그 → 청소는 scripts/chat-eval-cleanup.mjs.
 *
 * 심판 모델 키: GOOGLE_GENERATIVE_AI_API_KEY (없으면 자동으로 --no-judge 처럼 동작). .env.local 에서 읽음.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STREAM_META_DELIM = "\u001e"; // 서버 STREAM_META_DELIM 와 동일(RS, U+001E)
const EVAL_TAG = "__EVAL__";

// ── .env.local 에서 키만 주입(있으면) ───────────────────────────────
function loadEnvLocal() {
  const p = join(ROOT, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "").trim();
  }
}
loadEnvLocal();

// ── args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : def;
};
const BASE = (getArg("base", "") || "").replace(/\/$/, "");
const CASES_PATH = join(ROOT, getArg("cases", "eval/chat-cases.json"));
const LANG_FILTER = (getArg("langs", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
const ID_FILTER = (getArg("ids", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
const NO_JUDGE = args.includes("--no-judge") || !process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const DELAY_MS = Number(getArg("delay", "900"));

if (!BASE) {
  console.error("사용: node scripts/chat-eval.mjs --base <배포 URL> [--langs ko,ru] [--ids id1,id2] [--no-judge]");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 언어 감지(기계검사용) — 카자흐어 ↔ 러시아어 구분이 핵심 ─────────────
// "지배 스크립트"로 판정: 카자흐어 답변에 병원명이 한글로 박혀도(소수 한글) 키릴이 지배면 kz.
function detectLang(text) {
  const t = text || "";
  if ((t.match(/[぀-ヿ]/g) || []).length > 0) return "ja";       // 가나는 일본어 전용
  const ko = (t.match(/[가-힣]/g) || []).length;
  const cyr = (t.match(/[Ѐ-ӿ]/g) || []).length;                // 전체 키릴(카자흐 포함)
  const han = (t.match(/[一-鿿]/g) || []).length;
  const lat = (t.match(/[a-zA-Z]/g) || []).length;
  const kzc = (t.match(/[әғқңөұүһіӘҒҚҢӨҰҮҺІ]/g) || []).length;  // 카자흐 전용 키릴
  const m = Math.max(ko, cyr, han, lat);
  if (m === 0) return "other";
  if (m === cyr) return kzc > 0 ? "kz" : "ru";                  // 키릴 지배 → 카자흐글자 유무로 갈림
  if (m === ko) return "ko";
  if (m === han) return "zh";
  return "en";
}
function listItemCount(text) {
  return (text || "").split("\n").filter((l) => /^\s*(?:\d+[.)]|[-•*])\s+/.test(l)).length;
}

// ── 기계검사 ──────────────────────────────────────────────────────────
// 각 검사: (replies[], lang) → { id, pass, info }
const CHECKS = {
  reply_lang: (r, lang) => {
    const got = detectLang(r[r.length - 1]);
    return { pass: got === lang, info: `감지=${got} 기대=${lang}` };
  },
  doc_list_ge5: (r) => {
    const n = listItemCount(r[0]);
    return { pass: n >= 5, info: `첫 응답 목록항목=${n}(기대 ≥5)` };
  },
  turn_last_no_doc_list: (r) => {
    const n = listItemCount(r[r.length - 1]);
    return { pass: n < 4, info: `마지막 응답 목록항목=${n}(서류 재나열이면 ≥4)` };
  },
  source_tag: (r) => {
    const ok = /출처|source|источник|дереккөз|来源|出处|出典/i.test(r[0]);
    return { pass: ok, info: ok ? "출처 표기 있음" : "출처 표기 없음" };
  },
  price_range: (r) => {
    const last = r[r.length - 1] || "";
    const hasCur = /[\$₩]|usd|krw|원|долл|тенге|元|won/i.test(last);
    // 범위 인식: ①구분자(–~-〜到)+숫자 ②범위어(에서/부터/까지/от/до/to) ③통화금액 2개 이상(범위는 보통 두 금액).
    const dashRange = /\d[\d.,]*\s*[–\-~〜到]\s*[₩$]?\s*\d/.test(last);
    const wordRange = /\d[\d.,]*[^\n]{0,8}?(?:에서|부터|까지|от|до|\bto\b)[^\n]{0,6}?\d/i.test(last);
    const figs = (last.match(/[₩$]\s?\d[\d.,]*|\d[\d.,]*\s*만?\s*원|\d[\d.,]*\s*(?:usd|krw|тг|тенге|元)/gi) || []).length;
    const hasRange = dashRange || wordRange || figs >= 2;
    return { pass: hasCur && hasRange, info: `통화=${hasCur} 범위(dash=${dashRange} word=${wordRange} 금액수=${figs})` };
  },
  no_bare_price: (r) => {
    const last = r[r.length - 1] || "";
    const bare = /[\$₩]\s?\d|\d[\d,]*\s?(원|만원|USD|KRW|долл|тг|元)/i.test(last);
    return { pass: !bare, info: bare ? "가격 숫자 노출됨" : "가격 미노출(정상)" };
  },
};

// ── API 호출 ──────────────────────────────────────────────────────────
async function startThread(lang, sessionId) {
  const res = await fetch(`${BASE}/api/public/chat/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: lang,
      guest_name: "__EVALBOT__",
      guest_country: EVAL_TAG, // 태그: 청소·집계제외 기준
      browser_session_id: sessionId,
      landing_path: "/inquiry",
      consent: true,
      consent_version: "1.0.0",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) throw new Error(`start 실패: ${res.status} ${json.error || ""}`);
  return { threadId: json.thread_id, token: json.public_token };
}

async function sendTurn(threadId, token, text) {
  const res = await fetch(`${BASE}/api/public/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thread_id: threadId, public_token: token, message_text: text, attachments: [] }),
  });
  if (!res.ok) {
    let code = "";
    try { code = (await res.json()).error || ""; } catch {}
    throw new Error(`stream 실패: ${res.status} ${code}`);
  }
  const body = await res.text();
  return body.split(STREAM_META_DELIM)[0].trim(); // 구분자 전까지가 답변 본문
}

// ── LLM 심판(선택) ───────────────────────────────────────────────────
let judgeFn = null;
async function getJudge() {
  if (NO_JUDGE) return null;
  if (judgeFn) return judgeFn;
  const { google } = await import("@ai-sdk/google");
  const { generateText } = await import("ai");
  const model = google("gemini-flash-latest");
  judgeFn = async (turns, replies, criterion) => {
    const convo = turns.map((t, i) => `USER: ${t}\nASSISTANT: ${replies[i] ?? "(없음)"}`).join("\n\n");
    // JSON 대신 단순 라인 형식 — LLM 이 JSON 보다 훨씬 안정적으로 따른다(파싱 false-실패 방지).
    const prompt =
      `You are a STRICT QA grader for a medical-tourism AI chat (cancer patients → Korea).\n` +
      `Judge ONLY the assistant reply(ies) against the CRITERION.\n\n` +
      `CONVERSATION:\n${convo}\n\nCRITERION:\n${criterion}\n\n` +
      `Respond in EXACTLY this format, nothing else:\nVERDICT: PASS or FAIL\nWHY: <one short sentence>`;
    const { text } = await generateText({ model, prompt, temperature: 0, maxOutputTokens: 600 });
    const v = /VERDICT\s*[:\-]?\s*(PASS|FAIL)/i.exec(text) || /\b(PASS|FAIL)\b/i.exec(text);
    const w = /WHY\s*[:\-]?\s*([\s\S]+)/i.exec(text);
    if (!v) return { pass: false, reason: `심판 형식오류: ${text.slice(0, 120)}` };
    return { pass: /pass/i.test(v[1]), reason: (w ? w[1] : text).trim().replace(/\s+/g, " ").slice(0, 300) };
  };
  return judgeFn;
}

// ── 실행 ──────────────────────────────────────────────────────────────
function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function main() {
  const conf = JSON.parse(readFileSync(CASES_PATH, "utf8"));
  let cases = conf.cases || [];
  if (ID_FILTER.length) cases = cases.filter((c) => ID_FILTER.includes(c.id));

  const runId = ts();
  const judge = await getJudge();
  console.log(`▶ chat-eval | base=${BASE} | judge=${judge ? "on" : "off"} | runId=${runId}`);

  const results = [];
  for (const c of cases) {
    let langs = c.langs || ["ko"];
    if (LANG_FILTER.length) langs = langs.filter((l) => LANG_FILTER.includes(l));
    for (const lang of langs) {
      const turns = (c.turns && c.turns[lang]) || null;
      if (!turns) { console.log(`  - skip ${c.id}/${lang} (turns 없음)`); continue; }
      if (turns.length > 2) { console.log(`  ✗ ${c.id}/${lang}: ${turns.length}턴 — ≤2턴만 허용(KHIDI 오염방지). 건너뜀`); continue; }

      const rec = { id: c.id, lang, desc: c.desc_ko, turns, replies: [], checks: [], judge: null, ok: false, error: null };
      try {
        const sid = `eval-${runId}-${c.id}-${lang}`;
        const { threadId, token } = await startThread(lang, sid);
        rec.threadId = threadId;
        for (const t of turns) {
          const reply = await sendTurn(threadId, token, t);
          rec.replies.push(reply);
          await sleep(DELAY_MS);
        }
        for (const id of c.checks || []) {
          const fn = CHECKS[id];
          if (!fn) { rec.checks.push({ id, pass: false, info: "알 수 없는 검사" }); continue; }
          const out = fn(rec.replies, lang);
          rec.checks.push({ id, ...out });
        }
        if (judge && c.judge) rec.judge = await judge(turns, rec.replies, c.judge);
        const checksPass = rec.checks.every((x) => x.pass);
        const judgePass = !rec.judge || rec.judge.pass;
        rec.ok = checksPass && judgePass;
      } catch (e) {
        rec.error = e.message;
      }
      const mark = rec.error ? "⚠️" : rec.ok ? "✅" : "❌";
      console.log(`  ${mark} ${c.id}/${lang}${rec.error ? " — " + rec.error : ""}`);
      results.push(rec);
      await sleep(DELAY_MS);
    }
  }

  // 리포트
  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok && !r.error).length;
  const err = results.filter((r) => r.error).length;
  const dir = join(ROOT, "eval", "reports");
  mkdirSync(dir, { recursive: true });

  const md = [];
  md.push(`# AI 챗 평가 리포트 — ${runId}`);
  md.push(`- base: \`${BASE}\` · judge: ${judge ? "on" : "off"}`);
  md.push(`- **합격 ${pass} / 불합격 ${fail} / 오류 ${err}** (총 ${results.length})`);
  md.push("");
  md.push("| 결과 | 케이스 | 언어 | 검사 | 심판 |");
  md.push("|---|---|---|---|---|");
  for (const r of results) {
    const mark = r.error ? "⚠️오류" : r.ok ? "✅" : "❌";
    const chk = r.checks.map((c) => `${c.pass ? "✓" : "✗"}${c.id}`).join(" ") || "-";
    const jd = r.judge ? `${r.judge.pass ? "✓" : "✗"} ${r.judge.reason}` : r.error ? r.error : "-";
    md.push(`| ${mark} | ${r.id} | ${r.lang} | ${chk} | ${jd.replace(/\|/g, "/")} |`);
  }
  md.push("\n---\n## 상세\n");
  for (const r of results) {
    md.push(`### ${r.error ? "⚠️" : r.ok ? "✅" : "❌"} ${r.id} / ${r.lang} — ${r.desc || ""}`);
    if (r.error) { md.push(`> 오류: ${r.error}\n`); continue; }
    r.turns.forEach((t, i) => {
      md.push(`**Q${i + 1}:** ${t}`);
      md.push(`**A${i + 1}:** ${(r.replies[i] || "(없음)").replace(/\n/g, "\n> ")}`);
    });
    if (r.checks.length) md.push(`- 기계검사: ${r.checks.map((c) => `${c.pass ? "✓" : "✗"} ${c.id}(${c.info})`).join(" · ")}`);
    if (r.judge) md.push(`- 심판: ${r.judge.pass ? "✓ 합격" : "✗ 불합격"} — ${r.judge.reason}`);
    md.push("");
  }
  const mdPath = join(dir, `chat-eval-${runId}.md`);
  writeFileSync(mdPath, md.join("\n"), "utf8");
  writeFileSync(join(dir, `chat-eval-${runId}.json`), JSON.stringify(results, null, 2), "utf8");

  console.log(`\n결과: ✅ ${pass}  ❌ ${fail}  ⚠️ ${err}  (총 ${results.length})`);
  console.log(`리포트: ${mdPath}`);
  if (fail + err > 0) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
