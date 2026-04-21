/**
 * LiveKit Token Generation API
 *
 * POST /api/khidi/consultation/token
 * Body: { consultationId, participantRole? }
 *
 * 변경 이력:
 * - 2026-04-17 (보안): 미인증 → requireConsultationAccess 게이트.
 *   기존에는 roomName + participantName 만 알면 누구나 토큰 발급받아 다른
 *   환자 진료실 침입 가능했음. 이제는 인증된 참가자(또는 admin)만 발급 가능.
 *   토큰 TTL 2시간 + 역할별 권한 분리 (환자=publish only, 의사=publish+subscribe).
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { requireConsultationAccess } from "@/lib/auth/requireConsultationAccess";

const TOKEN_TTL_SECONDS = 2 * 60 * 60; // 2시간

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return Response.json(
        { ok: false, error: "LiveKit credentials not configured" },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { consultationId } = body || {};

    if (!consultationId) {
      return Response.json(
        { ok: false, error: "consultationId is required" },
        { status: 400 }
      );
    }

    // 인증 + 참가자 검증 + 세션 조회
    const access = await requireConsultationAccess(request, consultationId);
    if (!access.success) return access.response;

    const { session, userId, role } = access;

    if (!session.livekit_room_name) {
      return Response.json(
        { ok: false, error: "consultation_has_no_room" },
        { status: 409 }
      );
    }

    if (session.status === "completed" || session.status === "cancelled") {
      return Response.json(
        { ok: false, error: "consultation_closed" },
        { status: 409 }
      );
    }

    // 역할별 권한 분리
    // - 환자: 본인 영상/오디오 송신 + 의사/통역사 영상 수신
    // - 의사: 본인 영상/오디오 송신 + 환자 영상 수신
    // - 코디네이터/통역사: subscribe only (영상 송신 불필요시)
    // - admin: 모니터링 목적 subscribe only
    const canPublish = role === "patient" || role === "doctor";
    const canSubscribe = true;
    const canPublishData = role !== "admin"; // admin 은 메시지 송신 X

    const token = new AccessToken(apiKey, apiSecret, {
      identity: `${role}-${userId}`,
      name: role,
      metadata: JSON.stringify({ role, userId, consultationId }),
      ttl: TOKEN_TTL_SECONDS,
    });

    token.addGrant({
      room: session.livekit_room_name,
      roomJoin: true,
      canPublish,
      canSubscribe,
      canPublishData,
    });

    const jwt = await token.toJwt();

    return Response.json({
      ok: true,
      token: jwt,
      roomName: session.livekit_room_name,
      // 서버 전용 환경변수 `LIVEKIT_URL` 우선, 구버전 설정 호환용으로
      // `NEXT_PUBLIC_LIVEKIT_URL` 도 지원. 둘 중 하나만 있으면 동작.
      livekitUrl: process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL,
      role,
      ttlSeconds: TOKEN_TTL_SECONDS,
    });
  } catch (error: any) {
    console.error("[api/khidi/consultation/token] Error:", error?.message);
    return Response.json(
      { ok: false, error: "Token generation failed" },
      { status: 500 }
    );
  }
}
