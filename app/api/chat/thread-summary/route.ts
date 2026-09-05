/**
 * /api/chat/thread-summary — AI 채팅 thread 기본 정보 조회 (폼 자동채움용)
 * guest_name, guest_email, guest_country 반환. 게스트 PII 이므로 public_token 소유 검증 필수.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { checkRateLimitPersistent, getClientIp, getRateLimitHeaders, RATE_LIMITS } from "@/lib/rateLimit";
import { decryptMaybe } from "@/lib/security/encryptionV2";

export async function GET(request: NextRequest) {
  assertSupabaseEnv();

  // 게스트 PII(이름·이메일) 반환 → UUID 만으로는 불충분. public_token 소유까지 확인.
  // (과거엔 thread UUID 만 알면 인증 없이 이름·이메일을 가져갈 수 있었음)
  const ip = getClientIp(request);
  const rl = await checkRateLimitPersistent(ip, RATE_LIMITS.CHAT_READ);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("thread_id");
  const publicToken = searchParams.get("public_token");

  if (!threadId || !/^[0-9a-f-]{36}$/i.test(threadId)) {
    return Response.json({ ok: false, error: "invalid_thread_id" }, { status: 400 });
  }
  if (!publicToken || publicToken.length < 8) {
    return Response.json({ ok: false, error: "public_token_required" }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("chat_threads")
      .select("guest_name, guest_email, guest_country, public_token")
      .eq("id", threadId)
      .maybeSingle();

    // 「없는 스레드」와 「토큰 불일치」를 같은 답으로 — 다르게 답하면 스레드 존재 여부가 샌다.
    if (error || !data) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    // 소유권: 토큰 불일치면 PII 반환 거부
    if (!data.public_token || String(data.public_token) !== String(publicToken)) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    return Response.json({
      ok: true,
      guest_name: decryptMaybe(data.guest_name),
      guest_email: decryptMaybe(data.guest_email),
      guest_country: data.guest_country ?? null,
    });
  } catch (e: any) {
    console.error("[/api/chat/thread-summary]", e.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
