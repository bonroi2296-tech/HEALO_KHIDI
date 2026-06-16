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
import { AccessToken } from "livekit-server-sdk";
import { verifyAndConsumeGuestToken } from "@/lib/auth/guestToken";
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

    const { token, displayName } = body || {};

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
      .select("id, livekit_room_name, status")
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
    const canPublish = role === "patient" || role === "doctor";
    const canSubscribe = true;
    const canPublishData = role !== "observer";

    // identity: 게스트는 audit 시 추적 가능하도록 tokenId 일부 포함.
    // 입장마다 난수 suffix 추가 — 같은 링크를 두 기기에서 동시에 써도
    // LiveKit 이 동일 참가자로 보고 한쪽을 끊지 않게 (재접속도 안전).
    const identitySuffix = verification.tokenId!.slice(0, 8);
    const joinNonce = randomBytes(3).toString("hex");
    const identity = `guest-${role}-${identitySuffix}-${joinNonce}`;
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
    });

    const jwt = await lkToken.toJwt();

    // ───────────────────────────────────────────────
    // 4. Waiting Room 등록 (의사 제외 pending)
    // ───────────────────────────────────────────────
    const initialStatus = role === "doctor" ? "approved" : "pending";
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
    });
  } catch (err: any) {
    console.error("[guest-join] error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
