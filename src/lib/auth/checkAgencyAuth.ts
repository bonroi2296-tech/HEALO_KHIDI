/**
 * healwith: 에이전시(환자 유치 파트너) 담당자 권한 체크
 * checkHospitalAuth 와 동일 패턴 — Bearer token / 쿠키 인증 후 agency_users 조회.
 */

import type { NextRequest } from "next/server";
import { createSupabaseServerClient, createServiceRoleClient } from "../supabase/server";

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
          const { data, error } = await supabaseAdmin.auth.getUser(token);
          user = data?.user;
          userError = error;
        } catch (err: unknown) {
          userError = err;
        }
      }
    }
    if (!user) {
      try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase.auth.getUser();
        user = data?.user;
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
    const { data: au, error: auErr } = await serviceClient
      .from("agency_users")
      .select("agency_id, role, is_active, agencies(id, name, is_active, partner_type)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .single();

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
