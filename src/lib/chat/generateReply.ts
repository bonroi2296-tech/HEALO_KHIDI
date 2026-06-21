/**
 * healwith: 공통 AI 응답 생성 로직
 *
 * /api/chat (스트리밍) 과 /api/public/chat/message (비스트리밍) 모두 사용
 * RAG: rag_search_chunks_v1_1 RPC 전용 (무필터 fallback 금지)
 * playbook_pattern 회수/사용 로그 수집 (PLAYBOOK-ANALYTICS-V1)
 */

import "server-only";

import { createHash } from "crypto";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { supabaseAdmin } from "../rag/supabaseAdmin";
import { hashQuery, logRagDisabled } from "../rag/ragQueryEvents";
import { searchHospitalsAndTreatments } from "./dbSearch";
import { searchExternal } from "./externalSearch";
import { runJudgeInBackground } from "./judge";
import { CARE_REFERENCE } from "./careReference";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMS = 768;

const TIER_LABELS: Record<number, string> = {
  1: "Official",
  2: "Partner-verified",
  3: "Public source",
};

export function getModel() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return null;
  return google("gemini-flash-latest") as any;
}

export function getModelName() {
  return "gemini-flash-latest";
}

// Gemini 안전필터(safety filter) 설정.
// 왜: 이 서비스의 핵심 질의가 "암 치료/항암/수술" 등 의료 내용인데, Gemini 기본값
// (BLOCK_MEDIUM_AND_ABOVE)은 DANGEROUS_CONTENT 카테고리에서 암·치료 논의를 간헐적으로
// 차단 → 빈 응답(finishReason=SAFETY)으로 떨어지는 버그(2026-06-21 재현). 이 챗봇은
// 시스템 프롬프트에 진단·처방 금지 등 의료 레드라인 가드가 이미 강하게 박혀 있으므로,
// 모델 단의 확률적 안전차단은 끄고(애플리케이션 가드가 진짜 안전선) 빈 응답을 없앤다.
const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
] as const;

// 빈 응답 방어용 안내 메시지(6개 언어). 모델이 빈 텍스트를 반환(추론이 토큰을
// 소진/안전필터/구조화 파싱 실패)할 때 빈 말풍선 대신 노출 + 코디 연결 유도.
const EMPTY_REPLY_FALLBACK: Record<string, string> = {
  ko: "죄송합니다, 지금 답변을 만들지 못했어요. 질문을 조금 더 구체적으로 다시 적어주시거나, 상단 메뉴에서 코디네이터 연결을 눌러주세요.",
  en: "Sorry, I couldn't generate a response right now. Please rephrase your question, or use the menu to connect with a human coordinator.",
  ru: "Извините, не удалось сформировать ответ. Пожалуйста, переформулируйте вопрос или свяжитесь с координатором через меню.",
  kz: "Кешіріңіз, қазір жауап жасай алмадым. Сұрағыңызды нақтырақ қайта жазыңыз немесе мәзірден үйлестірушіге хабарласыңыз.",
  zh: "抱歉，暂时无法生成回复。请重新描述您的问题，或通过菜单联系人工协调员。",
  ja: "申し訳ありません、ただいま回答を生成できませんでした。質問を言い換えていただくか、メニューからコーディネーターにおつなぎください。",
};

export async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: EMBEDDING_DIMS,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.embedding?.values ?? null;
  } catch {
    return null;
  }
}

function computeThreadHash(threadId: string): number {
  const hash = createHash("sha256").update(threadId).digest();
  return (hash[0] | (hash[1] << 8)) % 100;
}

export async function fetchRagChunks(query: string, lang: string, threadId?: string): Promise<any[]> {
  if (process.env.RAG_DISABLED === "true") {
    await logRagDisabled({
      source: "chat",
      queryTextHash: hashQuery(query),
      lang: lang || null,
    });
    return [];
  }

  const TOTAL_LIMIT = 6;
  const PLAYBOOK_LIMIT = 3;

  const abEnabled = !!threadId;
  const threadHash = threadId ? computeThreadHash(threadId) : 0;

  const embedding = await getEmbedding(query);
  let playbookChunks: any[] = [];
  const generalChunks: any[] = [];
  const seenIds = new Set<string>();

  if (embedding) {
    const { data: pbData } = await supabaseAdmin.rpc("rag_search_chunks_v1_1", {
      query_embedding: JSON.stringify(embedding),
      match_count: PLAYBOOK_LIMIT,
      p_lang: lang,
      p_source_type: "playbook_pattern",
      p_partner_only: false,
      p_ab_enabled: abEnabled,
      p_thread_hash: threadHash,
    });
    if (pbData?.length) {
      playbookChunks = pbData.map((row: any) => {
        seenIds.add(row.chunk_id);
        return {
          content: row.content,
          trust_tier: row.trust_tier,
          source_label: row.source_label,
          doc_title: row.doc_title,
          doc_source_type: row.doc_source_type,
          doc_source_id: row.doc_source_id,
          rag_documents: { source_type: row.doc_source_type, title: row.doc_title },
        };
      });
    }

    const remaining = TOTAL_LIMIT - playbookChunks.length;
    if (remaining > 0) {
      const { data: genData } = await supabaseAdmin.rpc("rag_search_chunks_v1_1", {
        query_embedding: JSON.stringify(embedding),
        match_count: remaining + 2,
        p_lang: lang,
        p_source_type: undefined,
        p_partner_only: false,
        p_ab_enabled: abEnabled,
        p_thread_hash: threadHash,
      });
      if (genData?.length) {
        for (const row of genData) {
          if (seenIds.has(row.chunk_id)) continue;
          if (generalChunks.length >= remaining) break;
          seenIds.add(row.chunk_id);
          generalChunks.push({
            content: row.content,
            trust_tier: row.trust_tier,
            source_label: row.source_label,
            doc_title: row.doc_title,
            doc_source_type: row.doc_source_type,
            doc_source_id: row.doc_source_id,
            rag_documents: { source_type: row.doc_source_type, title: row.doc_title },
          });
        }
      }
    }
  }

  return [...playbookChunks, ...generalChunks];
}

