/**
 * HEALO: 공통 AI 응답 생성 로직
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
  let generalChunks: any[] = [];
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
  "- You MUST ONLY mention hospitals that appear in the [HEALO 등록 병원] section of the Context above.",
  "- Do NOT mention, recommend, or compare ANY hospital NOT listed in the Context.",
  "- Do NOT generate facts not present in the Context (doctor count, treatment protocols, success rates, founding year, price ranges, etc.). For missing details, say '확인 필요' (or equivalent in the user's language).",
  "- Do NOT use external knowledge about this hospital. ONLY use the Context.",
  "- Response format:",
  "  1) Hospital name (number of branches if multiple listed)",
  "  2) Branch list: branch name + location (only if present in Context)",
  "  3) Key treatments/specialties (only if present in Context)",
  "  4) Next step: 'HEALO를 통해 자세한 상담을 받아보세요' (translate to user's language). Do NOT suggest direct contact.",
  "",
].join("\n");

const HOSPITAL_NO_MATCH_GUARD = [
  "",
  "⚠️ HOSPITAL NOT FOUND IN HEALO:",
  "- State clearly: 'HEALO에 등록된 정보가 없습니다' (translate to user's language).",
  "- Do NOT fabricate hospital details. Do NOT hallucinate.",
  "- You may use RAG/external context below, but prefix with '참고 정보 (HEALO 미등록):' and add disclaimer.",
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
  const hasDbData = contextText.includes("HEALO 등록");
  const hasHira = externalSources.includes("hira");
  const hasNaver = externalSources.includes("naver");
  const { hospitalGuardActive = false, hospitalIntentNoMatch = false } = hospitalGuard;

  return [
    "You are HEALO's AI agent — a medical concierge connecting international patients with Korean hospitals.",
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
    "RESPONSE RULES:",
    "- Keep answers SHORT and scannable: max 3-4 sentences per point, use bullet points.",
    "- Lead with the recommendation, skip lengthy introductions.",
    "- Respond in the same language the user writes in.",
    "- If unsure, say 'I'm not sure — let me connect a coordinator'. Honesty > confident wrong answer.",
    "",
    hospitalGuardActive ? "" : "CORE BEHAVIOR (only when user expresses clear medical need):",
    hospitalGuardActive ? "" : "- Recommend specific hospitals, treatments, and programs from the Context.",
    hospitalGuardActive ? "" : "- Include: hospital name, key specialty, estimated price range.",
    hospitalGuardActive ? "" : "- If multiple options, present as a brief comparison list.",
    hospitalGuardActive ? "" : "- After recommendations, suggest submitting an inquiry for a personalized quote.",
    "",
    "SOURCE LABELING (IMPORTANT):",
    hasDbData ? "- [HEALO 등록 병원] / [HEALO 등록 시술/프로그램]: HEALO's verified partner database. Present confidently." : "",
    hasHira ? "- [공공 의료데이터 - HIRA]: Official Korean government medical data. Present as reliable public data." : "",
    hasNaver ? "- [네이버 검색]: Naver local search results. Mention it's from Naver search." : "",
    useWebSearch ? "- [웹 검색 - 미검증]: Google Search results — clearly state: '웹 검색 결과입니다. HEALO에서 직접 검증한 정보가 아니므로 참고용으로 활용해 주세요.' (translate to user's language)" : "",
    "",
    "SAFETY:",
    "- No medical diagnosis or outcome guarantees.",
    "- If the user asks for a human, connect them with a HEALO coordinator.",
    hospitalGuardActive ? HOSPITAL_HARD_GUARD : "",
    hospitalIntentNoMatch ? HOSPITAL_NO_MATCH_GUARD : "",
    "",
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

const HIGH_RISK_PATTERNS = [
  /\b(?:emergency|urgent|severe\s*pain|chest\s*pain|breathing\s*difficulty|suicidal|overdose)\b/i,
  /\b(?:응급|긴급|극심한|자살|과다복용|호흡곤란)\b/,
];

export function detectHandOff(text: string): { requested: boolean; reason: string | null } {
  for (const p of HAND_OFF_PATTERNS) {
    if (p.test(text)) return { requested: true, reason: "user_requested_human" };
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
      greeting: "안녕하세요! HEALO AI 에이전트입니다. 어떤 치료나 병원 정보가 필요하신가요? 증상이나 원하시는 진료를 말씀해 주세요.",
      thanks: "별말씀을요. 더 궁금한 점이 있으면 언제든 물어보세요.",
      bye: "감사합니다. 추가 문의는 언제든 환영합니다.",
      default: "더 자세히 말씀해 주시면 적합한 한국 병원을 찾아드릴게요.",
    },
    en: {
      greeting: "Hello! I'm HEALO's AI agent. What medical treatment or hospital information do you need? Please describe your symptoms or desired care.",
      thanks: "You're welcome. Feel free to ask anything else.",
      bye: "Thank you. Reach out anytime for more questions.",
      default: "Could you tell me more so I can find the right hospital in Korea for you?",
    },
    ru: {
      greeting: "Здравствуйте! Я AI-агент HEALO. Какое лечение или информацию о больнице вас интересует? Расскажите о симптомах или нужном вам уходе.",
      thanks: "Пожалуйста. Спрашивайте, если что-то ещё нужно.",
      bye: "Спасибо. Обращайтесь в любое время.",
      default: "Расскажите подробнее, чтобы я подобрал подходящую корейскую клинику.",
    },
    kk: {
      greeting: "Сәлеметсіз бе! Мен HEALO AI агентімін. Қандай емдеу немесе аурухана туралы ақпарат қажет? Симптомдарыңызды немесе керек көмек түрін айтыңыз.",
      thanks: "Оқасы жоқ. Тағы сұрағыңыз болса айта беріңіз.",
      bye: "Рахмет. Қашан да хабарласа беріңіз.",
      default: "Толығырақ айтсаңыз, лайық корейлік клиниканы тапсам.",
    },
    zh: {
      greeting: "您好！我是 HEALO 的 AI 助手。需要哪种治疗或医院信息？请告诉我您的症状或希望的诊疗。",
      thanks: "不客气，有其他问题请随时提问。",
      bye: "谢谢，欢迎随时再来咨询。",
      default: "请详细说明，以便我为您找到合适的韩国医院。",
    },
    ja: {
      greeting: "こんにちは！HEALOのAIエージェントです。どのような治療や病院情報をお探しですか？症状やご希望の診療をお聞かせください。",
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
    // 1단계: HEALO DB 직접 검색 (최우선) + RAG 벡터 검색 (병렬 실행)
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

    // DB 결과를 RAG보다 앞에 배치 (HEALO 등록 데이터 우선)
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

    const result = await generateText({
      model,
      system: fullSystemPrompt,
      messages: messages as any,
      providerOptions: useWebSearch ? { google: { useSearchGrounding: true } } : undefined,
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

    return {
      reply: finalReply,
      ragChunks,
      _analytics: {
        retrievedPatternIds,
        usedPatternIds: fallback ? injectedPatternIds : declaredUsedIds,
        declaredUsedPatternIds: declaredUsedIds,
        analyticsFallback: fallback,
        ragScoring,
        latencyMs: Date.now() - t0,
      },
    };
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
