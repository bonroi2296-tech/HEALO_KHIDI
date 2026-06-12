/**
 * ✅ P0 수정: 런타임 명시 (Node.js)
 * ✅ 운영 안정화: Rate limit + 운영 로그 추가
 * 
 * 이유:
 * - 암호화 처리 (Node.js crypto 의존)
 * - DB 관리자 접근 (SERVICE_ROLE_KEY 사용)
 * - LLM API 호출 (OpenAI/Google)
 * - Edge 런타임에서 발생할 수 있는 예측 불가 오류 방지
 * - 봇/도배 방지 및 운영 추적성 확보
 */
export const runtime = "nodejs";

import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { supabaseAdmin, assertSupabaseEnv } from "../../../src/lib/rag/supabaseAdmin";
import { checkRateLimit, getClientIp, RATE_LIMITS, getRateLimitHeaders } from "../../../src/lib/rateLimit";
import { logRateLimitExceeded, logEncryptionFailed, logOperational } from "../../../src/lib/operationalLog";
import { trackFunnelEvent } from "../../../src/lib/events/funnelTracking";
import { checkBlockRate } from "../../../src/lib/alerts/operationalAlerts";
import {
  createEmptyIntake,
  computeMissingFields,
  computeExtractionConfidence,
  type Intake,
  type IntakeMeta,
} from "../../../src/lib/intakeSchema";
import {
  bodyPartFromText,
  contraindicationsAndFlagsFromMessage,
  extractTimelineFromQuery,
  extractBudgetFromQuery,
  extractDurationFromQuery,
  extractSeverityFromQuery,
} from "../../../src/lib/intakeExtract";
import { encryptStringNullable } from "../../../src/lib/security/encryptionV2";
import { safeRagSearch } from "../../../src/lib/rag/safeSearch";
import { searchHospitalsAndTreatments } from "../../../src/lib/chat/dbSearch";
import { searchExternal } from "../../../src/lib/chat/externalSearch";

type ChatMessage = { role: string; content: string };

const isProd = process.env.NODE_ENV === "production";

const jsonError = (
  status: number,
  code: string,
  detail?: string,
  meta?: Record<string, any>
) => {
  console.error(`[api/chat] jsonError ${status} ${code}:`, detail, meta);
  return Response.json(
    {
      ok: false,
      error: code,
      // 에러 원문(detail)은 내부 정보 유출 방지를 위해 개발 환경에서만 응답에 포함
      ...(isProd ? {} : { detail: detail || undefined, meta }),
    },
    { status }
  );
};

const getModel = () => {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error("[api/chat] GOOGLE_GENERATIVE_AI_API_KEY is missing");
    return { error: jsonError(500, "google_key_missing", "GOOGLE_GENERATIVE_AI_API_KEY is missing") };
  }
  return { model: google("gemini-2.5-flash") as any };
};

const getModelName = () => "gemini-2.5-flash";

const classifyGoogleError = (error: any) => {
  const message = String(error?.message || "");
  const lower = message.toLowerCase();

  if (lower.includes("api key")) {
    return { status: 401, code: "google_invalid_key", message };
  }
  if (lower.includes("quota") || lower.includes("insufficient")) {
    return { status: 402, code: "google_quota_exceeded", message };
  }
  if (lower.includes("permission") || lower.includes("access")) {
    return { status: 403, code: "google_access_denied", message };
  }
  if (lower.includes("rate limit")) {
    return { status: 429, code: "google_rate_limited", message };
  }
  return { status: 502, code: "google_error", message };
};

const TIER_LABELS: Record<number, string> = {
  1: "Official",
  2: "Partner-verified",
  3: "Public source",
};

const buildContext = (chunks: Array<any>) => {
  if (!Array.isArray(chunks) || chunks.length === 0) return { text: "", hasTier3: false };
  let hasTier3 = false;
  const lines = chunks.map((c) => {
    const tier = c?.trust_tier ?? 3;
    if (tier >= 3) hasTier3 = true;
    const tierLabel = TIER_LABELS[tier] || TIER_LABELS[3];
    const sourceLabel = c?.source_label || c?.rag_documents?.source_type || "unknown";
    const title = c?.rag_documents?.title || c?.doc_title || "";
    const header = `[Tier ${tier} | ${tierLabel} | ${sourceLabel}${title ? ` | ${title}` : ""}]`;
    return `${header}\n${String(c.content || "").trim()}`;
  });
  return { text: lines.join("\n\n"), hasTier3 };
};

