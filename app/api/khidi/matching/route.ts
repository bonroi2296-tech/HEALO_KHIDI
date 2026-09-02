/**
 * healwith: Hospital Matching API
 *
 * POST /api/khidi/matching — 암종 기반 병원 매칭 실행
 * 입력: { cancerType, cancerStage?, preferredTreatments?, budgetMin?, budgetMax?, budgetCurrency? }
 * 출력: { ok, matches: HospitalMatch[] }
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import {
  matchHospitals,
  type MatchingCriteria,
  type HospitalCapability,
} from "@/lib/cancer/matchingEngine";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";

const MATCHING_RATE = {
  windowMs: 60 * 1000,
  maxRequests: 20,
  apiName: "khidi_matching",
};

export async function POST(request: NextRequest) {
  // Rate limit (DB 부하 + enum 방지)
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, MATCHING_RATE);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  // 본문 파싱은 try 밖에서 따로 — 빈 본문으로 오는 건 대개 «화면을 떠나며 브라우저가 요청을
  // 끊은 것»이라(코디 인박스의 병원 매칭 fetch 가 그렇다) 서버 고장이 아니다. 아래 공용 catch 에
  // 맡기면 500 + 스택이 남아 진짜 고장을 찾을 때 로그가 오염된다(2026-09-01 E2E 로그에서 발견).
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    if (!payload.cancerType) {
      return Response.json(
        { ok: false, error: "cancerType is required" },
        { status: 400 }
      );
    }

    const { getSupabaseServerClient } = await import("@/lib/data/supabaseServerClient");
    const supabaseAdmin = getSupabaseServerClient();

    // Fetch hospital cancer capabilities — 활성 병원만(!inner + is_active).
    // (과거엔 is_active 필터가 없어 비활성/보관 병원도 환자 매칭에 떠서, 계약 안 된 병원을
    //  추천하던 버그. POSTMORTEMS #60)
    const { data: capabilities, error } = await supabaseAdmin
      .from("hospital_cancer_capabilities")
      .select(`
        *,
        hospitals!inner(name, slug, is_active)
      `)
      .eq("cancer_type", payload.cancerType)
      .eq("hospitals.is_active", true);

    if (error) {
      console.error("[api/khidi/matching] DB error:", error);
      return Response.json(
        { ok: false, error: "matching_failed" },
        { status: 500 }
      );
    }

    // Map DB rows to HospitalCapability type
    const mappedCapabilities: HospitalCapability[] = (capabilities || []).map((row: any) => ({
      id: row.id,
      hospital_id: row.hospital_id,
      hospital_name: row.hospitals?.name || '',
      hospital_slug: row.hospitals?.slug || '',
      cancer_type: row.cancer_type,
      treatment_types: row.treatment_types || [],
      annual_cases: row.annual_cases || 0,
      success_rate: row.success_rate || 0,
      avg_treatment_cost_usd: row.avg_treatment_cost_usd || 0,
      avg_duration_days: row.avg_duration_days || 0,
      specialized_doctors: row.specialized_doctors || [],
      certifications: row.certifications || [],
      is_verified: row.is_verified || false,
    }));

    // Build matching criteria
    const criteria: MatchingCriteria = {
      cancerType: payload.cancerType,
      cancerStage: payload.cancerStage,
      preferredTreatments: payload.preferredTreatments,
      budgetMin: payload.budgetMin ? parseFloat(payload.budgetMin) : undefined,
      budgetMax: payload.budgetMax ? parseFloat(payload.budgetMax) : undefined,
      budgetCurrency: payload.budgetCurrency,
      languagePreference: payload.languagePreference,
    };

    // Run matching
    const matches = matchHospitals(mappedCapabilities, criteria, payload.limit || 5);

    console.log(
      `[api/khidi/matching] ${payload.cancerType}: ${mappedCapabilities.length} capabilities → ${matches.length} matches`
    );

    return Response.json({
      ok: true,
      matches,
      totalCapabilities: mappedCapabilities.length,
    });
  } catch (error: any) {
    console.error("[api/khidi/matching] Exception:", error);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
