/**
 * HEALO: Education Content API
 *
 * GET /api/khidi/education — 교육 콘텐츠 조회
 * Query: cancerType, phase, category, lang
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { localizeEducation, type EducationContent } from "../../../../src/lib/followup/educationEngine";
import { defaultLimiter } from "../../../../src/lib/api/rateLimiter";

export async function GET(request: NextRequest) {
  try {
    const limited = defaultLimiter.check(request);
    if (limited) return limited;
    const { searchParams } = new URL(request.url);
    const cancerType = searchParams.get("cancerType");
    const phase = searchParams.get("phase");
    const category = searchParams.get("category");
    const lang = searchParams.get("lang") || "en";

    if (!cancerType) {
      return Response.json(
        { ok: false, error: "cancerType is required" },
        { status: 400 }
      );
    }

    const { getSupabaseServerClient } = await import(
      "../../../../src/lib/data/supabaseServerClient"
    );
    const supabase = getSupabaseServerClient();

    let query = supabase
      .from("education_contents")
      .select("*")
      .eq("cancer_type", cancerType)
      .order("phase");

    if (phase) {
      query = query.eq("phase", phase);
    }
    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[api/khidi/education] Query error:", error);
      return Response.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const localized = (data || []).map((item: EducationContent) =>
      localizeEducation(item, lang)
    );

    return Response.json({
      ok: true,
      data: localized,
      count: localized.length,
      lang,
    });
  } catch (error: any) {
    console.error("[api/khidi/education] Exception:", error);
    return Response.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
