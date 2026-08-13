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
import { checkRateLimitPersistent, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";

// 2026-08-04: 2h → 6h. 2시간을 넘기는 회의에서 **재입장이 막혔다**(만료된 입장권으로는
// 다시 못 들어온다). 초대 토큰 자체의 수명(상담 시각 +12시간, 최소 72시간)은 그대로다 —
// 여기서 늘리는 건 «방에 붙어 있는 동안» 쓰는 열쇠의 수명뿐이다.
const TOKEN_TTL_SECONDS = 6 * 60 * 60; // LiveKit JWT — 6h

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
    const rl = await checkRateLimitPersistent(ip, GUEST_JOIN_RATE);
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

    // ── 통역봇은 여기서 부르지 않는다 (2026-07-28 변경, token 라우트와 동일) ──
    // 방 생성과 동시에 자동 입장시키던 것을 **버튼을 누를 때만** 부르는 방식으로 옮겼다
    // (POSTMORTEMS #101 실환자방 무단 입장). 호출 지점 =
    // `POST /api/khidi/consultation/[id]/interpreter`

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
    // ── 같은 인터넷 회선(= 거의 확실히 같은 사무실)에 이미 들어와 있는 기기 수 ──
    // 왜 소리로 안 재고 회선으로 재나: 하울링을 «듣고» 잡는 감지기는 마이크 잡음제거·자동
    // 음량조절을 거친 뒤의 소리를 보기 때문에, 방에서 실제로 울리는데도 문턱을 못 넘을 수
    // 있다 — 게다가 그게 실제로 도는지 확인된 적이 한 번도 없다(2026-07-29 PO: "두 대만
    // 켜졌을 때도 하울링이 났다"). 회선은 그런 불확실성이 없다: 그날 기록에서도 우리 사무실
    // 3대가 IP 하나(218.153.240.144)로 정확히 묶였고 해외 참가자는 따로 떨어졌다.
    // 내 행을 넣기 «전»에 세야 나 자신이 안 세어진다. 3시간 넘은 행은 유령이라 뺀다.
    let sameNetworkPeers = 0;
    if (ip && ip !== "unknown") {
      try {
        const { count } = await supabaseAdmin
          .from("consultation_admissions")
          .select("id", { count: "exact", head: true })
          .eq("consultation_id", consultationId)
          .eq("requester_ip", ip)
          // ⚠️ 나 자신의 옛 입장 기록은 빼야 한다. 회선이 끊겨 새로고침하면 퇴장 시각을
          //    채우는 신호(LiveKit 알림)가 몇 초 늦게 오는데, 그 사이에 다시 들어오면
          //    «같은 회선에 한 대 있음»이 되어 **자기 자신 때문에 소리가 꺼진다**.
          //    같은 기기는 identity 가 같으므로(deviceId 기반) 그걸로 걸러낸다.
          .neq("participant_identity", identity)
          .is("left_at", null)
          .gte("requested_at", new Date(Date.now() - 3 * 3600 * 1000).toISOString());
        sameNetworkPeers = count || 0;
      } catch {
        /* 못 세면 0 — 이 기능만 조용히 꺼지고 입장은 그대로 */
      }
    }

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
      // 같은 회선에 이미 접속한 기기 수 — 1 이상이면 방에 들어가자마자 이 기기 소리를 끈다
      // (하울링은 «마이크 하나 + 스피커 하나»만 같은 방에 있어도 난다 = 두 대로 충분하다).
      sameNetworkPeers,
      // 세션에 설정된 언어 — 게스트 클라이언트가 자막 상대 언어를 하드코딩이 아닌 실제 값으로 잡게
      patientLanguage: session.patient_language || null,
      doctorLanguage: session.doctor_language || null,
    });
  } catch (err: any) {
    console.error("[guest-join] error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
