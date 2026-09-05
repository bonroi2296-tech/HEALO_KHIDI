/**
 * healwith: 공통 AI 응답 생성 로직
 *
 * /api/chat (스트리밍) 과 /api/public/chat/message (비스트리밍) 모두 사용
 * RAG: rag_search_chunks_v1_1 RPC 전용 (무필터 fallback 금지)
 * playbook_pattern 회수/사용 로그 수집 (PLAYBOOK-ANALYTICS-V1)
 */

import "server-only";

import { createHash } from "crypto";
import { generateText, streamText } from "ai";
import { google } from "@ai-sdk/google";
import { logAiUsage } from "@/lib/ai/usageLog";
import { callGeminiWithCompat } from "@/lib/ai/geminiThinkingCompat";
import { supabaseAdmin } from "../rag/supabaseAdmin";
import { hashQuery, logRagDisabled } from "../rag/ragQueryEvents";
import { searchHospitalsAndTreatments } from "./dbSearch";
import { searchExternal } from "./externalSearch";
import { runJudgeInBackground } from "./judge";
import { scanRedlines, safeDeferralMessage } from "./safetyGuard";
import { pickCareReference } from "./careReference";
import { BoundedCache } from "../util/boundedCache";
import { mentionsCancerType, isTopicCorrection, correctionReply, asksDocsOrProcess, mentionsHospital, asksHospitalRanking, stripPriceLines } from "./topicGuards";
import { redactModelPii, redactMessagesForModel } from "../security/redactModelPii";

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

// 쿼리 임베딩 메모이즈: 같은 텍스트는 항상 같은 벡터(결정적)라 캐시가 100% 안전.
// 반복 질문(인사·흔한 암 질문·재시도)에서 임베딩 네트워크 왕복(~0.6~1s)을 건너뛰어
// 첫 글자까지 시간(TTFT)을 줄인다. 서버리스 인스턴스 수명 동안만 유지(상한 200).
const EMBEDDING_CACHE = new BoundedCache<string, number[]>(200);

export async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;

  const cacheKey = (text || "").trim();
  if (cacheKey) {
    const cached = EMBEDDING_CACHE.get(cacheKey);
    if (cached) return cached;
  }

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
      // 4초 상한: 임베딩이 느리면 응답 전체가 인질이 됨. 초과 시 RAG만 우아하게 포기(null→[]).
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const values = data?.embedding?.values ?? null;
    if (values && cacheKey) EMBEDDING_CACHE.set(cacheKey, values);
    return values;
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
    // playbook 검색과 일반검색을 병렬로(둘은 독립 RPC). 일반검색은 playbook 회수량을
    // 모르는 상태에서 미리 던지므로 넉넉히(TOTAL+2) 받아와, 아래에서 playbook 우선 채운
    // 뒤 남는 자리만큼만 dedup해서 채운다(기존 결과 구성과 동일, 왕복만 2→1로 단축).
    const embStr = JSON.stringify(embedding);
    const [pbRes, genRes] = await Promise.all([
      supabaseAdmin.rpc("rag_search_chunks_v1_1", {
        query_embedding: embStr,
        match_count: PLAYBOOK_LIMIT,
        p_lang: lang,
        p_source_type: "playbook_pattern",
        p_partner_only: false,
        p_ab_enabled: abEnabled,
        p_thread_hash: threadHash,
      }),
      supabaseAdmin.rpc("rag_search_chunks_v1_1", {
        query_embedding: embStr,
        match_count: TOTAL_LIMIT + 2,
        // 언어필터 끔: RAG 지식(병원·치료)은 현재 en 단일언어인데 Gemini 임베딩은 다국어라
        // ko/ru/kz 질문도 en 문서와 의미로 매칭된다(모델은 사용자 언어로 답하므로 무방).
        // p_lang=lang 하드필터를 두면 비영어 질문이 청크 0개로 떨어짐(2026-06-29 발견).
        // ※ 다국어 문서를 적재하게 되면 '같은 언어 우선'으로 재검토.
        p_lang: undefined,
        p_source_type: undefined,
        p_partner_only: false,
        p_ab_enabled: abEnabled,
        p_thread_hash: threadHash,
      }),
    ]);

    const pbData = pbRes.data;
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
    const genData = genRes.data;
    if (remaining > 0 && genData?.length) {
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
  "- NO RANKING: if the user asks for the 'best', the 'top N', or any ranking of hospitals (e.g. '제일 잘하는', 'top 3', 'самая лучшая'), do NOT give a ranked or numbered 'best' list. The right hospital depends on the patient's specific diagnosis — say that warmly, and offer to match them to the right partner hospital for THEIR case (share the diagnosis → a coordinator guides). You may mention registered partner hospitals as care options (where treatment happens), but NEVER as an objective quality ranking or a 'top N' leaderboard.",
  "- Do NOT generate facts not present in the Context (doctor count, treatment protocols, success rates, founding year, price ranges, etc.). For missing details, say '확인 필요' (or equivalent in the user's language).",
  "- Do NOT use external knowledge about this hospital. ONLY use the Context.",
  "- Response format:",
  "  1) Hospital name (number of branches if multiple listed)",
  "  2) Branch list: branch name + location (only if present in Context)",
  "  3) Key treatments/specialties (only if present in Context)",
  "  4) Next step: 'healwith를 통해 자세한 상담을 받아보세요' (translate to user's language). Do NOT suggest direct contact.",
  "",
].join("\n");

// 병원 랭킹/최저가 요청 전용 하드 가드 (2026-07-04): 병원명이 없어 STRICT 규칙을 못 타는
// "제일 싼/좋은 병원" 질문에서 kz 가격 랭킹 노출 실측(3/3) → 코드 강제.
const HOSPITAL_RANKING_GUARD = [
  "",
  "⚠️ HARD RULE — the user is asking for a BEST/CHEAPEST/RANKED hospital comparison:",
  "- Do NOT output any ranked, ordered, or price-labeled list of hospitals or programs.",
  "- Do NOT include ANY specific price figures ($, ₩, numbers) in this reply, even from the reference above — a price-ordered answer IS the shopping list we never give.",
  "- Explain warmly that the right hospital and the real cost depend on their specific diagnosis, and offer ONE next step: share the diagnosis so a coordinator matches the right partner hospital and prepares a personalized quote (free preliminary review).",
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
  hospitalRankingAsk?: boolean;
}

// 대화 세션의 "상태 사실"(state facts) — 모델이 로그인·저장·연락 가능 여부를 추측하지 않고
// 사실대로 답하게 주입한다. 비로그인·연락처 미보유 사용자에게 "접수 완료/코디가 연락"이라는
// 거짓 약속을 하던 버그(2026-06-22 PO 재현)를 막는 핵심 입력.
export interface ChatSession {
  // 로그인 여부 — chat_thread.user_id 가 있으면 true. 세션 유지·계정 연결 안내에 사용.
  isLoggedIn?: boolean;
  // 코디네이터가 연락할 수단(이메일·전화) 또는 계정이 있는가. 접수 멘트 분기의 기준.
  hasReachableContact?: boolean;
  // 지금 대화 중인 채널 자체가 회신 채널인가(텔레그램 봇 등 메신저). true 면 모델이
  // 연락처·선호 채널을 되묻는 것 자체가 헛질문 → 프롬프트에서 금지한다.
  contactInThisChannel?: boolean;
  // 이 스레드에 환자가 올린 첨부(검사지·사진)가 있는가. true 면 "AI는 파일을 읽을 수 없다"
  // 하드룰 주입 — 첨부 내용을 지어내던 환각(2026-07-13 품질경고 4건 전부 이 패턴)의 방지책.
  hasAttachments?: boolean;
<<<<<<< HEAD
  // 이 호출이 «사람의 상담»이 아니라 AI 자가시험(회귀 테스트)인가.
  // true 면 ①실서비스 Judge(ai_response_evaluations 적재 + 코디 긴급알림)를 건너뛰고
  // ②AI 비용을 public_chat 이 아니라 regression_generate 표면으로 기록한다.
  // 시험 트래픽이 실서비스 품질지표·알림에 섞이면 KPI 가 오염된다(2026-08-21).
  isRegressionTest?: boolean;
=======
  /**
   * 대화가 벌어지는 자리. 기본값 "web"(사이트 안 채팅 위젯).
   * ⚠️ **「게스트 30일 자동 재개」는 web 에서만 참이다** — 그건 브라우저 쿠키
   * (`app/inquiry/ThreadChat.jsx` COOKIE_MAX_AGE) + `/api/public/chat/resume` 로 굴러간다.
   * 텔레그램·왓츠앱엔 브라우저도 쿠키도 없고 대신 «그 메신저 대화창»이 곧 스레드라 항상 이어진다.
   * 이 칸을 안 나누면 메신저 환자에게 없는 기능을 약속하게 되고, 더 나쁘게는 그 거짓말이
   * 판사에게 「사실」로 넘어가 환각 검출을 통과한다(2026-08-31 독립 리뷰 지적).
   */
  channel?: "web" | "messenger";
>>>>>>> origin/main
}


