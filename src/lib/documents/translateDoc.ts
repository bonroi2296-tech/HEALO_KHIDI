/**
 * healwith: 외국 의료서류 → 한국어 "충실 번역" (요약 아님)
 *
 * 코디가 인박스에서 러시아어·카자흐어 등 외국 검사지/진료기록을 열 때,
 * 한국 병원 의료진이 그대로 읽을 수 있게 원문을 1:1로 한국어로 옮긴다.
 *
 * ⚠️ 설계 원칙 (PO 결정 2026-07-07 — 요약하면 놓칠 수 있다):
 *   - 요약·해석·진단 금지. 검사지의 모든 행을 그대로 옮긴다.
 *   - 숫자·단위·정상범위·날짜·ID·라틴 약어(HGB·RBC…)는 원문 그대로 복사(번역·수정 금지).
 *     번역하는 것은 "사람 언어로 된 항목 이름"뿐 → 한국 의료진이 원본과 대조 가능.
 *   - 원본 파일은 항상 별도 보존(이 번역은 덧붙임이지 대체가 아님).
 *
 * triage.ts 와 동일한 Gemini REST(inlineData) 경로 + logAiUsage 계측을 재사용.
 */

import "server-only";

import { supabaseAdmin } from "../rag/supabaseAdmin";
import { logAiUsage } from "@/lib/ai/usageLog";
import { glossaryBlock, type DocLang, type GlossaryEntry } from "./medicalGlossary";
import type { Json } from "@/types/database.types";

export type { DocLang };

const MODEL = "gemini-flash-latest";

// 출력 언어별 설정. 코디=한글 / 병원의뢰=영문 / 환자·에이전시=러시아어(#37 키르기스 등 CIS).
const LANG_NAME: Record<DocLang, string> = { ko: "KOREAN", en: "ENGLISH", ru: "RUSSIAN" };
const COLUMNS: Record<DocLang, string[]> = {
  ko: ["항목(원문)", "항목(한글)", "결과", "정상범위", "단위"],
  en: ["Item (original)", "Item (English)", "Result", "Reference range", "Unit"],
  ru: ["Показатель (ориг.)", "Показатель (рус.)", "Результат", "Референсные значения", "Ед.изм."],
};
const UNREADABLE: Record<DocLang, string> = { ko: "(원문 판독 불가)", en: "(unreadable in source)", ru: "(не читается в оригинале)" };
const DEFAULT_DOCTYPE: Record<DocLang, string> = { ko: "의료서류", en: "Medical document", ru: "Медицинский документ" };

function normalizeLang(v: unknown): DocLang {
  return v === "en" || v === "ru" ? v : "ko";
}

// Gemini inlineData 로 직접 판독 가능한 타입만(이미지 + PDF). doc/docx 는 모델이 못 읽음.
const MODEL_READABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
const MAX_BYTES = 18 * 1024 * 1024; // 원본 상한(~18MB)

/** 파일명/경로 확장자로 MIME 추정 (첨부 메타에 type 이 없을 때 폴백). */
export function inferMimeFromName(name: string): string | null {
  const ext = (name.split(".").pop() || "").toLowerCase();
  switch (ext) {
    case "pdf": return "application/pdf";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    default: return null;
  }
}

export type TranslatedSection = {
  title: string;            // 한국어 소제목 (원문 병기 가능)
  note?: string;            // 부가 맥락(환자·검사일·검사실 등), 한국어
  columns?: string[];       // 표 헤더 (예: 항목(원문)·항목(한글)·결과·정상범위·단위)
  rows?: { cells: string[] }[]; // 표 각 행(원문 값은 그대로)
  text?: string;            // 자유서술 블록(한국어 번역)
};

export type TranslatedDoc = {
  docTypeShort: string;     // chip 용 짧은 종류: "혈액검사"
  docType: string;          // 전체 종류: "일반혈액검사 (OAK/CBC)"
  sections: TranslatedSection[];
};

export type TranslateResult =
  | { ok: true; doc: TranslatedDoc }
  | { ok: false; error: string };

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    docTypeShort: { type: "string" },
    docType: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          note: { type: "string" },
          columns: { type: "array", items: { type: "string" } },
          rows: {
            type: "array",
            items: {
              type: "object",
              properties: { cells: { type: "array", items: { type: "string" } } },
              required: ["cells"],
            },
          },
          text: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  required: ["docTypeShort", "docType", "sections"],
};

