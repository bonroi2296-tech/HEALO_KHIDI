/**
 * healwith: Public Chat Resume API
 *
 * GET /api/public/chat/resume?token=<public_token>
 *   또는
 * POST /api/public/chat/resume { token, browser_session_id }
 *
 * - 쿠키에 저장된 public_token 으로 기존 thread 복구
 * - 30일 이내 last_active_at 있는 thread 만 반환
 * - 만료/없음 → 404 (클라이언트가 새 thread 시작)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";

const MAX_INACTIVE_DAYS = 30;

async function resume(token: string | null) {
  if (!token || typeof token !== "string" || token.length < 8) {
    return { ok: false, status: 400, error: "invalid_token" };
  }

  const cutoff = new Date(Date.now() - MAX_INACTIVE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await (supabaseAdmin as any)
    .from("chat_threads")
    .select(
      "id, public_token, status, subject, guest_name, guest_email, guest_country, guest_phone, last_active_at, created_at, metadata"
    )
    .eq("public_token", token)
    .gte("last_active_at", cutoff)
    .maybeSingle();

  if (error) {
    console.error("[chat/resume] db error:", error.message);
    return { ok: false, status: 500, error: "db_error" };
  }
  if (!data) {
    return { ok: false, status: 404, error: "expired_or_not_found" };
  }

  // last_active 갱신 (재방문 시각 기록)
  await (supabaseAdmin as any)
    .from("chat_threads")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", data.id);

  // 최근 메시지 50개 동시 반환
  // chat_messages 컬럼: actor_type (patient/coordinator/bot/admin), message_text
  // 클라이언트에 보낼 땐 role(user/assistant) + content 로 변환
  const { data: rawMessages } = await (supabaseAdmin as any)
    .from("chat_messages")
    .select("id, actor_type, message_text, created_at")
    .eq("thread_id", data.id)
    .order("created_at", { ascending: true })
    .limit(50);

  const messages = (rawMessages || []).map((m: any) => ({
    id: m.id,
    role: m.actor_type === "patient" || m.actor_type === "user" ? "user" : "assistant",
    content: m.message_text || "",
    created_at: m.created_at,
  }));

  return {
    ok: true,
    status: 200,
    thread: {
      id: data.id,
      public_token: data.public_token,
      status: data.status,
      subject: data.subject,
      guest: {
        name: data.guest_name,
        email: data.guest_email,
        country: data.guest_country,
        phone: data.guest_phone,
      },
      created_at: data.created_at,
      last_active_at: data.last_active_at,
    },
    messages,
  };
}

export async function GET(request: NextRequest) {
  assertSupabaseEnv();
  const token = new URL(request.url).searchParams.get("token");
  const result = await resume(token);
  const { status, ...body } = result;
  return Response.json(body, { status });
}

export async function POST(request: NextRequest) {
  assertSupabaseEnv();
  const body = await request.json().catch(() => ({}));
  const result = await resume(body.token || null);
  const { status, ...rest } = result;
  return Response.json(rest, { status });
}
