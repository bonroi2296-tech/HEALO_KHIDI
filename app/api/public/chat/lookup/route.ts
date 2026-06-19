/**
 * healwith: Public Chat Lookup API
 *
 * POST /api/public/chat/lookup
 * - 이름 + 이메일 매칭으로 기존 thread 검색 (다른 기기 재방문 복구용)
 * - 보안: 이름·이메일 동시 일치 + 30일 내 활성 + 최신 1건만
 * - 응답: { ok, found, public_token } — found=true 면 클라이언트가 쿠키 set 후 resume 호출
 *
 * 주의: 이메일만으로는 복구 불가 (보안). 이름까지 정확 일치 시에만.
 *       의료 민감정보 단계엔 회원가입 권유 필요.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rateLimit";
import { safeHash } from "@/lib/security/encryptionV2";

const MAX_INACTIVE_DAYS = 30;

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const clientIp = getClientIp(request);
  const rl = checkRateLimit(clientIp, RATE_LIMITS.CHAT);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const rawName = typeof body.name === "string" ? body.name.trim() : "";
    const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    // 이메일·이름 둘 다 필수
    if (!rawName || rawName.length < 1 || !rawEmail || rawEmail.length < 5 || !rawEmail.includes("@")) {
      return Response.json({ ok: true, found: false });
    }

    const cutoff = new Date(Date.now() - MAX_INACTIVE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // guest_name/guest_email 은 암호화 저장되어 평문 ilike 불가 →
    // start 에서 metadata 에 심은 SHA256 블라인드 인덱스(이름·이메일 모두 소문자)로 매칭.
    // (암호화 도입 이전 평문 행은 해시가 없어 매칭 안 됨 = 토큰/세션 복구는 그대로 동작)
    const emailHash = safeHash(rawEmail);
    const nameHash = safeHash(rawName.toLowerCase());

    const { data, error } = await (supabaseAdmin as any)
      .from("chat_threads")
      .select("id, public_token, last_active_at")
      .filter("metadata->>guest_email_hash", "eq", emailHash)
      .filter("metadata->>guest_name_hash", "eq", nameHash)
      .gte("last_active_at", cutoff)
      .order("last_active_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[chat/lookup] db error:", error.message);
      return Response.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    if (!data) {
      return Response.json({ ok: true, found: false });
    }

    return Response.json({
      ok: true,
      found: true,
      public_token: data.public_token,
      last_active_at: data.last_active_at,
    });
  } catch (err: any) {
    console.error("[chat/lookup] Unexpected:", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
