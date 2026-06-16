/**
 * healwith: Consultation Schedule API
 *
 * POST /api/khidi/consultation/schedule — Auto-generate recommended consultation schedule
 *   body: { patientId, cancerType, treatmentPhase }
 *   → Returns array of recommended consultation dates
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/requireConsultationAccess";

/**
 * Generate recommended consultation schedule based on cancer type and treatment phase
 *
 * Treatment phases:
 * - pre_treatment: Initial assessment (Week 0)
 * - during_treatment: Weekly check-ins (Week 1-8, varies by cancer)
 * - post_treatment: Follow-ups at 2 weeks, 1 month, 3 months, 6 months, 1 year
 */
function generateSchedule(
  cancerType: string,
  treatmentPhase: string,
  startDate: Date
): Array<{ date: Date; type: string; description: string }> {
  const schedule: Array<{ date: Date; type: string; description: string }> = [];

  const cancerSchedules: Record<string, Record<string, number[]>> = {
    stomach: {
      pre_treatment: [0],
      during_treatment: [0, 7, 14, 21, 28, 35, 42], // Weekly for 6 weeks
      post_treatment: [14, 30, 90, 180, 365],
    },
    liver: {
      pre_treatment: [0],
      during_treatment: [0, 7, 14, 21, 28, 35], // 5 weeks
      post_treatment: [7, 30, 60, 180, 365],
    },
    lung: {
      pre_treatment: [0],
      during_treatment: [0, 7, 14, 21, 28, 35, 42, 49], // 7 weeks
      post_treatment: [14, 30, 90, 180, 365],
    },
    breast: {
      pre_treatment: [0],
      during_treatment: [0, 7, 14, 21, 28], // 4 weeks
      post_treatment: [7, 30, 90, 180, 365],
    },
    thyroid: {
      pre_treatment: [0],
      during_treatment: [0, 7, 14], // 2 weeks
      post_treatment: [30, 90, 180, 365],
    },
    other: {
      pre_treatment: [0],
      during_treatment: [0, 7, 14, 21, 28],
      post_treatment: [14, 30, 90, 180, 365],
    },
  };

  const days = cancerSchedules[cancerType.toLowerCase()]?.[treatmentPhase] || [0, 7, 14, 21];

  days.forEach((dayOffset) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayOffset);

    let type = "follow_up";
    let description = `Follow-up consultation (Day ${dayOffset})`;

    if (dayOffset === 0) {
      type = treatmentPhase === "pre_treatment" ? "pre_consultation" : "follow_up";
      description =
        treatmentPhase === "pre_treatment"
          ? "Pre-treatment assessment"
          : "Treatment check-in";
    } else if (dayOffset <= 7 && treatmentPhase === "during_treatment") {
      type = "follow_up";
      description = `Weekly check-in (Week ${Math.ceil(dayOffset / 7)})`;
    }

    schedule.push({
      date,
      type,
      description,
    });
  });

  return schedule;
}

export async function POST(request: NextRequest) {
  try {
    // 인증 (스케줄 생성 알고리즘 — 환자/의료진/admin 모두 호출 가능)
    const auth = await requireAuthenticatedUser(request);
    if (!auth.success) return auth.response;

    const payload = await request.json();

    // Validation
    if (!payload.cancerType) {
      return Response.json(
        { ok: false, error: "cancerType is required" },
        { status: 400 }
      );
    }

    const validCancerTypes = [
      "stomach",
      "liver",
      "lung",
      "breast",
      "thyroid",
      "other",
    ];
    if (!validCancerTypes.includes(payload.cancerType.toLowerCase())) {
      return Response.json(
        { ok: false, error: "Invalid cancerType" },
        { status: 400 }
      );
    }

    const treatmentPhase = payload.treatmentPhase || "pre_treatment";
    const validPhases = ["pre_treatment", "during_treatment", "post_treatment"];
    if (!validPhases.includes(treatmentPhase)) {
      return Response.json(
        { ok: false, error: "Invalid treatmentPhase" },
        { status: 400 }
      );
    }

    // Generate schedule
    const startDate = payload.startDate
      ? new Date(payload.startDate)
      : new Date();
    const schedule = generateSchedule(
      payload.cancerType,
      treatmentPhase,
      startDate
    );

    console.log(
      `[api/khidi/consultation/schedule] Generated schedule for ${payload.cancerType} (${treatmentPhase}): ${schedule.length} sessions`
    );

    return Response.json({
      ok: true,
      data: {
        cancerType: payload.cancerType,
        treatmentPhase,
        startDate,
        schedule,
        totalSessions: schedule.length,
      },
    });
  } catch (error: any) {
    console.error("[api/khidi/consultation/schedule] Exception:", error);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
