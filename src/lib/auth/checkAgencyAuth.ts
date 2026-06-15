/**
 * HEALO: 에이전시(환자 유치 파트너) 담당자 권한 체크
 * checkHospitalAuth 와 동일 패턴 — Bearer token / 쿠키 인증 후 agency_users 조회.
 */

import { createSupabaseServerClient, createServiceRoleClient } from "../supabase/server";

export interface AgencyAuthResult {
  isAgencyUser: boolean;
  userId?: string;
  email?: string;
  agencyId?: string;
  agencyName?: string;
  role?: string;
  error?: string;
}

export async function checkAgencyAuth(request?: any): Promise<AgencyAuthResult> {
  try {
    let user: any = null;
    let userError: any = null;

    if (request?.headers) {
      const authHeader = request.headers.get?.("authorization") || request.headers.get?.("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        try {
          const { supabaseAdmin } = await import("../rag/supabaseAdmin");
          const { data, error } = await supabaseAdmin.auth.getUser(token);
          user = data?.user;
          userError = error;
        } catch (err: any) {
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
      } catch (err: any) {
        userError = err;
      }
    }
    if (userError || !user) {
      return { isAgencyUser: false, error: userError?.message || "no_user" };
    }

    const userId = user.id;
    const serviceClient = createServiceRoleClient() as any;
    const { data: au, error: auErr } = await serviceClient
      .from("agency_users")
      .select("agency_id, role, is_active, agencies(id, name, is_active)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (auErr || !au) {
      return { isAgencyUser: false, userId, email: user.email, error: "not_agency_user" };
    }
    const agency = (au as any).agencies;
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
    };
  } catch (error: any) {
    return { isAgencyUser: false, error: error.message };
  }
}