function buildPrompt(lang: DocLang, learned: GlossaryEntry[] = []): string {
  const T = LANG_NAME[lang];             // 대상 언어(대문자)
  const cols = COLUMNS[lang];            // 표 헤더(대상 언어)
  const colList = cols.map((c) => `'${c}'`).join(",");
  const unread = UNREADABLE[lang];       // 판독불가 표기(대상 언어)
  const labelCol = cols[1];              // 번역 라벨이 들어가는 열 이름
  const glossary = glossaryBlock(lang, learned); // 씨앗+학습 용어 사전(대상 언어)

  return [
    "You are a medical document translator for healwith, a Korea-based medical-tourism platform.",
    "A coordinator uploaded a foreign-language medical document (Russian/Kazakh/other) that must be handed to doctors or the patient.",
    `Your job is a FAITHFUL, COMPLETE translation into ${T} — NOT a summary.`,
    "",
    "HARD RULES (a summary could drop something clinically important — do not summarize):",
    "1. Translate EVERY line/row/field. Do NOT omit, merge, reorder, or summarize anything.",
    "2. Preserve ALL numbers, units, reference ranges, dates, IDs, and Latin abbreviations (HGB, RBC, WBC, PLT, MCV, СОЭ→ESR, etc.) EXACTLY as in the source — copy them character-for-character. NEVER guess, round, or 'correct' a value. If unsure of a digit, copy what you see verbatim.",
    `3. Translate ONLY the human-language label text (the Russian/Kazakh medical term) into ${T}. Keep the source term in parentheses where useful so doctors can cross-check.`,
    "4. Do NOT add any diagnosis, interpretation, opinion, or clinical advice. This is a translation, not a reading.",
    "5. COMPLETENESS — read EVERY page of the document. Any section that contains results, findings, or measurements in the source MUST include those values. NEVER output a section that has only a header/patient info and no results. Concretely: for a smear/microscopy, transcribe every measured value (leukocytes, flora, epithelium, etc.); for an infection/STI PCR panel, list EVERY pathogen tested with its positive/negative (or detected/not-detected) result; for any quantitative assay, give every value. A section with a results table in the source but empty results in your output is a FAILURE.",
    `6. UNREADABLE ≠ OMIT — if a value or line is too faint, blurred, cropped, or handwritten to read with confidence, write '${unread}' in its place. NEVER silently drop it. Flagging an unreadable value is far safer than leaving it out.`,
    glossary ? "" : null,
    glossary ? `GLOSSARY — for these source terms, use EXACTLY this ${T} translation (respect any [note]):` : null,
    glossary || null,
    "",
    "OUTPUT (JSON):",
    `- docTypeShort: a SHORT ${T} chip label for the document type (blood test, urine test, cytology, imaging, medical record, pathology, ...).`,
    `- docType: fuller ${T} type with the source name in parentheses (e.g. for a CBC: '일반혈액검사 (OAK/CBC)' in Korean, or the equivalent in ${T}).`,
    "- sections: array. For each logical block of the document, one section:",
    `   • For lab result tables → set \`columns\` and \`rows\`. Use columns [${colList}]. Put the original parameter name in the first column, the ${T} translation in the '${labelCol}' column, and copy result/reference-range/unit VERBATIM from the source. One row per source line — do not drop rows.`,
    `   • For free-text blocks (impressions, notes, headers with patient/date/lab info) → set \`text\` to the faithful ${T} translation (keep numbers/dates verbatim). Use \`note\` for context lines like patient name, date of birth, lab name.`,
    `   • \`title\`: a short ${T} heading for the section (source term in parentheses if helpful).`,
    "",
    "Return ONLY the JSON object.",
  ].filter((l) => l !== null).join("\n");
}

const CACHE_TABLE = "attachment_translations";
const GLOSSARY_TABLE = "doc_glossary_terms";