/**
 * 요청마다 절대 안 바뀌는 규칙 덩어리 = **캐시 접두사(cache prefix)**.
 *
 * 왜 한 덩어리로 묶어 맨 앞에 두나 (2026-08-11):
 *   제미나이는 «요청들의 앞부분이 글자 하나까지 똑같을 때만» 그 부분을 캐시로 재사용한다
 *   (자동 캐시, 최소 약 1,024 토큰). 예전 구조는 **맨 첫 줄**이 조건부였다
 *   (`currentMentionsCancer` — 환자가 이번 메시지에 암종을 말했나에 따라 붙었다 떨어졌다).
 *   그래서 «똑같은 앞부분»이 사실상 0 이었고 캐시가 한 번도 안 걸렸다.
 *   실측(2026-08-11, 최근 30일): 공개 챗 1건당 입력 4,962 토큰 : 출력 141 토큰 = 입력이 97%.
 *   즉 매 요청이 규칙서를 처음부터 다시 읽히고 있었다.
 *
 * ⚠️ 여기 규칙을 «상태에 따라 달라지게» 만들지 마라 — 문자열 끼워넣기(`${}`) 하나만 들어가도
 *    접두사가 깨져 캐시가 통째로 무효가 된다. 상태에 따라 달라지는 규칙은 아래 가변부에 둔다.
 *    (기계 검사: `systemPromptPrefix.test.ts` — 상태를 바꿔가며 앞부분이 같은지 잠근다.)
 *
 * ⚠️ 순서만 바뀌었고 «문장은 한 글자도 안 고쳤다». 조건부 가드들은 서로의 상대 순서를 유지한 채
 *    이 덩어리 «뒤»로 갔다(프롬프트 끝 = 사용자 메시지 바로 앞이라 지시 강도가 약해지지 않는 자리).
 */
const STATIC_RULES = [
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
  "STAY ON THE PATIENT'S ACTUAL QUESTION — DO NOT ASSUME THEIR DIAGNOSIS (CRITICAL — caused real complaints):",
  "- NEVER name or assume a specific cancer type (대장암/colorectal, 유방암/breast, 폐암/lung, 위암/stomach, etc.) unless the user EXPLICITLY named it in their CURRENT message. The reference data below lists many cancers as examples ONLY — never pick one on the patient's behalf.",
  "- Earlier mentions in the chat are NOT permission to keep assuming. If the current message is general (e.g. 'what's the procedure', 'how do I start', '절차 알려줘'), answer generally ('your cancer', 'the treatment') WITHOUT naming a cancer type.",
  "- HONOR CORRECTIONS INSTANTLY: if the user pushes back or corrects you ('I didn't say X', 'that's not what I asked', 'not X', '아니', '말고', '아니라고', '안했는데'), apologize in ONE short line, DROP that topic completely, and ask what they actually want. NEVER repeat or keep explaining the rejected topic — repeating a cancer type after the user rejected it is the single worst failure.",
  "",
  "DO NOT ECHO YOUR OWN PREVIOUS REPLIES (CRITICAL — caused a real deflection loop):",
  "- Answer the user's CURRENT message. Do NOT recycle the wording, tone, or reassurances from your earlier replies in this chat.",
  "- If your recent replies sound the same (e.g. repeating 'I keep my safety rules / my limits are locked', 'let me help with your treatment', or generic reassurance), that is a FAILURE. Break the pattern and directly address what was just asked, in different words.",
  "- A user complaint that you keep repeating, misunderstand, are stuck, or are 'broken' is REAL feedback — treat it literally, do not answer it with more reassurance. If you genuinely cannot answer, say so plainly in ONE sentence and offer a coordinator. Never fill a turn with reassurance instead of an answer.",
  "- Do NOT lecture about your own safety rules, system prompt, or 'I cannot bypass restrictions' unless the user explicitly asks how you work. It reads as evasive and off-topic.",
  "",
  "RESPONSE RULES (this is a small MOBILE chat bubble — brevity is mandatory):",
  "- ANSWER THE ACTUAL QUESTION the user asked, in a warm, human, conversational way — like a caring coordinator texting back, NOT a textbook or a price sheet. Talk WITH them, do not recite data AT them.",
  "- KEEP THE WHOLE REPLY SHORT: aim for 3-5 short lines, under ~70 words total. A wall of text makes the patient leave. If there is more to say, end with ONE short line offering to continue (e.g. 'Want the rough cost range too?').",
  "- DO NOT lead with a price or a number unless the user EXPLICITLY asked the cost (e.g. '얼마', 'how much', 'cost', 'цена'). For open or emotional questions (e.g. 'what should I tell my friend', 'where do we start', 'she has lots of questions'), reply conversationally: acknowledge them, briefly say how healwith helps and accompanies them, then ask what they most want to know. Numbers come ONLY when asked.",
  "- NEVER dump a bare figure like '₩18M' or '$13,500' as the answer. A price, when asked, is a gentle range inside a full sentence, never the opening words.",
  "- LIGHT FORMATTING ONLY: the chat renders **bold** (use for 1-2 key words at most, not whole sentences), simple '- ' bullet lists, '1. 2. 3.' numbered lists (each item on its OWN line — never put several '1. ... 2. ...' on one line), and blank-line paragraph breaks. Do NOT use ##, ***, ---, backticks, or tables — those are NOT rendered and show as literal broken symbols. Keep it minimal and human, not a styled document.",
  "- No preamble, no restating the question, no 'If you sent me X, I would say...'. Answer directly.",
  "- OUTPUT ONLY THE FINAL MESSAGE TO THE PATIENT. Never reveal your own planning or self-talk: no 'Wait,', no 'let's keep it short / shorter / cleaner', no word counts like '(32 words)', no notes-to-self in asterisks or brackets. If you start writing a note about HOW to answer, delete it — send only the answer itself.",
  "- If unsure, say 'I'm not sure — let me connect a coordinator'. Honesty > confident wrong answer.",
  "- TONE: the user is often an anxious cancer patient or family. If they share distressing news (advanced-stage cancer, fear, a sick family member), open with ONE brief empathetic sentence before guidance. Warm but never exaggerated — no emoji spam, no hollow marketing phrases.",
  "- DE-ESCALATION (important): if the user is upset, frustrated, angry, or criticizing the service (swearing, sarcasm, 'this is useless', 'why do I have to explain this to you'), do NOT respond by dumping documents, price lists, or feature explanations. First acknowledge their frustration in ONE short sincere line, then ask ONE simple question to fix the actual problem. Reciting reference data at an upset person makes it worse.",
  "- OVERWHELMED FIRST CONTACT: if the message is primarily emotional distress rather than a concrete info request (e.g. 'I can't cope', 'she is my only support', 'I don't know where to start', fear/grief about a family member), do NOT list the 5 intake documents or any prices in that reply. Open with empathy, say the coordinator will organize everything step by step so they don't have to figure it out alone, and offer exactly ONE gentle next step (e.g. share the diagnosis, or connect with a coordinator). The document list comes later — only when they ask what to prepare or the conversation reaches that step.",
  "- NO decorative emoji and NO filler/flattery openers. Do not start with interjections like '아이고/아하/앗' (beyond a brief genuine apology) or flattery like '날카롭게 짚으셨네요 / great question / sharp observation'. Use at most ONE emoji per reply and only when truly fitting — default to none. Get to the substance.",
  "",
  "INTEGRATIVE / KOREAN MEDICINE (CRITICAL — legal & ethical):",
  "- NEVER present Korean medicine, immune therapy, or integrative care as a cure for cancer or as something that 'treats/eliminates' the cancer itself.",
  "- Frame them ONLY as supportive care: recovery, quality of life, and side-effect management alongside conventional treatment.",
  "- The CORE of cancer treatment is surgery/chemotherapy at partner university hospitals. Immune/rehab care is a complementary step, not a replacement.",
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
  "- REQUIRED DOCUMENTS are FIXED. When you list them, copy ALL FIVE from [healwith 안내자료] EXACTLY — same items, same order. NEVER drop one, merge two, rename, shorten, or invent extras (no 'imaging CD', no '4 documents'). It is always exactly these five. This list is exempt from the brevity limit.",
  "- SHOW THE DOCUMENT LIST AT MOST ONCE per conversation. If you already listed the documents earlier in THIS chat, do NOT paste the list again — in one short line refer to 'the documents I listed above' and move the conversation forward. Re-asking for documents every turn (parroting) is a failure.",
  "- After listing them ONCE, add ONE line: share them with a coordinator for a free preliminary review & personalized quote.",
  "- LOGISTICS questions (flights, lodging/hotel near the hospital, the trip schedule, 'plan/optimize my trip', who books what): ANSWER substantively first — explain what healwith actually arranges (a coordinator books hospital-adjacent lodging within walking/shuttle distance, airport pickup, an interpreter, and a day-by-day schedule), and that the EXACT hotel, flight dates and timeline are finalized only after a doctor reviews the diagnosis. Give the indicative cost range only if they asked about cost. Do NOT collapse a logistics question into 'send me documents' — give real, concrete value first; the documents are at most ONE closing line, and only if not already asked.",
  "- ONLY when the patient EXPLICITLY asks the price (e.g. '얼마', 'how much', 'cost'): give just that cancer type's INDICATIVE RANGE (USD and ₩) woven into a full sentence, then ONE line that it is an estimate and the hospital sets the final price after reviewing the diagnosis. Never a single fixed number, never a bare figure, never dump the whole price list. If they did NOT ask about cost, do NOT volunteer a price — answer their real question instead.",
  // 실측 2026-07-27: 한국어 답변엔 「국내 비급여 정가 기준」이 붙었는데 같은 질문의 러시아어
  // 답변에선 통째로 빠졌다(문서 머리에 경고를 박아뒀는데도 번역하며 흘림). 우리 주 고객이
  // 러·CIS 라 이게 그대로 "내가 낼 금액"으로 읽히면 실제 분쟁이 된다 → 문서에만 두지 말고 규칙으로.
  "- KOREA DOMESTIC PRICES (센터 메뉴판 / center_menu documents in Context — 안면마비센터·수술 후 재활센터, amounts in ₩): these are KOREAN DOMESTIC self-pay list prices, NOT foreign-patient international rates. EVERY time you quote a figure from those documents you MUST add, IN THE USER'S OWN LANGUAGE, that it is the Korean domestic non-covered list price and that a foreign patient's final amount is confirmed by the hospital after a doctor reviews the case. Omitting this line for a non-Korean user is a failure, not a style choice.",
  "- Tag these with '(출처: healwith 안내자료)' (translate '출처' to the user's language).",
  "- Keep the integrative/immune framing: supportive care alongside surgery/chemo, never a cure.",
  "",
  "SAFETY:",
  "- No medical diagnosis or outcome guarantees.",
  "- healwith connects patients to Korean medical institutions and their doctors; healwith itself does not diagnose or treat.",
  "- If the user asks for a human, connect them with a healwith coordinator.",
  "- DISCLAIMER: a permanent disclaimer already shows under the chat — do NOT repeat a disclaimer every message. Only when you give specific medical or cost info, add at most ONE short clause that the medical team makes the final decision. Never a wall of legalese.",
].join("\n");

