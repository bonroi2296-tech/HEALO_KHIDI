/**
 * healwith: cost_estimates 접근 권한 강제 체크
 *
 * 원칙: 환자는 본인 건, 코디·admin 은 전체.
 */

import "server-only";
import { NextRequest } from "next/server";
import { checkAdminAuth } from "./checkAdminAuth";
import { supabaseAdmin } from "../rag/supabaseAdmin";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "../rateLimit";
import { askOnceMoreOnError } from "./retryTransient";

const COST_RATE = {
  windowMs: 60 * 1000,
  maxRequests: 60,
  apiName: "cost_estimate_api",
};

interface CostEstimateRow {
  id: string;
  patient_user_id: string;
  coordinator_user_id: string | null;
  status: string;
  // 발행 시각 — issued 전이 때 같이 찍는다([id]/route.ts). 여정 매핑이 «발행 이력»의 근거로 쓴다.
  quotation_issued_at: string | null;
  consultation_id: string | null;
  intake_id: string | null;
  // 어느 병원 견적인지 — 유치수수료 법정 상한이 «병원 종별»마다 다르기 때문에
  // 견적 저장 길목에서 이 값으로 종별을 찾아 상한을 판정한다(facilitationFeeCap.ts).
  hospital_id: string | null;
}

export type CostRole = "admin" | "coordinator" | "patient";

export type CostAccessResult =
  | {
      success: true;
      userId: string;
      isAdmin: boolean;
      estimate: CostEstimateRow;
      role: CostRole;
    }
  | { success: false; response: Response };

/**
 * 코디네이터 판정.
 *
 * 🛑 2026-08-20 실측: user_roles 만 보면 «항상 false» 다. 그 테이블의 검사규칙
 * (user_roles_role_check)이 받는 값은 patient/korean_hospital/local_clinic/agent/admin 뿐이라
 * 'coordinator' 는 애초에 저장할 수 없다(실측: patient 29건 · admin 1건 · coordinator 0건).
 * 그래서 코디가 견적 목록에서 환자로 취급돼(scope=patient) 환자 요청을 한 건도 못 봤다.
 * 비자(requireVisaAccess)도 같은 원인이었고 같은 방식으로 고쳤다(신청서 #1434).
 *
 * 프로젝트 표준은 app_metadata.role 이다(CLAUDE.md 보안 규칙).
 */
function isCoordinatorRole(appRole?: string): boolean {
  return appRole === "coordinator";
}

/** 배정 흐름 보조: user_roles 에 coordinator 가 적힌 경우도 인정(현재 스키마에선 저장 불가). */
async function isCoordinatorInUserRoles(userId: string): Promise<boolean> {
  // 오류를 아예 안 받아서 DB 삐끗 = 「코디 아님」 = 403 이었다 → 1회 더 물어본다(retryTransient.ts).
  const res = await askOnceMoreOnError(() =>
    supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).maybeSingle()
  );
  return (res?.data as { role?: string } | null)?.role === "coordinator";
}

export async function requireCostEstimateAccess(
  request: NextRequest,
  estimateId: string,
  options?: { requireRole?: ("admin" | "coordinator")[] }
): Promise<CostAccessResult> {
  const clientIp = getClientIp(request);
  const rl = checkRateLimit(clientIp, COST_RATE);
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
        { ok: false, error: "unauthorized" },
        { status: 401 }
      ),
    };
  }

  if (!estimateId || typeof estimateId !== "string") {
    return {
      success: false,
      response: Response.json(
        { ok: false, error: "invalid_estimate_id" },
        { status: 400 }
      ),
    };
  }

  const { data: estimateRaw, error } = await supabaseAdmin
    .from("cost_estimates")
    // ⚠️ hospital_id 를 빼면 유치수수료 법정 상한이 «항상 미확인(15%)»으로 판정된다 —
    //    타입에만 넣고 select 에서 빠뜨려 실제로 그런 일이 났다(2026-08-04 독립 리뷰).
    //    strict:false + as 캐스팅이라 타입검사도 안 잡는다. 컬럼을 지울 땐 상한 판정부터 확인하라.
    .select("id, patient_user_id, coordinator_user_id, status, consultation_id, intake_id, hospital_id")
    .eq("id", estimateId)
    .maybeSingle();
  const estimate = estimateRaw as CostEstimateRow | null;

  if (error) {
    return {
      success: false,
      response: Response.json({ ok: false, error: "db_error" }, { status: 500 }),
    };
  }

  if (!estimate) {
    return {
      success: false,
      response: Response.json(
        { ok: false, error: "estimate_not_found" },
        { status: 404 }
      ),
    };
  }

  const uid = auth.userId;
  let role: CostRole;

  if (auth.isAdmin) {
    role = "admin";
  } else if (estimate.coordinator_user_id === uid) {
    role = "coordinator";
  } else if (isCoordinatorRole(auth.appRole) || (await isCoordinatorInUserRoles(uid))) {
    role = "coordinator";
  } else if (estimate.patient_user_id === uid) {
    role = "patient";
  } else {
    return {
      success: false,
      response: Response.json({ ok: false, error: "forbidden" }, { status: 403 }),
    };
  }

  if (
    options?.requireRole &&
    !options.requireRole.includes(role as "admin" | "coordinator")
  ) {
    return {
      success: false,
      response: Response.json(
        {
          ok: false,
          error: "insufficient_role",
          detail: `required: ${options.requireRole.join("/")}`,
        },
        { status: 403 }
      ),
    };
  }

  return { success: true, userId: uid, isAdmin: auth.isAdmin, estimate, role };
}

export async function requireCostEstimateUser(
  request: NextRequest
): Promise<
  | { success: true; userId: string; email?: string; isAdmin: boolean; isCoordinator: boolean }
  | { success: false; response: Response }
> {
  const clientIp = getClientIp(request);
  const rl = checkRateLimit(clientIp, COST_RATE);
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
        { ok: false, error: "unauthorized" },
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
