/**
 * healwith: Admission status polling (게스트 공개)
 *
 * GET /api/khidi/consultation/:id/admission-status?admissionId=xxx
 *   → 자기 admission 상태 확인 (2~5초 polling)
 *   응답: { ok, status: 'pending' | 'approved' | 'rejected' }
 *
 * 보안: admission id 자체가 랜덤 UUID 라 다른 사용자 상태 조회 리스크 거의 없음.
 * 그래도 consultation_id 와 매칭 검증 + display_name / identity 는 노출 X.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const POLL_RATE = {
  windowMs: 60 * 1000,
  maxRequests: 120, // IP 당 분당 120회 — 2초 polling 수용
  apiName: "admission_status_poll",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request) || "unknown";
  const rl = checkRateLimit(ip, POLL_RATE);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const { id: consultationId } = await params;
  const admissionId = request.nextUrl.searchParams.get("admissionId");

  if (!admissionId) {
    return Response.json(
      { ok: false, error: "admissionId required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("consultation_admissions")
    .select("id, status, consultation_id")
    .eq("id", admissionId)
    .maybeSingle();

  if (error || !data) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // 다른 세션의 admission 조회 차단
  if (data.consultation_id !== consultationId) {
    return Response.json({ ok: false, error: "mismatch" }, { status: 403 });
  }

  return Response.json({ ok: true, status: data.status });
}
