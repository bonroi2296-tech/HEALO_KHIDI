/**
 * healwith: Visa Application Detail / Status Update
 *
 * GET   /api/khidi/visa/applications/[id] — 상세 조회 (참가자 + admin/coordinator)
 * PATCH /api/khidi/visa/applications/[id] — 상태/배정/메모 업데이트
 *   - 환자: draft 상태에서 본인 작성 필드만 수정 가능
 *   - 코디/admin: 상태 전이, 배정, 코디 메모
 */

export const runtime = "nodejs";

import { NextRequest, after } from "next/server";
import { requireVisaAccess } from "@/lib/auth/requireVisaAccess";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { encryptStringNullable, decryptStringNullable } from "@/lib/security/encryptionV2";
import { logPiiAccess } from "@/lib/audit/logPiiAccess";
import type { TablesUpdate } from "@/types/database.types";

const VALID_STATUSES = [
  "draft",
  "documents_pending",
  "under_review",
  "changes_requested",
  "invitation_ready",
  "invitation_issued",
  "submitted_embassy",
  "approved",
  "rejected",
  "cancelled",
] as const;

// 상태 전이 규칙 (from → 허용된 to 배열)
const TRANSITIONS: Record<string, string[]> = {
  draft: ["documents_pending", "cancelled"],
  documents_pending: ["under_review", "cancelled"],
  under_review: ["changes_requested", "invitation_ready", "rejected", "cancelled"],
  changes_requested: ["under_review", "cancelled"],
  invitation_ready: ["invitation_issued", "cancelled"],
  invitation_issued: ["submitted_embassy", "cancelled"],
  submitted_embassy: ["approved", "rejected"],
  approved: [],
  rejected: [],
  cancelled: [],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await requireVisaAccess(request, id);
    if (!access.success) return access.response;

    // 전체 컬럼 가져오기
    const { data, error } = await supabaseAdmin
      .from("visa_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return Response.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    // 코디 메모는 코디/admin 에게만 복호화 해서 제공
    let coordinatorNotes: string | null = null;
    if (access.role === "admin" || access.role === "coordinator") {
      // 접속기록(법정 의무): «취급자»가 남의 비자 신청을 열어본 경우만 남긴다.
      // 환자가 자기 것을 보는 건 접속기록 대상이 아니라 이 분기 안에 둔다.
      after(() =>
        logPiiAccess(request, { userId: access.userId }, {
          action: "VIEW_INQUIRY",
          metadata: { screen: "visa_application", decrypted: "coordinator_notes" },
        })
      );

      try {
        coordinatorNotes = decryptStringNullable(data.coordinator_notes_encrypted);
      } catch {
        coordinatorNotes = null;
      }
    }

    // 응답에서 암호화 컬럼은 감춤
    const { coordinator_notes_encrypted: _drop, ...rest } = data;

    return Response.json({
      ok: true,
      data: {
        ...rest,
        coordinator_notes: coordinatorNotes,
      },
      role: access.role,
    });
  } catch (error: any) {
    console.error("[api/khidi/visa/applications/[id]] GET exception:", error?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await requireVisaAccess(request, id);
    if (!access.success) return access.response;
    const { application, role, userId } = access;

    const payload = await request.json();
    // 실DB 표의 모양으로 못박는다 — 없는 칸이 섞이면 여기서 걸린다(Record<string, any> 면 안 걸린다)
    const updates: TablesUpdate<"visa_applications"> = {};
    const isStaff = role === "admin" || role === "coordinator";

    // ────────────────────────────────────────
    // 환자 수정 가능 필드 (draft 상태일 때만)
    // ────────────────────────────────────────
    if (role === "patient") {
      // 환자 "코디 검수 요청": documents_pending → under_review (상태머신상 유효한 전이).
      // 과거엔 이 전이가 환자 분기에 없어, 서류 준비 완료 후 검수 요청 버튼이 항상
      // 실패(상태가 draft 가 아니라 read_only 403)했음.
      if (payload.status === "under_review" && application.status === "documents_pending") {
        updates.status = "under_review";
      } else if (application.status === "draft") {
        // draft 에서만 폼 필드 수정 + 제출(draft → documents_pending)
        const patientFields = [
          "purpose",
          "duration_days",
          "planned_arrival_date",
          "planned_departure_date",
          "nationality",
        ];
        for (const f of patientFields) {
          if (payload[f] !== undefined) updates[f] = payload[f];
        }
        if (payload.status === "documents_pending") {
          updates.status = "documents_pending";
        }
      } else {
        return Response.json(
          { ok: false, error: "read_only", detail: "제출 후에는 수정할 수 없습니다. 코디네이터에게 문의하세요." },
          { status: 403 }
        );
      }
    }

    // ────────────────────────────────────────
    // 코디/admin 전용 필드
    // ────────────────────────────────────────
    if (isStaff) {
      // 배정 / 병원 연결
      if (payload.coordinator_user_id !== undefined) {
        updates.coordinator_user_id = payload.coordinator_user_id;
      }
      if (payload.hospital_id !== undefined) {
        updates.hospital_id = payload.hospital_id;
      }

      // 대사관 관련
      if (payload.embassy_submission_date !== undefined) {
        updates.embassy_submission_date = payload.embassy_submission_date;
      }
      if (payload.embassy_decision_date !== undefined) {
        updates.embassy_decision_date = payload.embassy_decision_date;
      }
      if (payload.visa_number !== undefined) {
        updates.visa_number = payload.visa_number;
      }

      // 코디 메모 (암호화)
      if (payload.coordinator_notes !== undefined) {
        updates.coordinator_notes_encrypted = encryptStringNullable(
          payload.coordinator_notes
        );
      }

      // 상태 전이 (코디/admin 만 임의 전이 가능)
      if (payload.status && payload.status !== application.status) {
        if (!VALID_STATUSES.includes(payload.status)) {
          return Response.json({ ok: false, error: "invalid_status" }, { status: 400 });
        }
        const allowed = TRANSITIONS[application.status] || [];
        if (!allowed.includes(payload.status) && !access.isAdmin) {
          return Response.json(
            {
              ok: false,
              error: "invalid_transition",
              detail: `${application.status} → ${payload.status} 는 허용되지 않습니다. 허용: ${allowed.join(", ")}`,
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
      .from("visa_applications")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[api/khidi/visa/applications/[id]] PATCH error:", error.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    // 상태 변경 시 이력 기록
    if (updates.status) {
      await supabaseAdmin.from("visa_status_history").insert({
        application_id: id,
        from_status: application.status,
        to_status: updates.status,
        changed_by: userId,
        note: payload.status_note || null,
      });
    }

    const { coordinator_notes_encrypted: _drop, ...rest } = data;
    return Response.json({ ok: true, data: rest });
  } catch (error: any) {
    console.error("[api/khidi/visa/applications/[id]] PATCH exception:", error?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
