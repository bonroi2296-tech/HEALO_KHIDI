/**
 * healwith: 푸시 기기 토큰 등록 API (서버 전용)
 *
 * 경로: POST /api/push/register
 * 권한: 공개 (Rate limited) — 네이티브 앱이 푸시 권한 획득 후 받은 FCM 토큰을 등록한다.
 * Body: { token: string, platform: "ios"|"android"|"web" }
 *
 * 🔒 RLS: device_tokens 는 공개 정책 없음 → service_role(서버)만 upsert.
 *    토큰은 PII 아님(기기 식별자). 로그인 사용자면 user_id 연결(선택).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { checkRateLimit, getClientIp, RATE_LIMITS, getRateLimitHeaders } from "@/lib/rateLimit";

const PLATFORMS = ["ios", "android", "web"] as const;

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const clientIp = getClientIp(request);
  const rl = checkRateLimit(clientIp, RATE_LIMITS.CHAT);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limit_exceeded" },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const platform = typeof body?.platform === "string" ? body.platform : "";
  if (!token || token.length > 4096 || !PLATFORMS.includes(platform as any)) {
    return Response.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  // 로그인 사용자면 토큰을 그 사용자에 연결(선택). 인증 없어도 등록은 허용.
  let userId: string | null = null;
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const { data } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
    userId = data?.user?.id ?? null;
  }

  // device_tokens 는 generated 타입(database.types.ts) 재생성 전이라 캐스팅(마이그레이션은 적용됨).
  const { error } = await (supabaseAdmin as any)
    .from("device_tokens")
    .upsert(
      { token, platform, user_id: userId, last_seen_at: new Date().toISOString() },
      { onConflict: "token" }
    );

  if (error) {
    console.error("[push/register] upsert 실패:", error.code || "internal_error");
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }

  return Response.json({ ok: true }, { headers: getRateLimitHeaders(rl) });
}
