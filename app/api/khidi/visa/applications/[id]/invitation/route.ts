/**
 * healwith: Visa Invitation Letter (초청장) Auto-Issue
 *
 * POST /api/khidi/visa/applications/[id]/invitation — 초청장 PDF 생성 + Storage 업로드 + 상태 전이 (코디/admin 만)
 * GET  /api/khidi/visa/applications/[id]/invitation — 발급된 초청장 signed URL
 *
 * 정부 요건: KHIDI #3, #6 — "비자발급지원" 의 핵심. 초청장이 있어야 의료사증 신청 가능.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireVisaAccess } from "@/lib/auth/requireVisaAccess";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params;

    // 초청장 발급은 admin / coordinator 만
    const access = await requireVisaAccess(request, applicationId, {
      requireRole: ["admin", "coordinator"],
    });
    if (!access.success) return access.response;
    const { application, userId } = access;

    // 발급 전 상태 검증 — under_review 또는 invitation_ready 에서만
    const allowedStates = ["under_review", "invitation_ready", "changes_requested"];
    if (!allowedStates.includes(application.status) && !access.isAdmin) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_state",
          detail: `현재 상태(${application.status})에서는 초청장 발급 불가. ${allowedStates.join(", ")} 에서만 발급 가능.`,
        },
        { status: 400 }
      );
    }

    // 관련 데이터 수집
    const [{ data: fullApp }, intakeResult, hospitalResult, patientResult] =
      await Promise.all([
        supabaseAdmin
          .from("visa_applications")
          .select("*")
          .eq("id", applicationId)
          .single(),
        application.intake_id
          ? supabaseAdmin
              .from("cancer_patient_intakes")
              .select("cancer_type, cancer_stage, current_treatment_encrypted, first_name_encrypted")
              .eq("id", application.intake_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        application.hospital_id
          ? supabaseAdmin
              .from("hospitals")
              .select("name")
              .eq("id", application.hospital_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabaseAdmin.auth.admin.getUserById(application.patient_user_id),
      ]);

    const { decryptStringNullable } = await import("@/lib/security/encryptionV2");
    const intakeData = intakeResult?.data as
      | { cancer_type?: string | null; cancer_stage?: string | null; current_treatment_encrypted?: string | null; first_name_encrypted?: string | null }
      | null;
    const hospital = hospitalResult?.data as
      | { name?: string | null }
      | null;
    const patientEmail = patientResult?.data?.user?.email || "";
    const decryptedName = intakeData?.first_name_encrypted
      ? decryptStringNullable(intakeData.first_name_encrypted)
      : null;
    const decryptedTreatment = intakeData?.current_treatment_encrypted
      ? decryptStringNullable(intakeData.current_treatment_encrypted)
      : null;

    const diagnosis = intakeData
      ? `${intakeData.cancer_type || ""}${intakeData.cancer_stage ? ` - Stage ${intakeData.cancer_stage}` : ""}`.trim() || null
      : null;

    if (!fullApp) {
      return Response.json(
        { ok: false, error: "application not found" },
        { status: 404 }
      );
    }

    // PDF 데이터 구성
    const pdfData = {
      letterNo: `healwith-INV-${fullApp.id.slice(0, 8).toUpperCase()}`,
      issuedAt: new Date().toISOString().slice(0, 10),
      patient: {
        name: decryptedName || patientEmail,
        nationality: fullApp.nationality,
        passport: null, // 여권번호는 visa_documents 에서 별도 관리
        dob: null,
        diagnosis,
      },
      visa: {
        visaType: fullApp.visa_type,
        purpose: fullApp.purpose || "의료 치료 (Medical Treatment)",
        durationDays: fullApp.duration_days,
      },
      hospital: {
        name: hospital?.name || "제휴 의료기관",
        doctor: "—",
        regNo: "—",
        plan: decryptedTreatment || "암 치료 및 사후관리 (Cancer treatment + post-care)",
      },
      schedule: {
        arrival: fullApp.planned_arrival_date,
        departure: fullApp.planned_departure_date,
        totalDays: fullApp.duration_days,
      },
    };

    // PDF 렌더
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const VisaInvitationLetterMod = await import(
      "@/lib/pdf/VisaInvitationLetter"
    );
    const React = (await import("react")).default;
    const element = React.createElement(VisaInvitationLetterMod.default, {
      data: pdfData,
      lang: "en",
    });
    const buffer = await renderToBuffer(element as any);

    // Storage 업로드
    const storagePath = `visa-applications/${applicationId}/invitation_${Date.now()}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[VisaInvitation] upload error:", uploadError);
      return NextResponse.json(
        { ok: false, error: "upload_failed" },
        { status: 500 }
      );
    }

    // visa_applications 업데이트 — 초청장 정보 + 상태 전이
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("visa_applications")
      .update({
        invitation_letter_url: storagePath,
        invitation_issued_at: new Date().toISOString(),
        invitation_issued_by: userId,
        status: "invitation_issued",
      })
      .eq("id", applicationId)
      .select("*")
      .single();

    if (updateError) {
      console.error("[VisaInvitation] DB update error:", updateError);
      return NextResponse.json(
        { ok: false, error: "db_update_failed" },
        { status: 500 }
      );
    }

    // 상태 이력 기록
    await supabaseAdmin.from("visa_status_history").insert({
      application_id: applicationId,
      from_status: application.status,
      to_status: "invitation_issued",
      changed_by: userId,
      note: `초청장 발급: ${storagePath}`,
    });

    // visa_documents 에도 기록 (감사/추적 용이)
    await supabaseAdmin.from("visa_documents").insert({
      application_id: applicationId,
      uploaded_by: userId,
      document_type: "invitation_letter",
      document_label: "의료목적 사증 초청장 (healwith 발급)",
      file_name: `invitation_${applicationId.slice(0, 8)}.pdf`,
      file_type: "application/pdf",
      file_size: buffer.byteLength,
      storage_path: storagePath,
      review_status: "approved",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    });

    // Signed URL 생성 (24시간)
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from("documents")
      .createSignedUrl(storagePath, 24 * 60 * 60);

    return NextResponse.json({
      ok: true,
      data: {
        application: updated,
        invitation_letter_url: signedUrlData?.signedUrl || null,
        storage_path: storagePath,
      },
    });
  } catch (error: any) {
    console.error("[VisaInvitation] exception:", error);
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

    const { data: fullApp } = await supabaseAdmin
      .from("visa_applications")
      .select("invitation_letter_url, invitation_issued_at, invitation_issued_by")
      .eq("id", applicationId)
      .single();

    if (!fullApp?.invitation_letter_url) {
      return NextResponse.json(
        { ok: false, error: "invitation_not_issued" },
        { status: 404 }
      );
    }

    const { data: signedUrlData } = await supabaseAdmin.storage
      .from("documents")
      .createSignedUrl(fullApp.invitation_letter_url, 60 * 60);

    return NextResponse.json({
      ok: true,
      invitation_letter_url: signedUrlData?.signedUrl || null,
      invitation_issued_at: fullApp.invitation_issued_at,
      invitation_issued_by: fullApp.invitation_issued_by,
    });
  } catch (error: any) {
    console.error("[VisaInvitation] GET exception:", error);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
