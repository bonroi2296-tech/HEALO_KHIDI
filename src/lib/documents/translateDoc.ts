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
import { getAiReadable } from "./aiReadable";
import { logAiUsage } from "@/lib/ai/usageLog";
import { fetchGeminiWithCompat, DEFAULT_THINKING_LEVEL } from "@/lib/ai/geminiThinkingCompat";
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

// Gemini inlineData 로 직접 «그림처럼» 판독 가능한 타입(이미지 + PDF).
const MODEL_READABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
// Word(.docx) 는 모델이 파일 자체를 못 읽는다 → 우리가 글자·표를 뽑아 «글»로 넘긴다(mammoth).
// 옛 .doc(바이너리)은 못 뽑는다 — 그건 그대로 미지원.
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
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
    case "docx": return DOCX_MIME;
    default: return null;
  }
}

/** 이 형식을 번역할 수 있나 (그림으로 읽든, 글자를 뽑든). */
function canTranslate(mime: string): boolean {
  return MODEL_READABLE.has(mime) || mime === DOCX_MIME;
}

export type TranslatedSection = {
  title: string;            // 한국어 소제목 (원문 병기 가능)
  note?: string;            // 부가 맥락(환자·검사일·검사실 등), 한국어
  columns?: string[];       // 표 헤더 (예: 항목(원문)·항목(한글)·결과·정상범위·단위)
  rows?: { cells: string[] }[]; // 표 각 행(원문 값은 그대로)
  text?: string;            // 자유서술 블록(한국어 번역)
  page?: number;            // 원본 몇 쪽에서 나왔나 (1부터). 화면 쪽 고르기·원본 대조용
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
    // 실측 2026-08-03: 「양측 신장 실질의弥漫性(미만성) 변화」 — 뜻은 맞지만 한자가 섞여 읽기 나쁘다.
    lang === "ko"
      ? "7. Write Korean in Hangul only. NEVER use Chinese characters (한자) — write 미만성, not 弥漫性. Latin medical abbreviations and the source term in parentheses are fine."
      : null,
    // 실측 2026-08-04: аорта 를 「아오르타」로, хорда 를 「삭대/가삭」으로 «소리만» 옮겼다.
    //   PO 가 «대아오르타가 뭐냐»고 잡아냈다. 병기는 괜찮지만 본문은 한국 의료진이 쓰는 말이어야 한다.
    `8. TRANSLATE anatomy and medical terms into the standard ${T} clinical term — do NOT transliterate the sound of the source word. Examples for Korean: аорта → 대동맥 (NOT 아오르타), хорда → 부챙/덧줄 (NOT 삭대), почка → 신장, лоханка → 신우. You may add the source word in parentheses, but the ${T} term must come first and must be the word a ${T} clinician actually uses.`,
    `9. Do not merge two different findings into one phrase. If the source says fluid in the pelvis, say fluid in the pelvis — do not add a body cavity the source did not mention.`,
    // 실측 2026-08-04: 「Ротация правой почки. Анэхогеное образование левой почки (заболевание?)」에서
    //   «(заболевание?)» 가 **우측 신장 회전**으로 옮겨 붙었다. 이 환자는 «좌측» 신장암이라 그 물음표가
    //   어느 소견에 걸리는지가 곧 뜻이다. 붙어 있던 자리를 옮기지 마라.
    // ⚠️ 이 규칙이 두 번 깨졌다(2026-08-05). 「소견에 붙는다」로는 부족해서 **위치로** 못 박는다:
    //   원문 「Ротация правой почки. Анэхогеное образование левой почки (заболевание?)」에서
    //   «(заболевание?)» 가 두 번 다 **앞 문장(우측 회전)**으로 옮겨 갔다. 환자는 «좌측» 신장암이다.
    `9-1. KEEP QUALIFIERS WHERE THEY ARE — mechanical rule: a parenthetical, "?", "suspected", a size, or a laterality attaches to the finding **immediately before it in the same sentence**, never to anything in a previous sentence. Split the source at each period FIRST, translate each sentence on its own, keep the source order, and re-attach every qualifier to the finding that preceded it inside that same sentence. Never merge two sentences.`,
    // 실측 2026-08-05: 원문의 «(заболевание?)» 를 「(질환?)」으로만 옮겼더니 PO 가 **번역 오류로 읽었다.**
    //   그 물음표는 판독의가 «확정 못 했다»고 남긴 것이라 지우면 안 되는 정보인데, 그대로 두면
    //   우리 실수처럼 보인다 → 「누가 의심한 것인지」가 문장에서 드러나게 적는다.
    `9-2. THE SOURCE'S OWN DOUBT — when the source writes a bare "?" after a finding, that question mark is the reporting doctor's own uncertainty. Never delete it, and never leave it as a bare "(?)" either: make it read as the source's doubt. Korean: 「…병변(원문에 «질환?»으로 기재 — 판독의도 확정하지 않음)」, not 「…병변(질환?)」. Same for «под вопросом», «не исключается», «?» after a diagnosis.`,
    // 실측 2026-08-04(문의 #60 신장 초음파): анэхогенное 를 「무음영」으로, солевая инкрустация 를
    //   「염분 착색」으로 옮겼다. 「음영(그림자)」과 「에코(반사)」는 다른 말이고, 무에코는 임상적으로
    //   «대개 물이 찬 것»을 뜻해서 뜻이 통째로 달라진다. PO 가 «번역 제대로 한 거 맞아?»로 잡아냈다.
    `10. ULTRASOUND/IMAGING WORDS — echo is not shadow. Korean: анэхогенный → 무에코 (NOT 무음영), гипоэхогенный → 저에코, гиперэхогенный → 고에코, изоэхогенный → 등에코, акустическая тень → 음향 음영. Deposits: солевая инкрустация → 염류 침착 (NOT 착색), кальцинат → 석회화. Structures: ЧЛС(чашечно-лоханочная система) → 신배-신우계, каликоэктазия → 신배 확장, паренхима → 실질.`,
    // PO 지시 2026-08-04: 이 번역을 «가장 먼저 읽는 사람»은 의학 지식이 없는 코디네이터다.
    //   원문을 깎지 말라는 규칙(4·5번)은 그대로 두고, «덧붙이는 것»만 허용한다.
    `11. PLAIN-WORD GLOSS — the FIRST reader is a coordinator with NO medical training. After a term a layperson cannot parse, ADD a short everyday-${T} gloss in parentheses. Korean examples: 「무에코 병변(초음파에서 검게 비치는 것 — 대개 물이 찬 혹)」, 「수신증(콩팥에 소변이 고여 부은 상태)」, 「신배-신우계(콩팥 안에서 소변이 모이는 공간)」. ⚠️ ADD ONLY — never delete, shorten, or reword the source content to make room. Never invent a term that does not exist in ${T} clinical usage.`,
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


// 한 번에 몇 쪽씩 모델에 보낼지. 순차면 20쪽에 몇 분 — 5쪽 묶음이 실측 46초.
const PAGE_BATCH = 5;
// 쪽 그림의 긴 변 화소. A4 기준 ≈260dpi — 잔글씨도 읽힌다.
const PAGE_MAX_SIDE = 2200;

// Word 는 «쪽»이 없다(화면에서 흘러간다) → 이만큼씩 잘라 쪽처럼 다룬다. 통째로 주면 모델이 줄인다.
const DOCX_CHUNK_CHARS = 6000;

type PagePart = { mimeType: string; base64: string } | { text: string };

/**
 * Word(.docx) → HTML. 표를 <table> 로 살려서 넘긴다(맨 글자로 뽑으면 검사표의 칸 짝이 무너진다).
 * 이미 깔려 있는 mammoth 사용 — 새로 붙이는 것 없음.
 */
export async function docxToHtml(buf: Buffer): Promise<string> {
  const mammoth: any = await import("mammoth");
  const { value } = await mammoth.convertToHtml({ buffer: buf });
  return String(value || "").trim();
}

/** HTML 을 «블록 경계에서만» 잘라 쪽처럼 만든다(표 중간에서 끊으면 머리글이 떨어져 나간다). */
export function chunkHtmlBlocks(html: string, limit = DOCX_CHUNK_CHARS): string[] {
  const blocks = html.split(/(?<=<\/table>|<\/p>|<\/h[1-6]>|<\/ul>|<\/ol>)/).filter((b) => b.trim());
  const out: string[] = [];
  let cur = "";
  for (const b of blocks) {
    if (cur && cur.length + b.length > limit) { out.push(cur); cur = ""; }
    cur += b;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

/**
 * 문서를 «쪽 단위»로 쪼갠다. PDF 는 각 쪽을 그림으로 뽑고, 원래 이미지 한 장이면 그대로 한 쪽.
 * 왜 쪼개나: 통째로 주면 모델이 스스로 줄인다(실측 8분의 1). 쪽을 우리가 세면 빠뜨릴 수 없다.
 */
async function splitPages(buf: Buffer, mime: string): Promise<PagePart[]> {
  if (mime === DOCX_MIME) {
    return chunkHtmlBlocks(await docxToHtml(buf)).map((text) => ({ text }));
  }
  if (mime !== "application/pdf") {
    return [{ mimeType: mime, base64: buf.toString("base64") }];
  }
  try {
    const mupdf: any = await import("mupdf");
    const doc = mupdf.Document.openDocument(buf, "application/pdf");
    const n = doc.countPages();
    const out: PagePart[] = [];
    for (let i = 0; i < n; i++) {
      const page = doc.loadPage(i);
      const b = page.getBounds();
      const scale = Math.min(PAGE_MAX_SIDE / Math.max(b[2] - b[0], b[3] - b[1]), 3);
      const pix = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
      out.push({ mimeType: "image/jpeg", base64: Buffer.from(pix.asJPEG(80, false)).toString("base64") });
      pix.destroy();
    }
    return out;
  } catch (e) {
    console.error("[translateDoc] 쪽 나누기 실패 — 통째로 보낸다:", e);
    return [{ mimeType: mime, base64: buf.toString("base64") }];
  }
}

/** 쪽 하나를 번역. 실패하면 null(그 쪽만 빠지고 나머지는 살린다). */
async function translateOnePage(
  page: PagePart, pageNo: number, pageTotal: number,
  lang: DocLang, learned: GlossaryEntry[], apiKey: string, originalMime: string
): Promise<{ sections: any[]; docTypeShort?: string; docType?: string; truncated: boolean } | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const res = await fetchGeminiWithCompat(url, {
      systemInstruction: { parts: [{ text: buildPrompt(lang, learned) }] },
      contents: [{ role: "user", parts: "text" in page
        ? [{ text: `This is part ${pageNo} of ${pageTotal} of a Word document, extracted as HTML (tables are <table>). Transcribe EVERY line and EVERY table row of THIS part into ${LANG_NAME[lang]}. Ignore the HTML markup itself — it is only structure. Return only JSON.\n\n${page.text}` }]
        : [
            { text: `This is page ${pageNo} of ${pageTotal}. Transcribe EVERY line on THIS page into ${LANG_NAME[lang]}. Return only JSON.` },
            { inlineData: { mimeType: page.mimeType, data: page.base64 } },
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
        maxOutputTokens: 16384, // 한 쪽 분량엔 넉넉하다(실측 최대 6,503자)
        thinkingConfig: { thinkingLevel: DEFAULT_THINKING_LEVEL },
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });
    if (!res.ok) return null;
    const json = await res.json();

    logAiUsage({
      surface: "doc_translate",
      model: MODEL,
      promptTokens: json?.usageMetadata?.promptTokenCount ?? null,
      completionTokens: json?.usageMetadata?.candidatesTokenCount ?? null,
      meta: { mime: originalMime, lang, page: pageNo },
    }).catch(() => {});

    const truncated = json?.candidates?.[0]?.finishReason === "MAX_TOKENS";
    const raw = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
    let parsed: any = null;
    try { parsed = JSON.parse(raw); } catch { return { sections: [], truncated }; }
    const secs = Array.isArray(parsed?.sections) ? parsed.sections : [];
    // 어느 쪽에서 나온 칸인지 표시 — 화면의 쪽 고르기와, 원본 대조 검증의 근거가 된다.
    // 제목에 «1쪽 ·» 을 붙이지 않는 이유: 화면에 쪽 고르기가 따로 있어 제목만 지저분해진다.
    secs.forEach((x: any) => {
      if (x && typeof x === "object") x.page = pageNo;
    });
    return { sections: secs, docTypeShort: parsed?.docTypeShort, docType: parsed?.docType, truncated };
  } catch {
    return null;
  }
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
  if (!canTranslate(mime)) {
    // 옛 .doc·zip 등 글자를 뽑을 수도 그림으로 읽을 수도 없는 형식 → 코디에게 원본 직접 검토 안내.
    return { ok: false, error: "unsupported_type" };
  }

  // 저장소에서 파일 바이트 로드.
  // 큰 스캔 PDF 는 그대로 넣으면 모델이 요청 자체를 반려한다(실측 137MB → INVALID_ARGUMENT).
  // getAiReadable 이 필요하면 줄여서 준다(130.9MB → 9.0MB, 눈으로 차이 없음). 원본은 안 건드린다.
  let fileBuf: Buffer;
  let sendMime = mime;
  {
    const doc = await getAiReadable("attachments", opts.path, mime);
    if (!doc.ok) return { ok: false, error: doc.reason === "download_failed" ? "download_failed" : "file_too_large" };
    fileBuf = doc.buffer;
    sendMime = doc.mimeType;
  }

  // 학습 용어사전(코디 수정 축적)을 씨앗 사전과 병합해 프롬프트에 주입.
  const learned = await fetchLearnedGlossary();

  try {
    // ⚠️ 문서를 «통째로» 한 번에 번역하면 모델이 스스로 줄인다 — 요약 금지라고 아무리 써도 그렇다.
    //   2026-08-03 실측(20쪽 진료기록, 같은 모델·같은 설정):
    //     통째 + 우리 프롬프트  7,072자 / 11칸   ← 원본의 8분의 1
    //     통째 + 짧은 프롬프트 22,108자 / 20칸
    //     **쪽별로 나눠 번역   56,246자 / 87칸 / 46초**  ← 채택
    //   로우 데이터라 «조금 줄이는 것»도 사고다. 쪽을 우리가 세어 돌리면 빠뜨릴 수가 없다.
    const pages = await splitPages(fileBuf, sendMime);
    const allSections: any[] = [];
    let docTypeShort = "";
    let docType = "";
    let truncated = false;

    // 한 번에 5쪽씩 — 순차로 돌리면 20쪽에 몇 분이 걸린다(실측 5쪽 묶음 = 46초).
    for (let i = 0; i < pages.length; i += PAGE_BATCH) {
      const batch = pages.slice(i, i + PAGE_BATCH);
      const results = await Promise.all(
        batch.map((pg, k) => translateOnePage(pg, i + k + 1, pages.length, lang, learned, apiKey, mime))
      );
      for (const r of results) {
        if (!r) continue;
        if (r.truncated) truncated = true;
        if (!docTypeShort && r.docTypeShort) docTypeShort = r.docTypeShort;
        if (!docType && r.docType) docType = r.docType;
        allSections.push(...r.sections);
      }
    }

    // 「길이 상한에서 끊겼다」를 삼키지 않는다 — 잘린 번역이 «완역»처럼 저장되면 안 된다.
    if (truncated) {
      console.error("[translateDoc] 어떤 쪽이 길이 상한에서 끊겼다 — 저장하지 않는다:", opts.path);
      return { ok: false, error: "too_long" };
    }
    if (!allSections.length) return { ok: false, error: "empty_result" };

    const doc: TranslatedDoc = {
      docTypeShort: docTypeShort || DEFAULT_DOCTYPE[lang],
      docType: docType || docTypeShort || DEFAULT_DOCTYPE[lang],
      sections: allSections.filter((x: any) => x && typeof x === "object"),
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
  if (!canTranslate(mime)) return { ok: false, error: "unsupported_type" };

  // 큰 스캔 PDF 는 그대로 넣으면 모델이 요청 자체를 반려한다(실측 137MB → INVALID_ARGUMENT).
  // getAiReadable 이 필요하면 줄여서 준다(130.9MB → 9.0MB, 눈으로 차이 없음). 원본은 안 건드린다.
  // Word 는 그림이 아니라 뽑아낸 글자를 원본 자리에 넣는다.
  let sourcePart: { text: string } | { inlineData: { mimeType: string; data: string } };
  {
    const doc = await getAiReadable("attachments", opts.path, mime);
    if (!doc.ok) return { ok: false, error: doc.reason === "download_failed" ? "download_failed" : "file_too_large" };
    sourcePart = mime === DOCX_MIME
      ? { text: `ORIGINAL (Word document, extracted as HTML):\n${(await docxToHtml(doc.buffer)).slice(0, 60000)}` }
      : { inlineData: { mimeType: doc.mimeType, data: doc.buffer.toString("base64") } };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    // 별칭 세대 교체 생존 사다리 — thinkingBudget 거절(400) 시 강등 재시도(geminiThinkingCompat).
    const res = await fetchGeminiWithCompat(url, {
      systemInstruction: { parts: [{ text: [
        "You are a medical number auditor. You are given a TRANSLATION of a document (text) and the ORIGINAL document (an image, or the text extracted from a Word file).",
        "For EVERY number in the translation (lab values, reference ranges, counts, dates, IDs), check whether it matches the number in the ORIGINAL.",
        "Report ONLY disagreements. For each, return: item = the field/parameter name (as in the original, so a human can locate it), translated = the number as written in the translation, source = the number you read in the original image.",
        "Ignore pure formatting differences (1.0 vs 1; comma vs dot decimal; spacing). Do NOT translate — only compare digits.",
        "If everything matches, return an empty mismatches array. Return ONLY JSON {mismatches:[...]}.",
      ].join("\n") }] },
      contents: [{ role: "user", parts: [
        { text: `TRANSLATION:\n${docToText(opts.doc).slice(0, 12000)}\n\nCompare against the ORIGINAL below/attached. Return only JSON.` },
        sourcePart,
      ] }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
      generationConfig: { temperature: 0, maxOutputTokens: 4096, thinkingConfig: { thinkingLevel: DEFAULT_THINKING_LEVEL }, responseMimeType: "application/json", responseSchema: VERIFY_SCHEMA },
    });
    if (!res.ok) return { ok: false, error: "model_http_error" };
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
