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

/**
 * GET — 「내 계정에 폰 알림이 켜져 있나」. 설정 화면의 스위치가 이걸 보고 켜짐/꺼짐을 그린다.
 * 로그인 필수(남의 상태를 볼 이유가 없다).
 */
export async function GET(request: NextRequest) {
  assertSupabaseEnv();
  const userId = await userIdFromRequest(request);
  if (!userId) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { count, error } = await (supabaseAdmin as any)
    .from("device_tokens")
    .select("token", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("[push/register] 조회 실패:", error.code || "internal_error");
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
  return Response.json({ ok: true, devices: count ?? 0 });
}

/**
 * DELETE — 폰 알림 끄기. 이 계정에 묶인 기기 등록을 지운다.
 * 「기기 하나만」이 아니라 계정 단위로 지우는 이유: 설정 화면에서 끌 때 사용자가 기대하는 건
 * «내 알림을 끈다»이고, 그 화면은 지금 쓰는 폰의 토큰을 항상 들고 있지는 않다.
 */
export async function DELETE(request: NextRequest) {
  assertSupabaseEnv();
  const userId = await userIdFromRequest(request);
  if (!userId) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { error } = await (supabaseAdmin as any)
    .from("device_tokens")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("[push/register] 삭제 실패:", error.code || "internal_error");
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
  return Response.json({ ok: true, devices: 0 });
}

async function userIdFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const { data } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  return data?.user?.id ?? null;
}
