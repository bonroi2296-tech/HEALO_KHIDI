/**
 * HOSPITAL_OFFER_IMPORT_V1: 미리보기 payload로 treatments + treatment_sources DB 반영
 * POST /api/admin/hospitals/[id]/offers/apply
 * Body: OffersPreviewPayload (preview 응답과 동일)
 */

export const runtime = "nodejs";
export const maxDuration = 30;

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import {
  logAdminAction,
  getIpFromRequest,
  getUserAgentFromRequest,
} from "@/lib/audit/adminAuditLog";
import { generateSlug } from "@/lib/utils/slug";
import type { OffersPreviewPayload, OfferItem } from "@/lib/hospitalOffers/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;
  const { id: hospitalId } = await params;
  if (!hospitalId) {
    return Response.json(
      { ok: false, error: "missing_hospital_id", detail: "병원 ID가 없습니다." },
      { status: 400 }
    );
  }

  let body: OffersPreviewPayload;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "invalid_json", detail: "요청 데이터 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  if (body.hospital_id !== hospitalId) {
    return Response.json(
      { ok: false, error: "hospital_id_mismatch", detail: "병원 정보가 일치하지 않습니다. 페이지를 새로고침 후 다시 시도하세요." },
      { status: 400 }
    );
  }

  const { data: hospital } = await supabaseAdmin
    .from("hospitals")
    .select("id")
    .eq("id", hospitalId)
    .single();

  if (!hospital) {
    return Response.json(
      { ok: false, error: "hospital_not_found", detail: "병원을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const offers: OfferItem[] = Array.isArray(body.offers) ? body.offers : [];
  const captured_at = body.captured_at || new Date().toISOString();
  const sources = Array.isArray(body.sources) ? body.sources : [];

  const { data: existingTreatments } = await supabaseAdmin
    .from("treatments")
    .select("id, slug")
    .eq("hospital_id", hospitalId);
  const usedSlugs = new Set((existingTreatments || []).map((t) => t.slug).filter(Boolean));

  function ensureUniqueSlug(baseSlug: string): string {
    let slug = baseSlug;
    let n = 1;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${n}`;
      n++;
    }
    usedSlugs.add(slug);
    return slug;
  }

  const treatmentIds: string[] = [];
  let created = 0;
  let updated = 0;
  const intended = offers.slice(0, 3).filter((o) => o?.treatment?.name?.trim()).length;

  for (const offer of offers.slice(0, 3)) {
    const t = offer.treatment;
    if (!t?.name?.trim()) continue;

    const baseSlug =
      t.slug && t.slug.trim() ? t.slug.trim() : generateSlug(t.name);
    const slug = ensureUniqueSlug(baseSlug);

    const basePayload: Record<string, unknown> = {
      hospital_id: hospitalId,
      name: t.name.trim(),
      slug,
      description: t.description ?? null,
      full_description: t.full_description ?? null,
      price_min: t.price_min ?? null,
      price_max: t.price_max ?? null,
      benefits: [],
      tags: t.tags ?? [],
      images: t.images ?? [],
      thumbnail_image: (t.images && t.images[0]) ?? null,
      gallery_images: t.images ?? [],
      display_order: null,
      recovery_time_min: t.recovery_time_min ?? null,
      recovery_time_max: t.recovery_time_max ?? null,
      side_effects: t.side_effects ?? [],
      side_effects_detail: null,
      precautions: t.precautions ?? [],
      anesthesia_type: t.anesthesia_type ?? null,
      surgery_duration_min: t.duration ?? null,
      surgery_duration_max: t.duration ?? null,
      required_equipment: [],
      insurance_coverage: false,
      insurance_coverage_detail: null,
      annual_procedure_count: null,
      success_rate: null,
      before_after_images: [],
      price_includes: t.price_includes ?? [],
    };

    const existing = (existingTreatments || []).find((e) => e.slug === slug);
    const payload =
      existing
        ? basePayload
        : { ...basePayload, is_published: false }; // 신규 자동생성 시술만 기본 숨김, 업데이트 시 기존 노출 유지
    let treatmentId: string;

    if (existing) {
      const { data: up, error: err } = await supabaseAdmin
        .from("treatments")
        .update(payload)
        .eq("id", existing.id)
        .select("id")
        .single();
      if (err || !up?.id) {
        if (err) console.error("[offers/apply] update error:", err.message);
        continue;
      }
      treatmentId = up.id;
      updated++;
    } else {
      const { data: ins, error: err } = await supabaseAdmin
        .from("treatments")
        .insert([payload])
        .select("id")
        .single();
      if (err) {
        console.error("[offers/apply] insert error:", err.message);
        continue;
      }
      treatmentId = ins.id;
      created++;
    }

    treatmentIds.push(treatmentId);

    // (2026-07-20, POSTMORTEMS #97) `raw_hash` 컬럼은 실DB `treatment_sources` 에 없어서
    // 이 insert 가 항상 실패하고 있었다(테이블 0건). 어디서도 되읽지 않는 값이라 컬럼을
    // 새로 만들지 않고 제거한다 — 중복 판정이 필요해지면 그때 컬럼과 함께 되살릴 것.
    await supabaseAdmin.from("treatment_sources").insert({
      treatment_id: treatmentId,
      hospital_id: hospitalId,
      captured_at: captured_at,
      sources,
      evidence: offer.evidence ?? {},
    } as any);
  }

  const { authResult } = auth;
  const partialFailure = intended > 0 && created + updated < intended;

  logAdminAction({
    adminEmail: authResult.email || "unknown",
    adminUserId: authResult.userId,
    action: "HOSPITAL_OFFERS_APPLY",
    ipAddress: getIpFromRequest(request),
    userAgent: getUserAgentFromRequest(request),
    metadata: {
      hospital_id: hospitalId,
      created,
      updated,
      intended,
      treatment_ids: treatmentIds,
    },
  }).catch((err) => console.error("[offers/apply] audit log failed:", err.message));

  return Response.json({
    ok: true,
    created,
    updated,
    treatment_ids: treatmentIds,
    ...(partialFailure && {
      partial_failure: true,
      message: "일부 시술만 저장되었습니다. 서버 로그를 확인해 주세요.",
    }),
  });
}
