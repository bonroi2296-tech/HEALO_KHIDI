/**
 * healwith: 첨부 의료자료 → 멀티모달 1차 소견(triage)
 *
 * 환자가 검사지·사진·진단서(이미지/PDF)를 올리면:
 *  1) 저장소에서 파일 바이트를 받아 Gemini 멀티모달에 직접 전달(판독)
 *  2) 환자용 "예비 1차 소견"(비진단·강한 면책) + 의료진용 "진료의뢰 패킷"(구조화 JSON) 동시 생성
 *
 * ⚠️ 의료 레드라인: 확정진단·처방·결과보장 금지. 환자용 응답은 항상 면책으로 끝나고,
 *    "AI 작성·의료진 검토 예정" 라벨이 붙는다. 최종 판단은 면허 의료진(진료의뢰 후).
 *    (PO 결정 2026-06-29: 자료 올리면 1차 소견 즉시 노출 + 사후 의사 검수.)
 */

import "server-only";

import { supabaseAdmin } from "../rag/supabaseAdmin";
import { redactModelPii } from "../security/redactModelPii";
import { logAiUsage } from "@/lib/ai/usageLog";
import { fetchGeminiWithCompat, DEFAULT_THINKING_LEVEL } from "@/lib/ai/geminiThinkingCompat";

const MODEL = "gemini-flash-latest";

// Gemini inlineData 로 직접 판독 가능한 타입만(이미지 + PDF). doc/docx 는 모델이 못 읽음 → 의료진 직접 검토.
const MODEL_READABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

const MAX_FILES_TO_MODEL = 6;          // 첨부 과다 시 상한(토큰·비용)
const MAX_TOTAL_BYTES = 18 * 1024 * 1024; // base64 전 원본 합계 상한(~18MB)

// 언어코드 → 응답 언어명(프롬프트 지시용). kk=kz 별칭.
const LANG_NAME: Record<string, string> = {
  ko: "Korean", en: "English", ru: "Russian", kz: "Kazakh", kk: "Kazakh", zh: "Chinese", ja: "Japanese",
};

// 안전망 면책(모델이 빠뜨려도 항상 붙임). 6개 언어.
const DISCLAIMER: Record<string, string> = {
  ko: "⚠️ 이 내용은 AI가 작성한 예비 안내이며, 최종 판단은 한국 면허 의료진이 검토 후 안내드립니다.",
  en: "⚠️ This is an AI-written preliminary note. A licensed Korean doctor will review and confirm.",
  ru: "⚠️ Это предварительная заметка, составленная ИИ. Окончательное решение примет лицензированный корейский врач после проверки.",
  kz: "⚠️ Бұл — AI жасаған алдын ала ақпарат. Түпкілікті шешімді лицензиясы бар корей дәрігері тексергеннен кейін береді.",
  zh: "⚠️ 这是AI撰写的初步说明，最终判断由韩国持照医生审核后提供。",
  ja: "⚠️ これはAIが作成した予備的な案内です。最終判断は韓国の免許を持つ医師が確認のうえご案内します。",
};

export type TriagePacket = {
  patient_summary: string;   // 누구 (나이·성별·배경)
  condition: string;         // 상태 요약 (비확정 표현)
  request: string;           // 환자가 원하는 것
  urgency: "high" | "medium" | "low";
  missing_docs: string[];    // 다음 단계에 필요한데 빠진 자료
  red_flags: string[];       // 의료진이 주의해서 볼 점
  suggested_specialty: string; // 추정 진료과
};

export type TriageResult = {
  patientReply: string;      // 환자에게 즉시 노출(면책 포함)
  packet: TriagePacket | null; // 의료진용 진료의뢰 패킷
  unreadableCount: number;   // 모델이 못 읽은 파일 수(doc 등)
  error?: string;
};

type Attachment = { path?: string | null; name?: string | null; type?: string | null };

// 저장소에서 모델이 읽을 수 있는 첨부만 base64 inlineData 로 변환.
async function loadInlineParts(attachments: Attachment[]): Promise<{ parts: any[]; unreadable: number }> {
  const parts: any[] = [];
  let total = 0;
  let unreadable = 0;

  for (const att of attachments.slice(0, MAX_FILES_TO_MODEL)) {
    const type = att?.type || "";
    if (!att?.path || !MODEL_READABLE.has(type)) {
      unreadable++;
      continue;
    }
    try {
      const { data, error } = await supabaseAdmin.storage.from("attachments").download(att.path);
      if (error || !data) {
        unreadable++;
        continue;
      }
      const buf = Buffer.from(await data.arrayBuffer());
      if (total + buf.length > MAX_TOTAL_BYTES) break;
      total += buf.length;
      parts.push({ inlineData: { mimeType: type, data: buf.toString("base64") } });
    } catch {
      unreadable++;
    }
  }
  return { parts, unreadable };
}

const PACKET_SCHEMA = {
  type: "object",
  properties: {
    patientReply: { type: "string" },
    packet: {
      type: "object",
      properties: {
        patient_summary: { type: "string" },
        condition: { type: "string" },
        request: { type: "string" },
        urgency: { type: "string", enum: ["high", "medium", "low"] },
        missing_docs: { type: "array", items: { type: "string" } },
        red_flags: { type: "array", items: { type: "string" } },
        suggested_specialty: { type: "string" },
      },
      required: ["patient_summary", "condition", "request", "urgency", "suggested_specialty"],
    },
  },
  required: ["patientReply", "packet"],
};

