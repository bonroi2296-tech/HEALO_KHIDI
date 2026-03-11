/**
 * HEALO: Public Chat Start API
 *
 * POST /api/public/chat/start
 * - 비회원도 사용 가능 (인증 불요)
 * - chat_thread 생성 + public_token 발급
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../src/lib/rag/supabaseAdmin";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "../../../../../src/lib/rateLimit";

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const clientIp = getClientIp(request);
  const rl = checkRateLimit(clientIp, RATE_LIMITS.CHAT);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const {
      treatment_slug,
      language = "en",
      country,
      utm,
      landing_path,
      referrer,
      client_meta,
    } = body;

    const publicToken = crypto.randomUUID();

    const { data, error } = await supabaseAdmin
      .from("chat_threads")
      .insert({
        status: "open",
        public_token: publicToken,
        subject: treatment_slug ? `Inquiry: ${treatment_slug}` : "New Chat",
        metadata: {
          language,
          country: country || null,
          utm: utm || null,
          landing_path: landing_path || null,
          referrer: referrer || null,
          client_meta: client_meta || null,
          treatment_slug: treatment_slug || null,
          started_at: new Date().toISOString(),
        },
      })
      .select("id, public_token, created_at")
      .single();

    if (error) {
      console.error("[POST /api/public/chat/start]", error.message);
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    return Response.json({
      ok: true,
      thread_id: data.id,
      public_token: data.public_token,
      created_at: data.created_at,
    });
  } catch (err: any) {
    console.error("[POST /api/public/chat/start] Unexpected:", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
