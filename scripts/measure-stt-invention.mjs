/**
 * 자막 「지어냄」 측정기 — 회의방·실서비스 DB 를 안 건드리고 받아쓰기 품질을 잰다.
 *
 *   # ⚠️ 거르개 부품이 .ts 라 --experimental-strip-types 가 필요하다(없으면 import 에서 죽는다).
 *   node --experimental-strip-types --env-file=.env.local scripts/measure-stt-invention.mjs
 *   ... --repeat 5          # 조각당 반복 횟수 (기본 3)
 *   ... --agree             # 라우트에 넣은 «두 번 물어 대조» 거르개를 켜고 잰다
 *   ... --mode json         # 전사+번역 합친 경로
 *   ... --model gemini-pro-latest
 *
 * 2026-08-07 실측 (--repeat 5):
 *   거르개 끔 → 무음·잡음 창작 15/15 (100%)
 *   거르개 켬 → 창작 0/15 (0%) · 진짜 말 버림 0/15 (0%)
 *
 * 왜 있나 (2026-08-07):
 *   자막이 아무도 안 한 말을 만들어낸다. 8/03·8/04 에 프롬프트로 두 번 손봤는데
 *   «고쳤다»고 말할 근거가 매번 그때그때 만든 임시 파일이었고, 임시 폴더가 지워지면서
 *   다음 사람은 처음부터 다시 쟀다. 그래서 저장소 안에 고정한다.
 *   ⚠️ 이 파일은 «화면이 뜨나»가 아니라 «없는 말을 만드나»를 재는 도구다.
 *      바꾼 프롬프트·모델이 정말 나아졌는지는 이걸 돌려 숫자로 대조해라.
 *
 * 무엇을 재나: 정답을 아는 소리 조각을 만들어 모델에 먹인다.
 *   · 무음·잡음 조각  → 나오는 글자는 전부 «창작»이다 (정답 = 빈 결과)
 *   · 말 조각        → 핵심 낱말이 살아 있나 (정답 = README 의 대본)
 *
 * 안 건드리는 것: LiveKit 방 · consultation_translations · 실서비스 API.
 *   Gemini 만 직접 부른다(조각당 1회, 소액 과금).
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { transcriptSimilarity, transcriptsAgree } from "../src/lib/consultation/transcriptAgreement.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WAV = path.join(HERE, "..", "e2e", "fixtures", "audio", "ko-patient-speech.wav");

// ── 라우트와 «같은» 프롬프트를 쓴다 ───────────────────────────────────────────
// 베끼면 갈라진다. app/api/khidi/consultation/[id]/stt/route.ts 를 고치면 여기도 같이 고쳐라.
// (모듈로 빼는 게 정답이지만 라우트는 server-only 라 스크립트에서 못 불러온다.)
const DOMAIN_PRIMING = `Domain: a Korea–CIS medical-tourism teleconsultation (cancer / oncology care). Korean, Russian, Kazakh and English may all be spoken, sometimes code-switched inside one sentence — transcribe exactly as spoken, in whatever languages are actually used. When a word is genuinely ambiguous, prefer the medical/business reading over an unrelated homophone (e.g. "큰 다리" = a big bridge, never the body part "leg"; "유플러스/Uplus" is a company, not "you plus"; "바이어"=buyer, "컨택/컨택트"=contact, "에이전시"=agency, "인플루언서"=influencer). This is disambiguation guidance ONLY — it tells you how to read what you hear, never what to expect.`;

const NO_INVENTION = `TRANSCRIBE ONLY WHAT IS ACTUALLY AUDIBLE. This is a medical setting — invented content is dangerous and will be stored in the patient's consultation record.
- The clip may start or end mid-sentence. Keep the fragment exactly as heard; NEVER add words to complete a cut-off sentence.
- NEVER add a person's name, nationality, hospital, diagnosis, or greeting that you did not actually hear, even when the domain makes it plausible.
- If the audio is only silence, breathing, background noise, or music, return the empty result — do NOT produce "Здравствуйте"/"안녕하세요" or any filler phrase.
- When in doubt, output LESS. A short faithful fragment is correct; a fluent invented sentence is a failure.`;

const transcribeOnlyPrompt = () => `${DOMAIN_PRIMING}
Transcribe the speech in this audio clip. The speaker is speaking Korean (may include code-switching) during a medical consultation. Output ONLY the transcript in the original language(s), nothing else. OMIT hesitation fillers (e.g. "음", "어", "그…", "uh", "um", "э-э", "ну", "えっと") but keep all meaningful words and proper nouns exactly.
${NO_INVENTION}
If there is no clear human speech, or the speech is ONLY hesitation fillers, output exactly: [NO_SPEECH]`;

const jsonPrompt = () => `${DOMAIN_PRIMING}
The speaker most likely speaks Korean, but this microphone may be shared by people speaking different languages — DETECT the language actually spoken (candidates: Korean ko, Russian ru, English en, Kazakh kz, Chinese zh, Japanese ja; prefer Korean/Russian when ambiguous).
1. Transcribe the speech verbatim in the original language(s), but OMIT hesitation fillers.
2. If the detected language is already Russian, set "x" to the transcript itself (do NOT translate). Otherwise translate the transcript into Russian — formal/polite register, standard medical terminology, concise (for real-time subtitles).
${NO_INVENTION}
Respond with ONLY this JSON on one line, no markdown, no code fences:
{"t":"<transcript>","x":"<translation>","l":"<detected language code>"}
If there is no clear human speech, or the speech is ONLY hesitation fillers with no content, respond exactly: {"t":"","x":"","l":""}`;

// ── WAV 읽기 (16bit PCM 모노) ────────────────────────────────────────────────
function readWav(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF") throw new Error("RIFF 아님");
  let pos = 12;
  let fmt = null;
  let data = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = buf.subarray(pos + 8, pos + 8 + size);
    if (id === "fmt ") fmt = { channels: body.readUInt16LE(2), rate: body.readUInt32LE(4), bits: body.readUInt16LE(14) };
    if (id === "data") data = body;
    pos += 8 + size + (size % 2); // 청크는 짝수 경계
  }
  if (!fmt || !data) throw new Error("fmt/data 청크 없음");
  if (fmt.bits !== 16 || fmt.channels !== 1) throw new Error(`16bit 모노만 지원 (지금: ${fmt.bits}bit ${fmt.channels}ch)`);
  const samples = new Int16Array(data.length >> 1);
  for (let i = 0; i < samples.length; i++) samples[i] = data.readInt16LE(i * 2);
  return { rate: fmt.rate, samples };
}

function writeWav(samples, rate) {
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + samples.length * 2, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(samples.length * 2, 40);
  const body = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) body.writeInt16LE(samples[i], i * 2);
  return Buffer.concat([head, body]);
}

/** 상담방 화면(page.jsx)과 같은 방식의 음량 — 100ms 프레임 최대 RMS. */
function peakRms(samples, rate) {
  const frame = Math.floor(rate * 0.1);
  let peak = 0;
  for (let s = 0; s + frame <= samples.length; s += frame) {
    let sum = 0;
    for (let i = s; i < s + frame; i++) {
      const v = samples[i] / 32768;
      sum += v * v;
    }
    peak = Math.max(peak, Math.sqrt(sum / frame));
  }
  return peak;
}