const getLastUserMessage = (messages: ChatMessage[] = []) => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") return messages[i];
  }
  return null;
};

function buildIntakeFromQuery(query: string): Intake {
  const { intake } = createEmptyIntake("ai_agent");
  try {
    const q = String(query || "").trim();
    intake.chief_complaint = q ? q.slice(0, 300) : null;
    intake.goal = null;
    intake.body_part = bodyPartFromText(q) ?? null;
    intake.timeline = extractTimelineFromQuery(q) ?? null;
    intake.budget = extractBudgetFromQuery(q) ?? null;
    intake.duration = extractDurationFromQuery(q) ?? null;
    intake.severity = extractSeverityFromQuery(q) ?? null;
    const { contraindications, allergy, medications } = contraindicationsAndFlagsFromMessage(q);
    intake.contraindications = contraindications.length ? contraindications : null;
    intake.allergy_flag = allergy || null;
    intake.medications_flag = medications || null;
    intake.medical_history_flag = null;
    intake.previous_procedure_flag = null;
    intake.attachments_present = false;
  } catch {
    /* no-op */
  }
  return intake;
}

export async function POST(request: Request) {
  assertSupabaseEnv();
  const clientIp = getClientIp(request);
  const apiPath = '/api/chat';

  // ✅ 운영 안정화: Rate limit 체크 (봇/도배 방지)
  const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.CHAT);
  if (!rateLimitResult.allowed) {
    logRateLimitExceeded(
      apiPath,
      clientIp,
      RATE_LIMITS.CHAT.maxRequests,
      RATE_LIMITS.CHAT.windowMs
    );

    // ✅ P2: 차단율 모니터링
    checkBlockRate().catch(err => console.error('[alert] checkBlockRate failed:', err));

    // ✅ P2: 퍼널 이벤트 추적 (차단)
    trackFunnelEvent({
      stage: 'chat_blocked',
      dropReason: 'rate_limit_exceeded',
    });
    
    return jsonError(
      429,
      "rate_limit_exceeded",
      rateLimitResult.reason,
      {
        retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
        headers: getRateLimitHeaders(rateLimitResult)
      }
    );
  }

  // ✅ Security: 암호화 키 검증 (fail-fast, V2 AES-256-GCM)
  if (!process.env.ENCRYPTION_KEY_V1) {
    const msg = "ENCRYPTION_KEY_V1 is missing";
    console.error("[api/chat]", msg);
    logEncryptionFailed(apiPath, clientIp, msg);
    return jsonError(500, "encryption_key_missing", msg);
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch (error: any) {
    console.error("[api/chat] invalid json:", error);
    return jsonError(400, "invalid_json", error?.message || "invalid_json");
  }
  const messages: ChatMessage[] = Array.isArray(body?.messages)
    ? body.messages
    : [];
  const lang = body?.lang ? String(body.lang) : "en";
  const sessionId = body?.session_id ? String(body.session_id) : null;
  const page = body?.page ? String(body.page) : null;
  const utm = body?.utm && typeof body.utm === "object" ? body.utm : null;
  const lastUser = getLastUserMessage(messages);
  const query = String(lastUser?.content || "").trim();

  if (!query) {
    return jsonError(400, "user_message_required", "last user message is empty");
  }

  /**
   * ✅ P0 수정: 서버리스 환경에서 비동기 작업 유실 방지
   * ✅ 운영 안정화: 저장 성공/실패 로그 추가
   * 
   * 수정 전:
   * - void IIFE로 DB insert를 백그라운드에서 실행
   * - Vercel 등 서버리스 환경에서 응답 종료 시 작업이 중단될 수 있음
   * 
   * 수정 후:
   * - DB insert를 await로 응답 전에 완료
   * - 저장 실패 시에도 로그를 남기고 계속 진행 (채팅 응답은 유지)
   * 
   * 이유:
   * - 데이터 유실 방지 (리드/문의 추적 데이터 확보)
   * - 서버리스 환경에서 안정적인 동작 보장
   * - 운영자가 저장 실패 추적 가능
   */
  // ✅ Log normalized inquiry (응답 전 완료)
  try {
    let intake: Intake = buildIntakeFromQuery(query);
    const meta: IntakeMeta = {
      pipeline_version: "v1",
      source_type: "ai_agent",
      model: getModelName(),
      prompt_version: null,
    };
    const missing_fields = computeMissingFields(intake);
    const extraction_confidence = computeExtractionConfidence(intake, missing_fields);
    const constraints: Record<string, unknown> = {
      intake,
      meta,
    };
    if (sessionId != null) constraints.session_id = sessionId;
    if (page != null) constraints.page = page;
    if (utm != null) constraints.utm = utm;

    // ✅ Security: raw_message 암호화 (V2: AES-256-GCM)
    const rawMessageEnc = encryptStringNullable(query);

    // ✅ DB insert를 await로 완료 (서버리스 환경에서 유실 방지)
    const { error: insertError } = await supabaseAdmin.from("normalized_inquiries").insert({
      source_type: "ai_agent",
      language: lang,
      raw_message: rawMessageEnc, // 암호화된 값
      constraints,
      treatment_slug: null,
      objective: null,
      extraction_confidence,
      missing_fields: missing_fields.length ? missing_fields : null,
    } as any);

    if (insertError) {
      throw insertError;
    }

    // ✅ 운영 로그: 채팅 수신 성공
    logOperational('info', {
      event: 'chat_received',
      api: apiPath,
      clientIp: clientIp || undefined,
      statusCode: 200,
      context: { language: lang, hasSession: !!sessionId }
    });

    // ✅ P2: 퍼널 이벤트 추적 (채팅 메시지)
    trackFunnelEvent({
      stage: 'chat_message',
      sessionId: sessionId ?? undefined,
      page: page ?? undefined,
      utm: utm ?? undefined,
      language: lang,
    });
  } catch (error: any) {
    // 저장 실패해도 채팅 응답은 계속 진행 (사용자 경험 유지)
    console.error("[api/chat] normalized_inquiries insert failed:", error);
    logOperational('error', {
      event: 'chat_blocked',
      api: apiPath,
      clientIp: clientIp || undefined,
      reason: 'db_insert_failed',
      statusCode: 500,
      context: { error: error?.message }
    });

    // ✅ P2: 퍼널 이벤트 추적 (에러)
    trackFunnelEvent({
      stage: 'chat_error',
      sessionId: sessionId ?? undefined,
      dropReason: 'db_insert_failed',
    });
  }

  // 1단계: HEALO DB 직접 검색 (최우선) + RAG 벡터 검색 (병렬 실행)
  const [dbResult, ragResult] = await Promise.all([
    searchHospitalsAndTreatments(query).catch((e: any) => {
      console.error("[api/chat] db search failed:", e?.message || e);
      return { context: "", hospitalCount: 0, treatmentCount: 0, matchedHospitalNames: [] as string[], hospitalMatchType: "none" as const };
    }),
    safeRagSearch({ query, lang: lang || "en", matchCount: 6 }).catch((e: any) => {
      console.error("[api/chat] rag search failed:", e?.message || e);
      return [] as any[];
    }),
  ]);

  const ragChunks = ragResult;
  const { text: contextText, hasTier3 } = buildContext(ragChunks);
  const dbContext = dbResult.context;
  const dbHospitalCount = dbResult.hospitalCount + dbResult.treatmentCount;
  const matchedHospitalNames = dbResult.matchedHospitalNames ?? [];
  const hospitalMatchType = dbResult.hospitalMatchType ?? "none";

  // hospital_intent 감지: 병원명 질문인지 판별
  const HOSPITAL_KEYWORDS = /병원|의원|한방병원|클리닉|clinic|hospital/i;
  const hospitalIntent = HOSPITAL_KEYWORDS.test(query) || matchedHospitalNames.length > 0;
  const hospitalGuardActive = hospitalIntent && matchedHospitalNames.length > 0;

  // 진단 로그
  console.log(`[api/chat] query="${query.slice(0, 80)}" | hospitalIntent=${hospitalIntent} | matchType=${hospitalMatchType} | dbHospitals=${matchedHospitalNames.length} | ragChunks=${ragChunks.length}`);
  if (matchedHospitalNames.length > 0) {
    console.log(`[api/chat] matchedHospitals:`, matchedHospitalNames);
  }
  console.log(`[api/chat] context preview: db=${dbContext.length}chars, rag=${contextText.length}chars`);

  // DB 결과를 RAG보다 앞에 배치 (HEALO 등록 데이터 우선)
  const internalContext = [dbContext, contextText].filter(Boolean).join("\n");

  // 외부 검색: hospital_intent+DB매칭 시 외부 검색 차단 (환각 방지)
  let externalContext = "";
  let externalSources: string[] = [];
  if (!internalContext && !hospitalGuardActive) {
    try {
      const ext = await searchExternal(query);
      externalContext = ext.context;
      externalSources = ext.sources;
    } catch (e) {
      console.error("[api/chat] external search failed:", e);
    }
  }

  const allContext = [internalContext, externalContext].filter(Boolean).join("\n\n");
  const hasAnyContext = allContext.length > 0;
  // Google Search: hospital_intent+DB매칭 시 웹 검색도 차단
  const useWebSearch = !hasAnyContext && !hospitalGuardActive;

  const hasDbData = dbHospitalCount > 0;

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

  const systemPrompt = [
    "You are HEALO's AI agent — a medical concierge connecting international patients with Korean hospitals.",
    "",
    "RESPONSE RULES:",
    "- Keep answers SHORT and scannable: max 3-4 sentences per point, use bullet points.",
    "- Lead with the recommendation, skip lengthy introductions.",
    "- Respond in the same language the user writes in.",
    "",
    hospitalGuardActive ? "" : "CORE BEHAVIOR:",
    hospitalGuardActive ? "" : "- Recommend specific hospitals, treatments, and programs from the Context.",
    hospitalGuardActive ? "" : "- Include: hospital name, key specialty, estimated price range.",
    hospitalGuardActive ? "" : "- If multiple options, present as a brief comparison list.",
    hospitalGuardActive ? "" : "- After recommendations, suggest submitting an inquiry for a personalized quote.",
    "",
    "SOURCE LABELING (IMPORTANT):",
    hasDbData ? "- [HEALO 등록 병원] / [HEALO 등록 시술/프로그램]: HEALO's verified partner database. Present confidently." : "",
    externalSources.includes("hira") ? "- [공공 의료데이터 - HIRA]: Official Korean government medical data. Present as reliable public data." : "",
    externalSources.includes("naver") ? "- [네이버 검색]: Naver local search results. Mention it's from Naver search." : "",
    useWebSearch ? "- [웹 검색 - 미검증]: Google Search results — clearly state: '웹 검색 결과입니다. HEALO에서 직접 검증한 정보가 아니므로 참고용으로 활용해 주세요.' (translate to user's language)" : "",
    "",
    "SAFETY:",
    "- No medical diagnosis or outcome guarantees.",
    "- If the user asks for a human, connect them with a HEALO coordinator.",
    hospitalGuardActive ? HOSPITAL_HARD_GUARD : "",
    hospitalIntent && matchedHospitalNames.length === 0 ? HOSPITAL_NO_MATCH_GUARD : "",
    "",
    hasAnyContext ? "Context:\n" + allContext : "",
    useWebSearch ? "No internal or public data found. Use Google Search to find relevant Korean hospitals and treatments. Present findings concisely. ALWAYS add a disclaimer that these are unverified web search results." : "",
    hasTier3 ? "\nNote: Some info is from public sources (Tier 3) — briefly note when citing." : "",
  ]
    .filter(Boolean)
    .join("\n");

  const modelResult = getModel();
  if (modelResult.error) return modelResult.error;

  try {
    const result = await streamText({
      model: modelResult.model,
      system: systemPrompt,
      messages: messages as any,
      // 비용 가드: 응답 길이 상한 (토큰 폭주 방지)
      maxOutputTokens: 2048,
      providerOptions: useWebSearch ? { google: { useSearchGrounding: true } } : undefined,
      onError: ({ error }) => {
        console.error("[api/chat] stream onError:", error instanceof Error ? error.message : error);
      },
    });
    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    const errStack = error?.stack || "";
    console.error(`[api/chat] LLM FATAL: ${errMsg}`);
    if (errStack) console.error(`[api/chat] stack: ${errStack.slice(0, 500)}`);
    const classified = classifyGoogleError(error);
    return jsonError(classified.status, classified.code, errMsg);
  }
}
