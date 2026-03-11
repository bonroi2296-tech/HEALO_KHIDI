/**
 * 시술 자동생성 실패 로그용 DB 컬럼 존재 여부 확인
 * GET /api/admin/hospitals/offers-schema
 * - 마이그레이션 20260226 미적용 시에도 앱은 동작하고, UI에서 안내만 노출할 수 있음
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../src/lib/auth/requireAdminAuth";

export async function GET(request: NextRequest) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { error } = await supabaseAdmin
      .from("hospitals")
      .select("offers_auto_failed_at")
      .limit(1)
      .maybeSingle();

    return Response.json({
      ok: true,
      offersFailureLogEnabled: !error,
      hint: error
        ? "migrations/20260226_offers_auto_fail_log.sql 을 Supabase SQL Editor에서 실행하면 실패 로그를 DB에 저장할 수 있습니다."
        : undefined,
    });
  } catch {
    return Response.json({
      ok: true,
      offersFailureLogEnabled: false,
      hint: "migrations/20260226_offers_auto_fail_log.sql 을 Supabase SQL Editor에서 실행하면 실패 로그를 DB에 저장할 수 있습니다.",
    });
  }
}
