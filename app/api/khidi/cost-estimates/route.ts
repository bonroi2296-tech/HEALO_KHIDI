/**
 * healwith: Cost Estimates (Tier 3 정식 견적) Workflow API
 *
 * POST /api/khidi/cost-estimates — 정식 견적 요청 시작 (환자)
 * GET  /api/khidi/cost-estimates — 목록 (환자: 본인, 코디: 전체, admin: 전체)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireCostEstimateUser } from "@/lib/auth/requireCostEstimateAccess";
import { supabaseAdmin as _sb } from "@/lib/rag/supabaseAdmin";
const supabaseAdmin: any = _sb;

const USD_RATE = 1380;

export async function POST(request: NextRequest) {
  const authResult = await requireCostEstimateUser(request);
  if (!authResult.success) return authResult.response;
  const { userId } = authResult;

  try {
    const payload = await request.json();
    // 허용 목록 밖 값은 버린다. 검증 없이 두면 아무 문자열이나 저장되고
    // (2026-08-20 실측: "<script>alert(1)</script>" 가 그대로 들어갔다),
    // 코디 화면이 그 값으로 사전을 조회해 뜻 없는 글자를 띄운다 = 무슨 암인지 못 읽는다.
    // 목록은 환자 요청 폼의 선택지(CANCER_OPTIONS)와 같아야 한다.
    const CANCER_TYPES = new Set([
      "stomach", "lung", "breast", "liver", "thyroid", "colorectal", "other",
    ]);
    const STAGES = new Set(["unknown", "1", "2", "3", "4"]);

    const rawCancer = String(payload.cancer_type || "").toLowerCase();
    const rawStage = String(payload.stage || "unknown");
    const cancer_type = CANCER_TYPES.has(rawCancer) ? rawCancer : "";
    const stage = STAGES.has(rawStage) ? rawStage : "unknown";

    // 자동 금액 범위는 내지 않는다.
    // 2026-08-20 실측: 근거로 삼던 treatment_cost_benchmarks 63건이 전부 출처 없는 창작이었다.
    // (존재한 적 없는 표의 "평균", 견적 0건인 시점에 "표본 200건", 진료비가 실리지 않은
    //  보고서를 출처로 표기) 그 숫자가 환자 기록에 저장되어 화면에 그대로 노출되고 있었다.
    // 예상진료비는 코디네이터가 병원에서 받은 금액으로 정식 견적서를 발급하는 경로로만
    // 안내한다. 되살리려면 병원에서 받은 실제 가격표가 먼저 있어야 한다.

    // intake_id / consultation_id 본인 소유 검증
    if (payload.consultation_id) {
      const { data: c } = await supabaseAdmin
        .from("consultation_sessions")
        .select("id, patient_user_id, patient_id")
        .eq("id", payload.consultation_id)
        .maybeSingle();
      if (!c) {
        return Response.json(
          { ok: false, error: "consultation_not_found" },
          { status: 404 }
        );
      }
      const isParticipant =
        c.patient_user_id === userId || c.patient_id === userId;
      if (!isParticipant && !authResult.isAdmin) {
        return Response.json(
          { ok: false, error: "forbidden_consultation" },
          { status: 403 }
        );
      }
    }

    const insertData = {
      patient_user_id: userId, // 클라이언트 지정 못하게 강제
      consultation_id: payload.consultation_id || null,
      intake_id: payload.intake_id || null,
      hospital_id: payload.hospital_id || null,
      // 환자가 고른 암종·병기를 그대로 남긴다. 코디네이터가 병원에 무엇을 물어야 하는지가
      // 이 두 칸이다. 예전에는 창작된 범위를 조회하는 데만 쓰이고 저장되지 않아,
      // 코디네이터는 환자가 무슨 암 몇 기인지 모르는 채로 견적을 써야 했다.
      cancer_type: cancer_type || null,
      stage: stage || null,
      status: "formal_requested",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("cost_estimates")
      .insert([insertData])
      .select("*")
      .single();

    if (error) {
      console.error("[api/khidi/cost-estimates] Insert error:", error.message);
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    await supabaseAdmin.from("cost_estimate_history").insert({
      estimate_id: data.id,
      from_status: null,
      to_status: "formal_requested",
      changed_by: userId,
      note: "환자가 정식 견적 요청",
    });

    console.log(`[api/khidi/cost-estimates] Created ${data.id} by ${userId}`);

    return Response.json({ ok: true, data });
  } catch (error: any) {
    console.error("[api/khidi/cost-estimates] POST exception:", error?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireCostEstimateUser(request);
  if (!authResult.success) return authResult.response;
  const { userId, isAdmin, isCoordinator } = authResult;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");
  const statusFilter = searchParams.get("status");

  let query = supabaseAdmin
    .from("cost_estimates")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter) query = query.eq("status", statusFilter);

  if (!isAdmin && !isCoordinator) {
    query = query.eq("patient_user_id", userId);
  }

  const { data, count, error } = await query;

  if (error) {
    return Response.json({ ok: false, error: "list_failed" }, { status: 500 });
  }

  // coordinator_notes_encrypted 는 코디 전용 내부 필드 — 목록 응답에서 제거(상세 API [id] 와 일관).
  // 환자도 본인 건을 목록 조회하므로 그대로 두면 코디 노트 암호문이 환자 브라우저로 나감.
  const rows = (data || []).map(({ coordinator_notes_encrypted: _drop, ...rest }) => rest);

  return Response.json({
    ok: true,
    data: rows,
    total: count,
    limit,
    offset,
    scope: isAdmin ? "admin" : isCoordinator ? "coordinator" : "patient",
  });
}
