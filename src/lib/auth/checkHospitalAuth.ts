/**
 * healwith: 병원 담당자 권한 체크 유틸
 * 
 * checkAdminAuth.ts와 동일한 패턴으로 Bearer token / 쿠키 인증 후
 * hospital_users 테이블에서 병원 연결 정보를 조회
 */

import type { NextRequest } from "next/server";
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

export async function checkHospitalAuth(request?: NextRequest): Promise<HospitalAuthResult> {
  try {
    let user: import("@supabase/supabase-js").User | null = null;
    let userError: unknown = null;

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
        } catch (err: unknown) {
          console.error("[checkHospitalAuth] Bearer token error:", err instanceof Error ? err.message : String(err));
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
      } catch (err: unknown) {
        console.error("[checkHospitalAuth] Cookie auth error:", err instanceof Error ? err.message : String(err));
        userError = err;
      }
    }

    if (userError || !user) {
      return {
        isHospitalUser: false,
        error: (userError instanceof Error ? userError.message : userError ? String((userError as { message?: unknown }).message ?? userError) : undefined) || "no_user",
      };
    }

    // 계정 비활성(app_metadata.disabled) — 계층 무관 전역 킬스위치. checkAdminAuth와 정합.
    // 병원 계정은 hospital_users.is_active로도 막히지만, disabled가 어느 계층에 찍혀도 잠기게 이중 안전.
    if ((user.app_metadata as { disabled?: boolean } | undefined)?.disabled === true) {
      return { isHospitalUser: false, userId: user.id, email: user.email?.trim().toLowerCase(), error: "account_disabled" };
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

    const hospital = (hospitalUser as { hospitals?: { id?: string; name?: string } | null }).hospitals;

    return {
      isHospitalUser: true,
      userId,
      email: userEmail,
      hospitalId: hospitalUser.hospital_id ?? undefined,
      hospitalName: hospital?.name || "Unknown",
      role: hospitalUser.role ?? undefined,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[checkHospitalAuth] Error:", msg);
    return { isHospitalUser: false, error: msg };
  }
}