/** 말이 있는 구간을 자동으로 찾는다 — README 의 무음 0.8~1.0초가 경계. */
function findSpeechSpans({ samples, rate }) {
  const frame = Math.floor(rate * 0.02);
  const loud = [];
  for (let s = 0; s + frame <= samples.length; s += frame) {
    let sum = 0;
    for (let i = s; i < s + frame; i++) {
      const v = samples[i] / 32768;
      sum += v * v;
    }
    loud.push(Math.sqrt(sum / frame) > 0.02);
  }
  // 문장 «사이» 무음은 0.8~1.0초(README), 문장 «안» 쉼표 호흡은 그보다 짧다.
  // 0.5초로 잡았더니 "안녕하세요."가 따로 떨어져 나와 대본 대조가 통째로 어긋났다(2026-08-07).
  const gapFrames = Math.ceil(0.7 / 0.02);
  const spans = [];
  let start = null;
  let quiet = 0;
  for (let i = 0; i < loud.length; i++) {
    if (loud[i]) {
      if (start === null) start = i;
      quiet = 0;
    } else if (start !== null && ++quiet >= gapFrames) {
      spans.push([start * frame, (i - quiet) * frame]);
      start = null;
    }
  }
  if (start !== null) spans.push([start * frame, samples.length]);
  return spans;
}

