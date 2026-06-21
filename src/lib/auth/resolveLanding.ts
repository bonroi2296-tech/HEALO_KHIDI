/**
 * healwith: 로그인 후 역할별 착지 경로 결정 (단일 규칙).
 *
 * 그동안 로그인하면 역할과 무관하게 전부 /patient(환자 대시보드)로 보냈다.
 * → 에이전시·병원·코디·의사가 환자 화면을 보는 문제. 여기서 계정 계층에 맞는
 *   포털로 보낸다. 계층 정의는 accountTiers.ts 표준을 따른다.
 *
 * - admin → /admin, coordinator → /coordinator, doctor → /doctor
 * - agency(해외 에이전시/의료기관) → /agency
 * - 병원 담당자(hospital_users) → /partner
 * - 그 외(환자) → /patient
 */

import "server-only";
import { supabaseAdmin } from "../rag/supabaseAdmin";

export async function resolveLandingPath(opts: {
  userId?: string | null;
  appRole?: string | null;
  isAdmin?: boolean;
}): Promise<string> {
  if (opts.isAdmin || opts.appRole === "admin") return "/admin";
  if (opts.appRole === "coordinator") return "/coordinator";
  if (opts.appRole === "doctor") return "/doctor";
  if (opts.appRole === "agency") return "/agency";

  // 병원 담당자는 app_metadata.role 이 아니라 hospital_users 테이블로 판정
  if (opts.userId) {
    try {
      const { data } = await supabaseAdmin
        .from("hospital_users")
        .select("hospital_id")
        .eq("user_id", opts.userId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (data) return "/partner";
    } catch {
      /* 조회 실패 시 환자로 폴백 */
    }
  }
  return "/patient";
}
