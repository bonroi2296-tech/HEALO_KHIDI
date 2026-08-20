/**
 * healwith: 비자 신청(visa_applications) API 접근 권한 강제 체크
 *
 * 정부 요건: KHIDI #3, #6 — 비자발급지원 정보 제공 + 진행 관리
 *
 * 원칙:
 * - admin → 항상 허용 (전체 조회/수정)
 * - 환자(patient) → 본인 신청 건만 조회·서류 업로드·draft 수정
 * - 코디네이터(coordinator) → 배정된 신청 건 조회·상태 변경·서류 검수·초청장 발급
 *   (현재는 "app_metadata.role = coordinator" 또는 application.coordinator_user_id 매칭으로 판정)
 *
 * 실패 시: 401 (미인증) / 403 (권한 없음) / 404 (신청 없음) 자동 응답.
 */

import "server-only";
import { NextRequest } from "next/server";
import { checkAdminAuth } from "./checkAdminAuth";
import { supabaseAdmin } from "../rag/supabaseAdmin";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "../rateLimit";
import { askOnceMoreOnError } from "./retryTransient";

const VISA_RATE = {
  windowMs: 60 * 1000,
  maxRequests: 60,
  apiName: "visa_api",
};

interface VisaApplicationRow {
  id: string;
  patient_user_id: string;
  coordinator_user_id: string | null;
  consultation_id: string | null;
  intake_id: string | null;
  hospital_id: string | null;
  visa_type: string;
  nationality: string;
  status: string;
}

export type VisaAccessRole = "admin" | "coordinator" | "patient";

export type VisaAccessResult =
  | {
      success: true;
      userId: string;
      isAdmin: boolean;
      application: VisaApplicationRow;
      role: VisaAccessRole;
    }
  | { success: false; response: Response };

/**
 * 코디네이터 판정.
 *
 * 🛑 2026-08-20 실측 사고: 예전엔 user_roles 테이블만 봤는데, 그 테이블의 검사규칙
 * (user_roles_role_check)이 받는 값은 patient/korean_hospital/local_clinic/agent/admin 뿐이라
 * **'coordinator' 는 애초에 들어갈 수 없는 값**이었다. 그래서 이 함수는 «항상 false» 였고,
 * 코디가 비자 목록 API 에서 환자로 취급돼(scope=patient) 자기 것만 찾다가 0건이 나왔다.
 * 실제 직원 계정(assel@healwith.co.kr)도 user_roles 에는 'patient' 로 적혀 있었다.
 *
 * 프로젝트 표준은 app_metadata.role 이다(CLAUDE.md 보안 규칙 · followup·cases·cost-estimates
 * 전부 appRole 로 판정). 여기만 다른 기준을 보고 있었다.
 */
function isCoordinatorRole(appRole?: string): boolean {
  return appRole === "coordinator";
}

/** 배정 흐름 보조: user_roles 에 coordinator 가 적힌 경우도 인정(현재 스키마에선 저장 불가라 사실상 미사용). */
async function isCoordinatorInUserRoles(userId: string): Promise<boolean> {
  // 오류를 아예 안 받아서 DB 삐끗 = 「코디 아님」 = 403 이었다 → 1회 더 물어본다(retryTransient.ts).
  const res = await askOnceMoreOnError(() =>
    supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle<{ role: string }>()
  );
  return res?.data?.role === "coordinator";
}

/**
 * 비자 신청 ID 에 대한 접근 권한을 강제 체크.
 */
export async function requireVisaAccess(
  request: NextRequest,
  applicationId: string,
  options?: { requireRole?: ("admin" | "coordinator")[] }
): Promise<VisaAccessResult> {
  // 1) Rate limit
  const clientIp = getClientIp(request);
  const rl = checkRateLimit(clientIp, VISA_RATE);
  if (!rl.allowed) {
    return {
      success: false,
      response: Response.json(
        { ok: false, error: "rate_limited" },
        { status: 429, headers: getRateLimitHeaders(rl) }
      ),
    };
  }

  // 2) 사용자 인증
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

  if (!applicationId || typeof applicationId !== "string") {
    return {
      success: false,
      response: Response.json(
        { ok: false, error: "invalid_application_id" },
        { status: 400 }
      ),
    };
  }

  // 3) 신청 건 조회
  const { data: application, error } = await supabaseAdmin
    .from("visa_applications")
    .select(
      "id, patient_user_id, coordinator_user_id, consultation_id, intake_id, hospital_id, visa_type, nationality, status"
    )
    .eq("id", applicationId)
    .maybeSingle<VisaApplicationRow>();

  if (error) {
    console.error("[requireVisaAccess] DB error:", error.message);
    return {
      success: false,
      response: Response.json(
        { ok: false, error: "db_error" },
        { status: 500 }
      ),
    };
  }

  if (!application) {
    return {
      success: false,
      response: Response.json(
        { ok: false, error: "visa_application_not_found" },
        { status: 404 }
      ),
    };
  }

  // 4) 권한 판정
  const uid = auth.userId;
  let role: VisaAccessRole;

  if (auth.isAdmin) {
    role = "admin";
  } else if (application.coordinator_user_id === uid) {
    role = "coordinator";
  } else if (isCoordinatorRole(auth.appRole) || (await isCoordinatorInUserRoles(uid))) {
    // coordinator 인 사용자는 미배정 건도 볼 수 있도록 허용 (배정 흐름 고려)
    role = "coordinator";
  } else if (application.patient_user_id === uid) {
    role = "patient";
  } else {
    console.warn(
      `[requireVisaAccess] 403 user=${uid} application=${applicationId}`
    );
    return {
      success: false,
      response: Response.json(
        { ok: false, error: "forbidden", detail: "이 비자 신청에 접근 권한이 없습니다" },
        { status: 403 }
      ),
    };
  }

  // 5) role 제한 (예: 상태 변경은 admin/coordinator 만)
  if (options?.requireRole && !options.requireRole.includes(role as "admin" | "coordinator")) {
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
    application,
    role,
  };
}

/**
 * 비자 신청 생성 및 목록 조회용 — 특정 신청 건 검사 없이 인증된 사용자 반환.
 * coordinator 여부도 함께 반환해서 목록 필터링에 사용.
 */
export async function requireVisaAuthenticatedUser(
  request: NextRequest
): Promise<
  | { success: true; userId: string; email?: string; isAdmin: boolean; isCoordinator: boolean }
  | { success: false; response: Response }
> {
  const clientIp = getClientIp(request);
  const rl = checkRateLimit(clientIp, VISA_RATE);
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

  const isCoordinator = auth.isAdmin
    ? true
    : isCoordinatorRole(auth.appRole) || (await isCoordinatorInUserRoles(auth.userId));

  return {
    success: true,
    userId: auth.userId,
    email: auth.email,
    isAdmin: auth.isAdmin,
    isCoordinator,
  };
}