/** 캐시 조회 → 코디 수정본(edited_doc) 우선, 없으면 모델 원출력(doc). 없으면 null. */
async function readCache(path: string, lang: DocLang): Promise<TranslatedDoc | null> {
  try {
    const { data } = await supabaseAdmin
      .from(CACHE_TABLE)
      .select("doc, edited_doc")
      .eq("path", path).eq("lang", lang)
      .maybeSingle();
    const doc = (data?.edited_doc || data?.doc) as TranslatedDoc | undefined;
    return doc && Array.isArray(doc.sections) ? doc : null;
  } catch {
    return null; // 캐시는 최적화일 뿐 — 실패해도 번역은 진행
  }
}

/** 캐시 저장(upsert). 강제 재변환이면 기존 코디 수정본을 비운다(재변환=새 출발). */
async function writeCache(path: string, lang: DocLang, doc: TranslatedDoc, force: boolean): Promise<void> {
  try {
    const row = {
      path, lang, doc: doc as unknown as Json, model: MODEL, updated_at: new Date().toISOString(),
      ...(force ? { edited_doc: null, edited_by: null, edited_at: null } : {}),
    };
    await supabaseAdmin.from(CACHE_TABLE).upsert(row, { onConflict: "path,lang" });
  } catch { /* 캐시 실패는 무시 */ }
}

/** 학습 용어사전(코디 수정에서 축적) 로드 → 프롬프트 병합용. */
async function fetchLearnedGlossary(): Promise<GlossaryEntry[]> {
  try {
    const { data } = await supabaseAdmin
      .from(GLOSSARY_TABLE)
      .select("src, ko, en, ru, note")
      .order("created_at", { ascending: false })
      .limit(500);
    return (data || []).map((r: any) => ({
      src: [String(r.src)], ko: r.ko || "", en: r.en || "", ru: r.ru || "", note: r.note || undefined,
    }));
  } catch {
    return [];
  }
}