export function buildContext(chunks: any[]) {
  if (!chunks?.length) return { text: "", hasTier3: false, usedPatternIds: [] as string[] };
  let hasTier3 = false;
  const usedPatternIds: string[] = [];
  const lines = chunks.map((c) => {
    const tier = c?.trust_tier ?? 3;
    if (tier >= 3) hasTier3 = true;
    const tierLabel = TIER_LABELS[tier] || TIER_LABELS[3];
    const sourceLabel = c?.source_label || c?.rag_documents?.source_type || "unknown";
    const title = c?.rag_documents?.title || c?.doc_title || "";
    const srcType = c?.doc_source_type || c?.rag_documents?.source_type;
    const srcId = c?.doc_source_id || c?.rag_documents?.source_id;
    const patternMarker = srcType === "playbook_pattern" && srcId ? `\n[PATTERN_ID:${srcId}]` : "";
    if (srcType === "playbook_pattern" && srcId) usedPatternIds.push(srcId);
    return `[Tier ${tier} | ${tierLabel} | ${sourceLabel}${title ? ` | ${title}` : ""}]${patternMarker}\n${String(c.content || "").trim()}`;
  });
  return { text: lines.join("\n\n"), hasTier3, usedPatternIds };
}

const HOSPITAL_HARD_GUARD = [
  "",
  "⚠️ STRICT HOSPITAL QUERY RULES (OVERRIDE ALL OTHER RULES):",
  "- PRESERVE THE USER'S ORIGINAL HOSPITAL NAME EXACTLY. Do NOT auto-correct, spell-fix, or replace it (e.g. do NOT change '면력' to '면역'). Use the name as-is.",
  "- You MUST ONLY mention hospitals that appear in the [healwith 등록 병원] section of the Context above.",
  "- Do NOT mention, recommend, or compare ANY hospital NOT listed in the Context.",
  "- Do NOT generate facts not present in the Context (doctor count, treatment protocols, success rates, founding year, price ranges, etc.). For missing details, say '확인 필요' (or equivalent in the user's language).",
  "- Do NOT use external knowledge about this hospital. ONLY use the Context.",
  "- Response format:",
  "  1) Hospital name (number of branches if multiple listed)",
  "  2) Branch list: branch name + location (only if present in Context)",
  "  3) Key treatments/specialties (only if present in Context)",
  "  4) Next step: 'healwith를 통해 자세한 상담을 받아보세요' (translate to user's language). Do NOT suggest direct contact.",
  "",
].join("\n");

const HOSPITAL_NO_MATCH_GUARD = [
  "",
  "⚠️ HOSPITAL NOT FOUND IN healwith:",
  "- State clearly: 'healwith에 등록된 정보가 없습니다' (translate to user's language).",
  "- Do NOT fabricate hospital details. Do NOT hallucinate.",
  "- You may use RAG/external context below, but prefix with '참고 정보 (healwith 미등록):' and add disclaimer.",
  "",
].join("\n");

export interface HospitalGuardOptions {
  hospitalGuardActive?: boolean;
  hospitalIntentNoMatch?: boolean;
}

