/**
 * healwith: 케이스(환자 유치) 관리 API — 코디/어드민
 *
 * GET   /api/admin/khidi/cases     → 케이스 목록 + 에이전시/상태 옵션
 * PATCH /api/admin/khidi/cases     → 진행상황(case_status)·보험·에이전시 배정 업데이트
 *
 * 진행상황은 변경 시 case_status_history 에 이력 기록. 보험 증번호는 암호화 저장.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { decryptInquiryForAdmin } from "@/lib/security/decryptForAdmin";
import { encryptStringNullable, decryptStringNullable } from "@/lib/security/encryptionV2";
import { CASE_STATUS_KEYS, CASE_STATUS_STEPS } from "@/lib/khidi/caseStatus";

// 케이스 보드는 관리자 + 코디네이터가 쓴다(의사 제외 — 보험 PII 쓰기 포함이라 범위 최소화).
async function requireCaseStaff(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth;
  if (!(auth.isAdmin || auth.appRole === "coordinator")) {
    return { success: false as const, response: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
  }
  return auth;
}

function maskName(first?: string | null, last?: string | null): string {
  const n = `${(first || "").trim()} ${(last || "").trim()}`.trim();
  if (!n) return "(이름없음)";
  return `${[...n][0] || ""}***`;
}

export async function GET(request: NextRequest) {
  const auth = await requireCaseStaff(request);
  if (!auth.success) return auth.response;
  try {
    assertSupabaseEnv();
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("id, created_at, nationality, cancer_type, first_name, last_name, agency_id, case_status, case_status_note, case_status_updated_at, insurance_provider, insurance_policy_no_encrypted, insurance_coverage, insurance_status, outcome")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("[cases] list error:", error.message);
      return NextResponse.json({ ok: false, error: "list_failed" }, { status: 500 });
    }
    const { data: agencies } = await (supabaseAdmin as any).from("agencies").select("id, name").eq("is_active", true);
    const aMap = new Map((agencies || []).map((a: any) => [a.id, a.name]));

    // 국내 병원(파트너) 목록 — 코디가 배정 대상으로 고름
    const { data: hospitals } = await (supabaseAdmin as any).from("hospitals").select("id, name, slug").order("name");
    const hMap = new Map<string, string>(
      (hospitals || []).map((h: any): [string, string] => [String(h.id), String(h.name)])
    );

    // 케이스별 "이미 배정된 병원" 매핑: inquiries → normalized_inquiries(source_inquiry_id) → hospital_leads
    const inquiryIds = (rows || []).map((r: any) => r.id);
    const assignedByInquiry = new Map<number, { id: string; name: string }[]>();
    if (inquiryIds.length > 0) {
      const { data: norms } = await (supabaseAdmin as any)
        .from("normalized_inquiries")
        .select("id, source_inquiry_id")
        .in("source_inquiry_id", inquiryIds);
      const normIdToInquiry = new Map<string, number>(
        (norms || []).map((n: any): [string, number] => [String(n.id), Number(n.source_inquiry_id)])
      );
      const normIds = (norms || []).map((n: any) => n.id);
      if (normIds.length > 0) {
        const { data: leads } = await (supabaseAdmin as any)
          .from("hospital_leads")
          .select("normalized_inquiry_id, hospital_id")
          .in("normalized_inquiry_id", normIds);
        for (const l of leads || []) {
          const inqId = normIdToInquiry.get(l.normalized_inquiry_id);
          if (inqId == null) continue;
          const arr = assignedByInquiry.get(inqId) || [];
          arr.push({ id: l.hospital_id, name: hMap.get(l.hospital_id) || "(미상)" });
          assignedByInquiry.set(inqId, arr);
        }
      }
    }

    const cases = await Promise.all((rows || []).map(async (r: any) => {
      const dec = await decryptInquiryForAdmin(r).catch(() => r);
      let policyNo: string | null = null;
      try { policyNo = decryptStringNullable(r.insurance_policy_no_encrypted); } catch { policyNo = null; }
      return {
        id: r.id,
        name: maskName(dec?.first_name, dec?.last_name),
        nationality: r.nationality || "(미상)",
        cancer_type: r.cancer_type || "-",
        created_at: r.created_at,
        agency_id: r.agency_id,
        agency_name: r.agency_id ? aMap.get(r.agency_id) || "(미상)" : null,
        case_status: r.case_status,
        case_status_note: r.case_status_note,
        case_status_updated_at: r.case_status_updated_at,
        insurance_provider: r.insurance_provider,
        insurance_policy_no: policyNo,
        insurance_coverage: r.insurance_coverage,
        insurance_status: r.insurance_status,
        outcome: r.outcome,
        assigned_hospitals: assignedByInquiry.get(r.id) || [],
      };
    }));

    return NextResponse.json({
      ok: true,
      cases,
      agencies: agencies || [],
      hospitals: (hospitals || []).map((h: any) => ({ id: h.id, name: h.name })),
      statusSteps: CASE_STATUS_STEPS,
    });
  } catch (err: any) {
    console.error("[cases] GET error:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireCaseStaff(request);
  if (!auth.success) return auth.response;
  try {
    assertSupabaseEnv();
    const body = await request.json().catch(() => ({}));
    const id = body?.inquiry_id;
    if (!id) return NextResponse.json({ ok: false, error: "inquiry_id_required" }, { status: 400 });

    const patch: Record<string, any> = {};
    let statusChanged = false;

    if (body.case_status !== undefined) {
      if (body.case_status !== null && !CASE_STATUS_KEYS.includes(body.case_status)) {
        return NextResponse.json({ ok: false, error: "invalid_case_status" }, { status: 400 });
      }
      patch.case_status = body.case_status;
      patch.case_status_updated_at = new Date().toISOString();
      statusChanged = true;
    }
    if (body.case_status_note !== undefined)
      patch.case_status_note = typeof body.case_status_note === "string" ? body.case_status_note.slice(0, 500) : null;
    if (body.agency_id !== undefined) patch.agency_id = body.agency_id || null;
    if (body.insurance_provider !== undefined)
      patch.insurance_provider = typeof body.insurance_provider === "string" ? body.insurance_provider.slice(0, 200) : null;
    if (body.insurance_coverage !== undefined)
      patch.insurance_coverage = typeof body.insurance_coverage === "string" ? body.insurance_coverage.slice(0, 500) : null;
    if (body.insurance_status !== undefined)
      patch.insurance_status = typeof body.insurance_status === "string" ? body.insurance_status.slice(0, 100) : null;
    if (body.insurance_policy_no !== undefined)
      patch.insurance_policy_no_encrypted = body.insurance_policy_no
        ? encryptStringNullable(String(body.insurance_policy_no).slice(0, 100))
        : null;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "no_updates" }, { status: 400 });
    }

    const { error } = await (supabaseAdmin as any).from("inquiries").update(patch).eq("id", id);
    if (error) {
      console.error("[cases] update error:", error.message);
      return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    // 진행상황 변경 시 이력 기록
    if (statusChanged && patch.case_status) {
      await (supabaseAdmin as any).from("case_status_history").insert({
        inquiry_id: id,
        status: patch.case_status,
        note: patch.case_status_note ?? body.case_status_note ?? null,
        created_by: auth.userId,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[cases] PATCH error:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