/** 코디 수정본 저장(번역 표를 사람이 고친 결과). */
export async function saveTranslationEdit(opts: {
  path: string; lang: DocLang | string; editedDoc: TranslatedDoc; userId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const lang = normalizeLang(opts.lang);
  if (!opts.editedDoc || !Array.isArray(opts.editedDoc.sections)) return { ok: false, error: "invalid_doc" };
  try {
    const { error } = await supabaseAdmin.from(CACHE_TABLE).upsert({
      path: opts.path, lang,
      doc: opts.editedDoc as unknown as Json, edited_doc: opts.editedDoc as unknown as Json,
      edited_by: opts.userId || null, edited_at: new Date().toISOString(), model: MODEL,
      updated_at: new Date().toISOString(),
    }, { onConflict: "path,lang" });
    return error ? { ok: false, error: "save_failed" } : { ok: true };
  } catch {
    return { ok: false, error: "internal_error" };
  }
}

/** 학습 용어사전에 (원문→대상언어) 한 줄 등록. 다음 번역부터 프롬프트에 반영된다. */
export async function addGlossaryTerm(opts: {
  src: string; ko?: string | null; en?: string | null; ru?: string | null; note?: string | null; userId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const src = (opts.src || "").trim();
  if (!src || !(opts.ko || opts.en || opts.ru)) return { ok: false, error: "invalid_term" };
  try {
    const { error } = await supabaseAdmin.from(GLOSSARY_TABLE).insert({
      src, ko: opts.ko || null, en: opts.en || null, ru: opts.ru || null,
      note: opts.note || null, created_by: opts.userId || null,
    });
    return error ? { ok: false, error: "save_failed" } : { ok: true };
  } catch {
    return { ok: false, error: "internal_error" };
  }
}

/**
 * 저장소의 첨부 1건을 대상 언어로 충실 번역한다(캐시 우선).
 * @param path  storage 경로 (inquiry/...)
 * @param mimeType  없으면 파일명으로 추정
 * @param lang  출력 언어(ko/en/ru, 기본 ko)
 * @param force  true 면 캐시 무시하고 재변환
 */
export async function translateMedicalDoc(opts: {
  path: string;
  mimeType?: string | null;
  name?: string | null;
  lang?: DocLang | string | null;
  force?: boolean;
}): Promise<TranslateResult> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return { ok: false, error: "no_api_key" };

  const lang = normalizeLang(opts.lang);

  // 1) 캐시 우선(강제 재변환이 아니면). 재호출 비용·지연 제거 + 코디 수정본 반영.
  if (!opts.force) {
    const cached = await readCache(opts.path, lang);
    if (cached) return { ok: true, doc: cached };
  }

  const mime = opts.mimeType || (opts.name ? inferMimeFromName(opts.name) : null) || inferMimeFromName(opts.path) || "";
  if (!MODEL_READABLE.has(mime)) {
    // doc/docx 등 모델이 못 읽는 형식 → 코디에게 원본 직접 검토 안내.
    return { ok: false, error: "unsupported_type" };
  }

  // 저장소에서 파일 바이트 로드.
  let base64: string;
  try {
    const { data, error } = await supabaseAdmin.storage.from("attachments").download(opts.path);
    if (error || !data) return { ok: false, error: "download_failed" };
    const buf = Buffer.from(await data.arrayBuffer());
    if (buf.length > MAX_BYTES) return { ok: false, error: "file_too_large" };
    base64 = buf.toString("base64");
  } catch {
    return { ok: false, error: "download_failed" };
  }

  // 학습 용어사전(코디 수정 축적)을 씨앗 사전과 병합해 프롬프트에 주입.
  const learned = await fetchLearnedGlossary();

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildPrompt(lang, learned) }] },
        contents: [{ role: "user", parts: [
          { text: `Translate this medical document faithfully into ${LANG_NAME[lang]} per the rules. Return only JSON.` },
          { inlineData: { mimeType: mime, data: base64 } },
        ] }],
        // 의료 내용이 안전필터에 간헐 차단되는 문제(triage/generateReply 와 동일) → 모델단 차단 끔.
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
        generationConfig: {
          temperature: 0, // 충실 번역 — 창의성 0
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!res.ok) {
      console.error("[translateDoc] model_http_error status:", res.status, await res.text().catch(() => ""));
      return { ok: false, error: "model_http_error" };
    }
    const json = await res.json();

    // 💰 비용 계측 (fire-and-forget)
    logAiUsage({
      surface: "doc_translate",
      model: MODEL,
      promptTokens: json?.usageMetadata?.promptTokenCount ?? null,
      completionTokens: json?.usageMetadata?.candidatesTokenCount ?? null,
      meta: { mime, lang },
    }).catch(() => {});

    const raw = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // 응답 잘림(대형 문서) 등 → 파싱 실패
      return { ok: false, error: "parse_error" };
    }

    if (!parsed || !Array.isArray(parsed.sections) || parsed.sections.length === 0) {
      return { ok: false, error: "empty_result" };
    }

    const doc: TranslatedDoc = {
      docTypeShort: String(parsed.docTypeShort || DEFAULT_DOCTYPE[lang]),
      docType: String(parsed.docType || parsed.docTypeShort || DEFAULT_DOCTYPE[lang]),
      // 방어: 구조화출력이 드물게 null/비객체 원소를 내도 렌더가 안 터지게 거른다.
      sections: parsed.sections.filter((s: any) => s && typeof s === "object"),
    };

    // 캐시 저장(강제 재변환이면 기존 코디 수정본 초기화). fire-and-forget — 실패해도 결과는 반환.
    writeCache(opts.path, lang, doc, opts.force === true).catch(() => {});

    return { ok: true, doc };
  } catch {
    return { ok: false, error: "internal_error" };
  }
}

// ── 숫자 대조검증(numeric cross-check) ──────────────────────────────────────
// 왜: 의료번역의 최악 실패 = 수치 오기(141을 114로). 모델이 "번역표"와 "원본 이미지"를
// 직접 대조해 어긋난 숫자만 (번역값·원본재판독값) 쌍으로 돌려준다 → 코디가 원본 딱 보고 판단.
// ⚠️ 검증기도 AI라 절대 보증 아님: 원본을 잘못 읽으면 헛알람(안전), 둘 다 같게 틀리면 놓칠 수 있음.
// 그래서 "판사"가 아니라 "여기 원본 봐라" 신호기 — 최종 진실은 늘 원본(항상 한 클릭 옆에 보존).

/** 번역 결과를 모델 대조용 텍스트로 평탄화(라벨+숫자가 함께 보이게). */
function docToText(doc: TranslatedDoc): string {
  const lines: string[] = [];
  for (const s of doc.sections || []) {
    if (s.title) lines.push(`# ${s.title}`);
    if (s.note) lines.push(s.note);
    for (const r of s.rows || []) lines.push((r?.cells || []).join(" | "));
    if (s.text) lines.push(s.text);
  }
  return lines.join("\n");
}

