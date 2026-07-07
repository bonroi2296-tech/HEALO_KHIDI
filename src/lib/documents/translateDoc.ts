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

const MODEL = "gemini-flash-latest";

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

function buildPrompt(): string {
  return [
    "You are a medical document translator for healwith, a Korea-based medical-tourism platform.",
    "A coordinator uploaded a foreign-language medical document (Russian/Kazakh/other) that must be handed to Korean hospital doctors.",
    "Your job is a FAITHFUL, COMPLETE translation into KOREAN — NOT a summary.",
    "",
    "HARD RULES (a summary could drop something clinically important — do not summarize):",
    "1. Translate EVERY line/row/field. Do NOT omit, merge, reorder, or summarize anything.",
    "2. Preserve ALL numbers, units, reference ranges, dates, IDs, and Latin abbreviations (HGB, RBC, WBC, PLT, MCV, СОЭ→ESR, etc.) EXACTLY as in the source — copy them character-for-character. NEVER guess, round, or 'correct' a value. If unsure of a digit, copy what you see verbatim.",
    "3. Translate ONLY the human-language label text (the Russian/Kazakh medical term) into Korean. Keep the source term in parentheses where useful so doctors can cross-check.",
    "4. Do NOT add any diagnosis, interpretation, opinion, or clinical advice. This is a translation, not a reading.",
    "5. COMPLETENESS — read EVERY page of the document. Any section that contains results, findings, or measurements in the source MUST include those values. NEVER output a section that has only a header/patient info and no results. Concretely: for a smear/microscopy, transcribe every measured value (leukocytes, flora, epithelium, etc.); for an infection/STI PCR panel, list EVERY pathogen tested with its positive/negative (or detected/not-detected) result; for any quantitative assay, give every value. A section with a results table in the source but empty results in your output is a FAILURE.",
    "6. UNREADABLE ≠ OMIT — if a value or line is too faint, blurred, cropped, or handwritten to read with confidence, write '(원문 판독 불가)' in its place. NEVER silently drop it. Flagging an unreadable value is far safer than leaving it out.",
    "",
    "OUTPUT (JSON):",
    "- docTypeShort: a SHORT Korean chip label for the document type (e.g. '혈액검사', '소변검사', '세포검사', '영상판독', '진료기록', '병리').",
    "- docType: fuller Korean type with the source name in parentheses (e.g. '일반혈액검사 (OAK/CBC)').",
    "- sections: array. For each logical block of the document, one section:",
    "   • For lab result tables → set `columns` and `rows`. Use columns like ['항목(원문)','항목(한글)','결과','정상범위','단위']. Put the original parameter name in 항목(원문), Korean in 항목(한글), and copy 결과/정상범위/단위 VERBATIM from the source. One row per source line — do not drop rows.",
    "   • For free-text blocks (impressions, notes, headers with patient/date/lab info) → set `text` to the faithful Korean translation (keep numbers/dates verbatim). Use `note` for context lines like patient name, date of birth, lab name.",
    "   • `title`: a short Korean heading for the section (source term in parentheses if helpful).",
    "",
    "Return ONLY the JSON object.",
  ].join("\n");
}

/**
 * 저장소의 첨부 1건을 한국어로 충실 번역한다.
 * @param path  storage 경로 (inquiry/...)
 * @param mimeType  없으면 파일명으로 추정
 */
export async function translateMedicalDoc(opts: {
  path: string;
  mimeType?: string | null;
  name?: string | null;
}): Promise<TranslateResult> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return { ok: false, error: "no_api_key" };

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

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildPrompt() }] },
        contents: [{ role: "user", parts: [
          { text: "Translate this medical document faithfully into Korean per the rules. Return only JSON." },
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

    if (!res.ok) return { ok: false, error: "model_http_error" };
    const json = await res.json();

    // 💰 비용 계측 (fire-and-forget)
    logAiUsage({
      surface: "doc_translate",
      model: MODEL,
      promptTokens: json?.usageMetadata?.promptTokenCount ?? null,
      completionTokens: json?.usageMetadata?.candidatesTokenCount ?? null,
      meta: { mime },
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

    return {
      ok: true,
      doc: {
        docTypeShort: String(parsed.docTypeShort || "의료서류"),
        docType: String(parsed.docType || parsed.docTypeShort || "의료서류"),
        // 방어: 구조화출력이 드물게 null/비객체 원소를 내도 렌더가 안 터지게 거른다.
        sections: parsed.sections.filter((s: any) => s && typeof s === "object"),
      },
    };
  } catch {
    return { ok: false, error: "internal_error" };
  }
}
