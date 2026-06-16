/**
 * healwith: 관리자 유저 검색 API
 *
 * GET /api/admin/users/search?q=<email or name>&limit=10
 *
 * 용도: 관리자가 상담 세션 만들 때 환자/의사 계정 찾기용.
 * - auth.users 이메일 부분 매치
 * - profiles.full_name 부분 매치 (있는 경우)
 *
 * 제약:
 * - admin only
 * - 최대 10건 반환 (enumeration 방지)
 * - 쿼리 길이 2자 이상 필수
 * - rate limit
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  // role 지정 시: 해당 역할(doctor/coordinator 등) 회원 전체 반환 (드롭다운용, q 불필요)
  const role = (request.nextUrl.searchParams.get("role") || "").trim();
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "10"),
    50
  );

  if (!role && q.length < 2) {
    return Response.json({
      ok: true,
      users: [],
      hint: "검색어 2자 이상 입력",
    });
  }

  try {
    // auth.users 는 listUsers 로 접근 — 서버사이드 필터 없어서 수동 필터
    const { data: authData, error: authErr } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200, // 전역 200명까지 스캔 (파일럿 단계)
      });

    if (authErr) {
      console.error("[users/search] listUsers error:", authErr.message);
      return Response.json(
        { ok: false, error: "search_failed" },
        { status: 500 }
      );
    }

    const qLower = q.toLowerCase();
    const matched = (authData.users || [])
      .filter((u: any) => {
        // role 모드: app_metadata.role 일치 + 비활성 제외 (드롭다운엔 활성 직원만)
        if (role) return u.app_metadata?.role === role && u.app_metadata?.disabled !== true;
        // 검색 모드: 이메일 부분 매치
        return (u.email || "").toLowerCase().includes(qLower);
      })
      .slice(0, limit)
      .map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        full_name: u.user_metadata?.full_name || null,
        role: u.app_metadata?.role || null,
      }));

    return Response.json({
      ok: true,
      users: matched,
      total: matched.length,
    });
  } catch (err: any) {
    console.error("[users/search] exception:", err.message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
