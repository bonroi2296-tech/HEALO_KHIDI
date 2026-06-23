/**
 * healwith: 환자 사후관리(재예약) 일정 — 로그인 환자 본인 기준 (서버 경유)
 *
 * GET   /api/portal/followup → { ok, schedules } = 본인 followup_schedules 목록
 * PATCH /api/portal/followup { id, status } → 본인 일정 상태 변경(확정/무시 등)
 *
 * 배경(P1): followup_schedules 는 service_role 전용 RLS → 브라우저 직접조회는 빈 데이터였음.
 * patient_user_id 로 본인 행만 다룸(이메일 매칭 불필요). PATCH 는 행 소유 확인 후 변경(IDOR 차단).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

const ALLOWED_STATUS = ["pending", "proposed", "confirmed", "dismissed", "completed"];

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { data, error } = await supabaseAdmin
      .from("followup_schedules")
      .select("*")
      .eq("patient_user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[portal/followup] GET error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }
    return Response.json({ ok: true, schedules: data || [] });
  } catch (err: any) {
    console.error("[portal/followup] GET exception:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const id = body?.id;
  const status = body?.status;
  if (!id || !status || !ALLOWED_STATUS.includes(status)) {
    return Response.json({ ok: false, error: "invalid_params" }, { status: 400 });
  }

  try {
    // IDOR 차단: 본인 일정인지 확인 후 변경
    const { data: row } = await supabaseAdmin
      .from("followup_schedules")
      .select("id, patient_user_id")
      .eq("id", id)
      .maybeSingle();

    if (!row || (row as any).patient_user_id !== auth.userId) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("followup_schedules")
      .update({ status } as any)
      .eq("id", id);

    if (error) {
      console.error("[portal/followup] PATCH error:", error.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }
    return Response.json({ ok: true, id, status });
  } catch (err: any) {
    console.error("[portal/followup] PATCH exception:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
