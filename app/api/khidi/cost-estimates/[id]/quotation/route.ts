/**
 * healwith: Cost Estimate — 정식 견적서 PDF 자동 발급
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
import { checkFacilitationFeeCap } from "@/lib/legal/facilitationFeeCap";

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

    // ── 유치수수료 법정 상한 재검증 — **여기가 진짜 관문이다** ──────────────
    // 저장(PATCH)에서 한 번 막지만, 실제로 법적 의미가 생기는 시점은 «환자에게 나가는 견적서
    // PDF 를 발급하고 issued 로 넘기는» 이 순간이다. 저장을 안 거치고 온 옛 항목, 저장 차단을
    // 무시하고 이어진 화면 흐름, 다른 경로로 들어온 값 — 전부 여기서 걸러야 한다.
    // (2026-08-04 독립 리뷰: 이 경로에 검사가 아예 없어서, 저장이 막혀도 발급은 그대로 나갔다.
    //  게다가 발급은 status 를 issued 로 바꿔 «되돌리기 어려운» 상태 전이를 만든다.)
    {
      let grade: unknown = null;
      if (estimate.hospital_id) {
        const { data: h } = await supabaseAdmin
          .from("hospitals")
          .select("medical_institution_grade")
          .eq("id", estimate.hospital_id)
          .maybeSingle();
        grade = h?.medical_institution_grade ?? null;
      }
      const capCheck = checkFacilitationFeeCap(estimate.quotation_items, grade);
      if (!capCheck.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: "facilitation_fee_over_cap",
            detail: {
              reason: capCheck.reason,
              cap: capCheck.cap,
              grade: capCheck.grade,
              grade_known: capCheck.gradeKnown,
              currency: capCheck.currency,
              patient_total_krw: capCheck.patientTotalKrw,
              facilitation_fee_krw: capCheck.facilitationFeeKrw,
              max_allowed_krw: capCheck.maxAllowedKrw,
              patient_total_usd: capCheck.patientTotalUsd,
              facilitation_fee_usd: capCheck.facilitationFeeUsd,
              max_allowed_usd: capCheck.maxAllowedUsd,
            },
          },
          { status: 400 }
        );
      }
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
    let languagePreference: string | null = null;
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
        languagePreference = intake.language_preference || null;
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

    // 발급 언어 — 법정 고지문서를 환자가 읽을 수 있어야 함(2026-07-02 전수 감사: lang "ko" 하드코딩이라
    // 러/카자흐 환자도 한국어 PDF를 받았음). 템플릿은 ko/en 이중표기 — ko 외 언어는 전부 en 폴백.
    // ※ ru/kz 라벨 직접 지원(2단계)은 키릴 글리프 폰트 등록(현재 내장 Helvetica뿐)이 선행돼야 함.
    const pdfLang = (languagePreference || "").toLowerCase().startsWith("ko") ? "ko" : "en";

    // 병원 정보
    let hospitalName = pdfLang === "ko" ? "제휴 의료기관" : "Partner hospital";
    if (estimate.hospital_id) {
      const { data: hospital } = await supabaseAdmin
        .from("hospitals")
        .select("name")
        .eq("id", estimate.hospital_id)
        .maybeSingle();
      if (hospital?.name) hospitalName = hospital.name;
    }

    const quotationNo = `healwith-${new Date()
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
          ? pdfLang === "ko"
            ? `${diagnosis} 치료 계획`
            : `${diagnosis} — Treatment Plan`
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
      lang: pdfLang,
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
