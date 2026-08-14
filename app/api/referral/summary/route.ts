/**
 * healwith: Referral Summary API
 * normalizedInquiryId + publicToken → 병원 전달용 요약 (JSON + Markdown)
 * 보안: publicToken 검증 및 attachment path 검증 후 signed URL 발급
 * 
 * ✅ P0 수정: 런타임 명시 (Node.js)
 * 
 * 이유:
 * - DB 관리자 접근 (SERVICE_ROLE_KEY 사용)
 * - Signed URL 발급 (buildReferralSummary 내부에서 사용)
 * - Edge 런타임에서 발생할 수 있는 예측 불가 오류 방지
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import {
  buildReferralSummaryJson,
  buildReferralSummaryMarkdown,
} from "@/lib/referral/buildReferralSummary";
import { checkRateLimitPersistent, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";

const REFERRAL_RATE = {
  windowMs: 60 * 1000,
  maxRequests: 10,
  apiName: "referral_summary",
};

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  // Rate limit (publicToken enum 방지)
  const ip = getClientIp(request);
  const rl = await checkRateLimitPersistent(ip, REFERRAL_RATE);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const normalizedInquiryId = body?.normalizedInquiryId ? String(body.normalizedInquiryId) : null;
    const publicToken = body?.publicToken ? String(body.publicToken) : null;

    if (!normalizedInquiryId) {
      return Response.json(
        { ok: false, error: "normalized_inquiry_id_required" },
        { status: 400 }
      );
    }

    if (!publicToken) {
      return Response.json(
        { ok: false, error: "public_token_required" },
        { status: 400 }
      );
    }

    // ✅ Security: normalized_inquiries → inquiries.public_token 검증
    const { data: norm, error: normErr } = await supabaseAdmin
      .from("normalized_inquiries")
      .select("id, source_inquiry_id")
      .eq("id", normalizedInquiryId)
      .maybeSingle();

    if (normErr) {
      console.error("[api/referral/summary] normalized_inquiries fetch error:", normErr);
      return Response.json(
        { ok: false, error: "normalized_inquiry_fetch_failed" },
        { status: 500 }
      );
    }

    if (!norm || !norm.source_inquiry_id) {
      return Response.json(
        { ok: false, error: "normalized_inquiry_not_found" },
        { status: 404 }
      );
    }

    const { data: inquiry, error: inquiryErr } = await supabaseAdmin
      .from("inquiries")
      .select("id, public_token")
      .eq("id", norm.source_inquiry_id)
      .maybeSingle();

    if (inquiryErr) {
      console.error("[api/referral/summary] inquiries fetch error:", inquiryErr);
      return Response.json(
        { ok: false, error: "inquiry_fetch_failed" },
        { status: 500 }
      );
    }

    if (!inquiry) {
      return Response.json(
        { ok: false, error: "inquiry_not_found" },
        { status: 404 }
      );
    }

    const storedToken = inquiry.public_token;
    const tokenMatch = storedToken != null && String(storedToken) === String(publicToken);
    if (!tokenMatch) {
      console.error("[api/referral/summary] public_token mismatch");
      return Response.json(
        { ok: false, error: "invalid_public_token" },
        { status: 403 }
      );
    }

    // ✅ Security: pathAuthorized 검증 포함하여 summary 생성
    const json = await buildReferralSummaryJson(normalizedInquiryId, norm.source_inquiry_id);
    if (!json) {
      return Response.json(
        { ok: false, error: "referral_summary_not_found" },
        { status: 404 }
      );
    }

    const markdown = buildReferralSummaryMarkdown(json);

    console.log("[api/referral/summary] success:", { normalizedInquiryId });
    return Response.json({
      ok: true,
      summaryJson: json,
      summaryMarkdown: markdown,
    });
  } catch (error: any) {
    console.error("[api/referral/summary] error:", error);
    return Response.json(
      { ok: false, error: "summary_failed" },
      { status: 500 }
    );
  }
}
