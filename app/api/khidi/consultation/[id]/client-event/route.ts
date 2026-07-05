/**
 * healwith: 상담방 클라이언트 오류 자동 수집 (진단 비콘)
 *
 * POST /api/khidi/consultation/[id]/client-event
 * Body: { type, message }
 *
 * 왜: 원격 기기(환자 폰·외부 PC)의 영상 연결 실패 원인이 브라우저 콘솔에만 남고
 * 서버엔 아무 흔적이 없어, 'invalid token: revoked' 장애 진단이 이틀 밀렸다
 * (docs/POSTMORTEMS.md #61). 이제 연결 오류·미디어 실패·타임아웃을 서버에 남겨
 * 스크린샷 없이도 원격 진단이 가능하게 한다.
 *
 * 보안: 참가자만(초대토큰 or 계정 Bearer — resolveConsultationActor), IP 레이트리밋,
 * 메시지 길이 제한, 응답에 상세 에러 미노출.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { resolveConsultationActor } from "@/lib/auth/requireConsultationAccess";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";

const RATE = {
  windowMs: 60 * 1000,
  maxRequests: 20, // 재시도 루프에서 튀어도 IP당 분당 20건이면 충분
  apiName: "consultation_client_event",
};

const VALID_TYPES = new Set(["connect_error", "connect_timeout", "media_failure"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request) || "unknown";
    const rl = checkRateLimit(ip, RATE);
    if (!rl.allowed) {
      return Response.json(
        { ok: false, error: "rate_limited" },
        { status: 429, headers: getRateLimitHeaders(rl) }
      );
    }

    const { id: consultationId } = await params;

    const access = await resolveConsultationActor(request, consultationId);
    if (!access.success) return access.response;

    let body: any;
    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    const type = typeof body?.type === "string" ? body.type : "";
    if (!VALID_TYPES.has(type)) {
      return Response.json({ ok: false, error: "invalid_type" }, { status: 400 });
    }
    const message =
      typeof body?.message === "string" ? body.message.slice(0, 300) : "";

    const userAgent = (request.headers.get("user-agent") || "").slice(0, 200);

    // Vercel 런타임 로그에서 `consultation_client_event` 로 즉시 검색 가능
    console.warn(
      `[consultation_client_event] type=${type} consultation=${consultationId} role=${access.role} guest=${access.isGuest} msg="${message}" ua="${userAgent.slice(0, 80)}"`
    );

    // 영구 기록 — admin_audit_logs (있는 테이블 재사용, best-effort)
    try {
      const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");
      await supabaseAdmin.from("admin_audit_logs").insert({
        admin_email: "client-event@consultation",
        action: "CONSULTATION_CLIENT_ERROR",
        metadata: {
          consultation_id: consultationId,
          type,
          message,
          role: access.role,
          is_guest: access.isGuest,
          ip_prefix: ip.slice(0, 8),
          user_agent: userAgent,
        },
      } as any);
    } catch (e) {
      console.warn("[client-event] audit insert failed:", (e as Error).message);
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("[client-event] error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
