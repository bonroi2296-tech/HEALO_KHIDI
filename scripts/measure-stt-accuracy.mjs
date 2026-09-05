/**
 * 받아쓰기 «정확도» 측정기 — 정답이 있는 외부 음성으로 우리 자막 엔진을 채점한다.
 *
 *   node --experimental-strip-types --env-file=.env.local scripts/measure-stt-accuracy.mjs --pairs <짝파일.json>
 *   ... --limit 30       # 표본 수 (기본 30, 0이면 전부)
 *   ... --model gemini-pro-latest
 *   ... --self-test      # 계산식만 검사하고 끝 (모델 호출 0회, 돈 안 나감)
 *
 * measure-stt-invention.mjs 와 무엇이 다른가:
 *   저것은 «없는 말을 만드나»(창작)를 잰다. 정답이 «빈 결과»인 조각을 쓴다.
 *   이것은 «있는 말을 얼마나 정확히 받아쓰나»를 잰다. 정답 문장이 있는 조각을 쓴다.
 *   둘은 서로를 대신하지 못한다: 창작 0%여도 알아듣기가 엉망일 수 있다.
 *
 * 짝파일 형식 (배열):
 *   [{ "wav": "<경로>", "ref": "<정답 문장>", "topic": "<주제>" }, ...]
 *
 * 어디서 정답을 구했나 (2026-08-27):
 *   AI Hub 「다국어 일상대화 실시간 통번역 데이터」(dataSetSn=71686) 맛보기 꾸러미.
 *   한국 안에서 녹음한 러시아어 원어민 발화 + 사람이 쓴 전사문. 16kHz 모노라 그대로 먹인다.
 *   ⚠️ 그 데이터의 «번역문» 칸은 15%가 문장 중간에서 잘려 있다(한국어→러시아어는 39%).
 *      그래서 여기서는 «전사문»(원문)만 정답으로 쓴다. 번역 채점에 쓰면 점수가 거짓이 된다.
 *
 * 무엇을 안 건드리나: LiveKit 방 · consultation_translations · 실서비스 API.
 *   Gemini 만 직접 부른다(표본당 1회, 소액 과금).
 */

import { readFileSync } from "node:fs";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// ── 라우트와 «같은» 프롬프트 ────────────────────────────────────────────────
// app/api/khidi/consultation/[id]/stt/route.ts 를 고치면 여기도 같이 고쳐라.
const DOMAIN_PRIMING = `Domain: a Korea–CIS medical-tourism teleconsultation (cancer / oncology care). Korean, Russian, Kazakh and English may all be spoken, sometimes code-switched inside one sentence — transcribe exactly as spoken, in whatever languages are actually used. When a word is genuinely ambiguous, prefer the medical/business reading over an unrelated homophone. This is disambiguation guidance ONLY — it tells you how to read what you hear, never what to expect.`;

const NO_INVENTION = `TRANSCRIBE ONLY WHAT IS ACTUALLY AUDIBLE. This is a medical setting — invented content is dangerous and will be stored in the patient's consultation record.
- The clip may start or end mid-sentence. Keep the fragment exactly as heard; NEVER add words to complete a cut-off sentence.
- NEVER add a person's name, nationality, hospital, diagnosis, or greeting that you did not actually hear, even when the domain makes it plausible.
- If the audio is only silence, breathing, background noise, or music, return the empty result — do NOT produce any filler phrase.
- When in doubt, output LESS.`;

const prompt = () => `${DOMAIN_PRIMING}
Transcribe the speech in this audio clip. Output ONLY the transcript in the original language(s), nothing else. OMIT hesitation fillers (e.g. "음", "어", "uh", "um", "э-э", "ну") but keep all meaningful words and proper nouns exactly.
${NO_INVENTION}
If there is no clear human speech, output exactly: [NO_SPEECH]`;