function buildSystemPrompt(langName: string): string {
  return [
    "You are a medical-tourism concierge AI for healwith, a Korea-based platform connecting international patients to Korean university hospitals (oncology and serious illness).",
    "A patient uploaded medical records (images/PDF). Read them and produce TWO outputs in one JSON object:",
    "",
    "1) `patientReply` — a brief PRELIMINARY ORIENTATION shown directly to the patient. RULES (medical redline — follow strictly):",
    "   - You are NOT the treating doctor. Do NOT give a definitive diagnosis ('you have X'), do NOT prescribe, do NOT change medications, do NOT guarantee outcomes or success rates.",
    "   - You MAY: summarize what the records appear to show in plain, careful language ('the records suggest...'), state whether the treatment the patient is asking about is appropriate IN PRINCIPLE, list real-world considerations/barriers for getting it done in Korea, and recommend concrete next steps + connection to a coordinator/doctor.",
    "   - Be warm, concise (under ~200 words), and oriented toward the next step. Do NOT invent values not present in the records.",
    "   - FORMATTING (this is a small mobile chat bubble — readability is critical): break patientReply into SHORT paragraphs of 2-3 sentences each, with a BLANK LINE between paragraphs. Put (1) the records summary, (2) whether the treatment is appropriate, (3) the key barriers, and (4) the next step in SEPARATE paragraphs. For a list of barriers or needed documents, put each item on its OWN line starting with '- '. NEVER write one long wall of text. PLAIN TEXT only — no markdown (**, ##, backticks, tables); they render as literal symbols.",
    `   - Write patientReply in ${langName}.`,
    "",
    "2) `packet` — a structured referral packet for the Korean coordinator/doctor (internal, not shown to patient). Write packet fields in Korean. Fields:",
    "   - patient_summary: who (age, sex, background) in one line.",
    "   - condition: what the records suggest, in non-definitive clinical shorthand.",
    "   - request: what the patient is asking for.",
    "   - urgency: high | medium | low (high if signs of acute/critical status).",
    "   - missing_docs: documents/tests needed for the next step that are not yet provided.",
    "   - red_flags: things the doctor should pay attention to.",
    "   - suggested_specialty: the most relevant Korean hospital department.",
    "",
    "Return ONLY the JSON object. Do not add a disclaimer to patientReply yourself — the system appends it.",
  ].join("\n");
}

/**
 * 첨부 의료자료에 대한 1차 소견 + 진료의뢰 패킷 생성.
 * 모델 호출 실패/빈응답이면 patientReply 는 안전한 폴백(접수 안내)으로 떨어진다.
 */
export async function generateTriage(opts: {
  attachments: Attachment[];
  messageText: string;
  lang: string;
}): Promise<TriageResult> {
  const lang = opts.lang || "en";
  const disclaimer = DISCLAIMER[lang] || DISCLAIMER.en;
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  const { parts: fileParts, unreadable } = await loadInlineParts(opts.attachments || []);

  // 읽을 수 있는 파일이 하나도 없으면(전부 doc 등) 모델 호출 없이 접수 안내만.
  if (fileParts.length === 0 || !apiKey) {
    return { patientReply: "", packet: null, unreadableCount: unreadable, error: apiKey ? "no_readable_files" : "no_api_key" };
  }

  const langName = LANG_NAME[lang] || "English";
  // 환자가 타이핑한 자유텍스트 PII(전화·이메일·여권·주민번호)는 채팅 경로와 동일하게 마스킹 후 전송.
  // (첨부 파일 자체는 판독에 필요해 불가피 — 마스킹 대상은 타이핑 텍스트.)
  const safeMessageText = redactModelPii(opts.messageText || "").trim();
  const userText =
    (safeMessageText ? `Patient's message: "${safeMessageText}"\n\n` : "") +
    "Here are the patient's uploaded medical records. Read them and produce the JSON.";

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    // 별칭 세대 교체 생존 사다리 — thinkingBudget 거절(400) 시 강등 재시도(geminiThinkingCompat).
    const res = await fetchGeminiWithCompat(url, {
      systemInstruction: { parts: [{ text: buildSystemPrompt(langName) }] },
      contents: [{ role: "user", parts: [{ text: userText }, ...fileParts] }],
      // 의료 논의가 안전필터에 간헐 차단되는 문제(generateReply 와 동일) → 모델단 차단 끔(앱 가드가 진짜 안전선).
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingLevel: DEFAULT_THINKING_LEVEL },
        responseMimeType: "application/json",
        responseSchema: PACKET_SCHEMA,
      },
    });

    if (!res.ok) {
      return { patientReply: "", packet: null, unreadableCount: unreadable, error: "model_http_error" };
    }
    const json = await res.json();

    // 💰 사용량·비용 계측 (fire-and-forget) — 첨부 멀티모달은 텍스트 챗보다 토큰이 크다.
    // 챗(generateReply)·통역·STT 는 계측되는데 이 경로만 빠져 있었음(2026-07-02 전수 감사).
    logAiUsage({
      surface: "triage",
      model: MODEL,
      promptTokens: json?.usageMetadata?.promptTokenCount ?? null,
      completionTokens: json?.usageMetadata?.candidatesTokenCount ?? null,
      meta: { attachments: fileParts.length },
    }).catch(() => {});

    const raw = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { patientReply: "", packet: null, unreadableCount: unreadable, error: "parse_error" };
    }

    const reply = String(parsed?.patientReply || "").trim();
    if (!reply) {
      return { patientReply: "", packet: parsed?.packet || null, unreadableCount: unreadable, error: "empty_reply" };
    }

    // 안전망: 면책을 항상 붙인다(모델이 빠뜨려도).
    const patientReply = `${reply}\n\n${disclaimer}`;
    return { patientReply, packet: parsed?.packet || null, unreadableCount: unreadable };
  } catch {
    return { patientReply: "", packet: null, unreadableCount: unreadable, error: "internal_error" };
  }
}
