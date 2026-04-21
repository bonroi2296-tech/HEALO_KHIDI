/**
 * HEALO: Cost Estimate Detail / Update
 *
 * GET   /api/khidi/cost-estimates/[id] — 상세 조회
 * PATCH /api/khidi/cost-estimates/[id] — 견적 항목 업데이트 / 상태 전이 / 환자 동의
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireCostEstimateAccess } from "@/lib/auth/requireCostEstimateAccess";
import { supabaseAdmin as _sb } from "@/lib/rag/supabaseAdmin";
const supabaseAdmin: any = _sb;
import { encryptStringNullable, decryptStringNullable } from "@/lib/security/encryptionV2";
import { getClientIp } from "@/lib/rateLimit";

const VALID_STATUSES = [
  "auto_range", "formal_requested", "hospital_pending", "draft",
  "issued", "accepted", "rejected", "expired",
];

const TRANSITIONS: Record<string, string[]> = {
  auto_range: ["formal_requested", "expired"],
  formal_requested: ["hospital_pending", "draft", "expired"],
  hospital_pending: ["draft", "expired"],
  draft: ["issued", "expired"],
  issued: ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired: [],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireCostEstimateAccess(request, id);
  if (!access.success) return access.response;

  const { data, error } = await supabaseAdmin
    .from("cost_estimates")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    return Response.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  let coordinatorNotes: string | null = null;
  if (access.role === "admin" || access.role === "coordinator") {
    try {
      coordinatorNotes = decryptStringNullable(data.coordinator_notes_encrypted);
    } catch {
      coordinatorNotes = null;
    }
  }

  const { coordinator_notes_encrypted, ...rest } = data;
  return Response.json({
    ok: true,
    data: { ...rest, coordinator_notes: coordinatorNotes },
    role: access.role,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireCostEstimateAccess(request, id);
  if (!access.success) return access.response;
  const { role, userId, estimate } = access;
  const isStaff = role === "admin" || role === "coordinator";

  try {
    const payload = await request.json();
    const updates: Record<string, any> = {};

    // 환자 동의 (의료해외진출법 §15 서명)
    if (role === "patient" && payload.accept === true) {
      if (estimate.status !== "issued") {
        return Response.json(
          { ok: false, error: "not_issued", detail: "발급된 견적서만 동의할 수 있습니다" },
          { status: 400 }
        );
      }
      updates.status = "accepted";
      updates.patient_accepted_at = new Date().toISOString();
      updates.patient_accepted_ip = getClientIp(request);
    }

    if (role === "patient" && payload.reject === true) {
      if (estimate.status !== "issued") {
        return Response.json(
          { ok: false, error: "not_issued" },
          { status: 400 }
        );
      }
      updates.status = "rejected";
    }

    if (isStaff) {
      // 견적 항목 작성
      if (payload.quotation_items !== undefined) {
        if (!Array.isArray(payload.quotation_items)) {
          return Response.json(
            { ok: false, error: "quotation_items_must_be_array" },
            { status: 400 }
          );
        }
        updates.quotation_items = payload.quotation_items;

        // 총액 자동 계산
        let total_krw = 0;
        let total_usd = 0;
        for (const item of payload.quotation_items) {
          total_krw += Number(item.krw) || 0;
          total_usd += Number(item.usd) || 0;
        }
        updates.total_krw = total_krw;
        updates.total_usd = total_usd;
      }

      if (payload.hospital_id !== undefined) updates.hospital_id = payload.hospital_id;
      if (payload.coordinator_user_id !== undefined) {
        updates.coordinator_user_id = payload.coordinator_user_id;
      }
      if (payload.coordinator_notes !== undefined) {
        updates.coordinator_notes_encrypted = encryptStringNullable(
          payload.coordinator_notes
        );
      }
      if (payload.expires_at !== undefined) updates.expires_at = payload.expires_at;

      // 상태 전이
      if (payload.status && payload.status !== estimate.status) {
        if (!VALID_STATUSES.includes(payload.status)) {
          return Response.json(
            { ok: false, error: "invalid_status" },
            { status: 400 }
          );
        }
        const allowed = TRANSITIONS[estimate.status] || [];
        if (!allowed.includes(payload.status) && !access.isAdmin) {
          return Response.json(
            {
              ok: false,
              error: "invalid_transition",
              detail: `${estimate.status} → ${payload.status} 불가. 허용: ${allowed.join(", ")}`,
            },
            { status: 400 }
          );
        }
        updates.status = payload.status;
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ ok: false, error: "no_updates" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("cost_estimates")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[cost-estimates/[id]] PATCH error:", error.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    if (updates.status) {
      await supabaseAdmin.from("cost_estimate_history").insert({
        estimate_id: id,
        from_status: estimate.status,
        to_status: updates.status,
        changed_by: userId,
        note: payload.status_note || null,
      });
    }

    const { coordinator_notes_encrypted, ...rest } = data;
    return Response.json({ ok: true, data: rest });
  } catch (error: any) {
    console.error("[cost-estimates/[id]] PATCH exception:", error?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
