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
    const cancer_type = String(payload.cancer_type || "").toLowerCase();
    const stage = String(payload.stage || "unknown");

    // Tier 1 자동 범위 먼저 계산
    const { data: benchmarks } = await supabaseAdmin
      .from("treatment_cost_benchmarks")
      .select("*")
      .eq("cancer_type", cancer_type)
      .eq("stage", cancer_type === "other" ? "unknown" : stage);

    let auto_min_krw: number | null = null;
    let auto_median_krw: number | null = null;
    let auto_max_krw: number | null = null;
    if (benchmarks && benchmarks.length > 0) {
      auto_min_krw = benchmarks.reduce((s: number, b: any) => s + Number(b.min_krw), 0);
      auto_median_krw = benchmarks.reduce((s: number, b: any) => s + Number(b.median_krw), 0);
      auto_max_krw = benchmarks.reduce((s: number, b: any) => s + Number(b.max_krw), 0);
    }

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
      auto_min_krw,
      auto_median_krw,
      auto_max_krw,
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
