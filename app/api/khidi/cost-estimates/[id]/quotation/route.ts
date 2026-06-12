/**
 * HEALO: Cost Estimate — 정식 견적서 PDF 자동 발급
 *
 * POST /api/khidi/cost-estimates/[id]/quotation — PDF 생성 + Storage 업로드 + issued 전이 (코디/admin)
 * GET  /api/khidi/cost-estimates/[id]/quotation — 발급된 PDF signed URL
 *
 * 기존 src/lib/pdf/MedicalQuotation.jsx 재사용.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireCostEstimateAccess } from "@/lib/auth/requireCostEstimateAccess";
import { supabaseAdmin as _sb } from "@/lib/rag/supabaseAdmin";
const supabaseAdmin: any = _sb;
import { decryptStringNullable } from "@/lib/security/encryptionV2";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimateId } = await params;

    const access = await requireCostEstimateAccess(request, estimateId, {
      requireRole: ["admin", "coordinator"],
    });
    if (!access.success) return access.response;
    const { userId } = access;

    // 전체 데이터 로드
    const { data: estimate } = await supabaseAdmin
      .from("cost_estimates")
      .select("*")
      .eq("id", estimateId)
      .single();
    if (!estimate) {
      return NextResponse.json(
        { ok: false, error: "estimate_not_found" },
        { status: 404 }
      );
    }

    if (!estimate.quotation_items || estimate.quotation_items.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "no_items",
          detail: "견적 항목이 비어있습니다. 먼저 항목을 작성하세요.",
        },
        { status: 400 }
      );
    }

    const allowedStates = ["hospital_pending", "draft"];
    if (!allowedStates.includes(estimate.status) && !access.isAdmin) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_state",
          detail: `현재 상태(${estimate.status})에서는 발급 불가.`,
        },
        { status: 400 }
      );
    }

    // 환자 정보
    const { data: patientUserRes } = await supabaseAdmin.auth.admin.getUserById(
      estimate.patient_user_id
    );
    const patientEmail = patientUserRes?.user?.email || "";

    // 인테이크 (진단명 등)
    let diagnosis: string | null = null;
    let patientName: string | null = null;
    const patientNationality: string | null = null;
    if (estimate.intake_id) {
      const { data: intake } = await supabaseAdmin
        .from("cancer_patient_intakes")
        .select(
          "cancer_type, cancer_stage, first_name_encrypted, language_preference"
        )
        .eq("id", estimate.intake_id)
        .maybeSingle();
      if (intake) {
        diagnosis = `${intake.cancer_type || ""}${
          intake.cancer_stage ? ` - Stage ${intake.cancer_stage}` : ""
        }`.trim();
        if (intake.first_name_encrypted) {
          try {
            patientName = decryptStringNullable(intake.first_name_encrypted);
          } catch {
            patientName = null;
          }
        }
      }
    }

    // 병원 정보
    let hospitalName = "제휴 의료기관";
    if (estimate.hospital_id) {
      const { data: hospital } = await supabaseAdmin
        .from("hospitals")
        .select("name")
        .eq("id", estimate.hospital_id)
        .maybeSingle();
      if (hospital?.name) hospitalName = hospital.name;
    }

    const quotationNo = `HEALO-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}-${estimate.id.slice(0, 4).toUpperCase()}`;

    const pdfData = {
      quotationNo,
      issuedAt: new Date().toISOString().slice(0, 10),
      patient: {
        name: patientName || patientEmail,
        nationality: patientNationality || "—",
        passport: "—",
        dob: "—",
        diagnosis: diagnosis || "—",
      },
      hospital: {
        name: hospitalName,
        doctor: "—",
        regNo: "—",
      },
      treatment: {
        procedure: diagnosis
          ? `${diagnosis} 치료 계획`
          : "치료 계획 (Treatment Plan)",
        duration: "—",
        dates: "—",
      },
      costs: estimate.quotation_items || [],
    };

    const { renderToBuffer } = await import("@react-pdf/renderer");
    const MedicalQuotationMod = await import("@/lib/pdf/MedicalQuotation");
    const React = (await import("react")).default;
    const element = React.createElement(MedicalQuotationMod.default, {
      data: pdfData,
      lang: "ko",
    });
    const buffer = await renderToBuffer(element as any);

    const storagePath = `cost-estimates/${estimateId}/quotation_${Date.now()}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadError) {
      console.error("[cost-estimates quotation] upload error:", uploadError);
      return NextResponse.json(
        { ok: false, error: "upload_failed" },
        { status: 500 }
      );
    }

    // DB 업데이트 + 상태 전이
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("cost_estimates")
      .update({
        quotation_no: quotationNo,
        quotation_pdf_url: storagePath,
        quotation_issued_at: new Date().toISOString(),
        quotation_issued_by: userId,
        status: "issued",
      })
      .eq("id", estimateId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: "db_update_failed" },
        { status: 500 }
      );
    }

    await supabaseAdmin.from("cost_estimate_history").insert({
      estimate_id: estimateId,
      from_status: estimate.status,
      to_status: "issued",
      changed_by: userId,
      note: `견적서 PDF 발급: ${quotationNo}`,
    });

    const { data: signedUrlData } = await supabaseAdmin.storage
      .from("documents")
      .createSignedUrl(storagePath, 24 * 60 * 60);

    return NextResponse.json({
      ok: true,
      data: {
        estimate: updated,
        quotation_pdf_url: signedUrlData?.signedUrl || null,
      },
    });
  } catch (error: any) {
    console.error("[cost-estimates quotation] POST exception:", error);
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
  const { id: estimateId } = await params;
  const access = await requireCostEstimateAccess(request, estimateId);
  if (!access.success) return access.response;

  const { data: est } = await supabaseAdmin
    .from("cost_estimates")
    .select("quotation_pdf_url, quotation_issued_at, quotation_no")
    .eq("id", estimateId)
    .single();

  if (!est?.quotation_pdf_url) {
    return NextResponse.json(
      { ok: false, error: "not_issued" },
      { status: 404 }
    );
  }

  const { data: signedUrlData } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUrl(est.quotation_pdf_url, 60 * 60);

  return NextResponse.json({
    ok: true,
    quotation_pdf_url: signedUrlData?.signedUrl || null,
    quotation_issued_at: est.quotation_issued_at,
    quotation_no: est.quotation_no,
  });
}
