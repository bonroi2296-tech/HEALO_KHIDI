/**
 * healwith: 입장 전 연결 사전점검(preflight)용 일회용 LiveKit 토큰 (안전망 ①, 2026-07-15 PO 승인)
 *
 * POST /api/khidi/consultation/[id]/preflight-token
 *
 * 왜: 회사·기관망의 WebRTC 차단이 '입장 후 18초 타임아웃'에서야 드러나 실회의가 지연됐다
 * (2026-07-14 두 실회의에서 국내 사무실 PC 연결 폭풍 실측). 입장 폼 단계에서 영상서버
 * 연결(웹소켓+WebRTC)을 미리 검사해 "이 네트워크는 어려워요 → 핫스팟" 안내를 입장 전에 준다.
 *
 * 보안: 참가자만(resolveConsultationActor — 초대토큰 or 계정 Bearer). 토큰은 실상담방이
 * 아니라 일회용 방(preflight-*)에만 유효 + TTL 2분 → 실방 도청·유령참가 불가.
 * IP 레이트리밋, 응답에 상세 에러 미노출.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { AccessToken } from "livekit-server-sdk";
import { resolveConsultationActor } from "@/lib/auth/requireConsultationAccess";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";

const RATE = {
  windowMs: 60 * 1000,
  maxRequests: 6, // 폼 진입당 1회 자동 실행 — 재시도 포함 분당 6이면 충분
  apiName: "consultation_preflight",
};

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

    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!url || !apiKey || !apiSecret) {
      return Response.json({ ok: false, error: "not_configured" }, { status: 503 });
    }

    const rand = randomBytes(4).toString("hex");
    const at = new AccessToken(apiKey, apiSecret, {
      identity: `preflight-${rand}`,
      ttl: 120, // 초 — 점검(수 초)만 하고 버리는 토큰
    });
    at.addGrant({
      // 실상담방과 무관한 일회용 방 — webhook의 left_at 갱신도 세션 조회 무일치로 자연 무시됨
      room: `preflight-${consultationId.slice(0, 8)}-${rand}`,
      roomJoin: true,
      canPublish: true, // WebRTC/TURN 경로 검사에 필요
      canSubscribe: false,
      canPublishData: false,
    });

    return Response.json({ ok: true, token: await at.toJwt(), livekitUrl: url });
  } catch (err: any) {
    console.error("[preflight-token] error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