// ── 조각 만들기 ──────────────────────────────────────────────────────────────
function buildClips(wav) {
  const { samples, rate } = wav;
  const spans = findSpeechSpans(wav);
  // 대본은 두 문장이다(README). 다르게 잡히면 대조가 통째로 어긋나므로 여기서 멈춘다 —
  // 조용히 틀린 숫자를 내는 것보다 낫다.
  if (spans.length !== 2) {
    throw new Error(
      `말 구간이 2개여야 하는데 ${spans.length}개로 잡혔다 (${spans
        .map(([a, b]) => `${(a / rate).toFixed(2)}~${(b / rate).toFixed(2)}초`)
        .join(", ")}) — 소리 파일이 바뀌었거나 경계 판정을 손봐야 한다`
    );
  }
  const clips = [];
  const cut = (a, b) => samples.slice(Math.max(0, a), Math.min(samples.length, b));

  // ① 무음 — 파일 맨 앞(README: 앞뒤 무음 0.8~1.0초)
  clips.push({ name: "무음(앞)", kind: "silent", samples: cut(0, Math.floor(rate * 0.8)) });
  // ② 무음 — 두 문장 사이
  clips.push({ name: "무음(사이)", kind: "silent", samples: cut(spans[0][1] + rate * 0.1, spans[1][0] - rate * 0.1) });
  // ③ 잡음 — 사무실 소음 흉내. 화면 문턱(0.014)을 «넘는» 크기로 만든다.
  //    실측 근거: 순수 잡음 0.021 이 문턱을 통과했다(2026-08-06). 이게 실사용에서 새는 구간이다.
  const noiseLen = Math.floor(rate * 1.5);
  const noise = new Int16Array(noiseLen);
  let seed = 12345; // 고정 씨앗 — 돌릴 때마다 같은 잡음이라야 비교가 된다
  for (let i = 0; i < noiseLen; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    noise[i] = Math.round(((seed / 0x7fffffff) * 2 - 1) * 0.03 * 32768);
  }
  clips.push({ name: "잡음(문턱통과)", kind: "silent", samples: noise });
  // ④⑤ 말 — 대본을 아는 두 문장
  clips.push({ name: "말1(위암 수술)", kind: "speech", samples: cut(...spans[0]), expect: ["위암", "두 달"] });
  clips.push({ name: "말2(회복 기간)", kind: "speech", samples: cut(...spans[1]), expect: ["회복", "기간"] });
  // ⑥ 잡음에 묻힌 말 — 실회의를 흉내낸다.
  //   왜 필요했나 (2026-08-07): 깨끗한 소리에선 「위암」이 5/5 정확한데, 실제 통화 기록에선
  //   같은 문장이 「**이식** 수술」로 바뀌어 저장됐다. 즉 깨끗한 조각만 재면 이 사고를 못 잡는다.
  //   병명이 바뀌는 건 의료 기록에서 창작보다 위험할 수 있다 — 그래서 재현 조건을 만든다.
  const mixNoise = (src, amp) => {
    const out = new Int16Array(src.length);
    let s = 777; // 고정 씨앗 — 돌릴 때마다 같은 잡음이라야 비교가 된다
    for (let i = 0; i < src.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const n = ((s / 0x7fffffff) * 2 - 1) * amp * 32768;
      out[i] = Math.max(-32768, Math.min(32767, Math.round(src[i] + n)));
    }
    return out;
  };
  const speech1 = cut(...spans[0]);
  clips.push({ name: "말1+잡음(약)", kind: "speech", samples: mixNoise(speech1, 0.02), expect: ["위암"] });
  clips.push({ name: "말1+잡음(강)", kind: "speech", samples: mixNoise(speech1, 0.06), expect: ["위암"] });

  // ⑦ 잘린 말 — 앞 문장의 절반. 뒤를 «완성»하면 창작이다.
  const [s0, e0] = spans[0];
  clips.push({ name: "잘린 말1(앞 절반)", kind: "fragment", samples: cut(s0, s0 + Math.floor((e0 - s0) / 2)), forbid: ["되었습니다", "됐습니다"] });

  // ⑧ 실제 통화가 거치는 «두 번 압축» — 여기가 깨끗한 시험과 실회의의 진짜 차이다.
  //   실제 경로: 내 마이크 → LiveKit 이 opus 로 압축 → 상대가 풀기 → 상대 브라우저가
  //   MediaRecorder 로 webm/opus 로 «다시» 압축 → 서버. 압축을 두 번 거친 소리가 모델에 간다.
  //   이 측정기는 그동안 무압축 WAV 를 보내고 있었다 = 실회의보다 훨씬 좋은 조건이었다.
  //   ffmpeg 이 없으면 이 조각들만 조용히 건너뛴다(나머지 측정은 그대로 된다).
  if (hasFfmpeg()) {
    for (const kbps of [32, 16]) {
      const webm = toOpusWebm(writeWav(speech1, rate), kbps);
      if (webm) {
        clips.push({
          name: `말1·2번압축 ${kbps}kbps`,
          kind: "speech",
          samples: speech1,
          expect: ["위암"],
          blob: webm,
          mediaType: "audio/webm",
        });
      }
    }
  } else {
    console.log("※ ffmpeg 이 없어 「두 번 압축」 조각은 건너뛴다 (나머지는 그대로 잰다)\n");
  }

  return clips.map((c) => ({
    ...c,
    rms: peakRms(c.samples, rate),
    wav: c.blob ?? writeWav(c.samples, rate),
    mediaType: c.mediaType ?? "audio/wav",
  }));
}

