/**
 * HEALO: 관리자 시술 관리 API
 * 
 * 경로: /api/admin/treatments
 * 권한: 관리자 전용
 * 
 * 목적:
 * - 시술 데이터 CRUD (브라우저 직접 Supabase 호출 제거)
 * - 서버 사이드에서 service role 사용
 * - RLS 정책 우회 (관리자 권한으로 모든 데이터 접근)
 * 
 * Slug 정책:
 * - Slug는 REQUIRED
 * - CREATE: name에서 slug 자동 생성
 * - UPDATE: 기존 slug 유지 (명시적으로 변경하지 않는 한)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import {
  logAdminAction,
  getIpFromRequest,
  getUserAgentFromRequest,
} from "@/lib/audit/adminAuditLog";
import { generateSlug, resolveSlugForUpdate } from "@/lib/utils/slug";
import {
  TreatmentCreateSchema,
  TreatmentUpdateSchema,
  validationErrorResponse,
} from "@/lib/validation/admin";
import { extractKrFields, triggerMultiLangTranslation } from "@/lib/translate";

/**
 * GET: 시술 목록 조회 (관리자 전용)
 * 
 * Query Parameters:
 * - hospital_id: 병원 ID로 필터링 (optional)
 * 
 * Response:
 * {
 *   ok: true,
 *   treatments: [...],
 *   total: 100
 * }
 */
