/**
 * healwith: 에이전시(환자 유치 파트너) 담당자 권한 체크
 * checkHospitalAuth 와 동일 패턴 — Bearer token / 쿠키 인증 후 agency_users 조회.
 */

import "server-only"; // service_role 접근 모듈 — 클라이언트 번들 유입 차단(독립 리뷰 2026-07-24 권고)
import type { NextRequest } from "next/server";
import { createSupabaseServerClient, createServiceRoleClient } from "../supabase/server";
import { askOnceMoreOnError } from "./retryTransient";

export interface AgencyAuthResult {
  isAgencyUser: boolean;
  userId?: string;
  email?: string;
  agencyId?: string;
  agencyName?: string;
  role?: string;
  /** agencies.partner_type — 'agency'(해외 에이전시) | 'medical_institution'(해외 의료기관) */
  partnerType?: string;
  error?: string;
}

export async function checkAgencyAuth(request?: NextRequest): Promise<AgencyAuthResult> {
  try {
    let user: import("@supabase/supabase-js").User | null = null;
    let userError: unknown = null;

    if (request?.headers) {
      const authHeader = request.headers.get?.("authorization") || request.headers.get?.("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        try {
          const { supabaseAdmin } = await import("../rag/supabaseAdmin");
          // 오류면 1회 더 (retryTransient.ts) — 인증 서버 한 번 삐끗 ≠ 권한 없음
          const res = await askOnceMoreOnError(() => supabaseAdmin.auth.getUser(token));
          const { data, error } = res ?? { data: null, error: new Error("auth_unreachable") };
          user = data?.user ?? null;
          userError = error;
        } catch (err: unknown) {
          userError = err;
        }
      }
    }
    if (!user) {
      try {
        const supabase = await createSupabaseServerClient();
        const res = await askOnceMoreOnError(() => supabase.auth.getUser());
        const { data, error } = res ?? { data: null, error: new Error("auth_unreachable") };
        user = data?.user ?? null;
        userError = error;
      } catch (err: unknown) {
        userError = err;
      }
    }
    if (userError || !user) {
      return {
        isAgencyUser: false,
        error: (userError instanceof Error ? userError.message : userError ? String((userError as { message?: unknown }).message ?? userError) : undefined) || "no_user",
      };
    }

    // 계정 비활성(app_metadata.disabled) — 계층 무관 전역 킬스위치. checkAdminAuth와 정합.
    // 에이전시 계정은 agency_users.is_active로도 막히지만, disabled가 어느 계층에 찍혀도 잠기게 이중 안전.
    if ((user.app_metadata as { disabled?: boolean } | undefined)?.disabled === true) {
      return { isAgencyUser: false, userId: user.id, email: user.email, error: "account_disabled" };
    }

    const userId = user.id;
    // service_role 클라이언트: agency_users 테이블/조인이 생성 스키마 타입에 없어 캐스팅 유지
    const serviceClient = createServiceRoleClient() as any;
    // DB 삐끗을 「파트너 포털 권한 없음」으로 바꾸지 않는다 — 진짜 미소속(PGRST116)은 그대로 거부.
    const auRes = await askOnceMoreOnError(() =>
      serviceClient
        .from("agency_users")
        .select("agency_id, role, is_active, agencies(id, name, is_active, partner_type)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1)
        .single()
    );
    const { data: au, error: auErr } = auRes ?? { data: null, error: new Error("db_unreachable") };

    if (auErr || !au) {
      return { isAgencyUser: false, userId, email: user.email, error: "not_agency_user" };
    }
    const agency = (au as { agencies?: { id?: string; name?: string; is_active?: boolean; partner_type?: string } | null }).agencies;
    if (agency && agency.is_active === false) {
      return { isAgencyUser: false, userId, email: user.email, error: "agency_inactive" };
    }

    return {
      isAgencyUser: true,
      userId,
      email: user.email,
      agencyId: au.agency_id ?? undefined,
      agencyName: agency?.name || "Unknown",
      role: au.role ?? undefined,
      partnerType: agency?.partner_type ?? "agency",
    };
  } catch (error: unknown) {
    return { isAgencyUser: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 파트너 유형 게이트 (2026-07-24 권한 정비 D — KNOWN_ISSUES 참조)
 *
 * 배경: 해외 에이전시(agency)와 해외 의료기관(medical_institution)은 같은 checkAgencyAuth 를
 * 통과한다 — "의료기관 전용" 데이터를 추가할 때 분기를 잊으면 조용히 둘 다 통과하는 구조.
 * → 유형 전용 라우트는 반드시 이 헬퍼로 명시 게이트할 것 (수동 if 비교 금지).
 *
 * 사용: const gate = requirePartnerType(auth, "medical_institution"); if (gate) return gate;
 */
export function requirePartnerType(
  auth: AgencyAuthResult,
  type: "agency" | "medical_institution"
): Response | null {
  if (!auth.isAgencyUser || !auth.agencyId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }
  if (auth.partnerType !== type) {
    return Response.json({ ok: false, error: `not_${type}` }, { status: 403 });
  }
  return null;
}
