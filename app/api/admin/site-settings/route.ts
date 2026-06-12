/**
 * HEALO: 사이트 설정 관리 API
 * 
 * 경로: /api/admin/site-settings
 * 
 * 기능:
 * - GET: 현재 사이트 설정 조회
 * - PUT: 사이트 설정 업데이트 (upsert)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";

/**
 * GET /api/admin/site-settings
 * 현재 사이트 설정 조회
 */
export async function GET(request: NextRequest) {
  assertSupabaseEnv();
  const apiPath = "/api/admin/site-settings [GET]";

  try {
    // 1) 관리자 인증
    const auth = await requireAdminAuth(request);
    if (!auth.success) return auth.response;

    // 2) site_settings 조회 (첫 번째 row 또는 id=1)
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`[${apiPath}] DB 조회 실패:`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      // 테이블이 존재하지 않는 경우
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            ok: false, 
            error: "table_not_found",
            message: "site_settings 테이블이 존재하지 않습니다. migrations/20260204_create_site_settings.sql을 실행하세요.",
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { ok: false, error: "query_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      settings: data || { logo_url: null, hero_background_url: null },
    });
  } catch (err: any) {
    console.error(`[${apiPath}] 예외 발생:`, err);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/site-settings
 * 사이트 설정 업데이트 (upsert)
 * 
 * Body: { logo_url?: string, hero_background_url?: string }
 */
export async function PUT(request: NextRequest) {
  assertSupabaseEnv();
  const apiPath = "/api/admin/site-settings [PUT]";

  try {
    // 1) 관리자 인증
    const auth = await requireAdminAuth(request);
    if (!auth.success) return auth.response;

    // 2) 요청 body 파싱
    const body = await request.json();
    const { logo_url, hero_background_url } = body;

    // 3) 업데이트할 데이터 구성
    const updateData: Record<string, any> = {};
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (hero_background_url !== undefined) updateData.hero_background_url = hero_background_url;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { ok: false, error: "no_fields_to_update" },
        { status: 400 }
      );
    }

    // 4) 기존 설정 확인
    const { data: existing } = await supabaseAdmin
      .from("site_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    let result;
    if (existing?.id) {
      // UPDATE
      const { data, error } = await supabaseAdmin
        .from("site_settings")
        .update(updateData)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        console.error(`[${apiPath}] UPDATE 실패:`, error);
        return NextResponse.json(
          { ok: false, error: "update_failed" },
          { status: 500 }
        );
      }
      result = data;
    } else {
      // INSERT (첫 생성)
      const { data, error } = await supabaseAdmin
        .from("site_settings")
        .insert(updateData as any)
        .select()
        .single();

      if (error) {
        console.error(`[${apiPath}] INSERT 실패:`, error);
        return NextResponse.json(
          { ok: false, error: "insert_failed" },
          { status: 500 }
        );
      }
      result = data;
    }

    console.log(`[${apiPath}] 설정 업데이트 완료:`, result);

    return NextResponse.json({
      ok: true,
      message: "사이트 설정이 업데이트되었습니다",
      settings: result,
    });
  } catch (err: any) {
    console.error(`[${apiPath}] 예외 발생:`, err);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