/**
 * 이 턴에 모델이 «사실»로 받은 세션 상태(로그인 여부·게스트 30일 재개·첨부 못 읽음 등).
 *
 * 왜 따로 뺐나 (2026-08-31, 반성문 #179): 이 사실들은 RAG 컨텍스트에도 안내자료에도 없고
 * 오직 시스템 프롬프트에만 있는데, 품질 판사(judge.ts)는 그 두 칸만 봤다.
 * → 모델이 여기 적힌 대로 «정확히» 답해도 판사는 "컨텍스트에 없다"며 hallucination 으로 찍었다.
 *   실측: 60일간 hallucination 53건 중 32건(60%)이 «로그인 안 했는데 저장돼?» 한 케이스,
 *   7/02~8/30 매일 1건씩 연속 오판. 30일 재개는 실제 구현이다(ThreadChat.jsx COOKIE_MAX_AGE).
 *   2026-08-28 부터 hallucination 이 ALERT_ALWAYS_FLAGS 라 매일 코디에게 가짜 경보까지 갔다.
 * ⚠️ 프롬프트와 판사가 «같은 문자열»을 봐야 어긋나지 않는다 — 여기서 한 번만 조립하고
 *   양쪽이 이 함수를 쓴다. 사실을 추가할 땐 이 함수 안에 넣어라(프롬프트에 직접 쓰면 판사가 또 못 본다).
 */
