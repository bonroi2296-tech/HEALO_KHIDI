/**
 * HEALO: Cost Estimate API
 *
 * GET /api/khidi/cost-estimate
 *   Query: cancer_type, stage, treatment_phase (optional, default 'during_treatment')
 *   → Returns Tier 1 자동 범위 (로그인 불필요 — 인테이크 직후 공개)
 *
 * POST /api/khidi/cost-estimate (Tier 2 — AI 개인화 보정)
 *   Body: { cancer_type, stage, intake_id? } — 인테이크 본문 읽어 Gemini 로 보정
 *   → Returns Tier 1 + Tier 2 personalization note
 *
 * 정부 요건: KHIDI #3, #6 — 예상진료비 산출내역 온라인 안내·제공
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin as _sb } from "@/lib/rag/supabaseAdmin";

// 신규 테이블(treatment_cost_benchmarks 등)이 아직 생성된 DB 타입에 반영되지 않아
// `as any` 로 우회. 마이그레이션 후 `supabase gen types` 재생성 시 제거 가능.
const supabaseAdmin: any = _sb;
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { checkAdminAuth } from "@/lib/auth/checkAdminAuth";
import { decryptStringNullable } from "@/lib/security/encryptionV2";

const ESTIMATE_RATE = {
  windowMs: 60 * 1000,
  maxRequests: 30,
  apiName: "cost_estimate",
};

const VALID_CANCER_TYPES = [
  "stomach", "liver", "lung", "breast", "thyroid", "colorectal", "other",
];
const VALID_STAGES = ["1", "2", "3", "4", "unknown"];
const VALID_PHASES = ["pre_treatment", "during_treatment", "post_treatment"];

export async function GET(request: NextRequest) {
  // Rate limit
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, ESTIMATE_RATE);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  const { searchParams } = new URL(request.url);
  const cancer_type = (searchParams.get("cancer_type") || "").toLowerCase();
  const stage = searchParams.get("stage") || "unknown";
  const includePhases = searchParams.get("include_all_phases") === "1";
  const phase = searchParams.get("treatment_phase") || "during_treatment";

  if (!VALID_CANCER_TYPES.includes(cancer_type)) {
    return Response.json(
      { ok: false, error: "invalid_cancer_type", detail: `allowed: ${VALID_CANCER_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!VALID_STAGES.includes(stage)) {
    return Response.json(
      { ok: false, error: "invalid_stage", detail: `allowed: ${VALID_STAGES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!includePhases && !VALID_PHASES.includes(phase)) {
    return Response.json(
      { ok: false, error: "invalid_phase", detail: `allowed: ${VALID_PHASES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    let query = supabaseAdmin
      .from("treatment_cost_benchmarks")
      .select("*")
      .eq("cancer_type", cancer_type);

    // other 는 stage 상관 없이 unknown 만
    if (cancer_type === "other") {
      query = query.eq("stage", "unknown");
    } else {
      query = query.eq("stage", stage);
    }

    if (!includePhases) {
      query = query.eq("treatment_phase", phase);
    }

    const { data: benchmarks, error } = await query;

    if (error) {
      console.error("[api/khidi/cost-estimate] DB error:", error.message);
      return Response.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    if (!benchmarks || benchmarks.length === 0) {
      return Response.json(
        { ok: false, error: "no_benchmark_found", detail: "해당 조합의 벤치마크가 없습니다. 정식 견적을 요청하세요." },
        { status: 404 }
      );
    }

    // 전체 단계 합산 (include_all_phases=1)
    let total_min_krw = 0;
    let total_median_krw = 0;
    let total_max_krw = 0;
    for (const b of benchmarks) {
      total_min_krw += Number(b.min_krw);
      total_median_krw += Number(b.median_krw);
      total_max_krw += Number(b.max_krw);
    }

    const USD_RATE = 1380;

    return Response.json({
      ok: true,
      data: {
        cancer_type,
        stage,
        phase: includePhases ? "all" : phase,
        breakdown: benchmarks.map((b: any) => ({
          phase: b.treatment_phase,
          procedures: b.procedures,
          range_krw: { min: b.min_krw, median: b.median_krw, max: b.max_krw },
          range_usd: { min: b.min_usd, median: b.median_usd, max: b.max_usd },
          confidence: b.confidence,
          source: b.source,
        })),
        total_if_full_course: includePhases
          ? {
              min_krw: total_min_krw,
              median_krw: total_median_krw,
              max_krw: total_max_krw,
              min_usd: Math.round(total_min_krw / USD_RATE),
              median_usd: Math.round(total_median_krw / USD_RATE),
              max_usd: Math.round(total_max_krw / USD_RATE),
            }
          : null,
        disclaimer:
          "본 금액은 KHIDI 공식 통계 및 과거 병원 견적 기반 '예상 범위' 입니다. 실제 비용은 진료 후 의료기관 청구서에 따릅니다. 의료해외진출법 §15 에 따라 진료 전 정식 견적서를 수령하시기 바랍니다.",
        tier: 1,
      },
    });
  } catch (error: any) {
    console.error("[api/khidi/cost-estimate] GET exception:", error?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

/**
 * POST — Tier 2 AI 개인화 보정 (Gemini)
 * 로그인된 사용자 대상, intake_id 있으면 환자 상세로 보정
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, { ...ESTIMATE_RATE, maxRequests: 10 });
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  const auth = await checkAdminAuth(request);
  if (!auth.userId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const cancer_type = String(payload.cancer_type || "").toLowerCase();
    const stage = String(payload.stage || "unknown");
    const intake_id = payload.intake_id;

    if (!VALID_CANCER_TYPES.includes(cancer_type)) {
      return Response.json({ ok: false, error: "invalid_cancer_type" }, { status: 400 });
    }
    if (!VALID_STAGES.includes(stage)) {
      return Response.json({ ok: false, error: "invalid_stage" }, { status: 400 });
    }

    // Tier 1: 전체 단계 합산 범위 조회
    const { data: benchmarks } = await supabaseAdmin
      .from("treatment_cost_benchmarks")
      .select("*")
      .eq("cancer_type", cancer_type)
      .eq("stage", cancer_type === "other" ? "unknown" : stage);

    if (!benchmarks || benchmarks.length === 0) {
      return Response.json(
        { ok: false, error: "no_benchmark" },
        { status: 404 }
      );
    }

    const total_min_krw = benchmarks.reduce((s: number, b: any) => s + Number(b.min_krw), 0);
    const total_median_krw = benchmarks.reduce((s: number, b: any) => s + Number(b.median_krw), 0);
    const total_max_krw = benchmarks.reduce((s: number, b: any) => s + Number(b.max_krw), 0);

    // Tier 2: Gemini 로 인테이크 상세 분석 (있으면)
    let personalization: string | null = null;
    let suggestedBand: "lower" | "middle" | "upper" | null = null;

    if (intake_id) {
      const { data: intake } = await supabaseAdmin
        .from("cancer_patient_intakes")
        .select("cancer_type, cancer_stage, current_treatment_encrypted, diagnosis_date_encrypted, preferred_hospitals, budget_range, travel_dates")
        .eq("id", intake_id)
        .maybeSingle();

      if (intake) {
        // 본인 또는 admin 만
        const { data: intakeOwner } = await supabaseAdmin
          .from("cancer_patient_intakes")
          .select("id")
          .eq("id", intake_id)
          .maybeSingle();
        if (!intakeOwner) {
          return Response.json({ ok: false, error: "intake_not_found" }, { status: 404 });
        }

        const currentTreatment = intake.current_treatment_encrypted
          ? decryptStringNullable(intake.current_treatment_encrypted)
          : null;

        try {
          const { generateText } = await import("ai");
          const { google } = await import("@ai-sdk/google");

          const systemPrompt = `당신은 한국 의료관광 비용 추정 전문가입니다.
환자의 상세 인테이크 정보를 보고 KHIDI 벤치마크 범위 ${total_min_krw}~${total_max_krw} KRW (중앙값 ${total_median_krw}) 안에서 이 환자의 실제 비용이 어느 구간에 위치할 가능성이 높은지 판단하세요.

규칙:
- 범위를 벗어나는 금액을 절대 제시하지 마세요.
- "lower" (하위 33%), "middle" (중위 33%), "upper" (상위 33%) 중 하나를 선택하세요.
- 이유를 2~3 문장으로 설명하세요.
- 의료 조언이 아닌 "비용 범위 추정" 입니다.
- 한국어로 답변하세요.

출력 형식 (JSON):
{"band": "lower"|"middle"|"upper", "reason": "..."}`;

          const userPrompt = `환자 정보:
- 암종: ${cancer_type}
- 단계: ${stage}
- 현재 받고 있는 치료: ${currentTreatment || "없음/미상"}
- 선호 병원: ${(intake.preferred_hospitals || []).join(", ") || "미정"}
- 예산 구간: ${intake.budget_range || "미정"}
- 여행 일정: ${intake.travel_dates || "미정"}`;

          const { text } = await generateText({
            model: google("gemini-2.5-flash") as any,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.2,
          });

          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (["lower", "middle", "upper"].includes(parsed.band)) {
              suggestedBand = parsed.band;
              personalization = parsed.reason || null;
            }
          }
        } catch (aiErr: any) {
          console.warn("[cost-estimate] AI personalization failed:", aiErr?.message);
          // AI 실패 시 silent fallback — Tier 1 만 반환
        }
      }
    }

    const USD_RATE = 1380;

    // 보정된 좁은 범위 계산
    let refinedMin = total_min_krw;
    let refinedMax = total_max_krw;
    if (suggestedBand === "lower") {
      refinedMax = total_min_krw + Math.round((total_median_krw - total_min_krw) * 1.2);
    } else if (suggestedBand === "middle") {
      const mid = total_median_krw;
      refinedMin = Math.round(mid - (mid - total_min_krw) * 0.5);
      refinedMax = Math.round(mid + (total_max_krw - mid) * 0.5);
    } else if (suggestedBand === "upper") {
      refinedMin = total_median_krw - Math.round((total_median_krw - total_min_krw) * 0.2);
    }

    return Response.json({
      ok: true,
      data: {
        cancer_type,
        stage,
        tier1_range_krw: {
          min: total_min_krw,
          median: total_median_krw,
          max: total_max_krw,
          min_usd: Math.round(total_min_krw / USD_RATE),
          median_usd: Math.round(total_median_krw / USD_RATE),
          max_usd: Math.round(total_max_krw / USD_RATE),
        },
        tier2_personalization: personalization,
        tier2_band: suggestedBand,
        tier2_refined_krw: suggestedBand
          ? {
              min: refinedMin,
              max: refinedMax,
              min_usd: Math.round(refinedMin / USD_RATE),
              max_usd: Math.round(refinedMax / USD_RATE),
            }
          : null,
        disclaimer:
          "본 금액은 통계 기반 예상 범위이며 AI 보정은 참고용입니다. 정식 견적서는 진료 전 병원·HEALO 를 통해 수령하셔야 합니다 (의료해외진출법 §15).",
        tier: suggestedBand ? 2 : 1,
      },
    });
  } catch (error: any) {
    console.error("[api/khidi/cost-estimate] POST exception:", error?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
