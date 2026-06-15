/**
 * HEALO: 에이전시 포털 — 내 에이전시가 의뢰한 환자들의 진행 상황 조회
 *
 * GET /api/agency/inquiries
 *   → 본 에이전시(agency_id)에 배정된 inquiries 의 진행상황·보험상태 + 단계 이력.
 *
 * 인증: checkAgencyAuth. 환자 PII 는 마스킹, 보험 증권번호 등 민감정보는 미노출.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { checkAgencyAuth } from "@/lib/auth/checkAgencyAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { decryptInquiryForAdmin } from "@/lib/security/decryptForAdmin";
import { caseStatusLabel, CASE_STATUS_STEPS } from "@/lib/khidi/caseStatus";

function maskName(first?: string | null, last?: string | null): string {
  const n = `${(first || "").trim()} ${(last || "").trim()}`.trim();
  if (!n) return "(이름없음)";
  return `${[...n][0] || ""}***`;
}

export async function GET(request: NextRequest) {
  const auth = await checkAgencyAuth(request);
  if (!auth.isAgencyUser || !auth.agencyId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }
  try {
    assertSupabaseEnv();
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("id, created_at, nationality, cancer_type, first_name, last_name, case_status, case_status_note, case_status_updated_at, insurance_provider, insurance_status, outcome")
      .eq("agency_id", auth.agencyId)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) {
      console.error("[agency/inquiries] list error:", error.message);
      return NextResponse.json({ ok: false, error: "list_failed" }, { status: 500 });
    }

    const ids = (rows || []).map((r: any) => r.id);
    // 단계 이력 (타임라인)
    const historyMap = new Map<number, any[]>();
    if (ids.length > 0) {
      const { data: hist } = await (supabaseAdmin as any)
        .from("case_status_history")
        .select("inquiry_id, status, note, created_at")
        .in("inquiry_id", ids)
        .order("created_at", { ascending: true });
      (hist || []).forEach((h: any) => {
        const arr = historyMap.get(h.inquiry_id) || [];
        arr.push({ status: h.status, status_label: caseStatusLabel(h.status), note: h.note, at: h.created_at });
        historyMap.set(h.inquiry_id, arr);
      });
    }

    const cases = await Promise.all((rows || []).map(async (r: any) => {
      const dec = await decryptInquiryForAdmin(r).catch(() => r);
      return {
        id: r.id,
        name: maskName(dec?.first_name, dec?.last_name),
        nationality: r.nationality || "(미상)",
        cancer_type: r.cancer_type || "-",
        created_at: r.created_at,
        case_status: r.case_status,
        case_status_label: caseStatusLabel(r.case_status),
        case_status_note: r.case_status_note,
        case_status_updated_at: r.case_status_updated_at,
        insurance_provider: r.insurance_provider,
        insurance_status: r.insurance_status,
        timeline: historyMap.get(r.id) || [],
      };
    }));

    return NextResponse.json({
      ok: true,
      agency: { id: auth.agencyId, name: auth.agencyName },
      cases,
      statusSteps: CASE_STATUS_STEPS,
    });
  } catch (err: any) {
    console.error("[agency/inquiries] error:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
