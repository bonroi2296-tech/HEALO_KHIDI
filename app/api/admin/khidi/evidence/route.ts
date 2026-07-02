/**
 * healwith: 중간평가 증빙 산출물 API
 *
 * GET /api/admin/khidi/evidence?from&to
 *   → 성과지표 증빙용 레코드 묶음 (상담기록·협진의뢰서) + 요약 카운트.
 *     평가 증빙(사전상담·사후관리 건수, 협진 실적)을 CSV 로 내려받기 위함.
 *
 * 인증: requireAdminAuth. 민감 테이블은 service_role 경유. PII 는 마스킹.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { decryptInquiryForAdmin } from "@/lib/security/decryptForAdmin";
import { fetchTestInquiryIds } from "@/lib/khidi/testData";

const DAY = 86_400_000;
function resolveRange(sp: URLSearchParams) {
  const toRaw = sp.get("to");
  const fromRaw = sp.get("from");
  const toBase = toRaw ? new Date(toRaw) : new Date();
  const from = fromRaw ? new Date(fromRaw) : new Date(toBase.getTime() - 90 * DAY);
  return { from: from.toISOString(), to: new Date(toBase.getTime() + DAY).toISOString() };
}
function maskName(first?: string | null, last?: string | null): string {
  const n = `${(first || "").trim()} ${(last || "").trim()}`.trim();
  if (!n) return "(이름없음)";
  return `${[...n][0] || ""}***`;
}
const TYPE_KO: Record<string, string> = {
  pre_consultation: "사전상담", follow_up: "사후관리", diagnostic: "진단", emergency: "응급",
};

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;
  try {
    assertSupabaseEnv();
    const { searchParams } = new URL(request.url);
    const { from, to } = resolveRange(searchParams);
    const includeTest = searchParams.get("includeTest") === "1";

    const [{ data: sessions }, { data: refs }, { data: hospitals }] = await Promise.all([
      supabaseAdmin
        .from("consultation_sessions")
        // 기간 필터는 scheduled_at 기준 — KPI 대시보드(kpi.ts K-02)와 동일 축.
        // created_at 기준이면 예약일이 월 경계를 넘는 세션에서 증빙 CSV 와 대시보드 숫자가 어긋남(2026-07-02 전수 감사).
        .select("id, inquiry_id, hospital_id, session_type, status, scheduled_at, created_at")
        .gte("scheduled_at", from).lt("scheduled_at", to)
        .order("scheduled_at", { ascending: false }).limit(1000),
      (supabaseAdmin as any)
        .from("cotreatment_referrals")
        .select("id, inquiry_id, from_hospital_id, to_hospital_id, status, reason, requested_at, completed_at")
        .gte("requested_at", from).lt("requested_at", to)
        .order("requested_at", { ascending: false }).limit(1000),
      supabaseAdmin.from("hospitals").select("id, name"),
    ]);

    const hMap = new Map((hospitals || []).map((h: any) => [h.id, h.name]));

    // 테스트/실제 분리: 테스트 문의에 딸린 상담·협진의뢰는 증빙에서 제외(기본). null inquiry 는 보존.
    let sessionRows = sessions || [];
    let refRows = refs || [];
    if (!includeTest) {
      const testSet = new Set(await fetchTestInquiryIds(supabaseAdmin));
      sessionRows = sessionRows.filter((s: any) => !testSet.has(s.inquiry_id));
      refRows = refRows.filter((r: any) => !testSet.has(r.inquiry_id));
    }

    // 환자명 마스킹 (상담+협진 의뢰의 inquiry_id 합쳐 한 번에)
    const inquiryIds = Array.from(new Set([
      ...sessionRows.map((s: any) => s.inquiry_id),
      ...refRows.map((r: any) => r.inquiry_id),
    ].filter(Boolean))) as number[];
    const nameMap = new Map<number, string>();
    if (inquiryIds.length > 0) {
      const { data: inqs } = await supabaseAdmin
        .from("inquiries").select("id, first_name, last_name").in("id", inquiryIds);
      await Promise.all((inqs || []).map(async (r: any) => {
        const dec = await decryptInquiryForAdmin(r).catch(() => r);
        nameMap.set(r.id, maskName(dec?.first_name, dec?.last_name));
      }));
    }

    const consultations = sessionRows.map((s: any) => ({
      id: s.id,
      환자: s.inquiry_id ? nameMap.get(s.inquiry_id) || "(미상)" : "(미지정)",
      유형: TYPE_KO[s.session_type] || s.session_type,
      상태: s.status,
      병원: hMap.get(s.hospital_id) || "(미지정)",
      예약일: s.scheduled_at ? new Date(s.scheduled_at).toISOString().slice(0, 10) : "",
      생성일: s.created_at ? new Date(s.created_at).toISOString().slice(0, 10) : "",
    }));
    const referrals = refRows.map((r: any) => ({
      id: r.id,
      환자: r.inquiry_id ? nameMap.get(r.inquiry_id) || "(미상)" : "(미지정)",
      의뢰기관: hMap.get(r.from_hospital_id) || "(미지정)",
      협진병원: hMap.get(r.to_hospital_id) || "(미지정)",
      상태: r.status,
      사유: r.reason || "",
      의뢰일: r.requested_at ? new Date(r.requested_at).toISOString().slice(0, 10) : "",
      완료일: r.completed_at ? new Date(r.completed_at).toISOString().slice(0, 10) : "",
    }));

    const preCount = consultations.filter((c) => c.유형 === "사전상담" && c.상태 === "completed").length;
    const followCount = consultations.filter((c) => c.유형 === "사후관리" && c.상태 === "completed").length;
    const refValid = referrals.filter((r) => r.상태 !== "cancelled").length;
    const refDone = referrals.filter((r) => r.상태 === "completed").length;

    return NextResponse.json({
      ok: true,
      range: { from, to },
      summary: {
        consult_total: consultations.length,
        pre_consult_done: preCount,
        followup_done: followCount,
        consult_care_total: preCount + followCount, // 사전상담+사후관리 (목표 120)
        referral_valid: refValid,
        referral_done: refDone,
        referral_rate: refValid > 0 ? Math.round((refDone / refValid) * 1000) / 10 : 0,
      },
      consultations,
      referrals,
    });
  } catch (err: any) {
    console.error("[evidence] error:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
