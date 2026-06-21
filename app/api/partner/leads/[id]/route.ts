export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { checkHospitalAuth } from "@/lib/auth/checkHospitalAuth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { caseStatusOrder, outcomeForHospitalLeadStatus } from "@/lib/khidi/caseStatus";

const VALID_STATUSES = ["sent", "viewed", "replied", "converted", "rejected"];

/**
 * 병원의 리드 응답을 의뢰(case_status)로 되돌려 반영 — 코디·에이전시가 보게.
 * 병원 상태 → 케이스 단계/메모/이력. 코디가 이미 더 진행시킨 단계는 후퇴시키지 않는다.
 */
async function syncLeadStatusToCase(
  supabase: any,
  leadId: string,
  newStatus: string,
  hospitalId: string,
  userId: string | undefined,
  quote: { min?: number | null; max?: number | null }
) {
  try {
    // 리드 → normalized_inquiry → 원본 의뢰 id
    const { data: lead } = await supabase
      .from("hospital_leads")
      .select("normalized_inquiry_id")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead?.normalized_inquiry_id) return;
    const { data: norm } = await supabase
      .from("normalized_inquiries")
      .select("source_inquiry_id")
      .eq("id", lead.normalized_inquiry_id)
      .maybeSingle();
    const inquiryId = norm?.source_inquiry_id;
    if (inquiryId == null) return;

    const { data: hosp } = await supabase.from("hospitals").select("name").eq("id", hospitalId).maybeSingle();
    const hName = hosp?.name || "병원";
    const { data: inq } = await supabase.from("inquiries").select("case_status").eq("id", inquiryId).maybeSingle();
    const curStatus: string | null = inq?.case_status ?? null;

    let note = "";
    let targetStatus: string | null = curStatus;

    if (newStatus === "replied" || newStatus === "converted") {
      const q = quote.min != null || quote.max != null ? ` (견적 ${quote.min ?? "?"}~${quote.max ?? "?"})` : "";
      note = `🏥 ${hName} ${newStatus === "converted" ? "치료 확정" : "회신"}${q}`;
      // 병원이 회신/확정하면 '치료 일정·견적 조율 중'으로 전진(이미 더 간 단계면 유지).
      if (caseStatusOrder(curStatus) < caseStatusOrder("scheduling")) targetStatus = "scheduling";
    } else if (newStatus === "rejected") {
      note = `🏥 ${hName} 거절`;
      // 다른 병원이 수락할 수 있으니 단계는 후퇴/변경하지 않음(메모·이력만).
      targetStatus = curStatus;
    } else {
      return; // viewed 등은 케이스 반영 안 함
    }

    const now = new Date().toISOString();
    const patch: any = { case_status_note: note, case_status_updated_at: now };
    if (targetStatus && targetStatus !== curStatus) patch.case_status = targetStatus;
    await supabase.from("inquiries").update(patch).eq("id", inquiryId);
    await supabase.from("case_status_history").insert({
      inquiry_id: inquiryId,
      status: targetStatus || curStatus || "hospital_review",
      note,
      created_by: userId ?? null,
    });

    // 병원이 '치료 확정'하면 실제 유치 → 유치 전환 점수판(KHIDI 평가 지표)에 자동 집계.
    //   (PO 결정 2026-06-21) 그동안 outcome 은 코디 수동 입력에만 의존해, 에이전시→병원
    //   의뢰 경로로 확정된 케이스가 유치 카운트에서 누락됐다. 병원 확정을 곧 유치로 반영.
    const autoOutcome = outcomeForHospitalLeadStatus(newStatus);
    if (autoOutcome) {
      await supabase
        .from("inquiries")
        .update({
          outcome: autoOutcome,
          outcome_note: `🏥 ${hName} 치료 확정 (자동 유치 집계)`,
          outcome_updated_at: now,
          outcome_updated_by: userId ?? null,
        })
        .eq("id", inquiryId);
    }
  } catch (e: any) {
    console.error("[partner/leads/id] case sync error:", e?.message?.slice(0, 200));
    // 케이스 반영 실패해도 리드 업데이트 자체는 성공 처리(베스트에포트).
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkHospitalAuth(request);
  if (!auth.isHospitalUser || !auth.hospitalId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }

  if (auth.role === "viewer") {
    return Response.json({ ok: false, error: "viewer_cannot_update" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServiceRoleClient();

    // Verify lead belongs to this hospital
    const { data: existing, error: findErr } = await supabase
      .from("hospital_leads")
      .select("id, hospital_id, status")
      .eq("id", id)
      .single();

    if (findErr || !existing) {
      return Response.json({ ok: false, error: "lead_not_found" }, { status: 404 });
    }

    if (existing.hospital_id !== auth.hospitalId) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }

    const updates: any = { last_status_at: new Date().toISOString() };

    if (body.status && VALID_STATUSES.includes(body.status)) {
      updates.status = body.status;
      if (body.status === "replied" && !(existing as any).first_response_at) {
        updates.first_response_at = new Date().toISOString();
      }
    }

    if (body.quoted_price_min !== undefined) updates.quoted_price_min = body.quoted_price_min;
    if (body.quoted_price_max !== undefined) updates.quoted_price_max = body.quoted_price_max;
    if (body.notes !== undefined) updates.notes = body.notes;

    const { data, error } = await supabase
      .from("hospital_leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[partner/leads/id] Update error:", error.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    // 역방향: 병원 응답을 의뢰 case_status 로 반영 → 코디·에이전시가 봄
    if (updates.status && updates.status !== existing.status) {
      await syncLeadStatusToCase(supabase, id, updates.status, auth.hospitalId, auth.userId, {
        min: data?.quoted_price_min ?? null,
        max: data?.quoted_price_max ?? null,
      });
    }

    return Response.json({ ok: true, lead: data });
  } catch (err: any) {
    console.error("[partner/leads/id] Exception:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
