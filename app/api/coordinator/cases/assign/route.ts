/**
 * healwith: 코디네이터 — 케이스(의뢰)를 국내 병원에 배정
 *
 * POST /api/coordinator/cases/assign  body: { inquiry_id: number, hospital_ids: string[] }
 * 권한: 관리자 + 코디네이터 (의사 제외)
 *
 * 흐름: inquiries(의뢰) → normalized_inquiries(없으면 최소 1건 생성, 있으면 재사용)
 *       → hospital_leads(병원별 status='sent') → 병원이 /hospital/leads 에서 확인.
 * 거대한 normalize 스코어링 파이프라인은 타지 않는다(병원 화면은 언어·국가·치료·출처만 표시).
 * PII(이름·연락처)는 normalized 행에 넣지 않음 → 복호화/재암호화 책임 없음.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { advanceCaseStatus } from "@/lib/khidi/advanceCaseStatus";

export async function POST(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;
  if (!(auth.isAdmin || auth.appRole === "coordinator")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  try {
    assertSupabaseEnv();
    const body = await request.json().catch(() => ({}));
    const inquiryId = body?.inquiry_id != null ? Number(body.inquiry_id) : null;
    const hospitalIds: string[] = Array.isArray(body?.hospital_ids)
      ? body.hospital_ids.filter((x: any) => typeof x === "string" && x.length > 0)
      : [];

    if (!inquiryId || Number.isNaN(inquiryId)) {
      return NextResponse.json({ ok: false, error: "inquiry_id_required" }, { status: 400 });
    }
    if (hospitalIds.length === 0) {
      return NextResponse.json({ ok: false, error: "hospital_ids_required" }, { status: 400 });
    }

    // 1) 의뢰 조회 (정규화 행에 넣을 비-PII 필드만)
    const { data: inq, error: inqErr } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("id, nationality, spoken_language, preferred_language, cancer_type, treatment_type")
      .eq("id", inquiryId)
      .maybeSingle();
    if (inqErr || !inq) {
      return NextResponse.json({ ok: false, error: "inquiry_not_found" }, { status: 404 });
    }

    // 2) 배정 대상 병원 유효성 (존재하는 병원만)
    const { data: validHospitals } = await (supabaseAdmin as any)
      .from("hospitals")
      .select("id")
      .in("id", hospitalIds);
    const validIds = new Set((validHospitals || []).map((h: any) => h.id));
    const targetIds = hospitalIds.filter((id) => validIds.has(id));
    if (targetIds.length === 0) {
      return NextResponse.json({ ok: false, error: "no_valid_hospital" }, { status: 400 });
    }

    // 3) normalized_inquiry 재사용 또는 최소 생성
    let normalizedId: string | null = null;
    const { data: existingRows, error: existingErr } = await (supabaseAdmin as any)
      .from("normalized_inquiries")
      .select("id")
      .eq("source_inquiry_id", inquiryId)
      .is("deleted_at", null)
      .limit(1);
    // 실패-닫힘: 재사용 대상을 못 읽은 채 else 로 떨어지면 같은 문의에 normalized_inquiry 가
    // 하나 더 생기고, 그 뒤 매칭·배정이 두 갈래로 갈라진다.
    if (existingErr) {
      console.error("[coordinator/assign] normalized lookup error:", existingErr.message);
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
    const existing = existingRows?.[0];
    if (existing?.id) {
      normalizedId = existing.id;
    } else {
      const { data: created, error: normErr } = await (supabaseAdmin as any)
        .from("normalized_inquiries")
        .insert({
          source_type: "coordinator_referral",
          source_inquiry_id: inquiryId,
          language: inq.spoken_language || inq.preferred_language || "en",
          country: inq.nationality || null,
          treatment_slug: inq.cancer_type || inq.treatment_type || null,
          constraints: {},
        })
        .select("id")
        .single();
      if (normErr || !created) {
        console.error("[coordinator/assign] normalize insert error:", normErr?.message);
        return NextResponse.json({ ok: false, error: "normalize_failed" }, { status: 500 });
      }
      normalizedId = created.id;
    }

    // 4) hospital_leads upsert (병원별, 중복 배정 방지)
    const now = new Date().toISOString();
    const leads = targetIds.map((hospital_id) => ({
      normalized_inquiry_id: normalizedId,
      hospital_id,
      status: "sent",
      assigned_at: now,
      last_status_at: now,
    }));
    const { data: inserted, error: leadErr } = await (supabaseAdmin as any)
      .from("hospital_leads")
      .upsert(leads, { onConflict: "normalized_inquiry_id,hospital_id", ignoreDuplicates: false })
      // hospital_id 도 같이 받는다 — 병원별 알림이 «그 의뢰»를 바로 열게 하려면 짝이 필요하다.
      .select("id, hospital_id");
    if (leadErr) {
      console.error("[coordinator/assign] hospital_leads upsert error:", leadErr.message);
      return NextResponse.json({ ok: false, error: "assign_failed" }, { status: 500 });
    }

    // 5) 케이스 진행단계를 '상담·검토 진행'으로 + 이력
    // POSTMORTEM #80: 재배정(추가 병원 배정) 시 이미 더 진행된 케이스(preparation 이후)를
    // 강제로 되돌리던 문제 — 전진-only 헬퍼로 교체(뒤로 안 감, 이력은 항상 남음).
    const note = `병원 배정 (${targetIds.length}곳)`;
    await advanceCaseStatus(supabaseAdmin, inquiryId, "consultation", note, auth.userId);

    // 파트너 알림(2026-07-15): 배정된 병원 담당자에게 '새 진료 의뢰' 종 알림(비-PII 요약: 암종·국적).
    //   admin/leads/assign 과 대칭 배선 — 한 경로만 붙이면 #85 '반쪽' 재발.
    try {
      const { notifyHospitalNewLead } = await import("@/lib/notifications/inApp");
      const summary = [inq.cancer_type, inq.nationality].filter(Boolean).join(" · ") || null;
      const leadIdByHospital = new Map<string, string>(
        ((inserted as any[]) || []).map((r) => [String(r.hospital_id), String(r.id)])
      );
      await Promise.allSettled(
        targetIds.map((hid) =>
          notifyHospitalNewLead({ hospitalId: hid, summary, leadId: leadIdByHospital.get(String(hid)) ?? null })
        )
      );
    } catch {
      /* fail-safe */
    }

    return NextResponse.json({
      ok: true,
      normalized_inquiry_id: normalizedId,
      assigned: inserted?.length ?? targetIds.length,
    });
  } catch (err: any) {
    console.error("[coordinator/assign] error:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
