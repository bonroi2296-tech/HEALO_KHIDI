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
import { issueUploadUrl, verifyUploaded, isOwnPath, normalizeMime } from "@/lib/storage/directUpload";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
// 예전엔 20MB 라고 적어놓고 실제로는 4.5MB 에서 끊겼다(서버 경유 방식의 Vercel 본문 한도).
// 지금은 브라우저 → Storage 직행이라 이 숫자가 진짜 상한이다.
const MAX_SIZE = 50 * 1024 * 1024;

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

    const body = await request.json();
    const documentType = sanitizeString(body.document_type, 50) || "other";
    const documentLabel = sanitizeString(body.document_label, 200);

    if (!VALID_DOCUMENT_TYPES.includes(documentType)) {
      return NextResponse.json(
        { ok: false, error: "invalid_document_type", detail: `허용: ${VALID_DOCUMENT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const dir = `visa-applications/${applicationId}`;

    // ── 1단계: 서명 URL 발급 ──
    if (body.phase !== "commit") {
      const signed = await issueUploadUrl(body, {
        bucket: "documents",
        dir,
        allowed: ALLOWED_TYPES,
        maxBytes: MAX_SIZE,
      });
      if (!signed.ok) {
        return NextResponse.json(
          { ok: false, error: signed.error, detail: signed.detail },
          { status: signed.status }
        );
      }
      return NextResponse.json({
        ok: true,
        signedUrl: signed.signedUrl,
        path: signed.path,
        name: signed.name,
        type: signed.type,
      });
    }

    // ── 2단계: 올라간 파일 검증 + 기록 저장 ──
    const storagePath = String(body.path || "");
    if (!isOwnPath(dir, storagePath)) {
      return NextResponse.json({ ok: false, error: "invalid_path" }, { status: 400 });
    }
    const fileType = normalizeMime(storagePath, String(body.type || ""));
    const verified = await verifyUploaded("documents", storagePath, fileType, MAX_SIZE);
    if (!verified.ok) {
      const error = verified.error === "invalid_file_content" ? "file_content_mismatch" : verified.error;
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }

    // DB insert
    const { data: doc, error: dbError } = await supabase
      .from("visa_documents")
      .insert({
        application_id: applicationId,
        uploaded_by: userId,
        document_type: documentType,
        document_label: documentLabel || null,
        file_name: sanitizeString(body.name, 200),
        file_type: fileType,
        file_size: verified.size, // 선언값이 아니라 실제 저장된 크기
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
