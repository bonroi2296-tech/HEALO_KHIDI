/**
 * /api/chat/thread-summary — AI 채팅 thread 기본 정보 조회 (폼 자동채움용)
 * guest_name, guest_email, guest_country 반환. PII 민감하지 않은 필드만.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../src/lib/rag/supabaseAdmin";
import { checkRateLimit, getClientIp, getRateLimitHeaders, RATE_LIMITS } from "../../../../src/lib/rateLimit";

export async function GET(request: NextRequest) {
  assertSupabaseEnv();

  // 인증 없이 thread UUID 로 게스트 PII(이름·이메일·국적)를 반환하므로
  // UUID 열거 공격 방지를 위해 IP 레이트리밋 (자동채움 1회용이라 충분)
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, RATE_LIMITS.INQUIRY);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("thread_id");

  if (!threadId || !/^[0-9a-f-]{36}$/i.test(threadId)) {
    return Response.json({ ok: false, error: "invalid_thread_id" }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("chat_threads")
      .select("guest_name, guest_email, guest_country")
      .eq("id", threadId)
      .maybeSingle();

    if (error || !data) {
      return Response.json({ ok: false, error: "thread_not_found" }, { status: 404 });
    }

    return Response.json({
      ok: true,
      guest_name: data.guest_name ?? null,
      guest_email: data.guest_email ?? null,
      guest_country: data.guest_country ?? null,
    });
  } catch (e: any) {
    console.error("[/api/chat/thread-summary]", e.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
