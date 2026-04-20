/**
 * HEALO: 진료(consultation) API 접근 권한 강제 체크
 *
 * 목적:
 * - /api/khidi/consultation/[id]/* 엔드포인트들에서 IDOR 차단
 * - 진료 세션의 참가자 (환자/의사/코디네이터/통역사) 또는 admin 만 접근 허용
 *
 * 원칙:
 * - admin (app_metadata.role=admin / ADMIN_EMAIL_ALLOWLIST) → 항상 허용
 * - 일반 사용자 → consultation_sessions 의 patient_user_id, doctor_user_id,
 *   coordinator_user_id, patient_id, doctor_id, coordinator_id, translator_id
 *   중 하나가 본인 user.id 와 일치할 때만 허용
 *
 * 실패 시: 401 (미인증) / 403 (인증되었으나 참가자 아님) / 404 (세션 없음) 자동 응답.
 */

import "server-only";
import { NextRequest } from "next/server";
import { checkAdminAuth } from "./checkAdminAuth";
import { supabaseAdmin } from "../rag/supabaseAdmin";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "../rateLimit";

const CONSULTATION_RATE = {
  windowMs: 60 * 1000,
  maxRequests: 60,
  apiName: "consultation_api",
};

interface ConsultationSessionRow {
  id: string;
  patient_id: string | null;
  doctor_id: string | null;
  coordinator_id: string | null;
  translator_id: string | null;
  patient_user_id: string | null;
  doctor_user_id: string | null;
  coordinator_user_id: string | null;
  livekit_room_name: string | null;
  status: string | null;
}

export type ConsultationAccessResult =
  | {
      success: true;
      userId: string;
      isAdmin: boolean;
      session: ConsultationSessionRow;
      role: "admin" | "patient" | "doctor" | "coordinator" | "translator";
    }
  | { success: false; response: Response };

/**
 * 진료 세션 ID 에 대한 접근 권한을 강제 체크.
 *
 * @param request NextRequest
 * @param consultationId consultation_sessions.id (UUID)
 * @returns 성공 시 세션 row + role, 실패 시 응답 객체
 */
export async function requireConsultationAccess(
  request: NextRequest,
  consultationId: string,
  options?: { requireRole?: ("admin" | "doctor" | "coordinator")[] }
): Promise<ConsultationAccessResult> {
  // ────────────────────────────────────────────────
  // 1) Rate limit (IDOR brute-force 방지)
  // ────────────────────────────────────────────────
  const clientIp = getClientIp(request);
  const rl = checkRateLimit(clientIp, CONSULTATION_RATE);
  if (!rl.allowed) {
    return {
      success: false,
      response: Response.json(
        { ok: false, error: "rate_limited" },
        { status: 429, headers: getRateLimitHeaders(rl) }
      ),
    };
  }

  // ────────────────────────────────────────────────
  // 2) 사용자 인증 (admin 검사 포함)
  // ────────────────────────────────────────────────
  const auth = await checkAdminAuth(request);
  if (!auth.userId) {
    return {
      success: false,
      response: Response.json(
        { ok: false, error: "unauthorized", detail: "로그인이 필요합니다" },
        { status: 401 }
      ),
    };
  }

  // ────────────────────────────────────────────────
  // 3) 세션 조회 (service_role 로 RLS 우회 — 권한 판정은 아래에서)
  // ────────────────────────────────────────────────
  if (!consultationId || typeof consultationId !== "string") {
    return {
      success: false,
      response: Response.json(
        { ok: false, error: "invalid_consultation_id" },
        { status: 400 }
      ),
    };
  }

  const { data: session, error } = await supabaseAdmin
    .from("consultation_sessions")
    .select(
      "id, patient_id, doctor_id, coordinator_id, translator_id, patient_user_id, doctor_user_id, coordinator_user_id, livekit_room_name, status"
    )
    .eq("id", consultationId)
    .maybeSingle<ConsultationSessionRow>();

  if (error) {
    console.error("[requireConsultationAccess] DB error:", error.message);
    return {
      success: false,
      response: Response.json(
        { ok: false, error: "db_error" },
        { status: 500 }
      ),
    };
  }

  if (!session) {
    return {
      success: false,
      response: Response.json(
        { ok: false, error: "consultation_not_found" },
        { status: 404 }
      ),
    };
  }

  // ────────────────────────────────────────────────
  // 4) 권한 판정
  // ────────────────────────────────────────────────
  const uid = auth.userId;
  type ConsultationRole = "admin" | "patient" | "doctor" | "coordinator" | "translator";
  let role: ConsultationRole = "patient";

  if (auth.isAdmin) {
    role = "admin";
  } else if (
    session.doctor_user_id === uid ||
    session.doctor_id === uid
  ) {
    role = "doctor";
  } else if (
    session.coordinator_user_id === uid ||
    session.coordinator_id === uid
  ) {
    role = "coordinator";
  } else if (session.translator_id === uid) {
    role = "translator";
  } else if (
    session.patient_user_id === uid ||
    session.patient_id === uid
  ) {
    role = "patient";
  } else {
    // 참가자 아님 → IDOR 차단
    console.warn(
      `[requireConsultationAccess] 403 user=${uid} consultation=${consultationId}`
    );
    return {
      success: false,
      response: Response.json(
        { ok: false, error: "forbidden", detail: "이 진료 세션에 접근 권한이 없습니다" },
        { status: 403 }
      ),
    };
  }

  // ────────────────────────────────────────────────
  // 5) Role 제한 (admin/doctor/coordinator 등)
  // ────────────────────────────────────────────────
  if (options?.requireRole && !options.requireRole.includes(role as "admin" | "doctor" | "coordinator")) {
    return {
      success: false,
      response: Response.json(
        {
          ok: false,
          error: "insufficient_role",
          detail: `이 작업은 ${options.requireRole.join("/")} 권한이 필요합니다`,
        },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    userId: uid,
    isAdmin: auth.isAdmin,
    session,
    role,
  };
}

/**
 * 인증된 사용자가 임의의 인증 사용자임을 보증 (특정 세션 검사 없음).
 * /api/khidi/consultation POST (신규 생성), token 발급용.
 */
export async function requireAuthenticatedUser(
  request: NextRequest
): Promise<
  | { success: true; userId: string; email?: string; isAdmin: boolean }
  | { success: false; response: Response }
> {
  const clientIp = getClientIp(request);
  const rl = checkRateLimit(clientIp, CONSULTATION_RATE);
  if (!rl.allowed) {
    return {
      success: false,
      response: Response.json(
        { ok: false, error: "rate_limited" },
        { status: 429, headers: getRateLimitHeaders(rl) }
      ),
    };
  }

  const auth = await checkAdminAuth(request);
  if (!auth.userId) {
    return {
      success: false,
      response: Response.json(
        { ok: false, error: "unauthorized", detail: "로그인이 필요합니다" },
        { status: 401 }
      ),
    };
  }

  return {
    success: true,
    userId: auth.userId,
    email: auth.email,
    isAdmin: auth.isAdmin,
  };
}