export async function GET(request: NextRequest) {
  // ✅ 환경변수 검증
  assertSupabaseEnv();

  // ========================================
  // 1. 관리자 권한 확인
  // ========================================
  const auth = await requireAdminAuth(request);
  if (!auth.success) {
    return auth.response;
  }
  const { authResult } = auth;

  // ========================================
  // 2. Query Parameters 파싱
  // ========================================
  const { searchParams } = new URL(request.url);
  const hospitalId = searchParams.get("hospital_id");
  const countsOnly = searchParams.get("counts_only") === "true";

  // ========================================
  // 3. DB 조회
  // ========================================
  try {
    if (countsOnly) {
      const { data, error } = await supabaseAdmin
        .from("treatments")
        .select("hospital_id");
      if (error) {
        return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
      }
      const counts: Record<string, number> = {};
      for (const row of data || []) {
        if (!row.hospital_id) continue;
        counts[row.hospital_id] = (counts[row.hospital_id] || 0) + 1;
      }
      return Response.json({ ok: true, counts });
    }
    let query = supabaseAdmin
      .from("treatments")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (hospitalId) {
      query = query.eq("hospital_id", hospitalId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[admin/treatments] GET error:", error.message);
      return Response.json(
        {
          ok: false,
          error: "db_query_failed",
        },
        { status: 500 }
      );
    }

    // ========================================
    // 4. 감사 로그 기록
    // ========================================
    logAdminAction({
      adminEmail: authResult.email || "unknown",
      adminUserId: authResult.userId,
      action: "LIST_TREATMENTS",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: { hospital_id: hospitalId, total: count || 0 },
    }).catch((err) => {
      console.error("[admin/treatments] Audit log failed:", err.message);
    });

    // ========================================
    // 5. 응답 반환
    // ========================================
    return Response.json({
      ok: true,
      treatments: data || [],
      total: count || 0,
    });
  } catch (error: any) {
    console.error("[admin/treatments] GET exception:", error.message);
    return Response.json(
      {
        ok: false,
        error: "internal_error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST: 새 시술 생성 (관리자 전용)
 * 
 * Body:
 * {
 *   hospital_id: string (required),
 *   name: string (required),
 *   slug?: string (optional, 없으면 name에서 자동 생성),
 *   description?: string,
 *   full_description?: string,
 *   price_min?: number,
 *   benefits?: string[],
 *   tags?: string[],
 *   images?: string[],
 *   display_order?: number,
 *   is_published?: boolean
 * }
 * 
 * Response:
 * {
 *   ok: true,
 *   treatment: { id, ... }
 * }
 */
export async function POST(request: NextRequest) {
  // ✅ 환경변수 검증
  assertSupabaseEnv();

  // ========================================
  // 1. 관리자 권한 확인
  // ========================================
  const auth = await requireAdminAuth(request);
  if (!auth.success) {
    return auth.response;
  }
  const { authResult } = auth;

  // ========================================
  // 2. Body 파싱 및 검증
  // ========================================
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  // ✅ Zod 검증
  const validation = TreatmentCreateSchema.safeParse(body);
  if (!validation.success) {
    return validationErrorResponse(validation.error);
  }

  const validatedData = validation.data;

  // ========================================
  // 3. Slug 생성 (정책: REQUIRED, CREATE시 자동 생성)
  // ========================================
  const slug = validatedData.slug?.trim() || generateSlug(validatedData.name);

  // ========================================
  // 4. Payload 구성
  // ========================================
  const payload: Record<string, any> = {
    hospital_id: validatedData.hospital_id.trim(),
    name: validatedData.name.trim(),
    slug,
    description: validatedData.description || null,
    full_description: validatedData.full_description || null,
    price_min: validatedData.price_min,
    price_max: validatedData.price_max ?? null,
    benefits: validatedData.benefits || [],
    tags: validatedData.tags || [],
    images: validatedData.images || [],
    thumbnail_image: validatedData.thumbnail_image ?? null,
    gallery_images: validatedData.gallery_images || [],
    display_order: validatedData.display_order || null,
    is_published: validatedData.is_published,
    recovery_time_min: validatedData.recovery_time_min ?? null,
    recovery_time_max: validatedData.recovery_time_max ?? null,
    side_effects: validatedData.side_effects || [],
    side_effects_detail: validatedData.side_effects_detail ?? null,
    precautions: validatedData.precautions || [],
    anesthesia_type: validatedData.anesthesia_type ?? null,
    surgery_duration_min: validatedData.surgery_duration_min ?? null,
    surgery_duration_max: validatedData.surgery_duration_max ?? null,
    required_equipment: validatedData.required_equipment || [],
    insurance_coverage: validatedData.insurance_coverage ?? false,
    insurance_coverage_detail: validatedData.insurance_coverage_detail ?? null,
    annual_procedure_count: validatedData.annual_procedure_count ?? null,
    success_rate: validatedData.success_rate ?? null,
    before_after_images: validatedData.before_after_images || [],
    price_includes: validatedData.price_includes || [],
    ...extractKrFields({
      name: validatedData.name,
      description: validatedData.description,
      tags: validatedData.tags,
    }),
  };

  // ========================================
  // 5. DB 삽입
  // ========================================
  try {
    const { data, error } = await supabaseAdmin
      .from("treatments")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("[admin/treatments] POST error:", error.message);
      return Response.json(
        {
          ok: false,
          error: "db_insert_failed",
        },
        { status: 500 }
      );
    }

    // ========================================
    // 6. 감사 로그 기록
    // ========================================
    logAdminAction({
      adminEmail: authResult.email || "unknown",
      adminUserId: authResult.userId,
      action: "CREATE_TREATMENT",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: { treatment_id: data.id, hospital_id: payload.hospital_id, name: payload.name, slug: payload.slug },
    }).catch((err) => {
      console.error("[admin/treatments] Audit log failed:", err.message);
    });

    if (payload.name || payload.description || payload.tags) {
      triggerMultiLangTranslation("treatments", data.id, payload, supabaseAdmin).catch((e) =>
        console.error("[admin/treatments] translation error:", e.message)
      );
    }

    // ========================================
    // 7. 응답 반환
    // ========================================
    return Response.json({
      ok: true,
      treatment: data,
    });
  } catch (error: any) {
    console.error("[admin/treatments] POST exception:", error.message);
    return Response.json(
      {
        ok: false,
        error: "internal_error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH: 시술 수정 (관리자 전용)
 * 
 * Query Parameters:
 * - id: 시술 ID (required)
 * 
 * Body: (수정할 필드만 포함)
 * {
 *   name?: string,
 *   slug?: string (명시적으로 변경하지 않으면 기존 유지),
 *   description?: string,
 *   ... (다른 필드들)
 * }
 * 
 * Slug 정책:
 * - slug가 명시적으로 제공되지 않으면 기존 slug 유지
 * - 기존 데이터 안정성 보장
 * 
 * Response:
 * {
 *   ok: true,
 *   treatment: { id, ... }
 * }
 */
export async function PATCH(request: NextRequest) {
  // ✅ 환경변수 검증
  assertSupabaseEnv();

  // ========================================
  // 1. 관리자 권한 확인
  // ========================================
  const auth = await requireAdminAuth(request);
  if (!auth.success) {
    return auth.response;
  }
  const { authResult } = auth;

  // ========================================
  // 2. Query Parameters 파싱
  // ========================================
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json(
      { ok: false, error: "id_required", detail: "시술 ID가 필요합니다." },
      { status: 400 }
    );
  }

  // ========================================
  // 3. Body 파싱 및 검증
  // ========================================
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  // ✅ Zod 검증 (partial - 변경된 필드만)
  const validation = TreatmentUpdateSchema.safeParse(body);
  if (!validation.success) {
    return validationErrorResponse(validation.error);
  }

  const validatedData = validation.data;

  // ========================================
  // 4. 기존 데이터 조회 (slug 유지 정책)
  // ========================================
  try {
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("treatments")
      .select("slug, name")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return Response.json(
        { ok: false, error: "treatment_not_found", detail: "시술을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // ========================================
    // 5. Slug 결정 (정책: UPDATE시 기존 slug 유지)
    // ========================================
    const finalName = validatedData.name?.trim() || existing.name || "";
    const finalSlug = resolveSlugForUpdate(validatedData.slug, existing.slug, finalName);

    // ========================================
    // 6. Payload 구성 (변경된 필드만)
    // ========================================
    const payload: any = {};

    if (validatedData.hospital_id !== undefined) payload.hospital_id = validatedData.hospital_id;
    if (validatedData.name !== undefined) payload.name = validatedData.name.trim();
    payload.slug = finalSlug;
    if (validatedData.description !== undefined) payload.description = validatedData.description;
    if (validatedData.full_description !== undefined) payload.full_description = validatedData.full_description;
    if (validatedData.price_min !== undefined) payload.price_min = validatedData.price_min;
    if (validatedData.price_max !== undefined) payload.price_max = validatedData.price_max;
    if (validatedData.benefits !== undefined) payload.benefits = validatedData.benefits ?? [];
    if (validatedData.tags !== undefined) payload.tags = validatedData.tags ?? [];
    if (validatedData.images !== undefined) payload.images = validatedData.images ?? [];
    if (validatedData.thumbnail_image !== undefined) payload.thumbnail_image = validatedData.thumbnail_image;
    if (validatedData.gallery_images !== undefined) payload.gallery_images = validatedData.gallery_images ?? [];
    if (validatedData.display_order !== undefined) payload.display_order = validatedData.display_order;
    if (validatedData.is_published !== undefined) payload.is_published = validatedData.is_published;
    if (validatedData.recovery_time_min !== undefined) payload.recovery_time_min = validatedData.recovery_time_min;
    if (validatedData.recovery_time_max !== undefined) payload.recovery_time_max = validatedData.recovery_time_max;
    if (validatedData.side_effects !== undefined) payload.side_effects = validatedData.side_effects ?? [];
    if (validatedData.side_effects_detail !== undefined) payload.side_effects_detail = validatedData.side_effects_detail;
    if (validatedData.precautions !== undefined) payload.precautions = validatedData.precautions ?? [];
    if (validatedData.anesthesia_type !== undefined) payload.anesthesia_type = validatedData.anesthesia_type;
    if (validatedData.surgery_duration_min !== undefined) payload.surgery_duration_min = validatedData.surgery_duration_min;
    if (validatedData.surgery_duration_max !== undefined) payload.surgery_duration_max = validatedData.surgery_duration_max;
    if (validatedData.required_equipment !== undefined) payload.required_equipment = validatedData.required_equipment ?? [];
    if (validatedData.insurance_coverage !== undefined) payload.insurance_coverage = validatedData.insurance_coverage;
    if (validatedData.insurance_coverage_detail !== undefined) payload.insurance_coverage_detail = validatedData.insurance_coverage_detail;
    if (validatedData.annual_procedure_count !== undefined) payload.annual_procedure_count = validatedData.annual_procedure_count;
    if (validatedData.success_rate !== undefined) payload.success_rate = validatedData.success_rate;
    if (validatedData.before_after_images !== undefined) payload.before_after_images = validatedData.before_after_images ?? [];
    if (validatedData.price_includes !== undefined) payload.price_includes = validatedData.price_includes ?? [];

    const krFields = extractKrFields(payload);
    Object.assign(payload, krFields);

    // ========================================
    // 7. DB 업데이트
    // ========================================
    const { data, error } = await supabaseAdmin
      .from("treatments")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[admin/treatments] PATCH error:", error.message);
      return Response.json(
        {
          ok: false,
          error: "db_update_failed",
        },
        { status: 500 }
      );
    }

    // ========================================
    // 8. 감사 로그 기록
    // ========================================
    logAdminAction({
      adminEmail: authResult.email || "unknown",
      adminUserId: authResult.userId,
      action: "UPDATE_TREATMENT",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: { treatment_id: id, changes: Object.keys(payload) },
    }).catch((err) => {
      console.error("[admin/treatments] Audit log failed:", err.message);
    });

    if (payload.name || payload.description || payload.tags) {
      triggerMultiLangTranslation("treatments", id, payload, supabaseAdmin).catch((e) =>
        console.error("[admin/treatments] translation error:", e.message)
      );
    }

    // ========================================
    // 9. 응답 반환
    // ========================================
    return Response.json({
      ok: true,
      treatment: data,
    });
  } catch (error: any) {
    console.error("[admin/treatments] PATCH exception:", error.message);
    return Response.json(
      {
        ok: false,
        error: "internal_error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 시술 삭제 (관리자 전용)
 * 
 * Query Parameters:
 * - id: 시술 ID (required)
 * 
 * Response:
 * {
 *   ok: true
 * }
 */
export async function DELETE(request: NextRequest) {
  // ✅ 환경변수 검증
  assertSupabaseEnv();

  // ========================================
  // 1. 관리자 권한 확인
  // ========================================
  const auth = await requireAdminAuth(request);
  if (!auth.success) {
    return auth.response;
  }
  const { authResult } = auth;

  // ========================================
  // 2. Query Parameters 파싱
  // ========================================
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json(
      { ok: false, error: "id_required", detail: "시술 ID가 필요합니다." },
      { status: 400 }
    );
  }

  // ========================================
  // 3. DB 삭제
  // ========================================
  try {
    const { error } = await supabaseAdmin
      .from("treatments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[admin/treatments] DELETE error:", error.message);
      return Response.json(
        {
          ok: false,
          error: "db_delete_failed",
        },
        { status: 500 }
      );
    }

    // ========================================
    // 4. 감사 로그 기록
    // ========================================
    logAdminAction({
      adminEmail: authResult.email || "unknown",
      adminUserId: authResult.userId,
      action: "DELETE_TREATMENT",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: { treatment_id: id },
    }).catch((err) => {
      console.error("[admin/treatments] Audit log failed:", err.message);
    });

    // ========================================
    // 5. 응답 반환
    // ========================================
    return Response.json({
      ok: true,
    });
  } catch (error: any) {
    console.error("[admin/treatments] DELETE exception:", error.message);
    return Response.json(
      {
        ok: false,
        error: "internal_error",
      },
      { status: 500 }
    );
  }
}
