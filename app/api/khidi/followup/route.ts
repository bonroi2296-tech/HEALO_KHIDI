/**
 * HEALO-KHIDI: Follow-up & Symptom Report API
 *
 * POST /api/khidi/followup — 증상 보고서 제출 + AI 분석
 * GET  /api/khidi/followup — Follow-up 스케줄 조회
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { analyzeSymptoms, type SymptomReport } from "@/lib/followup/symptomAnalyzer";
import { checkAdminAuth } from "@/lib/auth/checkAdminAuth";

export async function POST(request: NextRequest) {
  // ── 인증 확인: 로그인한 사용자만 증상 보고서 제출 가능 ──────────
  const auth = await checkAdminAuth(request);
  if (!auth.userId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();

    // Validate
    if (!payload.symptoms || !Array.isArray(payload.symptoms) || payload.symptoms.length === 0) {
      return Response.json(
        { ok: false, error: "symptoms array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Build report
    const report: SymptomReport = {
      followupId: payload.followupId || '',
      inquiryId: payload.inquiryId || '',
      reportType: payload.reportType || payload.report_type || 'ad_hoc',
      symptoms: payload.symptoms.map((s: any) => ({
        symptom: s.symptom || s.name || '',
        severity: parseInt(s.severity) || 1,
        duration: s.duration || '',
        language: s.language || payload.language || 'ru',
      })),
      additionalNotes: payload.additionalNotes,
    };

    // AI 분석 실행
    const analysis = analyzeSymptoms(report);

    // Supabase에 결과 저장
    const { getSupabaseServerClient } = await import("@/lib/data/supabaseServerClient");
    const supabaseAdmin = getSupabaseServerClient();

    const insertData = {
      followup_id: payload.followupId || null,
      inquiry_id: payload.inquiryId || null,
      report_type: report.reportType,
      symptoms: report.symptoms,
      ai_risk_score: analysis.riskScore,
      ai_assessment: analysis.assessment,
      action_taken: analysis.recommendedAction,
      human_reviewed: false,
    };

    const { data, error } = await supabaseAdmin
      .from("symptom_reports")
      .insert([insertData] as any)
      .select("id, ai_risk_score, ai_assessment, action_taken, created_at")
      .single();

    if (error) {
      console.error("[api/khidi/followup] Insert error:", error);
      // 저장 실패해도 분석 결과는 반환
      return Response.json({
        ok: true,
        analysis,
        saved: false,
        saveError: error.message,
      });
    }

    console.log(
      `[api/khidi/followup] Report ${data.id}: risk=${analysis.riskScore}, ` +
      `urgency=${analysis.urgencyLevel}, action=${analysis.recommendedAction}`
    );

    // ── FR-16: 이상치 자동 감지 (비동기 — 응답 차단 X) ─────────────
    // symptom_reports 의 첫 번째 증상을 SymptomEntry 형태로 변환하여 감지 실행
    ;(async () => {
      try {
        const { detectAlerts } = await import("@/lib/symptoms/detect");
        const { saveAndNotifyAlerts } = await import("@/lib/symptoms/alertService");

        // 직전 보고 조회 (급격한 악화 감지용)
        // symptom_reports 에 patient_id 컬럼이 없으므로 followup_id 기반 조회 시도,
        // 없으면 가장 최근 2개 (같은 inquiry 범위)
        const { data: prevReports } = payload.inquiryId
          ? await supabaseAdmin
              .from("symptom_reports")
              .select("id, symptoms, created_at")
              .eq("inquiry_id" as any, payload.inquiryId)
              .order("created_at", { ascending: false })
              .limit(2)
          : await supabaseAdmin
              .from("symptom_reports")
              .select("id, symptoms, created_at")
              .order("created_at", { ascending: false })
              .limit(2);

        const prevSymptoms = (prevReports as any[] | null)?.[1]?.symptoms;
        const prevPain = Array.isArray(prevSymptoms?.items)
          ? prevSymptoms.items[0]?.severity
          : Array.isArray(prevSymptoms)
            ? prevSymptoms[0]?.severity
            : undefined;

        const firstSym = report.symptoms[0];
        const entry = {
          id: data.id,
          patient_id: auth.userId!,
          pain_score: firstSym?.severity ?? undefined,
          notes: [
            ...report.symptoms.map((s: any) => s.symptom),
            report.additionalNotes || "",
          ]
            .filter(Boolean)
            .join(" "),
          created_at: new Date().toISOString(),
        };
        const previousEntry = prevPain != null
          ? { patient_id: auth.userId!, pain_score: Number(prevPain) }
          : null;

        const detected = await detectAlerts(entry, previousEntry);
        if (detected.length > 0) {
          await saveAndNotifyAlerts(detected);
          console.log(`[api/khidi/followup] 이상치 감지 ${detected.length}건 — report ${data.id}`);
        }
      } catch (e: any) {
        // Fail-safe: 감지 실패해도 메인 응답에 영향 없음
        console.error("[api/khidi/followup] 감지 오류 (무시):", e.message);
      }
    })();
    // ────────────────────────────────────────────────────────────────

    // Auto-evaluate rebooking need based on symptom analysis
    let rebookingSuggestion: any = null;
    if (analysis.recommendedAction === 'schedule_followup' ||
        analysis.recommendedAction === 'escalate_doctor' ||
        analysis.recommendedAction === 'emergency_refer') {
      const { evaluateFromSymptoms } = await import("@/lib/followup/rebookingEngine");
      rebookingSuggestion = evaluateFromSymptoms(report);
    }

    return Response.json({
      ok: true,
      analysis,
      report: data,
      saved: true,
      rebookingSuggestion,
    });
  } catch (error: any) {
    console.error("[api/khidi/followup] Exception:", error);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { checkAdminAuth } = await import("@/lib/auth/checkAdminAuth");
    const authResult = await checkAdminAuth(request);

    if (!authResult.isAdmin) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 403 }
      );
    }

    const { getSupabaseServerClient } = await import("@/lib/data/supabaseServerClient");
    const supabaseAdmin = getSupabaseServerClient();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");
    const urgency = searchParams.get("urgency"); // filter by urgency

    let query = supabaseAdmin
      .from("symptom_reports")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter: high risk reports only
    if (urgency === "high") {
      query = query.gte("ai_risk_score", 0.7);
    }

    // Filter: unreviewed only
    if (searchParams.get("unreviewed") === "true") {
      query = query.eq("human_reviewed", false);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("[api/khidi/followup] GET error:", error);
      return Response.json(
        { ok: false, error: "query_failed" },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      data: data || [],
      total: count,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("[api/khidi/followup] GET exception:", error);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
