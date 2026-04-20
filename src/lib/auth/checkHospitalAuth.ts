/**
 * HEALO: 병원 담당자 권한 체크 유틸
 * 
 * checkAdminAuth.ts와 동일한 패턴으로 Bearer token / 쿠키 인증 후
 * hospital_users 테이블에서 병원 연결 정보를 조회
 */

import { createSupabaseServerClient, createServiceRoleClient } from "../supabase/server";

export interface HospitalAuthResult {
  isHospitalUser: boolean;
  userId?: string;
  email?: string;
  hospitalId?: string;
  hospitalName?: string;
  role?: string; // 'owner' | 'manager' | 'viewer'
  error?: string;
}

export async function checkHospitalAuth(request?: any): Promise<HospitalAuthResult> {
  try {
    let user: any = null;
    let userError: any = null;

    // 1. Bearer token
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
          console.error("[checkHospitalAuth] Bearer token error:", err.message);
          userError = err;
        }
      }
    }

    // 2. Cookie fallback
    if (!user) {
      try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase.auth.getUser();
        user = data?.user;
        userError = error;
      } catch (err: any) {
        console.error("[checkHospitalAuth] Cookie auth error:", err.message);
        userError = err;
      }
    }

    if (userError || !user) {
      return { isHospitalUser: false, error: userError?.message || "no_user" };
    }

    const userId = user.id;
    const userEmail = user.email?.trim().toLowerCase();

    // 3. hospital_users 테이블에서 연결 정보 조회
    const serviceClient = createServiceRoleClient();

    const { data: hospitalUser, error: huError } = await serviceClient
      .from("hospital_users")
      .select("hospital_id, role, is_active, hospitals(id, name)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (huError || !hospitalUser) {
      return {
        isHospitalUser: false,
        userId,
        email: userEmail,
        error: "not_hospital_user",
      };
    }

    const hospital = (hospitalUser as any).hospitals;

    return {
      isHospitalUser: true,
      userId,
      email: userEmail,
      hospitalId: hospitalUser.hospital_id ?? undefined,
      hospitalName: hospital?.name || "Unknown",
      role: hospitalUser.role ?? undefined,
    };
  } catch (error: any) {
    console.error("[checkHospitalAuth] Error:", error.message);
    return { isHospitalUser: false, error: error.message };
  }
}
