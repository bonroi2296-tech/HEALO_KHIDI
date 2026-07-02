/**
 * healwith: Patient Chat API (authenticated)
 *
 * GET  /api/patient/chat         — 로그인 환자의 채팅 스레드 목록
 * POST /api/patient/chat         — 새 스레드 생성 또는 메시지 전송
 *   body.action = "start"        → 스레드 생성
 *   body.action = "message"      → 메시지 전송 + AI 응답
 *
 * 3-tier 답변 전략:
 *   Tier 1: healwith 내부 DB (병원/시술) + RAG 벡터 검색
 *   Tier 2: 승인 외부소스 (HIRA 공공데이터, 네이버)
 *   Tier 3: LLM 일반지식 (Google Search Grounding + 면책 문구)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { createSupabaseServerClientFromRequest } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimitPersistent, getClientIp, RATE_LIMITS } from "@/lib/rateLimit";
import { checkAiGuards } from "@/lib/ai/aiGuard";
import {
  generateChatReply,
  detectHandOff,
  getModelName,
  logPlaybookUsage,
} from "@/lib/chat/generateReply";

// ─── Auth helper ───

async function getAuthUser(request: NextRequest) {
  const supabase = createSupabaseServerClientFromRequest(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// ─── GET: 스레드 목록 ───

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await (supabaseAdmin as any)
      .from("chat_threads")
    .select("id, subject, status, created_at, updated_at, metadata")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[patient/chat] GET threads:", error.message);
    return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
  }

  return Response.json({ ok: true, threads: data || [] });
}

// ─── POST: start | message ───

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const clientIp = getClientIp(request);

  const body = await request.json().catch(() => ({}));
  const action = body.action || "message";

  // 분당 회수제한(DB 기반 — 인메모리는 다중 인스턴스에서 분산 우회됨) + AI 비용 가드.
  // 로그인 사용자도 우회 불가(공개챗과 동일 방어선 — 계정 하나로 일일 상한·전역 예산을
  // 전부 우회하던 구멍을 닫음, 2026-07-02 전수 감사). start 는 AI 호출이 없어 분당 제한만.
  const rl = await checkRateLimitPersistent(clientIp, RATE_LIMITS.CHAT);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  if (action !== "start") {
    const aiGuard = await checkAiGuards(clientIp, "/api/patient/chat");
    if (!aiGuard.allowed) {
      return Response.json({ ok: false, error: aiGuard.code }, { status: aiGuard.status });
    }
  }

  // ─── START: 새 스레드 생성 ───
  if (action === "start") {
    const lang = body.language || "en";

    const { data, error } = await (supabaseAdmin as any)
      .from("chat_threads")
      .insert({
        status: "open",
        user_id: user.id,
        public_token: crypto.randomUUID(),
        subject: "AI Health Consultation",
        metadata: {
          language: lang,
          started_at: new Date().toISOString(),
          source: "patient_portal",
        },
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("[patient/chat] start thread:", error.message);
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, thread_id: data.id, created_at: data.created_at });
  }

  // ─── MESSAGE: 메시지 전송 + AI 응답 ───
  const { thread_id, text } = body;
  if (!thread_id || !text?.trim()) {
    return Response.json(
      { ok: false, error: "thread_id and text are required" },
      { status: 400 }
    );
  }

  // 스레드 소유권 확인
  const { data: thread, error: tErr } = await (supabaseAdmin as any)
      .from("chat_threads")
    .select("id, status, metadata")
    .eq("id", thread_id)
    .eq("user_id", user.id)
    .single();

  if (tErr || !thread) {
    return Response.json({ ok: false, error: "Thread not found" }, { status: 404 });
  }

  if (thread.status === "resolved" || thread.status === "closed") {
    return Response.json({ ok: false, error: "Thread is closed" }, { status: 410 });
  }

  const trimmed = text.trim();

  // 환자 메시지 저장
  // ⚠️ chat_messages 스키마는 actor_type/message_text (role/content 컬럼은 존재하지 않음).
  // 이전엔 role/content 로 insert 해 모든 환자챗 메시지가 저장 실패(0건)였음 — 공개챗 규약으로 정정.
  const { error: insertErr } = await (supabaseAdmin as any).from("chat_messages").insert({
    thread_id,
    actor_type: "patient",
    actor_id: user.id,
    message_text: trimmed,
    is_internal: false,
    metadata: { source: "patient_portal" },
  });

  if (insertErr) {
    console.error("[patient/chat] insert user msg:", insertErr.message);
    return Response.json({ ok: false, error: "Failed to save message" }, { status: 500 });
  }

  // 대화 이력 조회
  const { data: history } = await (supabaseAdmin as any)
      .from("chat_messages")
    .select("actor_type, message_text")
    .eq("thread_id", thread_id)
    .order("created_at", { ascending: true })
    .limit(30);

  const chatMessages = (history || []).map((m: any) => ({
    role: m.actor_type === "patient" ? ("user" as const) : ("assistant" as const),
    content: m.message_text,
  }));

  const threadMeta: any = (thread.metadata && typeof thread.metadata === "object" && !Array.isArray(thread.metadata)) ? thread.metadata : {};
  const lang = threadMeta.language || "en";

  // Hand-off 감지
  const handOff = detectHandOff(trimmed);

  if (handOff.requested) {
    await (supabaseAdmin as any)
      .from("chat_threads")
      .update({
        updated_at: new Date().toISOString(),
        metadata: {
          ...threadMeta,
          hand_off_requested: true,
          hand_off_reason: handOff.reason,
          hand_off_at: new Date().toISOString(),
        },
      })
      .eq("id", thread_id);
  }

  // 3-tier RAG 기반 AI 응답 생성
  const { reply, ragChunks, error: aiError, _analytics } = await generateChatReply(
    chatMessages,
    trimmed,
    lang,
    thread_id,
    // 환자 포털은 항상 로그인 상태 → 계정 연결·연락 가능. 세션 사실을 정확히 주입.
    { isLoggedIn: true, hasReachableContact: true }
  );

  // 소스 정보 추출 (프론트엔드 표시용)
  const sources = extractSourceInfo(ragChunks);

  let finalReply = reply;
  if (handOff.requested) {
    finalReply +=
      "\n\n---\nA human coordinator has been notified. You can continue chatting while you wait.";
  }

  // AI 응답 저장 (공개챗 규약: actor_type="system" + message_text)
  const { data: aiMsg } = await (supabaseAdmin as any)
      .from("chat_messages")
    .insert({
      thread_id,
      actor_type: "system",
      message_text: finalReply,
      is_internal: false,
      metadata: {
        model: getModelName(),
        rag_chunks_used: ragChunks.length,
        sources,
        hand_off: handOff.requested ? handOff.reason : null,
        ...(aiError ? { ai_error: aiError } : {}),
      },
    } as any)
    .select("id, created_at")
    .single();

  // Playbook 사용 로그
  if (_analytics) {
    await logPlaybookUsage({
      threadId: thread_id,
      messageId: aiMsg?.id || null,
      language: lang,
      queryText: trimmed,
      model: getModelName(),
      analytics: _analytics,
      handoffRequested: handOff.requested,
    }).catch(() => {});
  }

  // 스레드 업데이트 (subject 컬럼이 현재 스키마엔 없어 as any)
  const currentSubject = (thread as any).subject ?? null;
  await (supabaseAdmin as any)
      .from("chat_threads")
    .update({
      updated_at: new Date().toISOString(),
      subject: currentSubject === "AI Health Consultation" && trimmed.length > 5
        ? trimmed.slice(0, 60) + (trimmed.length > 60 ? "..." : "")
        : currentSubject,
    } as any)
    .eq("id", thread_id);

  return Response.json({
    ok: true,
    reply: finalReply,
    sources,
    thread_id,
    message_id: aiMsg?.id,
    hand_off: handOff.requested ? handOff : undefined,
    ...(aiError ? { ai_error: aiError } : {}),
  });
}

// ─── 소스 정보 추출 ───

interface SourceInfo {
  tier: number;
  tierLabel: string;
  sourceType: string;
  title: string | null;
}

function extractSourceInfo(chunks: any[]): SourceInfo[] {
  if (!chunks?.length) return [];

  const TIER_LABELS: Record<number, string> = {
    1: "healwith verified",
    2: "Partner verified",
    3: "Public source",
  };

  const seen = new Set<string>();
  const sources: SourceInfo[] = [];

  for (const c of chunks) {
    const tier = c?.trust_tier ?? 3;
    const sourceType = c?.doc_source_type || c?.rag_documents?.source_type || "unknown";
    const title = c?.doc_title || c?.rag_documents?.title || null;
    const key = `${tier}-${sourceType}-${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      tier,
      tierLabel: TIER_LABELS[tier] || TIER_LABELS[3],
      sourceType,
      title,
    });
  }

  return sources;
}
