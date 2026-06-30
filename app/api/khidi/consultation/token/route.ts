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
import {
  AccessToken,
  RoomConfiguration,
  RoomAgentDispatch,
} from "livekit-server-sdk";
import { requireConsultationAccess } from "@/lib/auth/requireConsultationAccess";
import {
  isLiveTranslateEnabledServer,
  TRANSLATOR_AGENT_NAME,
  ROOM_EMPTY_TIMEOUT,
  ROOM_DEPARTURE_TIMEOUT,
  ROOM_MAX_PARTICIPANTS,
} from "@/lib/consultation/liveTranslate";

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

    // 송신 권한: 모든 참가자가 카메라·마이크 송신 가능 (PO 결정 2026-06-21 — 다자 회의).
    //   이전엔 환자·의사만 송신, 코디/통역사/admin 은 보기 전용이었으나
    //   "전원 카메라·마이크" 요구로 전 역할 publish 허용. (입장 자체는 여전히
    //   requireConsultationAccess 로 인증된 참가자만 — 권한 확대는 방 안 동작 한정.)
    const canPublish = true;
    const canSubscribe = true;
    const canPublishData = true; // 채팅·자막 데이터도 전원 송신 허용

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
      // 통역 켜짐: 참가자가 자기 언어(`lang` 속성)를 방에 알릴 수 있어야 에이전트가
      // 통역쌍을 만든다. 끄짐이면 불필요(영향 없음).
      canUpdateOwnMetadata: true,
    });

    // ── Gemini Live Translate 에이전트 자동 디스패치 (스위치 뒤) ──
    // RoomConfiguration 은 "방 최초 생성 시"에만 적용된다 → 이미 있는 방의 토큰을
    // 다시 발급해도 무시되므로 멱등(idempotent). 스위치가 꺼져 있으면 아무 것도 안 함
    // = 기존 동작과 100% 동일.
    if (isLiveTranslateEnabledServer()) {
      token.roomConfig = new RoomConfiguration({
        agents: [
          new RoomAgentDispatch({
            agentName: TRANSLATOR_AGENT_NAME,
            metadata: JSON.stringify({ consultationId }),
          }),
        ],
        emptyTimeout: ROOM_EMPTY_TIMEOUT,
        departureTimeout: ROOM_DEPARTURE_TIMEOUT,
        maxParticipants: ROOM_MAX_PARTICIPANTS,
      });
    }

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
