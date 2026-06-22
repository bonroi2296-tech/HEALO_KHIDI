/**
 * healwith: AI 에이전트 자기분석(마스터키 '힐로') 어드민 API
 *
 * POST /api/admin/khidi/agent-analysis  { thread_id, extra? }
 * - 지정한 채팅 스레드 '전체'를 모델에게 자기점검시켜 6하원칙 리포트를 반환.
 * - 채팅창에서 '힐로'를 치는 것과 동일한 분석을, 코디가 스레드를 골라 실행하는 어드민 경로.
 * - generateMasterKeyAnalysis 를 공유(채팅 경로와 동일 로직 → 품질 드리프트 방지).
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { generateMasterKeyAnalysis } from "@/lib/chat/generateReply";

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json().catch(() => ({} as any));
    const threadId = body?.thread_id;
    const extra = typeof body?.extra === "string" ? body.extra.trim() : "";

    if (!threadId || typeof threadId !== "string") {
      return Response.json({ ok: false, error: "thread_id_required" }, { status: 400 });
    }

    const { reply, ok } = await generateMasterKeyAnalysis(threadId, [], extra);
    return Response.json({ ok: true, analysis: reply, generated: ok });
  } catch (err: any) {
    console.error("[admin/khidi/agent-analysis] error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
