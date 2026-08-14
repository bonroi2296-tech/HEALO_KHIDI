/**
 * healwith: Waiting Room — Admissions API
 *
 * GET /api/khidi/consultation/:id/admissions
 *   → 대기열 조회 (의사/관리자 전용)
 *   응답: { ok, pending: [...], approved: [...], rejected: [...] }
 *
 * PATCH /api/khidi/consultation/:id/admissions?admissionId=xxx
 *   Body: { status: 'approved' | 'rejected' }
 *   → 의사가 개별 입장 승인/거절
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireConsultationAccess } from "@/lib/auth/requireConsultationAccess";
import { verifyGuestTokenReadOnly } from "@/lib/auth/guestToken";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimitPersistent, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { readTranscriptField } from "@/lib/consultation/transcriptCrypto";
import { encryptStringNullable } from "@/lib/security/encryptionV2";

const GUEST_ADMISSIONS_RATE = {
  windowMs: 60 * 1000,
  maxRequests: 60, // 3초 폴링 + 승인 클릭 여유
  apiName: "consultation_admissions_guest",
};

/**
 * 게스트 링크로 입장한 의사/코디도 대기열 조회·승인 가능해야 함
 * (의사가 계정 없이 초대 링크로만 들어오는 게 기본 플로우).
 * X-Guest-Token 헤더의 invite 토큰을 읽기 전용 검증(사용횟수 미소모)해
 * doctor/coordinator 역할일 때만 허용.
 *
 * @returns 허용 시 null, 거부 시 에러 Response
 */
async function checkGuestStaffToken(
  request: NextRequest,
  consultationId: string
): Promise<Response | null> {
  const ip = getClientIp(request) || "unknown";
  const rl = await checkRateLimitPersistent(ip, GUEST_ADMISSIONS_RATE);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  const tokenPlain = request.headers.get("x-guest-token") || "";
  const v = await verifyGuestTokenReadOnly(tokenPlain, consultationId);
  if (!v.valid || !["doctor", "coordinator"].includes(v.role || "")) {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: consultationId } = await params;

  // 의사 / 관리자 / 코디네이터 만 대기열 조회 가능
  // (계정 로그인 또는 doctor/coordinator 게스트 토큰)
  if (request.headers.get("x-guest-token")) {
    const denied = await checkGuestStaffToken(request, consultationId);
    if (denied) return denied;
  } else {
    const access = await requireConsultationAccess(request, consultationId, {
      requireRole: ["admin", "doctor", "coordinator"],
    });
    if (!access.success) return access.response;
  }

  const { data, error } = await supabaseAdmin
    .from("consultation_admissions")
    .select(
      "id, participant_role, participant_identity, display_name, display_name_encrypted, status, requested_at, decided_at, requester_ip"
    )
    .eq("consultation_id", consultationId)
    .order("requested_at", { ascending: true });

  if (error) {
    console.error("[admissions GET] error:", error.message);
    return Response.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  const raw = data ?? [];

  // 평문 잔존 행이면 조회 김에 암호문으로 이전(기회주의 백필, best-effort).
  const toBackfill = (raw as any[]).filter((r) => r.display_name && !r.display_name_encrypted).slice(0, 20);
  for (const r of toBackfill) {
    try {
      await supabaseAdmin
        .from("consultation_admissions")
        .update({ display_name_encrypted: encryptStringNullable(r.display_name), display_name: null } as any)
        .eq("id", r.id)
        .is("display_name_encrypted", null);
    } catch { /* best-effort — 다음 조회 때 재시도 */ }
  }

  // 응답: 암호문은 감추고 복호화된 이름만 (필드명 유지 — 화면 코드 변경 불필요)
  const rows = (raw as any[]).map((r) => {
    const rest = { ...r };
    delete rest.display_name_encrypted;
    return { ...rest, display_name: readTranscriptField(r.display_name_encrypted, r.display_name) };
  });
  return Response.json({
    ok: true,
    pending: rows.filter((r: any) => r.status === "pending"),
    approved: rows.filter((r: any) => r.status === "approved"),
    rejected: rows.filter((r: any) => r.status === "rejected"),
    left: rows.filter((r: any) => r.status === "left"),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: consultationId } = await params;

  let decidedBy: string | null = null;
  if (request.headers.get("x-guest-token")) {
    const denied = await checkGuestStaffToken(request, consultationId);
    if (denied) return denied;
    // 게스트 의사는 auth user_id 가 없음 → decided_by 는 null (감사는 audit 로그·IP로)
  } else {
    const access = await requireConsultationAccess(request, consultationId, {
      requireRole: ["admin", "doctor", "coordinator"],
    });
    if (!access.success) return access.response;
    decidedBy = access.userId;
  }

  const admissionId = request.nextUrl.searchParams.get("admissionId");
  if (!admissionId) {
    return Response.json(
      { ok: false, error: "admissionId query param required" },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const status = body.status;
  if (!["approved", "rejected", "left"].includes(status)) {
    return Response.json(
      { ok: false, error: "status must be approved/rejected/left" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("consultation_admissions")
    .update({
      status,
      decided_at: new Date().toISOString(),
      decided_by: decidedBy,
      left_at: status === "left" ? new Date().toISOString() : null,
    } as any)
    .eq("id", admissionId)
    .eq("consultation_id", consultationId);

  if (error) {
    console.error("[admissions PATCH] error:", error.message);
    return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
