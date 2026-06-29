/**
 * healwith: Public Chat Threads List API
 *
 * GET /api/public/chat/threads?browser_session_id=<uuid>
 * - 멀티스레드(여러 대화방) 지원: 한 사용자/브라우저의 대화방 목록을 돌려준다.
 * - 로그인 사용자: same-origin auth 쿠키로 user_id 매칭(기기 간 공유).
 * - 비로그인 게스트: browser_session_id 정확 일치(쿠키에 심긴 UUID) + 30일 cutoff.
 *
 * 보안/PII:
 * - 게스트 PII(guest_name/email/phone)는 절대 반환하지 않는다 — 화이트리스트 컬럼만 select.
 * - subject 는 start 에서 PII 제외하고 저장됨(이름 평문 금지) → 안전.
 * - public_token 은 같은 세션/계정 소유자에게만 가며, 실제 대화 로드/전송은 여전히
 *   resume/stream 의 public_token 검증을 거친다(토큰 모르면 그 방 사용 불가).
 * - IP rate limit + no-store 로 토큰/세션 추측 오라클 방지.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { createSupabaseServerClientFromRequest } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp, getRateLimitHeaders, RATE_LIMITS } from "@/lib/rateLimit";

const MAX_INACTIVE_DAYS = 30;
const LIST_LIMIT = 20;

// 공개 라우트지만 same-origin 쿠키로 로그인 사용자 식별 가능.
async function getOptionalUser(request: NextRequest) {
  if (!request.cookies.getAll().some((c) => /auth-token/.test(c.name))) return null;
  try {
    const supabase = createSupabaseServerClientFromRequest(request);
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
  } catch {
    return null;
  }
}

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

export async function GET(request: NextRequest) {
  assertSupabaseEnv();

  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, RATE_LIMITS.INQUIRY);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { ...getRateLimitHeaders(rl), ...NO_STORE } }
    );
  }

  const sessionId = new URL(request.url).searchParams.get("browser_session_id");
  const user = await getOptionalUser(request);

  // 식별자가 전혀 없으면(비로그인 + 세션id 없음) 빈 목록 — 추측 차단.
  if (!user && (!sessionId || sessionId.length < 8)) {
    return Response.json({ ok: true, threads: [] }, { headers: NO_STORE });
  }

  const cutoff = new Date(Date.now() - MAX_INACTIVE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // PII 컬럼(guest_*)은 select 자체를 하지 않는다.
  let query = (supabaseAdmin as any)
    .from("chat_threads")
    .select("id, public_token, subject, status, last_active_at, created_at, metadata")
    .gte("last_active_at", cutoff)
    .order("last_active_at", { ascending: false })
    .limit(LIST_LIMIT);

  // 로그인 = 계정 기준(기기 간 공유). 비로그인 = 이 브라우저 세션 기준.
  query = user ? query.eq("user_id", user.id) : query.eq("browser_session_id", sessionId);

  const { data, error } = await query;
  if (error) {
    console.error("[chat/threads] db error:", error.message);
    return Response.json({ ok: false, error: "db_error" }, { status: 500, headers: NO_STORE });
  }

  const threads = (data || []).map((t: any) => ({
    id: t.id,
    public_token: t.public_token,
    subject: t.subject || null,
    status: t.status || "open",
    last_active_at: t.last_active_at,
    created_at: t.created_at,
    language: t?.metadata?.language || null,
  }));

  return Response.json({ ok: true, threads }, { headers: NO_STORE });
}