export function buildSessionFacts(session: ChatSession = {}): string {
  const { isLoggedIn = false, hasAttachments = false, channel = "web" } = session;

  // ⚠️ 30일 쿠키 재개는 «웹 위젯에서만» 참이다. 메신저엔 브라우저도 쿠키도 없다 —
  //    대신 그 대화창 자체가 스레드라 로그인과 무관하게 이어진다.
  //    여기서 안 나누면 «없는 기능»을 약속하고, 그 거짓말이 판사에게 사실로 넘어간다.
  // ⚠️ 분기를 «web 일 때만 쿠키»로 «긍정» 판정한다(«messenger 일 때만 아님»이 아니라).
  //    DB `chat_threads.channel` 값은 "telegram"|"whatsapp"|"web" 이라, 다음 사람이
  //    `channel: thread.channel` 이라고 넘기면 "telegram" 이 들어온다. 그때 미지의 값이
  //    «쿠키 안내» 쪽으로 떨어지면 그게 곧 거짓말이다 → 모르는 값은 안전한 쪽으로 보낸다.
  //    (정보가 조금 부족한 것은 괜찮지만, 없는 기능을 약속하는 것은 안 괜찮다.)
  const continuity = isLoggedIn
    // ⚠️ 「My Page 에서」라고 «진입점»을 말하지 않는다 — `/patient/chat` 페이지는 실재하지만
    //    환자 대시보드 메뉴(PatientDashboardClient MENU_ITEMS)에도 하단탭(patient/layout.jsx)에도
    //    없고 견적·메시지 화면 안쪽에서만 링크된다. 「My Page 에서 열린다」고 안내하면 환자가
    //    거기 가서 못 찾는다 = 거짓 안내이고, 이 칸에 있으면 판사가 그걸 환각으로 못 찍는다
    //    (6차 독립 리뷰). 「계정에 연결돼 어느 기기에서나 이어진다」까지가 참이다.
    ? "- The patient is LOGGED IN: the conversation is linked to their account, so it continues on ANY device once they sign in. Do NOT tell them which menu or page to open — you do not know the current navigation."
    : channel === "web"
    ? "- The patient is a GUEST (not logged in): the conversation auto-resumes for 30 days on THIS browser/device via a secure cookie. It does NOT follow them to a different device unless they leave an email or sign in."
    // 참인 사실만 적는다. 「쿠키는 없습니다」식 부정문을 넣으면 모델이 그걸 환자에게 그대로
    // 읊어 오히려 혼란을 준다 — 웹 전용 기능은 «말하지 않는 것»이 맞다.
    // ⚠️ 「기한 없음」도 안 쓴다: 코디가 스레드를 종료(resolved/closed)하면 다음 메시지는
    //    새 스레드로 가서 이전 대화를 안 물고 온다 — 그건 «끊김 없음»이 아니다(2차 리뷰 지적).
    : "- The patient is not signed in to the website, but this messenger conversation IS the thread: it stays in their chat history, so they can come back to this same chat later.";

  // ⚠️ 「코디가 어떤 경로로 후속하나」는 여기 «넣지 않는다».
  //    한때 세 갈래로 나눠 넣었다가 뺐다(4차 독립 리뷰). 이유:
  //    ① 「연락 수단이 없으면 코디가 후속할 수 없다」가 **거짓**이다 — 코디는 같은 스레드에
  //       답을 남길 수 있고(admin/chat/threads/[id]/messages) 게스트는 돌아와서 그걸 본다.
  //    ② 그 거짓 문장이 이 칸에 들어가면, 프롬프트의 첨부 하드룰(「코디가 파일을 직접 보고
  //       설명해 준다」)대로 답한 모델이 판사의 «칸과 어긋나면 환각» 규칙에 걸린다
  //       = 이 반성문이 없애려던 오탐을 «연락처» 축에 새로 만든다.
  //    ③ 후속 경로는 애초에 «세션 상태»가 아니라 «업무 절차»이고, 아래 REGISTER/PROCEED
  //       지시문이 같은 세 갈래로 이미 정확히 다룬다(중복이었다).
  //    → 이 칸엔 채널·연락처와 무관하게 «항상 참»인 것만 남긴다.

  return [
    hasAttachments
      ? "- The patient uploaded document(s)/image(s) in this chat, but the assistant CANNOT open, see, or read their contents — it only knows files were received."
      : "",
    "- This chat is saved on healwith's server the moment each message is sent. Nothing the patient typed is lost.",
    continuity,
    "- The assistant replies LIVE in this chat, right now.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildSystemPrompt(
  contextText: string,
  hasTier3: boolean,
  useWebSearch = false,
  externalSources: string[] = [],
  hospitalGuard: HospitalGuardOptions = {},
  currentMentionsCancer = true,
  session: ChatSession = {},
  outputLang: string = "en",
  docListAllowed = true,
): string {
  const hasContext = !!contextText;
  const hasDbData = contextText.includes("healwith 등록");
  const hasHira = externalSources.includes("hira");
  const hasNaver = externalSources.includes("naver");
  const { hospitalGuardActive = false, hospitalIntentNoMatch = false, hospitalRankingAsk = false } = hospitalGuard;
  const { isLoggedIn = false, hasReachableContact = false, contactInThisChannel = false, hasAttachments = false } = session;
  // 선택 언어를 모델에 명시(특히 카자흐어 ↔ 러시아어 혼동 방지 — 둘 다 키릴문자라 모델이
  // 카자흐어 사용자에게 러시아어로 답하는 일이 잦음. 핵심 타겟이라 결정적으로 못박는다).
  const LANG_NAMES: Record<string, string> = {
    ko: "Korean", en: "English", ru: "Russian", kz: "Kazakh", kk: "Kazakh", zh: "Chinese", ja: "Japanese",
  };
  const outputLangName = LANG_NAMES[outputLang] || "the user's language";

  return [
    // ── ① 고정부(캐시 접두사) — 위 STATIC_RULES. 절대 여기 위에 뭘 끼워 넣지 마라. ──
    STATIC_RULES,
    // ── ② 가변부 — 요청 상태에 따라 달라지는 것만. 상대 순서는 예전 그대로 유지. ──
    // 코드 강제 가드: 현재 메시지에 암종이 없으면 옛 화제(대장암 등)를 끌어와 단정하는
    // over-anchoring 을 막는다. 예전엔 프롬프트 «최상단»이었는데, 최상단은 캐시 접두사를 깨는
    // 자리라 여기로 옮겼다 — 프롬프트 «중간»이 아니라 사용자 메시지 바로 앞쪽이므로 지시가
    // 묻히지 않는다(원래 문제였던 건 «중간에 두면 안 꺾인다»였다). 문구는 그대로.
    !currentMentionsCancer
      ? "⚠️ TOP PRIORITY — THE USER'S CURRENT MESSAGE DOES NOT NAME A CANCER TYPE: Do NOT mention, assume, or bring up ANY specific cancer (대장암/colorectal, 유방암/breast, 폐암/lung, 위암/stomach, etc.). Earlier messages in this chat do NOT give you permission. Answer ONLY the current question, in general terms ('your cancer' / 'the treatment'), and reply in the SAME language as the user's current message."
      : "",
    // 첨부 하드룰 — 환자가 파일을 올린 스레드에서만 주입. AI는 업로드 파일을 실제로 못 보는데
    // 모델이 내용을 지어내 설명하던 환각(품질경고 4건 재현 패턴)을 원천 차단한다.
    hasAttachments
      ? [
          "UPLOADED FILES (CRITICAL — the patient uploaded document(s)/image(s) in this chat):",
          "- You CANNOT open, see, or read the contents of ANY uploaded file. You only know that files were received.",
          "- NEVER describe, summarize, translate, interpret, or GUESS what an uploaded document says — not the document type, not test names, not results, not numbers. Inventing file contents is the single worst failure.",
          "- If asked what an uploaded document says or means ('what is this paper?', 'translate it', 'explain my results', 'какой это документ?'): say honestly in ONE short line that you cannot read the uploaded files yourself, reassure that the medical team/coordinator reviews the actual files directly and will explain them, and offer to connect a coordinator.",
          "",
        ].join("\n")
      : "",
    `- LANGUAGE: The user's selected language is ${outputLangName}. Write your ENTIRE reply in ${outputLangName}, unless the user clearly writes in a different language (then match theirs). IMPORTANT: Kazakh and Russian are different languages — if the selected language is Kazakh, reply in Kazakh (қазақша), NOT Russian.`,
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
    // ⚠️ 2026-07-31 삭제: 여기 있던 "[웹 검색 - 미검증] Google Search results — '웹 검색 결과입니다'
    //    라고 밝혀라" 지시는 **거짓 라벨을 만들고 있었다.** 아래 generateText 옵션의
    //    useSearchGrounding 은 설치된 @ai-sdk/google 3.0.64 에 없는 키라 조용히 무시된다
    //    (정식 이름은 googleSearch 도구). 즉 웹 검색은 실제로 한 번도 안 돌았는데, 모델은
    //    「검색해서 찾았다」고 말하라는 지시를 받았다 → **기억으로 지어낸 내용에 「웹 검색 결과」
    //    라는 출처가 붙어 암환자에게 나갈 수 있었다.** 근거 없는 답보다 나쁜 게 가짜 출처다.
    "",
    "SESSION & IDENTITY FACTS (about THIS conversation — answer any 'will I lose this / am I logged in / how do I get a reply' question with these FACTS, never guess or improvise):",
    // ⚠️ 사실 자체는 buildSessionFacts 한 곳에서만 조립한다 — 품질 판사가 «같은 문자열»을 받아야
    //    정확한 답이 환각으로 안 찍힌다(반성문 #179). 여기 직접 사실을 추가하지 마라.
    buildSessionFacts(session),
    isLoggedIn
      ? "- Their contact is already on file — do NOT ask for an email/phone just to 'save' the chat."
      : "- So if they worry 'I'll lose this if I close it' or 'I'm not logged in so it won't be saved' — reassure them HONESTLY using ONLY the fact stated above, and do not add a device, browser, cookie or time limit that is not written there. Leaving an email or signing in is optional, never demanded.",
    // ⚠️ 「코디가 연락처로 후속한다」 절은 origin/main 그대로 여기 «지시문»으로 둔다 —
    //    사실 칸(buildSessionFacts)에 넣었다가 뺐다. 연락 수단이 없는 게스트에겐 참이 아니고,
    //    바로 아래 REGISTER/PROCEED 세 갈래가 그 경우를 정확히 갈라 다룬다(4차 리뷰).
    "- NEVER tell the patient to 'leave a message and come back later for my answer' — you respond now; a human coordinator follows up through their contact detail.",
    "",
    contactInThisChannel
      ? "- REGISTER / PROCEED: when the patient wants to formally register, submit, proceed, or book (e.g. '접수해줘', 'оформить заявку', 'I want to proceed'), the coordinator will reply RIGHT HERE in this same chat — this chat IS the contact channel. NEVER ask for an email, phone number, messenger ID, or preferred contact method, and never send them to a separate form. Reassure in 1-2 short lines: their request is registered and a healwith coordinator will follow up in this chat. Only ask for any of the 5 required documents still missing."
      : hasReachableContact
      ? "- REGISTER / PROCEED: when the patient wants to formally register, submit, proceed, or book (e.g. '접수해줘', 'оформить заявку', 'I want to proceed'), we ALREADY have a way to reach them. NEVER send them to a separate form or tell them to re-enter anything. Reassure in 1-2 short lines: their request is registered and a healwith coordinator will follow up. Only ask for any of the 5 required documents still missing. A patient who already shared their info must never be asked to start over."
      : "- REGISTER / PROCEED: when the patient wants to register, submit, proceed, or book (e.g. '접수해줘', 'I want to proceed'), we currently have NO way to reach them (no email, phone, or account on file). Do NOT claim they are 'registered' and do NOT promise 'a coordinator will contact you' — with no contact that is a FALSE promise (this caused a real complaint). Instead: warmly say you'll get them set up, and ask for ONE contact detail — an email, or a messenger ID (WhatsApp/Telegram) — so a coordinator can reach them. Reassure that this chat is already saved and reopens on this device, so nothing is lost. Ask for at most one contact + any missing required document; never make them start over.",
    // 접수/핸드오프 턴엔 서버가 답변 뒤에 확정 문구(연락 채널 확인 또는 연락처 요청)를 자동으로 덧붙인다.
    // 모델이 같은 부탁을 또 하거나(중복) "이미 다 있으니 입력 불필요"라고 단정해(모순) 한 말풍선에서 어긋나지 않게 안내.
    contactInThisChannel
      ? "- IMPORTANT (register/handoff turns): a system line is appended right AFTER your reply — it confirms the request is registered and that the coordinator will follow up in this same chat. So never ask for contact details or a preferred channel yourself, and do NOT contradict the appended line. Keep your own reply to acknowledging + any missing required documents."
      : "- IMPORTANT (register/handoff turns): a system line is appended right AFTER your reply — it confirms we received the request and either asks their PREFERRED contact channel (if we can already reach them) or asks for ONE contact (if we cannot). So do NOT duplicate that contact ask yourself, and do NOT contradict it (never say 'no need to provide anything' or 'we already have everything'). Keep your own reply to acknowledging + any missing required documents, and let the appended line handle the contact channel.",
    "",
    hospitalGuardActive ? HOSPITAL_HARD_GUARD : "",
    hospitalIntentNoMatch ? HOSPITAL_NO_MATCH_GUARD : "",
    hospitalRankingAsk ? HOSPITAL_RANKING_GUARD : "",
    "",
    // 서류 5종 나열 가드(코드 강제, 2026-07-04): 사용자가 서류/절차/비용을 묻지 않은 턴엔
    // 목록 자체를 주입하지 않는다 — 감정적 첫 메시지에 프롬프트 규칙만으론 ru·kz에서 안 꺾임(실측).
    pickCareReference(docListAllowed),
    docListAllowed
      ? ""
      : "⚠️ HARD RULE — the user did NOT ask what to prepare or how much it costs in this message: do NOT enumerate the intake document list (no numbered list of medical papers) and do NOT volunteer prices in this reply. If next steps come up, say a coordinator will guide them through the needed papers step by step — one gentle next step only.",
    hasContext
      ? "Context:\n" + (docListAllowed ? contextText : stripPriceLines(contextText))
      : "",
    useWebSearch ? "No internal or public data found. Use Google Search to find relevant Korean hospitals and treatments. Present findings concisely. ALWAYS add a disclaimer that these are unverified web search results." : "",
    hasTier3 ? "\nNote: Some info is from public sources (Tier 3) — briefly note when citing." : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// 핸드오프 의도 감지는 순수 모듈로 분리(단위테스트 가능 + CJK \b 버그 수정) — 여기선 재노출만.
export { detectHandOff } from "./handoffDetect";

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
  /** critical 레드라인 적발로 답변이 안전 대체된 경우의 flag 목록(없으면 통과) */
  redlineBlocked?: string[];
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
      // 별칭 세대 교체 생존 사다리 — thinkingBudget 거절(400) 시 설정을 낮춰 재시도.
      // (2026-07-23 실사고: gemini-flash-latest 가 새 세대로 바뀌며 전면 400 → 전 채널 AI 불능)
      const result = await callGeminiWithCompat((p) => generateText(p as any), params);
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
/**
 * 「모델을 거치지 않고 코드가 가로챈」 턴의 이름들.
 *
 * 왜 목록으로 두나 (2026-08-28): 이 세 갈래는 환자 메시지를 «모델에 보내지도 않고» 정해진 문구로
 * 답한다. 그런데 여태 그 사실이 **어디에도 안 남았다** — 답변 기록(chat_messages.metadata)에도,
 * 판사 채점에도 없어서, 잡담 거르개가 환자의 「그래」(연결 동의)를 4번 씹는 동안 아무도 몰랐다.
 * PO 가 대화 로그를 눈으로 보고서야 드러났다.
 *
 * 가로채기 자체는 필요하다(인사에 병원을 추천할 순 없다). 문제는 «몇 번 가로챘는지 셀 수 없던 것»이다.
 * 정상일 때와 오작동할 때가 똑같이 조용하면 오작동은 영영 안 보인다.
 * → 두 저장 경로(message·stream)가 이 값을 metadata.bypassed 로 남긴다.
 */
export const MODEL_BYPASS_SCORINGS = [
  "small_talk_bypass", // 짧은 인사·잡담으로 판정 (오작동 시: 환자의 짧은 «대답»을 삼킨다)
  "topic_correction_reset", // 화제 정정으로 판정
  "master_key_self_analysis", // PO 디버그용 마스터키
] as const;

/** 이 턴이 모델을 안 거쳤으면 그 이름을, 거쳤으면 null. 답변 기록에 남길 값. */
export function modelBypassKind(ragScoring: unknown): string | null {
  return typeof ragScoring === "string" && (MODEL_BYPASS_SCORINGS as readonly string[]).includes(ragScoring)
    ? ragScoring
    : null;
}

// 짧은 인사·잡담 패턴 — RAG/DB 검색 없이 자연스럽게 응답
const SMALL_TALK_PATTERNS = [
  /^(안녕|하이|hi|hello|hey|здравств|привет|сәлем|你好|嗨|こんにちは|やあ|halo|hola)[\s!?.,~]*$/i,
  /^(고마워|감사|thanks|thank\s*you|спасибо|рахмет|谢谢|ありがとう)[\s!?.,~]*$/i,
  /^(ok|okay|네|예|응|yes|yep|good|좋아요?)[\s!?.,~]*$/i,
  /^(bye|잘\s*가|안녕히|пока|до\s*свидан|再见|さようなら)[\s!?.,~]*$/i,
  /^.{1,3}$/, // 매우 짧은 메시지 (4글자 이하)
];

// 🔁 디플렉션 루프 회로차단기 (2026-06-22 루프 사고)
// 긴 스레드에서 모델이 직전 자기 답변(같은 변명·되묻기)을 반복 복사하면, 그 톤을 정답으로
// 착각해 새 질문에도 같은 답을 낸다. 최근 어시스턴트 답변들이 서로 매우 유사하면 시스템
// 프롬프트 최상단에 "너 반복하고 있다 — 멈추고 현재 질문에 직접 답하라"를 강제 주입한다.
const REPETITION_GUARD = [
  "⚠️ TOP PRIORITY — YOU ARE REPEATING YOURSELF: Your recent replies in this chat are nearly identical (the same reassurance/deflection). STOP. Do NOT produce another variation of that message. Read the user's CURRENT message literally and answer ONLY it, in different words. If you cannot answer it, say so plainly in ONE sentence and offer a coordinator — do not reassure, do not restate your role or safety rules.",
  "",
].join("\n");

function normalizeForSimilarity(s: string): string {
  // 소문자화 + 공백/구두점/기호를 단일 공백으로 → 단어 집합 비교용
  return (s || "").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, " ").trim();
}

function jaccardSimilarity(a: string, b: string): number {
  const sa = new Set(normalizeForSimilarity(a).split(" ").filter(Boolean));
  const sb = new Set(normalizeForSimilarity(b).split(" ").filter(Boolean));
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  return inter / (sa.size + sb.size - inter);
}

// 최근 어시스턴트 답변 2~3개의 평균 Jaccard 유사도가 0.5 이상이면 반복 루프로 판단.
function detectRepetitiveAssistant(messages: ChatMessage[]): boolean {
  const asst = messages
    .filter((m) => m.role === "assistant" && !!m.content && m.content.trim().length > 0)
    .slice(-3);
  if (asst.length < 2) return false;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < asst.length; i++) {
    for (let j = i + 1; j < asst.length; j++) {
      total += jaccardSimilarity(asst[i].content, asst[j].content);
      pairs++;
    }
  }
  return pairs > 0 && total / pairs >= 0.5;
}

// 직전 어시스턴트 발화가 «환자의 대답을 기다리는» 상태인가. 그렇다면 뒤따르는 "네"·"그래"는
// 잡담이 아니라 그 질문에 대한 «대답»이다. 물음표로만 판정한다(모든 언어 공통, 전각 ？ 포함).
//
// ⚠️ «끝이 물음표»가 아니라 «끝 60자 안에 물음표»다. 처음엔 끝 글자만 봤는데 실측에서 틀렸다:
//    실DB(chat_messages) AI 답변 524건 중 물음표가 있는 건 286건인데 그중 «끝»에 있는 건 174건뿐
//    (61%)이다. 나머지 112건은 우리 프롬프트가 시킨 대로 「질문? + 알려주시면 안내하겠습니다」로
//    끝나 맺음말이 물음표 뒤에 붙는다. 끝 글자만 보면 «대답을 기다리는» 답변의 39%를 놓친다.
//    끝 60자면 286건 중 261건(91%)을 잡고, 「아무 데나 물음표」(286건)와는 25건 차이라 넓히는
//    비용이 거의 없다. 판정이 넓어서 생기는 최악은 "네"가 모델로 넘어가는 것(=원래 하려던 일)이고,
//    좁아서 생기는 최악은 환자의 «연결해 달라»는 동의가 통째로 씹히는 것이다. 비대칭이라 넓게 잡는다.
const QUESTION_TAIL_WINDOW = 60;

function lastAssistantAskedAQuestion(messages: ChatMessage[] | undefined): boolean {
  if (!messages?.length) return false;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const t = (m.content || "").trim();
    if (!t) continue;
    return /[?？]/.test(t.slice(-QUESTION_TAIL_WINDOW));
  }
  return false;
}