function hasFfmpeg() {
  return spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
}

/** WAV → opus(webm) 2회 왕복. 실패하면 null (측정 전체를 죽이지 않는다). */
function toOpusWebm(wavBuf, kbps) {
  const dir = mkdtempSync(path.join(tmpdir(), "stt-"));
  try {
    let input = path.join(dir, "in.wav");
    writeFileSync(input, wavBuf);
    // 1차: LiveKit 이 실어 보내는 압축
    const pass1 = path.join(dir, "p1.webm");
    if (spawnSync("ffmpeg", ["-y", "-i", input, "-c:a", "libopus", "-b:a", `${kbps}k`, "-ac", "1", pass1], { stdio: "ignore" }).status !== 0)
      return null;
    // 2차: 받는 쪽 브라우저가 다시 녹음하며 거는 압축
    const pass2 = path.join(dir, "p2.webm");
    if (spawnSync("ffmpeg", ["-y", "-i", pass1, "-c:a", "libopus", "-b:a", `${kbps}k`, "-ac", "1", pass2], { stdio: "ignore" }).status !== 0)
      return null;
    return readFileSync(pass2);
  } catch {
    return null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ── 실행 ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const repeat = Number(args[args.indexOf("--repeat") + 1]) || 3;
const mode = args.includes("--mode") ? args[args.indexOf("--mode") + 1] : "transcribe";
const modelId = args.includes("--model") ? args[args.indexOf("--model") + 1] : "gemini-flash-latest";
// --agree: 라우트에 넣은 «두 번 물어 대조» 거르개를 켜고 잰다 (호출 수가 2배가 된다).
const agreeMode = args.includes("--agree");

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  console.error("GOOGLE_GENERATIVE_AI_API_KEY 가 없다. `node --env-file=.env.local scripts/measure-stt-invention.mjs` 로 돌려라.");
  process.exit(1);
}
const google = createGoogleGenerativeAI({ apiKey });

const norm = (s) => s.replace(/[\s.,!?…"'·]/g, "");

/** 거르개는 라우트가 쓰는 그 부품을 그대로 쓴다 — 여기서 베끼면 둘이 갈라진다. */
const similarity = transcriptSimilarity;

/** 조각 1개 → 모델 1회 호출 → 전사문. 오류는 «__오류__» 로 표시해 위에서 센다. */
async function callOnce(clip) {
  try {
    const { text } = await generateText({
      model: google(modelId),
      temperature: 0,
      maxOutputTokens: mode === "json" ? 800 : 400,
      messages: [
        {
          role: "user",
          content: [
            { type: "file", data: clip.wav, mediaType: clip.mediaType },
            { type: "text", text: mode === "json" ? jsonPrompt() : transcribeOnlyPrompt() },
          ],
        },
      ],
    });
    return extractTranscript(text);
  } catch (e) {
    return `__오류__ ${String(e?.message || e).slice(0, 60)}`;
  }
}

/** 응답들끼리 둘씩 모두 비교한 평균 닮음. 응답이 1개면 잴 수 없다(null). */
function meanPairSimilarity(list) {
  if (list.length < 2) return null;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      sum += similarity(list[i], list[j]);
      n++;
    }
  }
  return sum / n;
}

/** 모델 응답에서 «전사문»만 뽑는다 — 라우트와 같은 규칙. */
function extractTranscript(text) {
  const raw = (text || "").trim();
  if (mode === "json") {
    const m = raw.replace(/```(?:json)?/g, "").trim().match(/\{[\s\S]*\}/);
    if (!m) return "";
    try {
      return String(JSON.parse(m[0]).t || "").trim();
    } catch {
      return "";
    }
  }
  return raw === "[NO_SPEECH]" ? "" : raw;
}

const clips = buildClips(readWav(readFileSync(WAV)));

console.log(`\n소리 파일: ${path.relative(process.cwd(), WAV)}`);
console.log(`모델: ${modelId} · 경로: ${mode === "json" ? "전사+번역 합침" : "전사만"} · 조각당 ${repeat}회\n`);
console.log("조각                 음량   문턱   반복시 답 갈림      결과");
console.log("─".repeat(88));

const rows = [];
for (const clip of clips) {
  const outs = [];
  for (let i = 0; i < repeat; i++) {
    // --agree: 라우트와 «같은» 방식으로 잰다 — 두 번 물어 답이 닮았을 때만 채택.
    if (agreeMode) {
      const [a, b] = await Promise.all([callOnce(clip), callOnce(clip)]);
      if (a.startsWith("__오류__") || b.startsWith("__오류__")) outs.push(a.startsWith("__오류__") ? a : b);
      else outs.push(transcriptsAgree(a, b) ? a : "");
      continue;
    }
    try {
      const { text } = await generateText({
        model: google(modelId),
        temperature: 0,
        maxOutputTokens: mode === "json" ? 800 : 400,
        messages: [
          {
            role: "user",
            content: [
              { type: "file", data: clip.wav, mediaType: clip.mediaType },
              { type: "text", text: mode === "json" ? jsonPrompt() : transcribeOnlyPrompt() },
            ],
          },
        ],
      });
      outs.push(extractTranscript(text));
    } catch (e) {
      outs.push(`__오류__ ${String(e?.message || e).slice(0, 60)}`);
    }
  }

  const errors = outs.filter((o) => o.startsWith("__오류__")).length;
  const ok = outs.filter((o) => !o.startsWith("__오류__"));
  let verdict;
  if (clip.kind === "silent") {
    const invented = ok.filter((o) => o.length > 0);
    verdict = { bad: invented.length, total: ok.length, label: "창작", samples: invented };
  } else if (clip.kind === "speech") {
    const missed = ok.filter((o) => !clip.expect.every((w) => o.includes(w)));
    verdict = { bad: missed.length, total: ok.length, label: "핵심낱말 유실", samples: missed };
  } else {
    const completed = ok.filter((o) => clip.forbid.some((w) => o.includes(w)));
    verdict = { bad: completed.length, total: ok.length, label: "잘린 문장 완성", samples: completed };
  }

  // 같은 조각을 여러 번 물었을 때 «같은 답»이 오나.
  // 왜 재나: 창작은 부를 때마다 다른 문장이 나오고(무에서 짓는 것이라 고정될 게 없다),
  //   진짜 말은 매번 같은 문장이 나온다. 이 차이가 크면 «두 번 불러 다르면 버린다»로
  //   지어냄을 걸러낼 수 있다 — 프롬프트로 부탁하는 대신 구조로 막는 길이다.
  const distinct = new Set(ok.map(norm)).size;
  // 「같다/다르다」만으론 문턱을 못 정한다 — 잘린 말은 진짜인데도 답이 갈린다(끝 글자 차이).
  // 그래서 «얼마나 닮았나»(글자 두 개씩 겹치는 비율)를 재서 창작과 겹치지 않는 선을 찾는다.
  const sim = meanPairSimilarity(ok);
  const agree =
    ok.length > 1 ? `${distinct}가지·닮음${sim === null ? "-" : sim.toFixed(2)}` : "-";

  // 거르개의 «대가» — 진짜 말인데 통째로 버려진 횟수. 창작을 0으로 만들어도
  // 여기가 커지면 자막이 뚝뚝 끊긴다. 좋아진 것만 세고 잃은 것을 안 세면 거짓 보고가 된다.
  const dropped = clip.kind === "silent" ? 0 : ok.filter((o) => o.length === 0).length;

  const passes = clip.rms > 0.014 ? "통과" : "막힘";
  const pct = verdict.total ? Math.round((verdict.bad / verdict.total) * 100) : 0;
  console.log(
    `${clip.name.padEnd(20)} ${clip.rms.toFixed(3)}  ${passes.padEnd(6)} ${agree.padEnd(12)} ${verdict.label} ${verdict.bad}/${verdict.total} (${pct}%)${dropped ? ` · ⚠️진짜 말 버림 ${dropped}/${verdict.total}` : ""}${errors ? ` · 호출오류 ${errors}` : ""}`
  );
  for (const s of verdict.samples.slice(0, 3)) console.log(`${" ".repeat(22)}└ "${s.slice(0, 60)}"`);
  rows.push({ clip, verdict, passes, dropped });
}

console.log("─".repeat(88));
const leaky = rows.filter((r) => r.clip.kind === "silent" && r.passes === "통과");
const leakBad = leaky.reduce((a, r) => a + r.verdict.bad, 0);
const leakAll = leaky.reduce((a, r) => a + r.verdict.total, 0);
console.log(
  `실사용에서 새는 양 = «화면 문턱을 통과하는 말 없는 조각»의 창작률: ${leakBad}/${leakAll}` +
    (leakAll ? ` (${Math.round((leakBad / leakAll) * 100)}%)` : " — 해당 조각 없음")
);
const dropAll = rows.reduce((a, r) => a + r.dropped, 0);
const speechTrials = rows.filter((r) => r.clip.kind !== "silent").reduce((a, r) => a + r.verdict.total, 0);
console.log(`거르개가 치른 대가 = «진짜 말인데 버려진» 비율: ${dropAll}/${speechTrials}` + (speechTrials ? ` (${Math.round((dropAll / speechTrials) * 100)}%)` : ""));
console.log("※ 「막힘」 줄은 상담방 화면이 서버로 안 보내는 조각이라 실사용엔 안 샌다(모델 특성 참고용).\n");