export function buildSystemPrompt(
  contextText: string,
  hasTier3: boolean,
  useWebSearch = false,
  externalSources: string[] = [],
  hospitalGuard: HospitalGuardOptions = {},
): string {
  const hasContext = !!contextText;
  const hasDbData = contextText.includes("healwith 등록");
  const hasHira = externalSources.includes("hira");
  const hasNaver = externalSources.includes("naver");
  const { hospitalGuardActive = false, hospitalIntentNoMatch = false } = hospitalGuard;

  return [
    "You are healwith's AI agent — a medical concierge that CONNECTS international patients with Korean hospitals and oncology specialists.",
    "You are NOT the treating party: you do not diagnose, read scans/labs, or prescribe — licensed Korean doctors do that. Your job is to guide, inform from verified Context, and connect.",
    "",
    "ANTI-HALLUCINATION (CRITICAL — never violate):",
    "- NEVER invent hospital names, doctor names, treatments, prices, or facts.",
    "- ONLY mention hospitals/doctors/treatments that appear LITERALLY in the Context section below.",
    "- If the Context is empty or doesn't contain relevant info, say: 'I don't have verified information about that. Let me connect you with a coordinator for accurate details.' (translate to user's language).",
    "- NEVER use a user's word as a hospital name. Example: if user says '안녕' (hello), never recommend '안녕성형외과'.",
    "- NEVER answer medical diagnosis or treatment-decision questions. Defer to actual doctors.",
    "",
    "INTENT DETECTION (decide before responding):",
    "- Greeting/smalltalk/thanks → respond naturally, NO hospital recommendation.",
    "- Vague question ('treatments?', 'help me') → ask 1 clarifying question.",
    "- Specific medical need (cancer type, symptoms, treatment) → recommend from Context only.",
    "- Off-topic (non-medical) → politely redirect to medical assistance topic.",
    "",
    "RESPONSE RULES (this is a small MOBILE chat bubble — brevity is mandatory):",
    "- ANSWER THE ACTUAL QUESTION the user asked, in a warm, human, conversational way — like a caring coordinator texting back, NOT a textbook or a price sheet. Talk WITH them, do not recite data AT them.",
    "- KEEP THE WHOLE REPLY SHORT: aim for 3-5 short lines, under ~70 words total. A wall of text makes the patient leave. If there is more to say, end with ONE short line offering to continue (e.g. 'Want the rough cost range too?').",
    "- DO NOT lead with a price or a number unless the user EXPLICITLY asked the cost (e.g. '얼마', 'how much', 'cost', 'цена'). For open or emotional questions (e.g. 'what should I tell my friend', 'where do we start', 'she has lots of questions'), reply conversationally: acknowledge them, briefly say how healwith helps and accompanies them, then ask what they most want to know. Numbers come ONLY when asked.",
    "- NEVER dump a bare figure like '₩18M' or '$13,500' as the answer. A price, when asked, is a gentle range inside a full sentence, never the opening words.",
    "- PLAIN TEXT ONLY. The chat does NOT render markdown — never use **, *, ***, ##, ---, backticks, or tables; they appear as literal symbols and look broken. For a short list use a simple '- ' prefix or '1. 2. 3.' only.",
    "- No preamble, no restating the question, no 'If you sent me X, I would say...'. Answer directly.",
    "- Respond in the same language the user writes in.",
    "- If unsure, say 'I'm not sure — let me connect a coordinator'. Honesty > confident wrong answer.",
    "- TONE: the user is often an anxious cancer patient or family. If they share distressing news (advanced-stage cancer, fear, a sick family member), open with ONE brief empathetic sentence before guidance. Warm but never exaggerated — no emoji spam, no hollow marketing phrases.",
    "",
    "INTEGRATIVE / KOREAN MEDICINE (CRITICAL — legal & ethical):",
    "- NEVER present Korean medicine, immune therapy, or integrative care as a cure for cancer or as something that 'treats/eliminates' the cancer itself.",
    "- Frame them ONLY as supportive care: recovery, quality of life, and side-effect management alongside conventional treatment.",
    "- The CORE of cancer treatment is surgery/chemotherapy at partner university hospitals. Immune/rehab care is a complementary step, not a replacement.",
    "",
    hospitalGuardActive ? "" : "CORE BEHAVIOR (only when user expresses clear medical need):",
    hospitalGuardActive ? "" : "- healwith is NOT a marketplace for comparing or ranking hospitals. Frame answers as a CONTINUOUS CARE JOURNEY: diagnosis → surgery/chemo at partner university hospitals → immune/rehab recovery — with a coordinator accompanying the whole way.",
    hospitalGuardActive ? "" : "- When mentioning hospitals from Context, present them as 'where this step of your care happens', NOT as a price-comparison shopping list. Do not lead with price tables.",
    hospitalGuardActive ? "" : "- If asked about cost, give the range from Context and note that a personalized quote follows after review.",
    hospitalGuardActive ? "" : "- Always orient toward the next step and our role of connecting + accompanying: e.g. 'Share your diagnosis and we'll connect you to the right hospital and stay with you through the process.'",
    "",
    "SOURCE LABELING (IMPORTANT):",
    hasDbData ? "- [healwith 등록 병원] / [healwith 등록 시술/프로그램]: healwith's verified partner database. Present confidently." : "",
    hasHira ? "- [공공 의료데이터 - HIRA]: Official Korean government medical data. Present as reliable public data." : "",
    hasNaver ? "- [네이버 검색]: Naver local search results. Mention it's from Naver search." : "",
    useWebSearch ? "- [웹 검색 - 미검증]: Google Search results — clearly state: '웹 검색 결과입니다. healwith에서 직접 검증한 정보가 아니므로 참고용으로 활용해 주세요.' (translate to user's language)" : "",
    "",
    "CITE YOUR SOURCE (verifiability — lets patient & medical team check, reinforces no-hallucination):",
    "- When you state a CONCRETE fact from Context (a hospital/doctor name, a treatment/program, a price range, a published statistic), attach a brief source tag in parentheses so it's traceable — e.g. '(출처: healwith 등록 병원)', '(출처: HIRA 공공데이터)', '(출처: 네이버 검색)'. Translate '출처' to the user's language.",
    "- Keep it light: ONE tag per distinct fact/source, not on every sentence. Never let tags clutter the warm, concise tone.",
    "- A fact you cannot tie to a Context source must NOT be stated at all (no source → no claim). Never invent a source.",
    "",
    "MEDICAL RED LINES (NEVER cross — these need a licensed doctor, not an AI):",
    "- Do NOT diagnose or name a disease from symptoms ('this sounds like X cancer').",
    "- Do NOT recommend or rank a treatment choice ('surgery is better than chemo', 'choose A therapy').",
    "- Do NOT name specific drugs, doses, or how to take medication.",
    "- Do NOT state survival rates, prognosis, or cure odds as fact ('X% cured', 'Y months to live'). General published statistics may only be cited WITH their source from Context, never invented.",
    "- Do NOT interpret/read scans, labs, or test values (CT, biopsy, blood numbers).",
    "- Do NOT reassure with other patients' outcomes ('others recovered, so you'll be fine').",
    "- Do NOT give fixed cost/duration ('exactly ₩X, Y days') — ranges/estimates from Context only.",
    "- For ANY of the above, say it needs a doctor and offer to connect via remote consultation (원격협진) or a coordinator.",
    "",
    "INTAKE & ESTIMATE (use the [healwith 안내자료] reference below — it is always available):",
    "- If the patient asks what to prepare / how to start / how to get a cost estimate, list the 5 REQUIRED DOCUMENTS as a compact '- ' list (one short line each, no extra commentary), then ONE line: share them with a coordinator for a personalized quote (free preliminary review).",
    "- ONLY when the patient EXPLICITLY asks the price (e.g. '얼마', 'how much', 'cost'): give just that cancer type's INDICATIVE RANGE (USD and ₩) woven into a full sentence, then ONE line that it is an estimate and the hospital sets the final price after reviewing the diagnosis. Never a single fixed number, never a bare figure, never dump the whole price list. If they did NOT ask about cost, do NOT volunteer a price — answer their real question instead.",
    "- Tag these with '(출처: healwith 안내자료)' (translate '출처' to the user's language).",
    "- Keep the integrative/immune framing: supportive care alongside surgery/chemo, never a cure.",
    "- REGISTER / PROCEED: when the patient wants to formally register, submit, proceed, or book (e.g. '접수해줘', 'оформить заявку', 'I want to proceed'), NEVER send them to a separate form or tell them to re-enter their details from scratch. Everything they told you in THIS chat is already saved with their name and contact. Reassure in 1-2 short lines: their request is registered and a healwith coordinator will contact them (by email if they gave one). Only ask for any of the 5 required documents still missing, or for a contact detail if none was given. A patient who already shared their info must never be asked to start over.",
    "",
    "SAFETY:",
    "- No medical diagnosis or outcome guarantees.",
    "- healwith connects patients to Korean medical institutions and their doctors; healwith itself does not diagnose or treat.",
    "- If the user asks for a human, connect them with a healwith coordinator.",
    "- DISCLAIMER: a permanent disclaimer already shows under the chat — do NOT repeat a disclaimer every message. Only when you give specific medical or cost info, add at most ONE short clause that the medical team makes the final decision. Never a wall of legalese.",
    hospitalGuardActive ? HOSPITAL_HARD_GUARD : "",
    hospitalIntentNoMatch ? HOSPITAL_NO_MATCH_GUARD : "",
    "",
    CARE_REFERENCE,
    hasContext ? "Context:\n" + contextText : "",
    useWebSearch ? "No internal or public data found. Use Google Search to find relevant Korean hospitals and treatments. Present findings concisely. ALWAYS add a disclaimer that these are unverified web search results." : "",
    hasTier3 ? "\nNote: Some info is from public sources (Tier 3) — briefly note when citing." : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const HAND_OFF_PATTERNS = [
  /\b(?:human|real\s*person|agent|coordinator|representative|staff|operator)\b/i,
  /\b(?:사람|상담[원사]|직원|담당자|연결)\b/,
  /\b(?:人間|担当者|スタッフ|オペレーター)\b/,
];

// 정식 접수·진행 의사 — 환자가 "이제 접수/신청해줘"라고 하면 사람에게 넘김(이미 대화에 다 저장됨)
const REGISTER_PATTERNS = [
  /\b(?:register|sign\s*me\s*up|formal(?:ly|\s*(?:registration|intake|request))?|proceed\s*(?:with|to)?|go\s*ahead|enroll|book\s*(?:a|the|my)\b)/i,
  /(?:접수|정식\s*신청|신청\s*(?:할|하고|해|하겠|드)|등록\s*(?:할|하고|해)|진행\s*(?:해|하고\s*싶|시켜)|예약)/,
  /(?:оформ|заявк|записаться|регистрац|подать)/i,
  /(?:тіркел|өтінім|ресми)/i,
  /(?:正式|登记|报名|申请|预约)/,
  /(?:正式|登録|申し込|予約|手続き)/,
];

const HIGH_RISK_PATTERNS = [
  /\b(?:emergency|urgent|severe\s*pain|chest\s*pain|breathing\s*difficulty|suicidal|overdose)\b/i,
  /\b(?:응급|긴급|극심한|자살|과다복용|호흡곤란)\b/,
];

export function detectHandOff(text: string): { requested: boolean; reason: string | null } {
  for (const p of HAND_OFF_PATTERNS) {
    if (p.test(text)) return { requested: true, reason: "user_requested_human" };
  }
  for (const p of REGISTER_PATTERNS) {
    if (p.test(text)) return { requested: true, reason: "user_requested_registration" };
  }
  for (const p of HIGH_RISK_PATTERNS) {
    if (p.test(text)) return { requested: true, reason: "high_risk_detected" };
  }
  return { requested: false, reason: null };
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function extractRetrievedPatternIds(chunks: any[]): string[] {
  const ids: string[] = [];
  for (const c of chunks) {
    const srcType = c?.doc_source_type || c?.rag_documents?.source_type;
    const srcId = c?.doc_source_id || c?.rag_documents?.source_id;
    if (srcType === "playbook_pattern" && srcId && !ids.includes(srcId)) {
      ids.push(srcId);
    }
  }
  return ids;
}

export interface ChatReplyResult {
  reply: string;
  ragChunks: any[];
  error?: string;
  _analytics?: {
    retrievedPatternIds: string[];
    usedPatternIds: string[];
    declaredUsedPatternIds: string[];
    analyticsFallback: boolean;
    ragScoring: string;
    latencyMs: number;
  };
}

const JSON_OUTPUT_INSTRUCTION = `
IMPORTANT: You MUST respond with ONLY a valid JSON object (no markdown fences, no extra text).
Schema:
{
  "answer": "Your full answer text to the user",
  "used_pattern_ids": ["<PATTERN_ID values you actually used as basis — only from [PATTERN_ID:xxx] markers in context, empty array if none>"],
  "used_sources": [{"type":"official|partner|public|playbook_pattern","label":"source name","url":"optional url or null"}]
}
Only include a PATTERN_ID in used_pattern_ids if you directly used that playbook context to form your answer.
`.trim();

// 일시적(transient) Gemini 오류 판별 — 503 과부하·타임아웃·연결 끊김·일시 한도.
// 이런 오류는 같은 요청을 잠깐 뒤 다시 보내면 대개 성공 → 사용자에게 에러 안 보이게 재시도.
function isTransientModelError(err: any): boolean {
  const msg = String(err?.message || err || "");
  const code = (err?.statusCode ?? err?.status ?? "").toString();
  return (
    /503|502|500|overload|unavailable|timeout|timed out|ETIMEDOUT|ECONNRESET|ECONNREFUSED|fetch failed|network|deadline|temporar/i.test(msg) ||
    /^5\d\d$/.test(code) ||
    code === "429"
  );
}

const sleepMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

// generateText 재시도 래퍼: 일시 오류 또는 빈 응답이면 짧은 백오프로 재시도.
// 빈 응답까지 재시도하는 이유 — 모델이 드물게 빈 텍스트를 반환(안전필터·구조화 흔들림)하는데
// 한 번 더 보내면 정상 응답이 오는 경우가 많음. 최종 빈 응답은 상위의 EMPTY 가드가 처리.
async function generateTextWithRetry(params: any, maxAttempts = 3): Promise<any> {
  let lastResult: any = null;
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await generateText(params);
      if (result?.text && result.text.trim()) return result;
      lastResult = result;
      console.warn(
        `[generateChatReply] empty text attempt ${attempt}/${maxAttempts} ` +
        `finishReason=${(result as any)?.finishReason}`
      );
    } catch (e: any) {
      lastError = e;
      const transient = isTransientModelError(e);
      console.warn(
        `[generateChatReply] generateText error attempt ${attempt}/${maxAttempts} ` +
        `transient=${transient} msg=${String(e?.message || e).slice(0, 120)}`
      );
      // 영구성 오류(잘못된 키·요청)면 즉시 중단 — 재시도해도 똑같음
      if (!transient) throw e;
    }
    if (attempt < maxAttempts) await sleepMs(400 * attempt);
  }
  // 모든 시도 소진: 마지막이 예외였으면 던지고(상위 catch), 빈 결과였으면 그대로 반환(EMPTY 가드行)
  if (lastError && !lastResult) throw lastError;
  return lastResult;
}

function parseStructuredReply(
  raw: string,
  injectedPatternIds: string[]
): { answer: string; declaredUsedIds: string[]; fallback: boolean } {
  try {
    let jsonStr = raw.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    const parsed = JSON.parse(jsonStr);
    if (typeof parsed.answer !== "string" || !parsed.answer) {
      throw new Error("missing answer field");
    }

    const declared: string[] = (Array.isArray(parsed.used_pattern_ids) ? parsed.used_pattern_ids : [])
      .filter((id: any) => typeof id === "string" && injectedPatternIds.includes(id));

    return { answer: parsed.answer, declaredUsedIds: declared, fallback: false };
  } catch {
    return { answer: raw, declaredUsedIds: [], fallback: true };
  }
}

/**
 * 비스트리밍 AI 응답 생성 (thread 기반 채팅용)
 * V1.1: 모델에 JSON 출력 강제 → used_pattern_ids 선언 기반 판정
 */
// 짧은 인사·잡담 패턴 — RAG/DB 검색 없이 자연스럽게 응답
const SMALL_TALK_PATTERNS = [
  /^(안녕|하이|hi|hello|hey|здравств|привет|сәлем|你好|嗨|こんにちは|やあ|halo|hola)[\s!?.,~]*$/i,
  /^(고마워|감사|thanks|thank\s*you|спасибо|рахмет|谢谢|ありがとう)[\s!?.,~]*$/i,
  /^(ok|okay|네|예|응|yes|yep|good|좋아요?)[\s!?.,~]*$/i,
  /^(bye|잘\s*가|안녕히|пока|до\s*свидан|再见|さようなら)[\s!?.,~]*$/i,
  /^.{1,3}$/, // 매우 짧은 메시지 (4글자 이하)
];

function isSmallTalk(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  return SMALL_TALK_PATTERNS.some((p) => p.test(trimmed));
}

function smallTalkReply(text: string, lang: string): string {
  const trimmed = text.trim().toLowerCase();
  // 인사 vs 감사 vs 종료 vs 기타 짧은 응답 구분
  const isGreeting = /^(안녕|하이|hi|hello|hey|здравств|привет|сәлем|你好|嗨|こんにちは|halo|hola)/i.test(trimmed);
  const isThanks = /^(고마워|감사|thanks|thank|спасибо|рахмет|谢谢|ありがとう)/i.test(trimmed);
  const isBye = /^(bye|잘\s*가|안녕히|пока|до\s*свидан|再见|さようなら)/i.test(trimmed);

  const replies: Record<string, { greeting: string; thanks: string; bye: string; default: string }> = {
    ko: {
      greeting: "안녕하세요! healwith AI 에이전트입니다. 어떤 치료나 병원 정보가 필요하신가요? 증상이나 원하시는 진료를 말씀해 주세요.",
      thanks: "별말씀을요. 더 궁금한 점이 있으면 언제든 물어보세요.",
      bye: "감사합니다. 추가 문의는 언제든 환영합니다.",
      default: "더 자세히 말씀해 주시면 적합한 한국 병원을 찾아드릴게요.",
    },
    en: {
      greeting: "Hello! I'm healwith's AI agent. What medical treatment or hospital information do you need? Please describe your symptoms or desired care.",
      thanks: "You're welcome. Feel free to ask anything else.",
      bye: "Thank you. Reach out anytime for more questions.",
      default: "Could you tell me more so I can find the right hospital in Korea for you?",
    },
    ru: {
      greeting: "Здравствуйте! Я AI-агент healwith. Какое лечение или информацию о больнице вас интересует? Расскажите о симптомах или нужном вам уходе.",
      thanks: "Пожалуйста. Спрашивайте, если что-то ещё нужно.",
      bye: "Спасибо. Обращайтесь в любое время.",
      default: "Расскажите подробнее, чтобы я подобрал подходящую корейскую клинику.",
    },
    kk: {
      greeting: "Сәлеметсіз бе! Мен healwith AI агентімін. Қандай емдеу немесе аурухана туралы ақпарат қажет? Симптомдарыңызды немесе керек көмек түрін айтыңыз.",
      thanks: "Оқасы жоқ. Тағы сұрағыңыз болса айта беріңіз.",
      bye: "Рахмет. Қашан да хабарласа беріңіз.",
      default: "Толығырақ айтсаңыз, лайық корейлік клиниканы тапсам.",
    },
    zh: {
      greeting: "您好！我是 healwith 的 AI 助手。需要哪种治疗或医院信息？请告诉我您的症状或希望的诊疗。",
      thanks: "不客气，有其他问题请随时提问。",
      bye: "谢谢，欢迎随时再来咨询。",
      default: "请详细说明，以便我为您找到合适的韩国医院。",
    },
    ja: {
      greeting: "こんにちは！healwithのAIエージェントです。どのような治療や病院情報をお探しですか？症状やご希望の診療をお聞かせください。",
      thanks: "どういたしまして。他にもご質問があればお気軽にどうぞ。",
      bye: "ありがとうございました。いつでもご相談ください。",
      default: "もう少し詳しくお聞かせいただければ、最適な韓国の病院をお探しします。",
    },
  };

  const langKey = lang in replies ? lang : "en";
  const set = replies[langKey];
  if (isGreeting) return set.greeting;
  if (isThanks) return set.thanks;
  if (isBye) return set.bye;
  return set.default;
}

export async function generateChatReply(
  messages: ChatMessage[],
  query: string,
  lang: string,
  threadId?: string
): Promise<ChatReplyResult> {
  const t0 = Date.now();
  let ragScoring = "none";

  // 짧은 인사·잡담 — RAG 검색 없이 즉시 응답
  if (isSmallTalk(query)) {
    return {
      reply: smallTalkReply(query, lang),
      ragChunks: [],
      _analytics: {
        retrievedPatternIds: [],
        usedPatternIds: [],
        declaredUsedPatternIds: [],
        analyticsFallback: false,
        ragScoring: "small_talk_bypass",
        latencyMs: Date.now() - t0,
      },
    };
  }

  try {
    // 1단계: healwith DB 직접 검색 (최우선) + RAG 벡터 검색 (병렬 실행)
    const [dbResult, ragChunks] = await Promise.all([
      searchHospitalsAndTreatments(query).catch((e) => {
        console.error("[generateReply] db search failed:", e);
        return { context: "", hospitalCount: 0, treatmentCount: 0 } as const;
      }),
      fetchRagChunks(query, lang, threadId),
    ]);

    ragScoring = ragChunks.length > 0 ? "vector_cosine_similarity" : "no_results";
    const { text: contextText, hasTier3, usedPatternIds: injectedPatternIds } = buildContext(ragChunks);
    const dbContext = dbResult.context;
    const matchedHospitalNames = (dbResult as any).matchedHospitalNames ?? [];
    const hospitalMatchType = (dbResult as any).hospitalMatchType ?? "none";

    const HOSPITAL_KEYWORDS = /병원|의원|한방병원|클리닉|clinic|hospital/i;
    const hospitalIntent = HOSPITAL_KEYWORDS.test(query) || matchedHospitalNames.length > 0;
    const hospitalGuardActive = hospitalIntent && matchedHospitalNames.length > 0;

    console.log(`[generateReply] query="${query.slice(0, 80)}" | hospitalIntent=${hospitalIntent} | matchType=${hospitalMatchType} | dbHospitals=${matchedHospitalNames.length} | ragChunks=${ragChunks.length}`);
    if (matchedHospitalNames.length > 0) {
      console.log(`[generateReply] matchedHospitals:`, matchedHospitalNames);
    }

    // DB 결과를 RAG보다 앞에 배치 (healwith 등록 데이터 우선)
    const internalContext = [dbContext, contextText].filter(Boolean).join("\n");

    // 외부 검색: hospital_intent+DB매칭 시 외부 검색 차단
    let externalContext = "";
    let externalSources: string[] = [];
    if (!internalContext && !hospitalGuardActive) {
      try {
        const ext = await searchExternal(query);
        externalContext = ext.context;
        externalSources = ext.sources;
      } catch (e) {
        console.error("[generateReply] external search failed:", e);
      }
    }

    const allContext = [internalContext, externalContext].filter(Boolean).join("\n\n");
    const useWebSearch = !allContext && !hospitalGuardActive;
    const systemPrompt = buildSystemPrompt(allContext, hasTier3, useWebSearch, externalSources, {
      hospitalGuardActive,
      hospitalIntentNoMatch: hospitalIntent && matchedHospitalNames.length === 0,
    });
    const retrievedPatternIds = extractRetrievedPatternIds(ragChunks);

    const model = getModel();
    if (!model) {
      return {
        reply: "I'm sorry, the AI service is temporarily unavailable. Please try again later.",
        ragChunks,
        error: "model_unavailable",
        _analytics: {
          retrievedPatternIds,
          usedPatternIds: injectedPatternIds,
          declaredUsedPatternIds: [],
          analyticsFallback: true,
          ragScoring,
          latencyMs: Date.now() - t0,
        },
      };
    }

    const fullSystemPrompt = injectedPatternIds.length > 0
      ? systemPrompt + "\n\n" + JSON_OUTPUT_INSTRUCTION
      : systemPrompt;

    const result = await generateTextWithRetry({
      model,
      system: fullSystemPrompt,
      messages: messages as any,
      // 비용·가독성 가드: 응답 길이 상한 (모바일 채팅 벽지 방지 + 토큰 폭주 차단)
      // ⚠️ gemini-flash-latest 는 thinking(추론) 토큰이 maxOutputTokens 에 포함됨 →
      //    상한이 낮으면 추론이 예산을 다 먹고 실제 답변이 잘리거나 통째로 빈칸(2026-06-20 빈답 버그).
      //    thinkingBudget:0 으로 추론을 끄되, 별칭(latest)이 옵션을 무시할 경우까지 대비해
      //    상한을 8192 로 올려 답변 토큰 여유 확보(빈답·잘림 방어). 일시 오류·빈답은
      //    generateTextWithRetry 가 재시도하고, 그래도 비면 아래 EMPTY 가드가 최종 안전망.
      maxOutputTokens: 8192,
      providerOptions: {
        google: {
          thinkingConfig: { thinkingBudget: 0 },
          // 의료(암 치료) 질의가 안전필터에 걸려 빈 응답으로 떨어지는 것 방지 — 위 SAFETY_SETTINGS 주석 참고.
          safetySettings: SAFETY_SETTINGS as any,
          ...(useWebSearch ? { useSearchGrounding: true } : {}),
        },
      },
    });

    let finalReply: string;
    let declaredUsedIds: string[];
    let fallback: boolean;

    if (injectedPatternIds.length > 0) {
      const parsed = parseStructuredReply(result.text, injectedPatternIds);
      finalReply = parsed.answer;
      declaredUsedIds = parsed.declaredUsedIds;
      fallback = parsed.fallback;
    } else {
      finalReply = result.text;
      declaredUsedIds = [];
      fallback = false;
    }

    // 🛟 빈 응답 최종 안전망: 모델이 빈 텍스트를 반환하면(추론 토큰 소진·안전필터·
    // 구조화 파싱 실패 등) 빈 말풍선이 그대로 사용자에게 노출되던 버그(2026-06-20).
    // → 6개 언어 안내로 치환 + 원인진단용 finishReason/usage 로깅 + error 플래그.
    let emptyError: string | undefined;
    if (!finalReply || !finalReply.trim()) {
      console.error(
        `[generateChatReply] EMPTY reply — finishReason=${(result as any)?.finishReason} ` +
        `usage=${JSON.stringify((result as any)?.usage)} structured=${injectedPatternIds.length > 0} ` +
        `query="${query.slice(0, 60)}"`
      );
      finalReply = EMPTY_REPLY_FALLBACK[lang] || EMPTY_REPLY_FALLBACK.en;
      // finishReason 을 에러코드에 실어 다음 발생 시 원인(SAFETY/MAX_TOKENS/…)을 API 응답·메타데이터에서 바로 확인 가능하게.
      emptyError = `empty_model_text:${(result as any)?.finishReason ?? "unknown"}`;
    }

    const finalResult: ChatReplyResult = {
      reply: finalReply,
      ragChunks,
      ...(emptyError ? { error: emptyError } : {}),
      _analytics: {
        retrievedPatternIds,
        usedPatternIds: fallback ? injectedPatternIds : declaredUsedIds,
        declaredUsedPatternIds: declaredUsedIds,
        analyticsFallback: fallback,
        ragScoring,
        latencyMs: Date.now() - t0,
      },
    };

    // Judge: 메인 응답 흐름 차단 없이 백그라운드 평가
    runJudgeInBackground({
      query,
      response: finalReply,
      context: allContext || undefined,
      lang,
      messageId: null,   // 호출자가 나중에 message_id 를 알게 되므로 null
      threadId: threadId ?? null,
    });

    return finalResult;
  } catch (err: any) {
    console.error("[generateChatReply] error:", err.message);
    return {
      reply: "I'm sorry, something went wrong. Please try again.",
      ragChunks: [],
      error: err.message,
      _analytics: {
        retrievedPatternIds: [],
        usedPatternIds: [],
        declaredUsedPatternIds: [],
        analyticsFallback: true,
        ragScoring,
        latencyMs: Date.now() - t0,
      },
    };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * playbook_usage_events 기록
 * Promise.race: 최대 200ms 대기 후 응답 반환 (누락 방지)
 */
export async function logPlaybookUsage(params: {
  threadId?: string | null;
  messageId?: string | null;
  language: string;
  queryText: string;
  model?: string | null;
  analytics: NonNullable<ChatReplyResult["_analytics"]>;
  handoffRequested: boolean;
}): Promise<void> {
  const {
    threadId, messageId, language, queryText, model,
    analytics, handoffRequested,
  } = params;

  const retrievedPatternIds = analytics.retrievedPatternIds;
  if (retrievedPatternIds.length === 0 && !handoffRequested) return;

  const declaredIds = analytics.declaredUsedPatternIds;
  const used = declaredIds.length > 0;
  const usedPatternId = declaredIds[0] || null;

  const insertPromise = Promise.resolve(
    supabaseAdmin
      .from("playbook_usage_events")
      .insert({
        thread_id: threadId || null,
        message_id: messageId || null,
        language,
        query_text_hash: sha256(queryText),
        query_len: queryText.length,
        model: model || null,
        retrieved_count: retrievedPatternIds.length,
        retrieved_pattern_ids: retrievedPatternIds,
        used,
        used_pattern_id: usedPatternId,
        handoff_requested: handoffRequested,
        rag_scoring: analytics.ragScoring,
        latency_ms: analytics.latencyMs,
        metadata: {
          declared_used_pattern_ids: declaredIds,
          analytics_fallback: analytics.analyticsFallback,
        },
      } as any)
  )
    .then(({ error }) => {
      if (error) console.error("[logPlaybookUsage] insert error:", error.message);
    })
    .catch((err: any) => {
      console.error("[logPlaybookUsage] unexpected:", err.message);
    });

  await Promise.race([insertPromise, sleep(200)]);
}
