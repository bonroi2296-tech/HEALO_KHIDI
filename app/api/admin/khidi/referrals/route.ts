/**
 * healwith: 양·한방 협진 의뢰/회신 워크플로우 API
 *
 * GET   /api/admin/khidi/referrals      → 협진 의뢰 목록 + 협진율 요약
 * POST  /api/admin/khidi/referrals      → 협진 의뢰 생성 (한방 → 대학병원)
 * PATCH /api/admin/khidi/referrals      → 상태 변경 (accepted/completed/declined/cancelled)
 *
 * 인증: requirePortalAuth(staffOnly = admin+coordinator) — 2026-07-24 권한 정비(A):
 * cases·conversion·satisfaction과 동일하게 코디도 협진 의뢰를 보고 진행할 수 있게 통일.
 * cotreatment_referrals 는 service_role 전용 → 서버 경유.
 * 산출물: 협진 의뢰서 증빙 + 협진율 지표(완료/유효 의뢰).
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse, after } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { decryptInquiryForAdmin } from "@/lib/security/decryptForAdmin";
import { logPiiAccess } from "@/lib/audit/logPiiAccess";

function maskName(first?: string | null, last?: string | null): string {
  const n = `${(first || "").trim()} ${(last || "").trim()}`.trim();
  if (!n) return "(이름 없음)";
  return `${[...n][0] || ""}***`;
}

const VALID_STATUS = ["requested", "accepted", "completed", "declined", "cancelled"];

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;
  try {
    assertSupabaseEnv();

    const { data: rows, error } = await (supabaseAdmin as any)
      .from("cotreatment_referrals")
      .select("*")
      .order("requested_at", { ascending: false });
    if (error) {
      console.error("[referrals] list error:", error.message);
      return NextResponse.json({ ok: false, error: "list_failed" }, { status: 500 });
    }

    // 병원명 매핑 + 드롭다운 옵션(한방/대학 구분)
    const { data: hospitals } = await supabaseAdmin.from("hospitals").select("id, name, slug");
    const hMap = new Map((hospitals || []).map((h: any) => [h.id, h.name]));
    const hospitalOptions = (hospitals || []).map((h: any) => ({
      id: h.id,
      name: h.name,
      kind: String(h.slug || "").startsWith("immunehospital") ? "한방(참여기관)" : "대학병원(협진)",
    }));

    // 환자명(마스킹) 매핑 — inquiry_id 묶어서 한 번에 조회
    const inquiryIds = Array.from(
      new Set((rows || []).map((r: any) => r.inquiry_id).filter(Boolean))
    ) as number[];
    const nameMap = new Map<number, string>();
    if (inquiryIds.length > 0) {
      const { data: inqs } = await supabaseAdmin
        .from("inquiries")
        .select("id, first_name, last_name")
        .in("id", inquiryIds);
      await Promise.all(
        (inqs || []).map(async (r: any) => {
          const dec = await decryptInquiryForAdmin(r).catch(() => r);
          nameMap.set(r.id, maskName(dec?.first_name, dec?.last_name));
        })
      );
    }

    const referrals = (rows || []).map((r: any) => ({
      id: r.id,
      inquiry_id: r.inquiry_id,
      patient: r.inquiry_id ? nameMap.get(r.inquiry_id) || "(미상)" : "(미지정)",
      from_hospital: hMap.get(r.from_hospital_id) || "(미지정)",
      to_hospital: hMap.get(r.to_hospital_id) || "(미지정)",
      reason: r.reason,
      status: r.status,
      result_note: r.result_note,
      requested_at: r.requested_at,
      responded_at: r.responded_at,
      completed_at: r.completed_at,
    }));

    // 협진율 = 완료 / 유효 의뢰(취소 제외)
    const valid = referrals.filter((r) => r.status !== "cancelled");
    const completed = referrals.filter((r) => r.status === "completed");
    const rate = valid.length > 0 ? Math.round((completed.length / valid.length) * 1000) / 10 : 0;

    // 접속기록(법정 의무): 의뢰 목록에 환자 정보를 복호화해 담는다.
    after(() =>
      logPiiAccess(request, auth, {
        action: "LIST_INQUIRIES",
        metadata: { screen: "khidi_referrals", count: referrals.length },
      })
    );

    return NextResponse.json({
      ok: true,
      referrals,
      hospitals: hospitalOptions,
      summary: { total: referrals.length, valid: valid.length, completed: completed.length, rate },
    });
  } catch (err: any) {
    console.error("[referrals] GET error:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;
  try {
    assertSupabaseEnv();
    const body = await request.json().catch(() => ({}));
    const fromHospitalId = body?.from_hospital_id || null;
    const toHospitalId = body?.to_hospital_id || null;
    const inquiryIdRaw = body?.inquiry_id;
    const inquiryId =
      inquiryIdRaw === undefined || inquiryIdRaw === null || inquiryIdRaw === "" ? null : Number(inquiryIdRaw);
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 1000) : null;

    if (!fromHospitalId || !toHospitalId) {
      return NextResponse.json({ ok: false, error: "from_to_hospital_required" }, { status: 400 });
    }
    if (inquiryId !== null && !Number.isFinite(inquiryId)) {
      return NextResponse.json({ ok: false, error: "invalid_inquiry_id" }, { status: 400 });
    }

    const { data, error } = await (supabaseAdmin as any)
      .from("cotreatment_referrals")
      .insert({
        inquiry_id: inquiryId,
        from_hospital_id: fromHospitalId,
        to_hospital_id: toHospitalId,
        reason,
        status: "requested",
        created_by: auth.userId,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[referrals] create error:", error.message);
      return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data.id });
  } catch (err: any) {
    console.error("[referrals] POST error:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;
  try {
    assertSupabaseEnv();
    const body = await request.json().catch(() => ({}));
    const id = body?.id;
    const status = body?.status;
    const resultNote = typeof body?.result_note === "string" ? body.result_note.slice(0, 1000) : undefined;

    if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
    if (!VALID_STATUS.includes(status)) {
      return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
    }

    const patch: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (resultNote !== undefined) patch.result_note = resultNote;
    if (status === "accepted" || status === "declined") patch.responded_at = new Date().toISOString();
    if (status === "completed") patch.completed_at = new Date().toISOString();

    const { error } = await (supabaseAdmin as any)
      .from("cotreatment_referrals")
      .update(patch)
      .eq("id", id);
    if (error) {
      console.error("[referrals] update error:", error.message);
      return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[referrals] PATCH error:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
