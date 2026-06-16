/**
 * healwith: Visa Document Individual Actions
 *
 * PATCH  /api/khidi/visa/applications/[id]/documents/[docId] — 검수 (코디/admin)
 * DELETE /api/khidi/visa/applications/[id]/documents/[docId] — 삭제 (본인 업로더 / admin)
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireVisaAccess } from "@/lib/auth/requireVisaAccess";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

const VALID_REVIEW_STATUSES = ["pending", "approved", "rejected", "needs_revision"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: applicationId, docId } = await params;

    // 검수는 코디/admin 만
    const access = await requireVisaAccess(request, applicationId, {
      requireRole: ["admin", "coordinator"],
    });
    if (!access.success) return access.response;
    const { userId } = access;

    const payload = await request.json();
    if (!VALID_REVIEW_STATUSES.includes(payload.review_status)) {
      return NextResponse.json(
        { ok: false, error: "invalid_review_status" },
        { status: 400 }
      );
    }

    // 해당 doc 이 이 신청 건에 속하는지 확인 (IDOR 차단)
    const { data: doc } = await supabaseAdmin
      .from("visa_documents")
      .select("id, application_id")
      .eq("id", docId)
      .maybeSingle();
    if (!doc || doc.application_id !== applicationId) {
      return NextResponse.json(
        { ok: false, error: "document_not_found" },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("visa_documents")
      .update({
        review_status: payload.review_status,
        review_note: payload.review_note || null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", docId)
      .select("*")
      .single();

    if (error) {
      console.error("[VisaDocumentReview] error:", error.message);
      return NextResponse.json(
        { ok: false, error: "update_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    console.error("[VisaDocumentReview] exception:", error?.message);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: applicationId, docId } = await params;
    const access = await requireVisaAccess(request, applicationId);
    if (!access.success) return access.response;
    const { userId, role, application } = access;

    const { data: doc } = await supabaseAdmin
      .from("visa_documents")
      .select("id, application_id, uploaded_by, storage_path")
      .eq("id", docId)
      .maybeSingle();

    if (!doc || doc.application_id !== applicationId) {
      return NextResponse.json(
        { ok: false, error: "document_not_found" },
        { status: 404 }
      );
    }

    // 환자는 본인 업로드 + draft/documents_pending/changes_requested 상태에서만 삭제 가능
    if (role === "patient") {
      if (doc.uploaded_by !== userId) {
        return NextResponse.json(
          { ok: false, error: "forbidden" },
          { status: 403 }
        );
      }
      if (!["draft", "documents_pending", "changes_requested"].includes(application.status)) {
        return NextResponse.json(
          { ok: false, error: "read_only_status" },
          { status: 403 }
        );
      }
    }

    // Storage 에서 삭제
    await supabaseAdmin.storage.from("documents").remove([doc.storage_path]);

    // DB 에서 삭제
    const { error } = await supabaseAdmin
      .from("visa_documents")
      .delete()
      .eq("id", docId);

    if (error) {
      console.error("[VisaDocumentDelete] error:", error.message);
      return NextResponse.json(
        { ok: false, error: "delete_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[VisaDocumentDelete] exception:", error?.message);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