// ── 채점: 문자 단위 오류율(CER) ─────────────────────────────────────────────
/** 문장부호·대소문자·연속 공백은 채점에서 뺀다. 자막은 «뜻»이 맞으면 된다. */
function normalize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[.,!?;:…"'«»„“”\-–—()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** 레벤슈타인 거리. 두 줄만 들고 돌아 긴 문장에서도 메모리가 안 는다. */
function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/** 0 = 완벽, 1 = 전부 틀림. 정답보다 길게 지어내면 1을 넘을 수 있다. */
function cer(ref, hyp) {
  const R = normalize(ref);
  const H = normalize(hyp);
  if (!R.length) return H.length ? 1 : 0;
  return editDistance(R, H) / R.length;
}

// ── 계산식 자체 검사 (모델 호출 0회) ────────────────────────────────────────
function selfTest() {
  const eq = (got, want, name) => {
    if (Math.abs(got - want) > 1e-9) throw new Error(`${name}: ${got} ≠ ${want}`);
  };
  eq(cer("привет", "привет"), 0, "같은 문장은 0");
  eq(cer("Привет!", "привет"), 0, "대소문자·문장부호는 무시");
  eq(cer("абв", ""), 1, "빈 답은 1");
  eq(cer("абв", "абг"), 1 / 3, "한 글자 틀리면 1/3");
  eq(cer("", ""), 0, "둘 다 비면 0");
  eq(cer("", "붙임말"), 1, "정답이 없는데 지어내면 1");
  console.log("계산식 자체 검사 통과 (6항목)");
}

// ── 실행 ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

if (argv.includes("--self-test")) {
  selfTest();
  process.exit(0);
}
selfTest();

const pairsPath = arg("--pairs", null);
if (!pairsPath) {
  console.error("--pairs <짝파일.json> 이 필요하다.");
  process.exit(1);
}
const limit = Number(arg("--limit", "30"));
const modelId = arg("--model", "gemini-flash-latest");

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  console.error("GOOGLE_GENERATIVE_AI_API_KEY 가 없다. `--env-file=.env.local` 을 붙여라.");
  process.exit(1);
}
const google = createGoogleGenerativeAI({ apiKey });

const all = JSON.parse(readFileSync(pairsPath, "utf-8"));
// 표본은 «고르게» 뽑는다. 앞에서 자르면 한 대화에만 몰린다.
const step = limit > 0 && all.length > limit ? all.length / limit : 1;
const pairs = limit > 0 && all.length > limit
  ? Array.from({ length: limit }, (_, i) => all[Math.floor(i * step)])
  : all;

console.log(`표본 ${pairs.length}개 / 전체 ${all.length}개 · 모델 ${modelId}`);

const rows = [];
for (let i = 0; i < pairs.length; i++) {
  const p = pairs[i];
  let hyp = "";
  try {
    const { text } = await generateText({
      model: google(modelId),
      temperature: 0,
      maxOutputTokens: 400,
      messages: [
        {
          role: "user",
          content: [
            { type: "file", data: readFileSync(p.wav), mediaType: "audio/wav" },
            { type: "text", text: prompt() },
          ],
        },
      ],
    });
    hyp = text.trim().replace(/^\[NO_SPEECH\]$/, "");
  } catch (e) {
    hyp = `__오류__ ${String(e?.message || e).slice(0, 50)}`;
  }
  const score = hyp.startsWith("__오류__") ? null : cer(p.ref, hyp);
  rows.push({ ...p, hyp, cer: score });
  process.stdout.write(`\r진행 ${i + 1}/${pairs.length}`);
}
console.log("");

const ok = rows.filter((r) => r.cer !== null);
const fail = rows.length - ok.length;
const mean = ok.reduce((s, r) => s + r.cer, 0) / (ok.length || 1);
const perfect = ok.filter((r) => r.cer === 0).length;
const good = ok.filter((r) => r.cer <= 0.1).length;
const bad = ok.filter((r) => r.cer > 0.5).length;
const empty = ok.filter((r) => !normalize(r.hyp).length).length;

console.log("");
console.log(`  잰 표본        ${ok.length}개 (호출 실패 ${fail}개)`);
console.log(`  평균 오류율    ${(mean * 100).toFixed(1)}%   ← 낮을수록 좋다`);
console.log(`  글자까지 완벽  ${perfect}개 (${((perfect / ok.length) * 100).toFixed(0)}%)`);
console.log(`  거의 정확(≤10%) ${good}개 (${((good / ok.length) * 100).toFixed(0)}%)`);
console.log(`  절반 넘게 틀림  ${bad}개 (${((bad / ok.length) * 100).toFixed(0)}%)`);
console.log(`  아무 말도 못 함 ${empty}개`);

const worst = ok.slice().sort((a, b) => b.cer - a.cer).slice(0, 3);
console.log("\n  가장 많이 틀린 3개:");
for (const w of worst) {
  console.log(`   [오류율 ${(w.cer * 100).toFixed(0)}% · ${w.topic}]`);
  console.log(`     정답: ${w.ref.slice(0, 90)}`);
  console.log(`     결과: ${w.hyp.slice(0, 90)}`);
}
