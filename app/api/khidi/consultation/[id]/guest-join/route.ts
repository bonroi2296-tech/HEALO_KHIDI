/**
 * healwith: Guest consultation join — Zoom 스타일 링크로 계정 없이 입장
 *
 * POST /api/khidi/consultation/:id/guest-join
 * Body: { token, displayName }
 *
 * 응답: { ok, livekitToken, livekitUrl, roomName, role, ttlSeconds }
 *
 * 흐름:
 * 1. invite 토큰 검증 (해시 비교, 만료/사용횟수/폐기 여부)
 * 2. 세션 상태 확인 (이미 종료/취소된 세션이면 거부)
 * 3. LiveKit access token 발급 — identity 에 'guest-' 프리픽스
 * 4. Audit: ip, user-agent, 토큰 사용 횟수 증가
 *
 * 보안:
 * - invite 토큰 발급 시 지정된 역할만 부여 (상승 불가)
 * - rate limit (token 단위가 아닌 IP 단위 — brute force 방어)
 * - 인증된 계정과 동일한 권한 게이트 (canPublish / canSubscribe)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import {
  AccessToken,
  RoomConfiguration,
  RoomAgentDispatch,
} from "livekit-server-sdk";
import { verifyAndConsumeGuestToken } from "@/lib/auth/guestToken";
import {
  isLiveTranslateEnabledServer,
  TRANSLATOR_AGENT_NAME,
  ROOM_EMPTY_TIMEOUT,
  ROOM_DEPARTURE_TIMEOUT,
  ROOM_MAX_PARTICIPANTS,
} from "@/lib/consultation/liveTranslate";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";

const TOKEN_TTL_SECONDS = 2 * 60 * 60; // LiveKit JWT — 2h

const GUEST_JOIN_RATE = {
  windowMs: 60 * 1000,
  maxRequests: 20,   // IP 당 분당 20회 (같은 환자가 재접속 여러 번 가능하도록 관대)
  apiName: "consultation_guest_join",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limit (brute force 방어)
    const ip = getClientIp(request) || "unknown";
    const rl = checkRateLimit(ip, GUEST_JOIN_RATE);
    if (!rl.allowed) {
      return Response.json(
        { ok: false, error: "rate_limited" },
        { status: 429, headers: getRateLimitHeaders(rl) }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      return Response.json(
        { ok: false, error: "livekit_not_configured" },
        { status: 503 }
      );
    }

    const { id: consultationId } = await params;

    let body: any;
    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    const { token, displayName, deviceId } = body || {};

    if (!token || typeof token !== "string") {
      return Response.json({ ok: false, error: "token_required" }, { status: 400 });
    }

    const safeDisplayName =
      typeof displayName === "string"
        ? displayName.trim().slice(0, 50).replace(/[^\p{L}\p{N}\s._-]/gu, "")
        : "";

    // ───────────────────────────────────────────────
    // 1. 토큰 검증 + 사용 카운트 증가
    // ───────────────────────────────────────────────
    const userAgent = request.headers.get("user-agent") || undefined;
    const verification = await verifyAndConsumeGuestToken(token, consultationId, {
      ip,
      userAgent,
    });

    if (!verification.valid) {
      // 공격자에게 구체적 실패 이유 주지 않기 위해 통합 에러 반환
      console.warn(
        `[guest-join] token invalid: reason=${verification.reason} ip=${ip.slice(0, 12)}`
      );
      return Response.json(
        { ok: false, error: "invalid_or_expired_invite" },
        { status: 403 }
      );
    }

    // ───────────────────────────────────────────────
    // 2. 세션 상태 확인
    // ───────────────────────────────────────────────
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from("consultation_sessions")
      .select("id, livekit_room_name, status, patient_language, doctor_language")
      .eq("id", consultationId)
      .maybeSingle();

    if (sessionErr || !session) {
      return Response.json({ ok: false, error: "consultation_not_found" }, { status: 404 });
    }

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

    // ───────────────────────────────────────────────
    // 3. LiveKit access token 발급
    // ───────────────────────────────────────────────
    const role = verification.role!;
    // 송신 권한: 게스트도 전원 카메라·마이크 송신 가능 (PO 결정 2026-06-21 — 다자 회의).
    //   입장은 여전히 유효한 초대 토큰(verification)으로만 가능 — 외부인 난입은 차단된 채
    //   초대받은 게스트의 방 안 송신만 허용한다.
    const canPublish = true;
    const canSubscribe = true;
    const canPublishData = true;

    // identity: 게스트는 audit 시 추적 가능하도록 tokenId 일부 포함.
    // 기기별 안정 ID(deviceId)가 오면 그걸 suffix 로 → 같은 기기로 재입장 시 identity 가 동일해
    // LiveKit 이 옛 세션(유령)을 '자동 교체'한다(같은 identity 재입장 = 기존 연결 대체, LiveKit 기본).
    // deviceId 가 없으면(구클라·localStorage 차단) 기존처럼 난수 suffix — 한 기기에서 여러 명이
    // 같은 링크로 동시 입장하는 경우(공용 PC 등)도 깨지지 않는다. 서로 다른 기기는 항상 다른 identity.
    //
    // ⚠️ 여기서 removeParticipant(선제 강제퇴장)를 호출하면 절대 안 된다 (2026-07-02 장애 원인):
    //   LiveKit Cloud 는 강제퇴장 시 "그 시각 이전 발급 토큰 = 폐기"로 기록하는데, SDK 토큰은
    //   nbf=0·iat 없음이라 방금 발급한 토큰까지 전부 "invalid token: revoked"로 거부됐다.
    //   → 6/30 저녁 #527부터 게스트 전원 입장 불가(직원만 됨). 유령 정리는 identity 자동 교체 +
    //   방 departureTimeout/emptyTimeout 이 담당하므로 선제 퇴장은 애초에 불필요.
    const identitySuffix = verification.tokenId!.slice(0, 8);
    const deviceSuffix =
      typeof deviceId === "string" && /^[a-zA-Z0-9_-]{6,64}$/.test(deviceId)
        ? deviceId.replace(/-/g, "").slice(0, 16)
        : randomBytes(3).toString("hex");
    const identity = `guest-${role}-${identitySuffix}-${deviceSuffix}`;
    const name =
      safeDisplayName || verification.inviteeName || `${role} guest`;

    const lkToken = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      metadata: JSON.stringify({
        role,
        consultationId,
        guest: true,
        tokenId: verification.tokenId,
      }),
      ttl: TOKEN_TTL_SECONDS,
    });

    lkToken.addGrant({
      room: session.livekit_room_name,
      roomJoin: true,
      canPublish,
      canSubscribe,
      canPublishData,
      // 통역 켜짐: 게스트도 자기 언어(`lang` 속성)를 방에 알릴 수 있어야 함.
      canUpdateOwnMetadata: true,
    });

    // ── Gemini Live Translate 에이전트 자동 디스패치 (스위치 뒤, 멱등) ──
    // 게스트가 먼저 입장해 방을 만드는 경우(초대링크)에도 통역 에이전트가 붙도록.
    // 스위치 꺼짐이면 무동작 = 기존 동작과 동일.
    if (isLiveTranslateEnabledServer()) {
      lkToken.roomConfig = new RoomConfiguration({
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

    const jwt = await lkToken.toJwt();

    // ───────────────────────────────────────────────
    // 4. 입장 등록 (admission)
    // ───────────────────────────────────────────────
    // PO 결정(2026-07-03): 초대 링크 = 접속 자격. 의료진 승인 게이트(대기실)는 기본 OFF.
    //   → 링크만 있으면 바로 입장. 초대 토큰 자체가 외부인 차단 게이트라 2차 사람 승인은 생략.
    //   대기실(Zoom식 호스트 승인)이 다시 필요하면 env CONSULTATION_WAITING_ROOM=1
    //   (그때만 의사 외 게스트 pending 복원 — UI/폴링 코드는 그대로 보존되어 있음).
    const waitingRoomEnabled = process.env.CONSULTATION_WAITING_ROOM === "1";
    const initialStatus =
      waitingRoomEnabled && role !== "doctor" ? "pending" : "approved";
    let admissionId: string | null = null;
    try {
      const { data: adm, error: admErr } = await supabaseAdmin
        .from("consultation_admissions")
        .insert({
          consultation_id: consultationId,
          participant_role: role,
          participant_identity: identity,
          display_name: name,
          guest_token_id: verification.tokenId,
          status: initialStatus,
          decided_at:
            initialStatus === "approved" ? new Date().toISOString() : null,
          requester_ip: ip,
          requester_user_agent: (userAgent || "").slice(0, 500),
        } as any)
        .select("id")
        .single();
      if (!admErr && adm) admissionId = adm.id;
    } catch (admInsertErr) {
      console.warn(
        "[guest-join] admission insert failed:",
        (admInsertErr as Error).message
      );
    }

    // ───────────────────────────────────────────────
    // 5. Audit log
    // ───────────────────────────────────────────────
    try {
      await supabaseAdmin.from("admin_audit_logs").insert({
        admin_email: verification.inviteeEmail || "guest@anonymous",
        action: "CONSULTATION_GUEST_JOIN",
        metadata: {
          consultation_id: consultationId,
          role,
          token_id: verification.tokenId,
          display_name: name,
          ip_prefix: ip.slice(0, 8),
          user_agent_prefix: (userAgent || "").slice(0, 100),
        },
      } as any);
    } catch (auditErr) {
      console.warn("[guest-join] audit log failed:", (auditErr as Error).message);
    }

    return Response.json({
      ok: true,
      livekitToken: jwt,
      livekitUrl: process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL,
      roomName: session.livekit_room_name,
      role,
      displayName: name,
      ttlSeconds: TOKEN_TTL_SECONDS,
      admissionId,
      admissionStatus: initialStatus,
      // 세션에 설정된 언어 — 게스트 클라이언트가 자막 상대 언어를 하드코딩이 아닌 실제 값으로 잡게
      patientLanguage: session.patient_language || null,
      doctorLanguage: session.doctor_language || null,
    });
  } catch (err: any) {
    console.error("[guest-join] error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
