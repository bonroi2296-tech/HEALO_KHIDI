/**
 * healwith: Public Chat Start API
 *
 * POST /api/public/chat/start
 * - 비회원도 사용 가능 (인증 불요)
 * - chat_thread 생성 + public_token 발급
 * - 게스트 식별 정보(이름·이메일·국적) 동시 저장 — AI 학습 데이터 캡처용
 * - browser_session_id 기록으로 재방문 시 이력 복구 가능
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

  try {
    const body = await request.json().catch(() => ({}));
    const {
      treatment_slug,
      language = "en",
      country,
      // 게스트 식별 정보 (선택이지만 권장)
      guest_name,
      guest_email,
      guest_country,
      guest_phone,
      browser_session_id,
      utm,
      landing_path,
      referrer,
      client_meta,
    } = body;

    // 입력 정규화·검증 (가벼운 수준)
    const name = typeof guest_name === "string" ? guest_name.trim().slice(0, 100) : null;
    const email = typeof guest_email === "string" ? guest_email.trim().slice(0, 200) : null;
    const ctry = typeof guest_country === "string" ? guest_country.trim().slice(0, 8) : (country || null);
    const phone = typeof guest_phone === "string" ? guest_phone.trim().slice(0, 32) : null;
    const sessionId = typeof browser_session_id === "string" ? browser_session_id.trim().slice(0, 64) : null;

    const publicToken = crypto.randomUUID();

    const { data, error } = await (supabaseAdmin as any)
      .from("chat_threads")
      .insert({
        status: "open",
        public_token: publicToken,
        subject: treatment_slug ? `Inquiry: ${treatment_slug}` : (name ? `${name} — New Chat` : "New Chat"),
        guest_name: name,
        guest_email: email,
        guest_country: ctry,
        guest_phone: phone,
        browser_session_id: sessionId,
        last_active_at: new Date().toISOString(),
        channel: "web",
        metadata: {
          language,
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
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
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
