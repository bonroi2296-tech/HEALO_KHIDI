/**
 * healwith: Visa Application Document Upload / List
 *
 * POST /api/khidi/visa/applications/[id]/documents — 서류 업로드 (환자/admin)
 * GET  /api/khidi/visa/applications/[id]/documents — 서류 목록 (참가자)
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireVisaAccess } from "@/lib/auth/requireVisaAccess";
import { getSupabaseServerClient } from "@/lib/data/supabaseServerClient";
import { uploadLimiter } from "@/lib/api/rateLimiter";
import { sanitizeString } from "@/lib/api/sanitize";
import { verifyFileMagic } from "@/lib/security/fileMagic";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

const VALID_DOCUMENT_TYPES = [
  "passport",
  "photo",
  "visa_application_form",
  "invitation_letter",
  "medical_certificate",
  "diagnosis_document",
  "treatment_plan",
  "bank_statement",
  "hospital_confirmation",
  "insurance",
  "other",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = uploadLimiter.check(request);
    if (limited) return limited;

    const { id: applicationId } = await params;
    const access = await requireVisaAccess(request, applicationId);
    if (!access.success) return access.response;
    const { userId, role, application } = access;

    // 환자는 draft / documents_pending / changes_requested 에서만 업로드 가능
    if (role === "patient") {
      const allowedStatuses = ["draft", "documents_pending", "changes_requested"];
      if (!allowedStatuses.includes(application.status)) {
        return NextResponse.json(
          { ok: false, error: "read_only_status", detail: `현재 상태(${application.status})에서는 서류 업로드 불가` },
          { status: 403 }
        );
      }
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType =
      sanitizeString(formData.get("document_type") as string, 50) || "other";
    const documentLabel = sanitizeString(
      formData.get("document_label") as string,
      200
    );

    if (!file) {
      return NextResponse.json({ ok: false, error: "file_required" }, { status: 400 });
    }
    if (!VALID_DOCUMENT_TYPES.includes(documentType)) {
      return NextResponse.json(
        { ok: false, error: "invalid_document_type", detail: `허용: ${VALID_DOCUMENT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: `file_type_not_allowed`, detail: `Accepted: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { ok: false, error: "file_too_large", detail: `Max ${MAX_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic bytes 검증
    const magicCheck = verifyFileMagic(buffer, file.type);
    if (!magicCheck.ok) {
      console.warn(
        `[VisaDocumentUpload] magic check failed: file=${file.name} declared=${file.type} reason=${magicCheck.reason}`
      );
      return NextResponse.json(
        { ok: false, error: "file_content_mismatch" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Storage 경로 — 신청 ID 하위, 랜덤 suffix
    const ext = file.name.split(".").pop() || "bin";
    const storagePath = `visa-applications/${applicationId}/${Date.now()}_${crypto
      .randomUUID()
      .slice(0, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[VisaDocumentUpload] Storage error:", uploadError);
      return NextResponse.json({ ok: false, error: "upload_failed" }, { status: 500 });
    }

    // DB insert
    const { data: doc, error: dbError } = await supabase
      .from("visa_documents")
      .insert({
        application_id: applicationId,
        uploaded_by: userId,
        document_type: documentType,
        document_label: documentLabel || null,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        review_status: "pending",
      })
      .select("*")
      .single();

    if (dbError) {
      console.error("[VisaDocumentUpload] DB error:", dbError);
      await supabase.storage.from("documents").remove([storagePath]);
      return NextResponse.json(
        { ok: false, error: "metadata_save_failed" },
        { status: 500 }
      );
    }

    // 환자가 draft 상태에서 첫 서류 업로드 시 자동으로 documents_pending 전이
    if (role === "patient" && application.status === "draft") {
      await supabase
        .from("visa_applications")
        .update({ status: "documents_pending" })
        .eq("id", applicationId);

      await supabase.from("visa_status_history").insert({
        application_id: applicationId,
        from_status: "draft",
        to_status: "documents_pending",
        changed_by: userId,
        note: "서류 첫 업로드로 자동 전이",
      });
    }

    return NextResponse.json({ ok: true, data: doc });
  } catch (error: any) {
    console.error("[VisaDocumentUpload] exception:", error?.message);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params;
    const access = await requireVisaAccess(request, applicationId);
    if (!access.success) return access.response;

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("visa_documents")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[VisaDocumentList] error:", error);
      return NextResponse.json(
        { ok: false, error: "list_failed" },
        { status: 500 }
      );
    }

    // 각 문서에 signed URL 첨부 (1 시간)
    const docsWithUrls = await Promise.all(
      (data || []).map(async (doc: any) => {
        const { data: urlData } = await supabase.storage
          .from("documents")
          .createSignedUrl(doc.storage_path, 3600);
        return { ...doc, url: urlData?.signedUrl || null };
      })
    );

    return NextResponse.json({
      ok: true,
      data: docsWithUrls,
      role: access.role,
    });
  } catch (error: any) {
    console.error("[VisaDocumentList] exception:", error?.message);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
