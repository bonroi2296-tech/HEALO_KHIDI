/**
 * healwith: Public Chat Consent API
 *
 * POST /api/public/chat/consent { thread_id, public_token, consent_version }
 * - 이미 존재하는 thread(재방문 쿠키·게이트 도입 이전 시작분)에 PIPA 동의를 기록.
 * - public_token 으로 소유권 검증(추측 차단). 동의는 metadata.consent 에 보존.
 * - 신규 thread는 /start 가 동의를 받으므로, 이건 "기존 thread 동의 백필"용.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const clientIp = getClientIp(request);
  const rl = checkRateLimit(clientIp, RATE_LIMITS.CHAT);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const { thread_id, public_token, consent_version } = body || {};
  if (!thread_id || !public_token) {
    return Response.json({ ok: false, error: "thread_id_and_token_required" }, { status: 400 });
  }

  // public_token 으로 소유권 검증
  const { data: thread, error: tErr } = await (supabaseAdmin as any)
    .from("chat_threads")
    .select("id, metadata")
    .eq("id", thread_id)
    .eq("public_token", public_token)
    .single();

  if (tErr || !thread) {
    return Response.json({ ok: false, error: "invalid_thread_or_token" }, { status: 403 });
  }

  const prevMeta =
    thread.metadata && typeof thread.metadata === "object" && !Array.isArray(thread.metadata)
      ? thread.metadata
      : {};

  const { error: uErr } = await (supabaseAdmin as any)
    .from("chat_threads")
    .update({
      metadata: {
        ...prevMeta,
        consent: {
          health_crossborder: true,
          version: typeof consent_version === "string" ? consent_version.slice(0, 20) : null,
          at: new Date().toISOString(),
          backfilled: true,
        },
      },
    })
    .eq("id", thread_id);

  if (uErr) {
    console.error("[chat/consent] update failed:", uErr.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
