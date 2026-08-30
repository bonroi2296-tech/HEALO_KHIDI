/**
 * healwith: public_token 회전(재발급) API (서버 전용)
 * 유출 대응을 위해 토큰 재발급
 *
 * 보안:
 * - INTERNAL_ADMIN_SECRET 환경변수로 보호
 * - ✅ Secret을 **헤더(x-internal-admin-secret)** 로만 받음 (body가 아님 — CSRF + 로그 노출 방지)
 * - ✅ 공용 safeEqual(timingSafeEqual) 로 비교 (타이밍 공격 방지) — 로컬 복붙본을 @/lib/security/safeEqual 로 승격
 * - ✅ IP 기반 rate limit (분당 5회)
 *
 * ⚠️ 과거 버전은 adminSecret을 JSON body로 받고 `!==` 비교 → CSRF + 타이밍 누출 위험.
 *
 * 런타임: Node.js
 */
export const runtime = "nodejs";

import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { NextRequest } from "next/server";
import { randomUUID as nodeRandomUUID } from "node:crypto";
import { checkRateLimitPersistent, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { safeEqual } from "@/lib/security/safeEqual";

const ROTATE_RATE = {
  windowMs: 60 * 1000,
  maxRequests: 5,
  apiName: "rotate_token",
};

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  // ✅ Rate limit
  const clientIp = getClientIp(request);
  const rl = await checkRateLimitPersistent(clientIp, ROTATE_RATE);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  const expectedSecret = process.env.INTERNAL_ADMIN_SECRET;
  if (!expectedSecret) {
    console.error("[api/inquiries/rotate-token] INTERNAL_ADMIN_SECRET not set");
    return Response.json(
      { ok: false, error: "admin_secret_not_configured" },
      { status: 500 }
    );
  }

  // ✅ Header 기반 시크릿 (body에 넣지 않음 — 로그 노출/CSRF 감소)
  const provided =
    request.headers.get("x-internal-admin-secret") ||
    request.headers.get("X-Internal-Admin-Secret") ||
    undefined;

  if (!safeEqual(provided, expectedSecret)) {
    // 실패 원인 상세 로그는 남기지 않음 (타이밍 정보 제공 최소화)
    return Response.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const inquiryId =
      body?.inquiryId != null
        ? typeof body.inquiryId === "number"
          ? body.inquiryId
          : Number(body.inquiryId)
        : null;

    if (inquiryId == null || isNaN(inquiryId)) {
      return Response.json(
        { ok: false, error: "inquiry_id_required" },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("inquiries")
      .select("id")
      .eq("id", inquiryId)
      .maybeSingle();

    if (fetchError) {
      console.error("[api/inquiries/rotate-token] fetch error:", fetchError);
      return Response.json(
        { ok: false, error: "inquiry_fetch_failed" },
        { status: 500 }
      );
    }

    if (!existing) {
      return Response.json(
        { ok: false, error: "inquiry_not_found" },
        { status: 404 }
      );
    }

    const newToken = nodeRandomUUID();

    const { error: updateError } = await supabaseAdmin
      .from("inquiries")
      .update({
        public_token: newToken,
        public_token_rotated_at: new Date().toISOString(),
      })
      .eq("id", inquiryId);

    if (updateError) {
      console.error("[api/inquiries/rotate-token] update error:", updateError);
      return Response.json(
        { ok: false, error: "token_rotate_failed" },
        { status: 500 }
      );
    }

    console.log("[api/inquiries/rotate-token] success:", { inquiryId });
    return Response.json(
      { ok: true, publicToken: newToken },
      { headers: getRateLimitHeaders(rl) }
    );
  } catch (error: any) {
    console.error("[api/inquiries/rotate-token] error:", error);
    return Response.json(
      { ok: false, error: "rotate_failed" },
      { status: 500 }
    );
  }
}
