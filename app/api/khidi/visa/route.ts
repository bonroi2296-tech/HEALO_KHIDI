/**
 * healwith: Visa Guide API
 *
 * GET /api/khidi/visa — 비자 가이드 조회
 * Query: nationality, duration, lang, visaType
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { defaultLimiter } from "@/lib/api/rateLimiter";
import {
  getVisaInfo,
  getVisaChecklist,
  getAllVisaTypes,
  getCountryEntry,
  type VisaType,
} from "@/lib/visa/visaGuide";

export async function GET(request: NextRequest) {
  const limited = defaultLimiter.check(request);
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const nationality = searchParams.get("nationality") || "en";
    const duration = parseInt(searchParams.get("duration") || "30");
    const lang = searchParams.get("lang") || "en";
    const visaType = searchParams.get("visaType") as VisaType | null;

    // If specific visa type requested, return checklist
    if (visaType) {
      if (visaType !== "C-3-3" && visaType !== "G-1-10") {
        return Response.json(
          { ok: false, error: "Invalid visaType. Must be C-3-3 or G-1-10" },
          { status: 400 }
        );
      }

      const checklist = getVisaChecklist(visaType, lang);
      return Response.json({ ok: true, checklist });
    }

    // Otherwise return recommendation based on nationality + duration
    const { recommended, alternative } = getVisaInfo(nationality, duration);

    const recommendedChecklist = getVisaChecklist(recommended.visaType, lang);
    const alternativeChecklist = alternative
      ? getVisaChecklist(alternative.visaType, lang)
      : null;

    // 국적별 입국 상태(비자 필요 여부·K-ETA·현지 대사관) — 언어별 해석
    const countryEntry = getCountryEntry(nationality, lang);

    return Response.json({
      ok: true,
      recommended: recommendedChecklist,
      alternative: alternativeChecklist,
      countryEntry,
      allVisaTypes: getAllVisaTypes(lang),
    });
  } catch (error: any) {
    console.error("[api/khidi/visa] Exception:", error);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
