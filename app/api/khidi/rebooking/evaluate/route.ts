/**
 * healwith: Rebooking Evaluation API
 *
 * POST /api/khidi/rebooking/evaluate — 재예약 필요 여부 평가
 * Body: { inquiryId, schedules?, symptomReport? }
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { evaluateRebooking } from "@/lib/followup/rebookingEngine";
import type { FollowupSchedule } from "@/lib/followup/scheduler";
import type { SymptomReport } from "@/lib/followup/symptomAnalyzer";
import { defaultLimiter } from "@/lib/api/rateLimiter";

export async function POST(request: NextRequest) {
  const limited = defaultLimiter.check(request);
  if (limited) return limited;
  try {
    const payload = await request.json();

    if (!payload.inquiryId) {
      return Response.json(
        { ok: false, error: "inquiryId is required" },
        { status: 400 }
      );
    }

    const schedules: FollowupSchedule[] = payload.schedules || [];

    let symptomReport: SymptomReport | undefined;
    if (payload.symptomReport) {
      symptomReport = {
        followupId: payload.symptomReport.followupId || '',
        inquiryId: payload.inquiryId,
        reportType: payload.symptomReport.reportType || 'ad_hoc',
        symptoms: (payload.symptomReport.symptoms || []).map((s: any) => ({
          symptom: s.symptom || '',
          severity: parseInt(s.severity) || 1,
          duration: s.duration || '',
          language: s.language || 'en',
        })),
        additionalNotes: payload.symptomReport.additionalNotes,
      };
    }

    const evaluation = evaluateRebooking(schedules, symptomReport);

    if (!evaluation) {
      return Response.json({
        ok: true,
        shouldRebook: false,
        message: "No rebooking needed at this time",
      });
    }

    return Response.json({
      ok: true,
      ...evaluation,
    });
  } catch (error: any) {
    console.error("[api/khidi/rebooking/evaluate] Exception:", error);
    return Response.json(
      { ok: false, error: "evaluate_failed" },
      { status: 500 }
    );
  }
}
