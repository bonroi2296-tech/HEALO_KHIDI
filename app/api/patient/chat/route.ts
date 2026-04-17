/**
 * HEALO: Patient Chat API (authenticated)
 *
 * GET  /api/patient/chat         — 로그인 환자의 채팅 스레드 목록
 * POST /api/patient/chat         — 새 스레드 생성 또는 메시지 전송
 *   body.action = "start"        → 스레드 생성
 *   body.action = "message"      → 메시지 전송 + AI 응답
 *
 * 3-tier 답변 전략:
 *   Tier 1: HEALO 내부 DB (병원/시술) + RAG 벡터 검색
 *   Tier 2: 승인 외부소스 (HIRA 공공데이터, 네이버)
 *   Tier 3: LLM 일반지식 (Google Search Grounding + 면책 문구)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { createSupabaseServerClientFromRequest } from "../../../../src/lib/supabase/server";
import { supabaseAdmin } from "../../../../src/lib/rag/supabaseAdmin";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "../../../../src/lib/rateLimit";
import {
  generateChatReply,
  detectHandOff,
  getModelName,
  logPlaybookUsage,
} from "../../../../src/lib/chat/generateReply";

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

  const { data, error } = await supabaseAdmin
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
  const rl = checkRateLimit(clientIp, RATE_LIMITS.CHAT);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action || "message";

  // ─── START: 새 스레드 생성 ───
  if (action === "start") {
    const lang = body.language || "en";

    const { data, error } = await supabaseAdmin
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
  const { data: thread, error: tErr } = await supabaseAdmin
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
  const { error: insertErr } = await supabaseAdmin.from("chat_messages").insert({
    thread_id,
    role: "user",
    content: trimmed,
    metadata: { source: "patient_portal" },
  });

  if (insertErr) {
    console.error("[patient/chat] insert user msg:", insertErr.message);
    return Response.json({ ok: false, error: "Failed to save message" }, { status: 500 });
  }

  // 대화 이력 조회
  const { data: history } = await supabaseAdmin
    .from("chat_messages")
    .select("role, content")
    .eq("thread_id", thread_id)
    .order("created_at", { ascending: true })
    .limit(30);

  const chatMessages = (history || []).map((m: any) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  const lang = thread.metadata?.language || "en";

  // Hand-off 감지
  const handOff = detectHandOff(trimmed);

  if (handOff.requested) {
    await supabaseAdmin
      .from("chat_threads")
      .update({
        updated_at: new Date().toISOString(),
        metadata: {
          ...thread.metadata,
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
    thread_id
  );

  // 소스 정보 추출 (프론트엔드 표시용)
  const sources = extractSourceInfo(ragChunks);

  let finalReply = reply;
  if (handOff.requested) {
    finalReply +=
      "\n\n---\nA human coordinator has been notified. You can continue chatting while you wait.";
  }

  // AI 응답 저장
  const { data: aiMsg } = await supabaseAdmin
    .from("chat_messages")
    .insert({
      thread_id,
      role: "assistant",
      content: finalReply,
      metadata: {
        model: getModelName(),
        rag_chunks_used: ragChunks.length,
        sources,
        hand_off: handOff.requested ? handOff.reason : null,
        ...(aiError ? { ai_error: aiError } : {}),
      },
    })
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

  // 스레드 업데이트
  await supabaseAdmin
    .from("chat_threads")
    .update({
      updated_at: new Date().toISOString(),
      subject: thread.subject === "AI Health Consultation" && trimmed.length > 5
        ? trimmed.slice(0, 60) + (trimmed.length > 60 ? "..." : "")
        : thread.subject,
    })
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
    1: "HEALO verified",
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
