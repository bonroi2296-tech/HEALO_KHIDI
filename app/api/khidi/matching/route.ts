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

  try {
    const payload = await request.json();

    if (!payload.cancerType) {
      return Response.json(
        { ok: false, error: "cancerType is required" },
        { status: 400 }
      );
    }

    const { getSupabaseServerClient } = await import("@/lib/data/supabaseServerClient");
    const supabaseAdmin = getSupabaseServerClient();

    // Fetch hospital cancer capabilities
    const { data: capabilities, error } = await supabaseAdmin
      .from("hospital_cancer_capabilities")
      .select(`
        *,
        hospitals(name, slug)
      `)
      .eq("cancer_type", payload.cancerType);

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
