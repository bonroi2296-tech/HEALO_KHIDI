/**
 * HIRA 데이터 영문 번역 스크립트 (Google Gemini Flash)
 *
 * 사전 조건:
 *   .env.local에 GOOGLE_GENERATIVE_AI_API_KEY 설정
 *
 * 사용법:
 *   node scripts/enrich-translate.cjs --input output/hira-import-nationwide-all-20260223.json
 *   node scripts/enrich-translate.cjs --input output/hira-import-nationwide-all-20260223.json --limit 10
 *   node scripts/enrich-translate.cjs --input output/hira-import-nationwide-all-20260223.json --resume
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");

// --key for GOOGLE_GENERATIVE_AI_API_KEY (AIza*)
const cliKeyIdx = process.argv.indexOf("--key");
const GEMINI_KEY = cliKeyIdx !== -1 ? process.argv[cliKeyIdx + 1] : process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!GEMINI_KEY) {
  console.error("API 키가 필요합니다:");
  console.error("  --key <KEY>   (Google AI API Key, AIza* 형식)");
  console.error("  .env.local의 GOOGLE_GENERATIVE_AI_API_KEY");
  process.exit(1);
}

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_KEY}`;
const BATCH_SIZE = 10;
const REQUEST_DELAY_MS = 4500;
const MAX_RETRIES = 5;

// ============================================================
// CLI
// ============================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { input: null, limit: null, resume: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && args[i + 1]) opts.input = args[++i];
    else if (args[i] === "--limit" && args[i + 1]) opts.limit = parseInt(args[++i], 10);
    else if (args[i] === "--key" && args[i + 1]) { i++; continue; }
    else if (args[i] === "--resume") opts.resume = true;
  }
  if (!opts.input) {
    console.error("사용법: node scripts/enrich-translate.cjs --input <파일경로> [--limit N] [--resume]");
    process.exit(1);
  }
  return opts;
}

// ============================================================
// Gemini API
// ============================================================

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const SYSTEM_PROMPT = `You are a medical translation assistant for a medical tourism platform called HEALO.
Translate Korean hospital data to English for international medical tourists.

RULES:
- "name_en": Use official English name if well-known (e.g. "서울대학교병원" → "Seoul National University Hospital", "세브란스병원" → "Severance Hospital"), otherwise romanize naturally (e.g. "미앤미성형외과" → "Me & Me Plastic Surgery Clinic").
- "addr_en": Convert Korean address to English. Use standard romanization with district names. Format: "[Street/Number], [District]-gu, [City]". Example: "서울특별시 강남구 테헤란로 152" → "152 Teheran-ro, Gangnam-gu, Seoul".
- "desc_en": Write a natural 1-2 sentence English description for international patients. Mention the hospital type, key specialties, and location. Do NOT just translate the raw metadata string. Make it sound professional and welcoming.
- "tags_en": Translate each tag to English. Korean medical specialty names should use standard medical English. Region names should be romanized. Hospital type tags like "상급종합" → "Tertiary Hospital", "종합병원" → "General Hospital", "의원" → "Clinic", "병원" → "Hospital".
- "specs_en": Translate each specialty to standard medical English. Common mappings: "성형외과"→"Plastic Surgery", "피부과"→"Dermatology", "치과"→"Dentistry", "안과"→"Ophthalmology", "한방내과"→"Korean Internal Medicine", "한방부인과"→"Korean OB/GYN", "한방소아과"→"Korean Pediatrics", "정형외과"→"Orthopedics", "내과"→"Internal Medicine", "외과"→"General Surgery", "산부인과"→"OB/GYN", "소아청소년과"→"Pediatrics", "이비인후과"→"ENT", "비뇨기과"→"Urology", "신경외과"→"Neurosurgery", "흉부외과"→"Cardiothoracic Surgery", "재활의학과"→"Rehabilitation Medicine".

Return ONLY a valid JSON array. Each element must have: { "i": <index>, "name_en": "...", "addr_en": "...", "desc_en": "...", "tags_en": [...], "specs_en": [...] }`;

function buildUserMessage(batch) {
  const compact = batch.map((h, i) => ({
    i,
    name: h.name,
    addr: h.location_kr,
    desc: h.description,
    tags: h.tags,
    specs: h.specialties,
  }));
  return `Translate these ${compact.length} hospitals:\n${JSON.stringify(compact)}`;
}

function buildGeminiBody(batch) {
  return {
    contents: [
      { role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + buildUserMessage(batch) }] },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 16384,
      responseMimeType: "application/json",
    },
  };
}

function safeParseJsonArray(raw) {
  let text = raw.trim();
  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  try {
    return JSON.parse(text);
  } catch {
    // Try to repair truncated JSON by closing open brackets
    let repaired = text;
    const opens = (repaired.match(/\[/g) || []).length;
    const closes = (repaired.match(/\]/g) || []).length;
    if (opens > closes) {
      // Trim back to last complete object
      const lastBrace = repaired.lastIndexOf("}");
      if (lastBrace > 0) {
        repaired = repaired.substring(0, lastBrace + 1);
        for (let n = 0; n < opens - closes; n++) repaired += "]";
      }
    }
    try {
      return JSON.parse(repaired);
    } catch {
      throw new Error(`JSON parse failed: ${text.slice(0, 100)}`);
    }
  }
}

async function callLLM(batch, attempt = 1) {
  try {
    const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildGeminiBody(batch)),
      });

      if (res.status === 429 || res.status === 503) {
        if (attempt <= MAX_RETRIES) {
          const retryAfter = res.headers.get("retry-after");
          const wait = retryAfter ? parseInt(retryAfter) * 1000 : 15000 * attempt;
          console.log(`\n  Rate limited, ${Math.round(wait / 1000)}초 대기 후 재시도 (${attempt}/${MAX_RETRIES})...`);
          await sleep(wait);
          return callLLM(batch, attempt + 1);
        }
        throw new Error(`Rate limited after ${MAX_RETRIES} retries`);
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini ${res.status}: ${errText.slice(0, 300)}`);
      }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty Gemini response");

    const parsed = safeParseJsonArray(text);
    if (!Array.isArray(parsed)) throw new Error("Response is not an array");
    return parsed;
  } catch (err) {
    if (attempt <= MAX_RETRIES && !err.message.includes("after")) {
      const wait = 10000 * attempt;
      console.log(`\n  오류 (${attempt}/${MAX_RETRIES}): ${err.message.slice(0, 120)}`);
      await sleep(wait);
      return callLLM(batch, attempt + 1);
    }
    throw err;
  }
}

// ============================================================
// 번역 결과 병합
// ============================================================

function applyTranslations(hospitals, translations) {
  const map = new Map();
  for (const t of translations) {
    map.set(t.i, t);
  }

  return hospitals.map((h, idx) => {
    const t = map.get(idx);
    if (!t) return h;

    return {
      ...h,
      name: t.name_en || h.name,
      location_en: t.addr_en || null,
      description: t.desc_en || h.description,
      tags: t.tags_en && t.tags_en.length > 0 ? t.tags_en : h.tags,
      specialties: t.specs_en && t.specs_en.length > 0 ? t.specs_en : h.specialties,
      supported_languages: ["Korean", "English"],
      _original_kr: {
        name: h.name,
        description: h.description,
        tags: h.tags,
        specialties: h.specialties,
      },
    };
  });
}

// ============================================================
// 메인
// ============================================================

async function main() {
  const opts = parseArgs();
  const startTime = Date.now();

  const inputPath = path.resolve(opts.input);
  if (!fs.existsSync(inputPath)) {
    console.error(`파일을 찾을 수 없습니다: ${inputPath}`);
    process.exit(1);
  }

  console.log("=== HIRA 데이터 영문 번역 ===\n");
  console.log(`LLM: Google Gemini Flash`);
  console.log(`입력: ${inputPath}`);

  const allData = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  let hospitals = opts.limit ? allData.slice(0, opts.limit) : allData;
  console.log(`대상: ${hospitals.length}건 (전체 ${allData.length}건)\n`);

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const outputDir = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const checkpointPath = path.join(outputDir, `translate-checkpoint-${dateStr}.json`);

  let startIdx = 0;
  let translated = [];

  if (opts.resume && fs.existsSync(checkpointPath)) {
    const cp = JSON.parse(fs.readFileSync(checkpointPath, "utf-8"));
    startIdx = cp.processedCount || 0;
    translated = cp.translations || [];
    console.log(`체크포인트 복구: ${startIdx}건 이미 처리됨\n`);
  }

  const totalBatches = Math.ceil((hospitals.length - startIdx) / BATCH_SIZE);
  let batchNum = 0;
  let errors = 0;

  for (let i = startIdx; i < hospitals.length; i += BATCH_SIZE) {
    batchNum++;
    const batch = hospitals.slice(i, i + BATCH_SIZE);
    const progress = `[${batchNum}/${totalBatches}] ${i + 1}~${Math.min(i + BATCH_SIZE, hospitals.length)}/${hospitals.length}`;

    process.stdout.write(`${progress} 번역 중...`);

    try {
      const results = await callLLM(batch);
      for (const r of results) {
        r.i = r.i + i;
      }
      translated.push(...results);
      process.stdout.write(` 완료 (${results.length}건)\n`);
    } catch (err) {
      errors++;
      process.stdout.write(` 실패: ${err.message.slice(0, 100)}\n`);
      for (let j = 0; j < batch.length; j++) {
        translated.push({
          i: i + j,
          name_en: null,
          addr_en: null,
          desc_en: null,
          tags_en: null,
          specs_en: null,
        });
      }
    }

    if (batchNum % 5 === 0) {
      fs.writeFileSync(
        checkpointPath,
        JSON.stringify({ processedCount: i + BATCH_SIZE, translations: translated }, null, 0),
        "utf-8"
      );
    }

    await sleep(REQUEST_DELAY_MS);
  }

  fs.writeFileSync(
    checkpointPath,
    JSON.stringify({ processedCount: hospitals.length, translations: translated }, null, 0),
    "utf-8"
  );

  console.log(`\n번역 완료: ${translated.length}건 (오류 배치 ${errors}건)\n`);

  const result = applyTranslations(hospitals, translated);

  const baseName = path.basename(opts.input, ".json");
  const outputPath = path.join(outputDir, `${baseName}-translated-${dateStr}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");

  const cleanResult = result.map((h) => {
    const { _original_kr, ...clean } = h;
    return clean;
  });
  const cleanPath = path.join(outputDir, `${baseName}-translated-clean-${dateStr}.json`);
  fs.writeFileSync(cleanPath, JSON.stringify(cleanResult, null, 2), "utf-8");

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const successCount = translated.filter((t) => t.name_en).length;

  console.log("=== 결과 ===");
  console.log(`번역 성공: ${successCount}/${hospitals.length}건`);
  console.log(`오류 배치: ${errors}건`);
  console.log(`소요 시간: ${elapsed}초`);
  console.log(`전체 출력: ${outputPath}`);
  console.log(`Import용 출력: ${cleanPath}`);
  console.log(`체크포인트: ${checkpointPath}`);
}

main().catch((err) => {
  console.error("\n치명적 오류:", err);
  process.exit(1);
});
