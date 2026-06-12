/**
 * HEALO: 관리자 병원 관리 API
 * 
 * 경로: /api/admin/hospitals
 * 권한: 관리자 전용
 * 
 * 목적:
 * - 병원 데이터 CRUD (브라우저 직접 Supabase 호출 제거)
 * - 서버 사이드에서 service role 사용
 * - RLS 정책 우회 (관리자 권한으로 모든 데이터 접근)
 * 
 * Slug 정책:
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
  HospitalCreateSchema,
  HospitalUpdateSchema,
  validationErrorResponse,
} from "@/lib/validation/admin";
import { extractKrFields, triggerMultiLangTranslation } from "@/lib/translate";

/**
 * GET: 병원 목록 조회 (관리자 전용)
 * 
 * Response:
 * {
 *   ok: true,
 *   hospitals: [...],
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
  // 2. DB 조회
  // ========================================
  try {
    const { data, error, count } = await supabaseAdmin
      .from("hospitals")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/hospitals] GET error:", error.message);
      return Response.json(
        {
          ok: false,
          error: "db_query_failed",
        },
        { status: 500 }
      );
    }

    // ========================================
    // 3. 감사 로그 기록
    // ========================================
    logAdminAction({
      adminEmail: authResult.email || "unknown",
      adminUserId: authResult.userId,
      action: "LIST_HOSPITALS",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: { total: count || 0 },
    }).catch((err) => {
      console.error("[admin/hospitals] Audit log failed:", err.message);
    });

    // ========================================
    // 4. 응답 반환
    // ========================================
    return Response.json({
      ok: true,
      hospitals: data || [],
      total: count || 0,
    });
  } catch (error: any) {
    console.error("[admin/hospitals] GET exception:", error.message);
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
 * POST: 새 병원 생성 (관리자 전용)
 * 
 * Body:
 * {
 *   name: string (required),
 *   slug?: string (optional, 없으면 name에서 자동 생성),
 *   location_kr?: string,
 *   location_en?: string,
 *   address_detail?: string,
 *   description?: string,
 *   latitude?: number,
 *   longitude?: number,
 *   tags?: string[],
 *   images?: string[],
 *   supported_languages?: string[],
 *   amenities?: string[],
 *   operating_hours?: object,
 *   doctor_profile?: object,
 *   display_order?: number,
 *   is_published?: boolean
 * }
 * 
 * Response:
 * {
 *   ok: true,
 *   hospital: { id, ... }
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
  const validation = HospitalCreateSchema.safeParse(body);
  if (!validation.success) {
    return validationErrorResponse(validation.error);
  }

  const validatedData = validation.data;

  // ========================================
  // 3. Slug 생성 (정책: CREATE시 자동 생성)
  // ========================================
  const slug = validatedData.slug?.trim() || generateSlug(validatedData.name);

  // ========================================
  // 4. Payload 구성
  // ========================================
  const payload: Record<string, any> = {
    name: validatedData.name.trim(),
    slug,
    location_kr: validatedData.location_kr?.trim() || null,
    location_en: validatedData.location_en?.trim() || null,
    address_detail: validatedData.address_detail?.trim() || null,
    website: validatedData.website?.trim() || null,
    description: validatedData.description || null,
    latitude: validatedData.latitude || null,
    longitude: validatedData.longitude || null,
    tags: validatedData.tags || [],
    images: validatedData.images || [],
    thumbnail_image: validatedData.thumbnail_image ?? null,
    gallery_images: validatedData.gallery_images || [],
    supported_languages: validatedData.supported_languages || [],
    amenities: validatedData.amenities || [],
    specialties: validatedData.specialties || [],
    medical_equipment: validatedData.medical_equipment || [],
    operating_hours: validatedData.operating_hours || null,
    doctor_profile: validatedData.doctor_profile || null,
    certifications: validatedData.certifications || [],
    insurance_accepted: validatedData.insurance_accepted ?? false,
    insurance_details: validatedData.insurance_details ?? null,
    annual_surgery_count: validatedData.annual_surgery_count ?? null,
    establishment_date: validatedData.establishment_date ?? null,
    doctor_count: validatedData.doctor_count ?? null,
    external_ratings: validatedData.external_ratings ?? null,
    display_order: validatedData.display_order || null,
    is_published: validatedData.is_published,
    is_partner: validatedData.is_partner ?? false,
    faq: validatedData.faq || [],
    ...extractKrFields({
      name: validatedData.name,
      description: validatedData.description,
      tags: validatedData.tags,
      specialties: validatedData.specialties,
    }),
  };

  // ========================================
  // 5. DB 삽입
  // ========================================
  try {
    const { data, error } = await supabaseAdmin
      .from("hospitals")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("[admin/hospitals] POST error:", error.message);
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
      action: "CREATE_HOSPITAL",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: { hospital_id: data.id, name: payload.name, slug: payload.slug },
    }).catch((err) => {
      console.error("[admin/hospitals] Audit log failed:", err.message);
    });

    // ========================================
    // 6.5. 비동기 번역 트리거
    // ========================================
    if (payload.name || payload.description || payload.tags || payload.specialties) {
      triggerMultiLangTranslation("hospitals", data.id, payload, supabaseAdmin).catch((e) =>
        console.error("[admin/hospitals] translation error:", e.message)
      );
    }

    // ========================================
    // 7. 응답 반환
    // ========================================
    return Response.json({
      ok: true,
      hospital: data,
    });
  } catch (error: any) {
    console.error("[admin/hospitals] POST exception:", error.message);
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
 * PATCH: 병원 수정 (관리자 전용)
 * 
 * Query Parameters:
 * - id: 병원 ID (required)
 * 
 * Body: (수정할 필드만 포함)
 * {
 *   name?: string,
 *   slug?: string (명시적으로 변경하지 않으면 기존 유지),
 *   location_kr?: string,
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
 *   hospital: { id, ... }
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
      { ok: false, error: "id_required" },
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
  const validation = HospitalUpdateSchema.safeParse(body);
  if (!validation.success) {
    return validationErrorResponse(validation.error);
  }

  const validatedData = validation.data;

  // ========================================
  // 4. 기존 데이터 조회 (slug 유지 정책)
  // ========================================
  try {
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("hospitals")
      .select("slug, name")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return Response.json(
        { ok: false, error: "hospital_not_found" },
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

    if (validatedData.name !== undefined) payload.name = validatedData.name.trim();
    payload.slug = finalSlug; // 항상 포함 (유지 또는 변경)
    if (validatedData.location_kr !== undefined) payload.location_kr = validatedData.location_kr?.trim() || null;
    if (validatedData.location_en !== undefined) payload.location_en = validatedData.location_en?.trim() || null;
    if (validatedData.address_detail !== undefined) payload.address_detail = validatedData.address_detail?.trim() || null;
    if (validatedData.website !== undefined) payload.website = validatedData.website?.trim() || null;
    if (validatedData.description !== undefined) payload.description = validatedData.description;
    if (validatedData.latitude !== undefined) payload.latitude = validatedData.latitude;
    if (validatedData.longitude !== undefined) payload.longitude = validatedData.longitude;
    if (validatedData.tags !== undefined) payload.tags = validatedData.tags ?? [];
    if (validatedData.images !== undefined) payload.images = validatedData.images ?? [];
    if (validatedData.supported_languages !== undefined) payload.supported_languages = validatedData.supported_languages ?? [];
    if (validatedData.amenities !== undefined) payload.amenities = validatedData.amenities ?? [];
    if (validatedData.operating_hours !== undefined) payload.operating_hours = validatedData.operating_hours;
    if (validatedData.doctor_profile !== undefined) payload.doctor_profile = validatedData.doctor_profile;
    if (validatedData.display_order !== undefined) payload.display_order = validatedData.display_order;
    if (validatedData.is_published !== undefined) payload.is_published = validatedData.is_published;
    if (validatedData.thumbnail_image !== undefined) payload.thumbnail_image = validatedData.thumbnail_image;
    if (validatedData.gallery_images !== undefined) payload.gallery_images = validatedData.gallery_images ?? [];
    if (validatedData.specialties !== undefined) payload.specialties = validatedData.specialties ?? [];
    if (validatedData.medical_equipment !== undefined) payload.medical_equipment = validatedData.medical_equipment ?? [];
    if (validatedData.certifications !== undefined) payload.certifications = validatedData.certifications ?? [];
    if (validatedData.insurance_accepted !== undefined) payload.insurance_accepted = validatedData.insurance_accepted;
    if (validatedData.insurance_details !== undefined) payload.insurance_details = validatedData.insurance_details;
    if (validatedData.annual_surgery_count !== undefined) payload.annual_surgery_count = validatedData.annual_surgery_count;
    if (validatedData.establishment_date !== undefined) payload.establishment_date = validatedData.establishment_date;
    if (validatedData.doctor_count !== undefined) payload.doctor_count = validatedData.doctor_count;
    if (validatedData.external_ratings !== undefined) payload.external_ratings = validatedData.external_ratings;
    if (validatedData.faq !== undefined) payload.faq = validatedData.faq ?? [];
    if (validatedData.i18n !== undefined) payload.i18n = validatedData.i18n ?? {};
    if (validatedData.is_partner !== undefined) payload.is_partner = validatedData.is_partner;
    if (validatedData.offers_auto_failed_at !== undefined) payload.offers_auto_failed_at = validatedData.offers_auto_failed_at;
    if (validatedData.offers_auto_fail_reason !== undefined) payload.offers_auto_fail_reason = validatedData.offers_auto_fail_reason;
    if (validatedData.offers_auto_skip !== undefined) payload.offers_auto_skip = validatedData.offers_auto_skip;

    const krFields = extractKrFields(payload);
    Object.assign(payload, krFields);

    // ========================================
    // 7. DB 업데이트
    // ========================================
    const { data, error } = await supabaseAdmin
      .from("hospitals")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[admin/hospitals] PATCH error:", error.message);
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
      action: "UPDATE_HOSPITAL",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: { hospital_id: id, changes: Object.keys(payload) },
    }).catch((err) => {
      console.error("[admin/hospitals] Audit log failed:", err.message);
    });

    // ========================================
    // 8.5. 비동기 번역 트리거 (수동 i18n 입력이 없을 때만)
    // ========================================
    const hasManualI18n = payload.i18n && Object.keys(payload.i18n).length > 0;
    if (!hasManualI18n && (payload.name || payload.description || payload.tags || payload.specialties)) {
      triggerMultiLangTranslation("hospitals", id, payload, supabaseAdmin).catch((e) =>
        console.error("[admin/hospitals] translation error:", e.message)
      );
    }

    // ========================================
    // 9. 응답 반환
    // ========================================
    return Response.json({
      ok: true,
      hospital: data,
    });
  } catch (error: any) {
    console.error("[admin/hospitals] PATCH exception:", error.message);
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
 * DELETE: 병원 삭제 (관리자 전용)
 * 
 * Query Parameters:
 * - id: 병원 ID (required)
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
      { ok: false, error: "id_required" },
      { status: 400 }
    );
  }

  // ========================================
  // 3. DB 삭제
  // ========================================
  try {
    const { error } = await supabaseAdmin
      .from("hospitals")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[admin/hospitals] DELETE error:", error.message);
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
      action: "DELETE_HOSPITAL",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: { hospital_id: id },
    }).catch((err) => {
      console.error("[admin/hospitals] Audit log failed:", err.message);
    });

    // ========================================
    // 5. 응답 반환
    // ========================================
    return Response.json({
      ok: true,
    });
  } catch (error: any) {
    console.error("[admin/hospitals] DELETE exception:", error.message);
    return Response.json(
      {
        ok: false,
        error: "internal_error",
      },
      { status: 500 }
    );
  }
}