export type NumberMismatch = { item: string; translated: string; source: string };
export type VerifyResult =
  | { ok: true; mismatches: NumberMismatch[] }
  | { ok: false; error: string };

const VERIFY_SCHEMA = {
  type: "object",
  properties: {
    mismatches: {
      type: "array",
      items: {
        type: "object",
        properties: { item: { type: "string" }, translated: { type: "string" }, source: { type: "string" } },
        required: ["item", "translated", "source"],
      },
    },
  },
  required: ["mismatches"],
};

/**
 * 번역표를 원본 이미지와 대조해 숫자가 어긋난 항목만 (번역값/원본재판독값) 쌍으로 반환.
 * 별도 모델 호출 1회(비용 2배) → 코디가 '숫자검증' 눌렀을 때만 실행.
 */
export async function verifyTranslationNumbers(opts: {
  path: string; mimeType?: string | null; name?: string | null; doc: TranslatedDoc;
}): Promise<VerifyResult> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return { ok: false, error: "no_api_key" };
  if (!opts.doc || !Array.isArray(opts.doc.sections)) return { ok: false, error: "invalid_doc" };

  const mime = opts.mimeType || (opts.name ? inferMimeFromName(opts.name) : null) || inferMimeFromName(opts.path) || "";
  if (!MODEL_READABLE.has(mime)) return { ok: false, error: "unsupported_type" };

  let base64: string;
  try {
    const { data, error } = await supabaseAdmin.storage.from("attachments").download(opts.path);
    if (error || !data) return { ok: false, error: "download_failed" };
    const buf = Buffer.from(await data.arrayBuffer());
    if (buf.length > MAX_BYTES) return { ok: false, error: "file_too_large" };
    base64 = buf.toString("base64");
  } catch {
    return { ok: false, error: "download_failed" };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: [
          "You are a medical number auditor. You are given a TRANSLATION of a document (text) and the ORIGINAL document (image).",
          "For EVERY number in the translation (lab values, reference ranges, counts, dates, IDs), check whether it matches the number printed in the ORIGINAL image.",
          "Report ONLY disagreements. For each, return: item = the field/parameter name (as in the original, so a human can locate it), translated = the number as written in the translation, source = the number you read in the original image.",
          "Ignore pure formatting differences (1.0 vs 1; comma vs dot decimal; spacing). Do NOT translate — only compare digits.",
          "If everything matches, return an empty mismatches array. Return ONLY JSON {mismatches:[...]}.",
        ].join("\n") }] },
        contents: [{ role: "user", parts: [
          { text: `TRANSLATION:\n${docToText(opts.doc).slice(0, 12000)}\n\nCompare against the attached ORIGINAL image. Return only JSON.` },
          { inlineData: { mimeType: mime, data: base64 } },
        ] }],
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
        generationConfig: { temperature: 0, maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 0 }, responseMimeType: "application/json", responseSchema: VERIFY_SCHEMA },
      }),
    });
    if (!res.ok) {
      console.error("[translateDoc] model_http_error status:", res.status, await res.text().catch(() => ""));
      return { ok: false, error: "model_http_error" };
    }
    const json = await res.json();
    logAiUsage({
      surface: "doc_translate_verify", model: MODEL,
      promptTokens: json?.usageMetadata?.promptTokenCount ?? null,
      completionTokens: json?.usageMetadata?.candidatesTokenCount ?? null,
      meta: { mime },
    }).catch(() => {});

    const raw = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
    let parsed: any = null;
    try { parsed = JSON.parse(raw); } catch { return { ok: false, error: "parse_error" }; }
    const mismatches: NumberMismatch[] = (Array.isArray(parsed?.mismatches) ? parsed.mismatches : [])
      .filter((m: any) => m && typeof m === "object")
      .map((m: any) => ({ item: String(m.item ?? ""), translated: String(m.translated ?? ""), source: String(m.source ?? "") }))
      .slice(0, 40);
    return { ok: true, mismatches };
  } catch {
    return { ok: false, error: "internal_error" };
  }
}