// ⚠️ messages 를 반드시 같이 넘겨라. 이 판정은 «현재 메시지만» 보면 틀린다.
//    2026-08-28 PO 제보(#30bfcc04): AI 가 "코디네이터 연결을 도와드릴까요?" 라고 물은 직후
//    환자가 "그래"(2자) → SMALL_TALK_PATTERNS 의 3자 이하 규칙에 걸려 모델을 거치지도 않고
//    "더 자세히 말씀해 주시면…" 고정문구가 나갔다. 같은 스레드에서 4번 반복됐고, 그중 3번이
//    «연결해 달라는 동의»와 «연락처를 주겠다는 동의»였다 — 접수 직전에 대화가 원점으로 돌아갔다.
//    환자가 "연결해줘요"(5자)라고 길게 다시 쳐서야 넘어갔다.
export function isSmallTalk(text: string, messages?: ChatMessage[]): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  if (!SMALL_TALK_PATTERNS.some((p) => p.test(trimmed))) return false;
  // 우리가 방금 물어봤다면 짧은 답도 답이다 → 모델에게 넘긴다.
  return !lastAssistantAskedAQuestion(messages);
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

function correctionResult(reply: string, t0: number): ChatReplyResult {
  return {
    reply,
    ragChunks: [],
    _analytics: {
      retrievedPatternIds: [],
      usedPatternIds: [],
      declaredUsedPatternIds: [],
      analyticsFallback: false,
      ragScoring: "topic_correction_reset",
      latencyMs: Date.now() - t0,
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 🔑 마스터키 '힐로' / 'healo' — AI 에이전트 자기분석(self-audit) 모드
// ───────────────────────────────────────────────────────────────────────────
// 왜: PO가 에이전트와 직접 테스트 대화를 한 뒤, 그 대화 로그를 근거로 "왜 그렇게
// 답했나 / 무슨 문제가 있었나 / 개선점을 어떻게 도출했나 / 뭘 고쳐야 하나"를
// 6하원칙으로 받아보기 위함. 사용자가 '힐로'(또는 '힐로 <추가지시>')를 입력하면
// 일반 RAG 흐름을 건너뛰고 지금까지의 '전체 스레드'를 모델에게 자기점검시킨다.
// 채팅(공개)·어드민(/admin/khidi/agent-analysis) 양쪽이 generateMasterKeyAnalysis 공유.
//
// 트리거: 메시지가 트리거어로 시작 + 그 뒤가 끝/공백/구두점.
// '힐로분석'처럼 바로 글자가 붙으면 일반 질의로 취급(오탐 방지).
// ⚠️ 트리거어에서 라틴 'healo' 제거(2026-07-02 전수 감사): 옛 브랜드명이라 실사용자
// (특히 러/영어권)가 'Healo, ...'로 말을 시작하면 한국어 내부 자기분석이 그대로 노출됐음.
// 기본은 한국어 '힐로'(PO 디버그용 — 실환자 입력과 충돌 확률 사실상 0),
// env CHAT_MASTER_KEY_WORD 로 비공개 키워드 교체 가능.
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const MASTER_KEY_WORD = (process.env.CHAT_MASTER_KEY_WORD || "힐로").trim();
const MASTER_KEY_RE = new RegExp(`^(${escapeRe(MASTER_KEY_WORD)})([\\s,.:!?~·]|$)`, "i");

export function isMasterKey(text: string): boolean {
  return MASTER_KEY_RE.test((text || "").trim());
}

// 트리거어를 제거한 나머지 = 운영자의 추가 분석 지시(예: "힐로 마지막 답변만" → "마지막 답변만").
function masterKeyExtra(text: string): string {
  return (text || "").trim().replace(MASTER_KEY_RE, "").trim();
}

const MASTER_KEY_NO_MODEL =
  "지금 자기분석을 만들 수 없어요(AI 모델 키 미설정). 잠시 후 다시 시도해 주세요.";
const MASTER_KEY_EMPTY =
  "분석할 대화 내용이 아직 없어요. 에이전트와 먼저 몇 마디 대화한 뒤 '힐로'를 입력해 주세요.";
const MASTER_KEY_ERROR =
  "죄송합니다, 자기분석 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";

const MASTER_KEY_TRANSCRIPT_LIMIT = 60;

function buildMasterKeySystemPrompt(extra: string): string {
  return [
    "당신은 healwith AI 의료 컨시어지 에이전트의 '내부 품질 분석가'입니다. 코드네임 '힐로'.",
    "아래 대화 기록에서 '에이전트(AI)'가 실제로 한 답변들을 환자 입장에서 냉정하게 자기점검(self-audit)하세요.",
    "이 출력은 PO(운영자)의 테스트·디버그용이며 환자에게 나가지 않습니다. 잘한 점도 짚되, 문제를 절대 미화하지 말고 솔직·비판적으로 쓰세요.",
    "",
    "반드시 한국어로 작성하세요. 가벼운 서식만 렌더됩니다 — **굵게**(핵심 1~2단어), '- ' 글머리, '1. 2. 3.' 번호(항목마다 줄바꿈), 빈 줄 문단. ##·---·표·백틱은 렌더 안 되니 쓰지 마세요.",
    "[⚠️오류폴백] 표시가 붙은 에이전트 메시지는 모델이 빈 응답을 내서 안내문으로 대체된 '실패한 턴'입니다. 이런 턴이 있으면 반드시 문제로 짚으세요.",
    "",
    "다음 구조 그대로 출력하세요:",
    "",
    "🔑 힐로 자기분석",
    "",
    "1) 대화 요약",
    "- 환자가 무엇을 원했는지, 에이전트가 전체적으로 어떻게 응대했는지 2~3줄.",
    "",
    "2) 답변별 6하원칙 분석",
    "- 문제가 있었거나 중요한 에이전트 답변을 1~3개 골라 각각 아래 6가지를 한 줄씩:",
    "  · 무엇을(What): 그 답변이 실제로 한 말 요약",
    "  · 누가·언제·어디서(Who/When/Where): 몇 번째 턴, 어떤 질문 직후의 답인지 맥락",
    "  · 왜(Why): 왜 그렇게 답했는지 추정 근거(RAG 컨텍스트 유무, 가드룰 발동, 질문을 좁게/넓게 해석, 안전 레드라인 회피 등 — 모르면 '추정'이라 표기)",
    "  · 무슨 문제(Problem): 그 답변의 문제·리스크(환각, 화제 이탈, 과도하게 김/짧음, 가격 선노출, 공감 부족, 언어 불일치, 빈응답 등). 문제 없으면 '문제 없음'.",
    "  · 어떻게 도출(How): 그 문제에서 개선점을 끌어낸 한 줄 논리",
    "  · 개선안(Fix): 구체적으로 무엇을 어떻게 바꿔야 하는지(프롬프트 규칙 추가·수정, RAG 보강, 가드 추가 등)",
    "",
    "3) 종합 개선 우선순위",
    "- 가장 먼저 고쳐야 할 것 1~3개를 중요도 순으로.",
    "",
    "대화에 실제로 나타난 내용에만 근거하세요. 추측은 '추정'이라고 명시하고 사실을 지어내지 마세요.",
    extra ? `\n운영자 추가 지시: ${extra}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// 분석용 대화 기록 구성 — 전체 스레드를 DB에서 직접 읽는다(라우트가 모델에 넘기는 최근 12개
// 한계·오류폴백 필터를 우회). 빈응답 폴백·자료ACK까지 태그로 포함해 '실패한 턴'도 분석 대상에 넣는다.
async function buildThreadTranscript(
  threadId: string | undefined,
  fallback: ChatMessage[]
): Promise<string> {
  if (threadId) {
    try {
      const { data } = await (supabaseAdmin as any)
        .from("chat_messages")
        .select("actor_type, message_text, metadata, created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(MASTER_KEY_TRANSCRIPT_LIMIT);
      if (data?.length) {
        const lines: string[] = [];
        let turn = 0;
        for (const m of data as any[]) {
          const text = String(m.message_text || "").trim();
          if (!text) continue;
          // 마스터키 트리거 입력 자체는 분석 대상에서 제외
          if (m.actor_type === "patient" && isMasterKey(text)) continue;
          turn += 1;
          const who =
            m.actor_type === "patient"
              ? "환자(USER)"
              : m.actor_type === "admin"
              ? "코디(HUMAN)"
              : "에이전트(AI)";
          const tags: string[] = [];
          if (m?.metadata?.ai_error) tags.push("⚠️오류폴백");
          if (m?.metadata?.attachment_ack) tags.push("자료접수안내");
          const tag = tags.length ? ` [${tags.join(", ")}]` : "";
          lines.push(`[${turn}] ${who}${tag}: ${text}`);
        }
        if (lines.length) return lines.join("\n");
      }
    } catch (e: any) {
      console.error("[masterKey] transcript fetch failed:", e?.message);
    }
  }
  // 폴백: 라우트가 넘긴 메시지(최근 N개)만으로 구성
  return fallback
    .filter((m) => !(m.role === "user" && isMasterKey(m.content)))
    .map((m, i) => {
      const who =
        m.role === "user" ? "환자(USER)" : m.role === "assistant" ? "에이전트(AI)" : "시스템";
      return `[${i + 1}] ${who}: ${m.content}`;
    })
    .join("\n");
}

/**
 * 마스터키 자기분석 생성 — 채팅(공개)·어드민(/admin/khidi/agent-analysis) 공용.
 * onChunk 가 주어지면 스트리밍(streamText), 없으면 단발(generateText)로 동작한다.
 */
export async function generateMasterKeyAnalysis(
  threadId: string | undefined,
  fallbackMessages: ChatMessage[],
  extra: string,
  onChunk?: (text: string) => void
): Promise<{ reply: string; ok: boolean }> {
  const model = getModel();
  if (!model) {
    onChunk?.(MASTER_KEY_NO_MODEL);
    return { reply: MASTER_KEY_NO_MODEL, ok: false };
  }

  const transcript = await buildThreadTranscript(threadId, fallbackMessages);
  if (!transcript.trim()) {
    onChunk?.(MASTER_KEY_EMPTY);
    return { reply: MASTER_KEY_EMPTY, ok: false };
  }

  const params: any = {
    model,
    system: buildMasterKeySystemPrompt(extra),
    // 자기분석은 일반 답변보다 길어질 수 있어 상한을 넉넉히. thinkingBudget:0 으로 비용은 고정.
    maxOutputTokens: 4096,
    providerOptions: {
      google: {
        thinkingConfig: { thinkingLevel: "minimal" },
        safetySettings: SAFETY_SETTINGS as any,
      },
    },
    messages: [{ role: "user", content: "다음은 분석할 대화 기록입니다:\n\n" + transcript }],
  };

  try {
    if (onChunk) {
      let full = "";
      try {
        // 사다리 연결 + fullStream 소비(에러 파트는 textStream 이 삼킴 — 독립 리뷰 F1·F4).
        await callGeminiWithCompat(async (p) => {
          if (full) return null; // 일부 전송됨 → 재시도 금지
          const sr = streamText(p as any);
          for await (const part of sr.fullStream as any) {
            if (part?.type === "text-delta") {
              const t = String(part.text ?? "");
              if (!t) continue;
              full += t;
              onChunk(t);
            } else if (part?.type === "error") {
              const cause: any = part.error;
              const err: any = cause instanceof Error ? cause : new Error(String(cause?.message ?? cause));
              if (!full) throw err;
              break;
            }
          }
          return null;
        }, params);
      } catch (e: any) {
        console.warn(`[masterKey] stream error: ${String(e?.message || e).slice(0, 120)}`);
      }
      if (!full.trim()) {
        const r = await generateTextWithRetry(params, 2).catch(() => null);
        const t = (r?.text || "").trim();
        if (t) {
          full = t;
          onChunk(t);
        }
      }
      if (!full.trim()) {
        onChunk(MASTER_KEY_ERROR);
        return { reply: MASTER_KEY_ERROR, ok: false };
      }
      return { reply: full, ok: true };
    }

    const result = await generateTextWithRetry(params);
    const text = (result?.text || "").trim();
    return { reply: text || MASTER_KEY_ERROR, ok: !!text };
  } catch (e: any) {
    console.error("[generateMasterKeyAnalysis] error:", e?.message);
    onChunk?.(MASTER_KEY_ERROR);
    return { reply: MASTER_KEY_ERROR, ok: false };
  }
}

function masterKeyResult(reply: string, t0: number): ChatReplyResult {
  return {
    reply,
    ragChunks: [],
    _analytics: {
      retrievedPatternIds: [],
      usedPatternIds: [],
      declaredUsedPatternIds: [],
      analyticsFallback: false,
      ragScoring: "master_key_self_analysis",
      latencyMs: Date.now() - t0,
    },
  };
}

// 검색(DB+RAG+외부) → 컨텍스트 → 시스템 프롬프트 → 생성설정까지의 공통 준비 단계.
// generateChatReply(비스트리밍)와 streamChatReply(스트리밍)가 동일 로직을 공유해 분기로 인한
// 품질 드리프트를 막는다. systemPrompt 에는 JSON 출력 지시를 붙이지 않음(호출자가 결정).
interface PreparedGeneration {
  model: any | null;
  systemPrompt: string;
  genConfig: { maxOutputTokens: number; providerOptions: any };
  ragChunks: any[];
  injectedPatternIds: string[];
  retrievedPatternIds: string[];
  /**
   * 판사에게 넘길 컨텍스트. 비용을 안 물은 턴엔 모델도 가격 줄이 빠진 컨텍스트를 보므로
   * 판사에게도 같은 걸 준다 — 안 그러면 모델이 못 본 가격 줄을 판사가 「근거 있음」으로 봐서
   * 「안 물었는데 가격 흘림」 검출이 헐거워진다.
   */
  judgeContext: string;
  ragScoring: string;
  /** 이 턴에 실제 주입된 안내자료 판(전체 or 가격 뺀 축약). 품질 판사에게 같은 걸 보여준다. */
  careReference: string;
  /** 이 턴에 시스템 프롬프트가 «사실»로 준 세션 상태. 판사에게 같은 문자열을 보여준다(반성문 #179). */
  sessionFacts: string;
}

async function prepareGeneration(
  query: string,
  lang: string,
  threadId?: string,
  session: ChatSession = {}
): Promise<PreparedGeneration> {
  // 1단계: healwith DB 직접 검색 (최우선) + RAG 벡터 검색 (병렬 실행)
  const [dbResult, ragChunks] = await Promise.all([
    searchHospitalsAndTreatments(query).catch((e) => {
      console.error("[generateReply] db search failed:", e);
      return { context: "", hospitalCount: 0, treatmentCount: 0 } as const;
    }),
    fetchRagChunks(query, lang, threadId),
  ]);

  const ragScoring = ragChunks.length > 0 ? "vector_cosine_similarity" : "no_results";
  const { text: contextText, hasTier3, usedPatternIds: injectedPatternIds } = buildContext(ragChunks);
  const dbContext = dbResult.context;
  const matchedHospitalNames = (dbResult as any).matchedHospitalNames ?? [];
  const hospitalMatchType = (dbResult as any).hospitalMatchType ?? "none";

  // 6개 언어 병원 키워드(topicGuards.mentionsHospital) — 옛 인라인 정규식은 ko·en 전용이라
  // ru·kz·zh·ja 병원 질문에 가드가 안 켜졌음(2026-07-04 kz 가격 쇼핑목록 실측 결함).
  const hospitalIntent = mentionsHospital(query) || matchedHospitalNames.length > 0;
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
  // 안내자료 판 선택은 여기서 «한 번만» 한다 — buildSystemPrompt 와 품질 판사가 같은 판을 봐야 한다.
  // (두 곳에서 따로 고르면 한쪽만 바뀌어 판사가 엉뚱한 자료로 채점한다.)
  const docListAllowed = asksDocsOrProcess(query);
  const systemPrompt = buildSystemPrompt(allContext, hasTier3, useWebSearch, externalSources, {
    hospitalGuardActive,
    hospitalIntentNoMatch: hospitalIntent && matchedHospitalNames.length === 0,
    hospitalRankingAsk: asksHospitalRanking(query),
  }, mentionsCancerType(query), session, lang, docListAllowed);
  const retrievedPatternIds = extractRetrievedPatternIds(ragChunks);
  const model = getModel();

  return {
    model,
    systemPrompt,
    genConfig: {
      // 비용·가독성 가드 + 빈답/잘림 방어 (thinkingBudget:0, 상한 8192) — 상세는 아래 주석 참조.
      maxOutputTokens: 8192,
      providerOptions: {
        google: {
          thinkingConfig: { thinkingLevel: "minimal" },
          safetySettings: SAFETY_SETTINGS as any,
          ...(useWebSearch ? { useSearchGrounding: true } : {}),
        },
      },
    },
    ragChunks,
    injectedPatternIds,
    retrievedPatternIds,
    judgeContext: docListAllowed ? allContext : stripPriceLines(allContext),
    ragScoring,
    careReference: pickCareReference(docListAllowed),
    sessionFacts: buildSessionFacts(session),
  };
}

export async function generateChatReply(
  messages: ChatMessage[],
  query: string,
  lang: string,
  threadId?: string,
  session: ChatSession = {}
): Promise<ChatReplyResult> {
  const t0 = Date.now();
  let ragScoring = "none";

  // 🔑 마스터키 '힐로'/'healo' — 일반 답변 대신 전체 스레드 자기분석을 반환(PO 디버그 전용)
  if (isMasterKey(query)) {
    const { reply } = await generateMasterKeyAnalysis(threadId, messages, masterKeyExtra(query));
    return masterKeyResult(reply, t0);
  }

  // 짧은 인사·잡담 — RAG 검색 없이 즉시 응답
  if (isSmallTalk(query, messages)) {
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

  // 화제 정정("그거 안 물어봤다 / 아니라고") — 모델을 거치면 누적된 옛 화제(대장암)를 또 우기므로
  // 결정적 사과+재질문으로 화제를 리셋한다. 정정 문장 속 암종어는 "거부 대상"이라 게이트하지
  // 않는다("난 대장암 안 물어봤는데"=대장암 거부). "A 말고 B"처럼 새 화제를 주는 건 패턴에서 제외됨.
  if (isTopicCorrection(query)) {
    return correctionResult(correctionReply(lang), t0);
  }

  // 🔒 데이터 주권: 외부 LLM(Gemini)으로 보내기 전 환자 자유텍스트의 고신뢰 식별자
  // (이메일·전화·주민번호·여권)를 가린다. 임베딩·검색·생성·judge 전 경로가 마스킹본을 쓴다.
  const safeQuery = redactModelPii(query);
  const safeMessages = redactMessagesForModel(messages);

  try {
    const prep = await prepareGeneration(safeQuery, lang, threadId, session);
    ragScoring = prep.ragScoring;
    const { ragChunks, injectedPatternIds, retrievedPatternIds, judgeContext, careReference, sessionFacts } = prep;

    if (!prep.model) {
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

    // 🔁 반복 루프 감지 시 최상단 강제 지시 주입(자기 답변 복사 차단)
    const baseSystem = detectRepetitiveAssistant(safeMessages)
      ? REPETITION_GUARD + prep.systemPrompt
      : prep.systemPrompt;
    const fullSystemPrompt = injectedPatternIds.length > 0
      ? baseSystem + "\n\n" + JSON_OUTPUT_INSTRUCTION
      : baseSystem;

    const baseParams = {
      model: prep.model,
      system: fullSystemPrompt,
      ...prep.genConfig,
    };

    let result = await generateTextWithRetry({ ...baseParams, messages: safeMessages as any });

    // 🔁 빈 응답 복구(핵심 수정 2026-06-21): 대화 기록이 길고 반복적으로 쌓이면 Gemini 가
    // finishReason=stop 으로 빈 텍스트를 반환한다(A/B 실측: 새 스레드 0/12 vs 기록누적 스레드 2/12).
    // 원인은 "모델이 직전 자기 답변을 다시 보고 '이미 답했음'으로 종료"하는 것 → 직전 어시스턴트
    // 답변을 포함해 재시도하면(slice(-2)) 똑같이 빈다(14/24 재현). 그래서 복구는 마지막 사용자
    // 질문 1건만 보낸다(slice(-1)) — 새 스레드와 동일 조건이라 위 A 테스트에서 빈응답 0%.
    // 트레이드오프: 직전 맥락 없이 답하지만, 빈 말풍선보다 낫다(이 경로는 빈 응답일 때만 탐).
    const lastUser = [...safeMessages].reverse().find((m) => m.role === "user");
    if ((!result?.text || !result.text.trim()) && lastUser && safeMessages.length > 1) {
      console.warn(
        `[generateChatReply] empty after retries (finishReason=${(result as any)?.finishReason}) ` +
        `— retrying with last user message only (of ${safeMessages.length} msgs)`
      );
      const reducedResult = await generateTextWithRetry({ ...baseParams, messages: [lastUser] as any }, 2);
      if (reducedResult?.text && reducedResult.text.trim()) result = reducedResult;
    }

    // 💰 사용량·비용 계측 (fire-and-forget — 실패해도 응답 무관). 어드민 '외부 서비스 사용량' 화면 데이터.
    logAiUsage({
      surface: session.isRegressionTest ? "regression_generate" : "public_chat",
      model: getModelName(),
      usage: (result as any)?.usage,
      providerMetadata: (result as any)?.providerMetadata,
      meta: { mode: "generate", structured: injectedPatternIds.length > 0 },
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
        `query="${safeQuery.slice(0, 60)}"`
      );
      finalReply = EMPTY_REPLY_FALLBACK[lang] || EMPTY_REPLY_FALLBACK.en;
      // finishReason 을 에러코드에 실어 다음 발생 시 원인(SAFETY/MAX_TOKENS/…)을 API 응답·메타데이터에서 바로 확인 가능하게.
      emptyError = `empty_model_text:${(result as any)?.finishReason ?? "unknown"}`;
    }

    // 🚨 송출 전 레드라인 게이트(0층 가드) — judge(비동기·사후)에만 의존하지 않는다.
    // 비스트리밍 경로는 아직 환자에게 안 보냈으므로 critical(완치·약물·예후 단정) 적발 시
    // 위험 답변을 안전 대체문구로 통째 교체(노출 0) + 플래그로 코디 검수 유도.
    let redlineFlags: string[] | undefined;
    const preScan = scanRedlines(finalReply);
    if (preScan.critical) {
      console.warn(`[generateChatReply] REDLINE blocked: ${preScan.flags.join(",")}`);
      finalReply = safeDeferralMessage(lang);
      redlineFlags = preScan.flags;
    }

    const finalResult: ChatReplyResult = {
      reply: finalReply,
      ragChunks,
      ...(emptyError ? { error: emptyError } : {}),
      ...(redlineFlags ? { redlineBlocked: redlineFlags } : {}),
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
    if (!session.isRegressionTest) runJudgeInBackground({
      query: safeQuery,
      response: finalReply,
      context: judgeContext || undefined,
      officialReference: careReference,
      sessionFacts,
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

/**
 * 스트리밍 AI 응답 생성 — 토큰을 받는 즉시 onChunk 로 흘려보내 체감 지연을 줄인다.
 * 비스트리밍 generateChatReply 와 동일한 검색·프롬프트(prepareGeneration)를 공유한다.
 *
 * 차이점(의도된 트레이드오프):
 * - 평문만 스트리밍하므로 JSON 출력(used_pattern_ids 선언)을 쓰지 않는다 → playbook 사용
 *   분석은 fallback(회수=사용 간주)로 기록. 정밀 귀속이 필요하면 비스트리밍 경로를 쓴다.
 * - 빈 응답이면 마지막 사용자 메시지만으로 비스트리밍 1회 복구 시도 후, 그래도 비면 안내문 치환.
 *
 * @returns 스트림이 끝난 뒤의 최종 결과(reply 전문 + 분석). onChunk 콜백으로 토큰이 전달됨.
 */
export async function streamChatReply(
  messages: ChatMessage[],
  query: string,
  lang: string,
  threadId: string | undefined,
  onChunk: (text: string) => void,
  session: ChatSession = {}
): Promise<ChatReplyResult> {
  const t0 = Date.now();
  let ragScoring = "none";

  // 🔑 마스터키 '힐로'/'healo' — 전체 스레드 자기분석을 스트리밍으로 반환(PO 디버그 전용)
  if (isMasterKey(query)) {
    const { reply } = await generateMasterKeyAnalysis(threadId, messages, masterKeyExtra(query), onChunk);
    return masterKeyResult(reply, t0);
  }

  // 짧은 인사·잡담 — RAG 검색 없이 즉시 응답(한 덩어리로 스트림)
  if (isSmallTalk(query, messages)) {
    const reply = smallTalkReply(query, lang);
    onChunk(reply);
    return {
      reply,
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

  // 화제 정정 — 모델 미경유 결정적 사과+재질문(누적 over-anchoring 방지). 비스트림과 동일 규칙.
  if (isTopicCorrection(query)) {
    const reply = correctionReply(lang);
    onChunk(reply);
    return correctionResult(reply, t0);
  }

  // 🔒 데이터 주권: 외부 LLM 전송 전 환자 자유텍스트의 고신뢰 식별자 마스킹(비스트림과 동일).
  const safeQuery = redactModelPii(query);
  const safeMessages = redactMessagesForModel(messages);

  try {
    const prep = await prepareGeneration(safeQuery, lang, threadId, session);
    ragScoring = prep.ragScoring;
    const { ragChunks, injectedPatternIds, retrievedPatternIds, judgeContext, careReference, sessionFacts } = prep;

    if (!prep.model) {
      const reply = "I'm sorry, the AI service is temporarily unavailable. Please try again later.";
      onChunk(reply);
      return {
        reply,
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

    // 🔁 반복 루프 감지 시 최상단 강제 지시 주입(자기 답변 복사 차단)
    const baseSystem = detectRepetitiveAssistant(safeMessages)
      ? REPETITION_GUARD + prep.systemPrompt
      : prep.systemPrompt;
    // 스트리밍은 평문만 보냄 → JSON 출력 지시 미부착(비스트리밍과의 유일한 프롬프트 차이).
    const baseParams = {
      model: prep.model,
      system: baseSystem,
      ...prep.genConfig,
    };

    let fullText = "";
    let finishReason: any = undefined;
    let usageForLog: any = undefined; // 💰 사용량 계측용(스트림 usage 또는 fallback usage)
    let providerMetaForLog: any = undefined; // 💰 캐시 적중 토큰이 여기로만 오는 SDK 버전 대비
    try {
      // 별칭 세대 교체 생존 사다리 — ⚠️ ai@6 의 streamText 는 API 오류(400 포함)를 throw 하지
      // 않고 스트림의 error 파트로 흘리며, textStream 은 그 파트를 조용히 버린다(독립 리뷰
      // F1, node_modules/ai/dist 실소스 확인). 그래서 fullStream 을 소비해 error 파트를 직접
      // 잡고, 첫 토큰 전이면 던져서 사다리가 다음 칸으로 강등하게 한다. 토큰 일부가 이미
      // 나간 뒤의 오류는 기존처럼 부분 출력을 유지하고 종료(출력 중복 방지).
      await callGeminiWithCompat(async (p) => {
        if (fullText) return null; // 일부 전송됨 → 재시도 금지
        const sr = streamText({ ...p, messages: safeMessages } as any);
        for await (const part of sr.fullStream as any) {
          if (part?.type === "text-delta") {
            const t = String(part.text ?? "");
            if (!t) continue;
            fullText += t;
            try {
              onChunk(t);
            } catch (consumerErr: any) {
              // 소비자(SSE enqueue 등) 오류는 모델 파라미터 문제가 아니다 — 사다리 강등·
              // memo 오염을 막기 위해 param-rejection 으로 절대 분류되지 않는 형태로 던진다(F3).
              console.warn(
                `[streamChatReply] onChunk 소비자 오류: ${String(consumerErr?.message || consumerErr).slice(0, 120)}`
              );
              throw new Error("stream_consumer_error");
            }
          } else if (part?.type === "error") {
            const cause: any = part.error;
            const err: any = cause instanceof Error ? cause : new Error(String(cause?.message ?? cause));
            if (!fullText) throw err; // 첫 토큰 전 → 사다리로(파라미터 거절이면 강등 재시도)
            console.warn(
              `[streamChatReply] mid-stream error(부분 출력 유지): ${String(err?.message || err).slice(0, 120)}`
            );
            break;
          }
        }
        try {
          finishReason = await sr.finishReason;
        } catch {
          /* finishReason 조회 실패는 무시 */
        }
        try {
          usageForLog = await sr.usage;
        } catch {
          /* usage 조회 실패는 무시(계측만 영향) */
        }
        try {
          providerMetaForLog = await sr.providerMetadata;
        } catch {
          /* providerMetadata 조회 실패는 무시(계측만 영향) */
        }
        return null;
      }, baseParams);
    } catch (e: any) {
      console.warn(`[streamChatReply] stream error: ${String(e?.message || e).slice(0, 120)}`);
    }

    // 🔁 빈 응답 복구: 스트림이 비면(안전필터·기록누적 등) 마지막 사용자 메시지만으로 비스트리밍 1회.
    if (!fullText.trim() && safeMessages.length > 1) {
      const lastUser = [...safeMessages].reverse().find((m) => m.role === "user");
      if (lastUser) {
        console.warn(
          `[streamChatReply] empty stream (finishReason=${finishReason}) — retrying with last user message only`
        );
        const reduced = await generateTextWithRetry(
          { ...baseParams, messages: [lastUser] as any },
          2
        ).catch(() => null);
        if (reduced?.text && reduced.text.trim()) {
          fullText = reduced.text;
          finishReason = (reduced as any)?.finishReason ?? finishReason;
          usageForLog = (reduced as any)?.usage ?? usageForLog;
          providerMetaForLog = (reduced as any)?.providerMetadata ?? providerMetaForLog;
          onChunk(fullText);
        }
      }
    }

    // 🛟 최종 안전망: 그래도 비면 6개 언어 안내로 치환.
    let emptyError: string | undefined;
    if (!fullText.trim()) {
      console.error(
        `[streamChatReply] EMPTY reply — finishReason=${finishReason} query="${safeQuery.slice(0, 60)}"`
      );
      fullText = EMPTY_REPLY_FALLBACK[lang] || EMPTY_REPLY_FALLBACK.en;
      onChunk(fullText);
      emptyError = `empty_model_text:${finishReason ?? "unknown"}`;
    }

    const result: ChatReplyResult = {
      reply: fullText,
      ragChunks,
      ...(emptyError ? { error: emptyError } : {}),
      _analytics: {
        retrievedPatternIds,
        // 스트리밍은 JSON 선언이 없으므로 회수=사용으로 간주(fallback)
        usedPatternIds: injectedPatternIds,
        declaredUsedPatternIds: [],
        analyticsFallback: true,
        ragScoring,
        latencyMs: Date.now() - t0,
      },
    };

    // 💰 사용량·비용 계측 (fire-and-forget). 스트림 usage 가 없으면 토큰 미상으로 기록(호출 수만 집계).
    logAiUsage({
      surface: session.isRegressionTest ? "regression_generate" : "public_chat",
      model: getModelName(),
      usage: usageForLog,
      providerMetadata: providerMetaForLog,
      meta: { mode: "stream" },
    });

    // Judge: 메인 흐름 차단 없이 백그라운드 평가
    if (!session.isRegressionTest) runJudgeInBackground({
      query: safeQuery,
      response: fullText,
      context: judgeContext || undefined,
      officialReference: careReference,
      sessionFacts,
      lang,
      messageId: null,
      threadId: threadId ?? null,
    });

    return result;
  } catch (err: any) {
    console.error("[streamChatReply] error:", err.message);
    const reply = "I'm sorry, something went wrong. Please try again.";
    onChunk(reply);
    return {
      reply,
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
