/**
 * HEALO: Referral Summary 생성 유틸
 * normalized_inquiries → 병원 전달용 요약 (JSON + Markdown)
 * 보안: pathAuthorized 검증 후 signed URL 발급
 */

import { supabaseAdmin } from "../rag/supabaseAdmin";
import { pathAuthorized } from "../security/attachmentAuth";

export type ReferralSummaryJson = {
  patient: {
    country: string | null;
    language: string | null;
  };
  complaint: {
    body_part: string[] | null;
    duration: string | null;
    severity: number | null;
    objective: string | null;
  };
  history: {
    diagnosis: { has: boolean; text: string } | null;
    meds: { has: boolean; text: string } | null;
  };
  logistics: {
    preferred_date: string | null;
    flex: boolean;
  };
  attachments: Array<{ path: string; name: string | null; signedUrl: string; expiresAt: string }>;
  quality: {
    extraction_confidence: number | null;
    missing_fields: string[] | null;
  };
};

/**
 * attachment path → signed URL 변환 (5분 유효)
 */
async function getSignedUrl(path: string): Promise<{ signedUrl: string; expiresAt: string } | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from("attachments")
      .createSignedUrl(path, 300);
    if (error || !data) return null;
    return {
      signedUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + 300 * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * inquiries.attachments → signed URL 배열
 * 보안: pathAuthorized 검증 후에만 signed URL 발급
 */
async function buildAttachmentsList(
  attachments: unknown,
  inquiryId: number
): Promise<ReferralSummaryJson["attachments"]> {
  const paths: Array<{ path: string; name: string | null }> = [];
  
  if (Array.isArray(attachments)) {
    for (const item of attachments) {
      if (item && typeof item === "object" && item.path && typeof item.path === "string") {
        paths.push({ path: item.path, name: item.name && typeof item.name === "string" ? item.name : null });
      }
    }
  }

  // ✅ Security: inquiries 레코드 조회하여 pathAuthorized 검증
  const { data: inquiryData, error: inquiryErr } = await supabaseAdmin
    .from("inquiries")
    .select("attachments")
    .eq("id", inquiryId)
    .maybeSingle();

  if (inquiryErr || !inquiryData) {
    console.error("[buildReferralSummary] inquiry fetch failed for path verification:", inquiryErr);
    return [];
  }

  const result: ReferralSummaryJson["attachments"] = [];
  for (const { path, name } of paths) {
    // ✅ Security: pathAuthorized 검증 후에만 signed URL 발급
    const authorized = pathAuthorized(path, inquiryData.attachments ?? []);
    if (!authorized) {
      console.warn("[buildReferralSummary] path not authorized, skipping:", path);
      continue;
    }

    const signed = await getSignedUrl(path);
    if (signed) {
      result.push({ path, name, signedUrl: signed.signedUrl, expiresAt: signed.expiresAt });
    }
  }
  return result;
}

/**
 * Referral Summary JSON 생성
 * @param normalizedInquiryId normalized_inquiries.id
 * @param inquiryId inquiries.id (pathAuthorized 검증용)
 */
export async function buildReferralSummaryJson(
  normalizedInquiryId: string,
  inquiryId: number
): Promise<ReferralSummaryJson | null> {
  const { data: norm, error: normErr } = await supabaseAdmin
    .from("normalized_inquiries")
    .select("id, source_inquiry_id, country, language, constraints, extraction_confidence, missing_fields")
    .eq("id", normalizedInquiryId)
    .maybeSingle();

  if (normErr || !norm) return null;

  // jsonb 컬럼 — TS Json 타입은 인덱싱 불허라 any 로 접근
  const constraints: any = (norm.constraints && typeof norm.constraints === "object" && !Array.isArray(norm.constraints)) ? norm.constraints : {};
  const intake: any = (constraints.intake && typeof constraints.intake === "object" && !Array.isArray(constraints.intake)) ? constraints.intake : {};
  const complaint: any = (intake.complaint && typeof intake.complaint === "object" && !Array.isArray(intake.complaint)) ? intake.complaint : {};
  const history: any = (intake.history && typeof intake.history === "object" && !Array.isArray(intake.history)) ? intake.history : {};
  const logistics: any = (intake.logistics && typeof intake.logistics === "object" && !Array.isArray(intake.logistics)) ? intake.logistics : {};

  // ✅ Security: pathAuthorized 검증 포함하여 attachments 생성
  const { data: inquiry, error: inquiryErr } = await supabaseAdmin
    .from("inquiries")
    .select("attachments")
    .eq("id", inquiryId)
    .maybeSingle();

  if (inquiryErr) return null;

  const attachments = await buildAttachmentsList(
    inquiry?.attachments ?? [],
    inquiryId
  );

  return {
    patient: {
      country: norm.country ?? null,
      language: norm.language ?? null,
    },
    complaint: {
      body_part: Array.isArray(complaint.body_part) ? complaint.body_part : (complaint.body_part ? [complaint.body_part] : null),
      duration: (complaint.duration && typeof complaint.duration === "string") ? complaint.duration : null,
      severity: typeof complaint.severity === "number" ? complaint.severity : null,
      objective: (constraints.objective && typeof constraints.objective === "string") ? constraints.objective : null,
    },
    history: {
      diagnosis: history.diagnosis && typeof history.diagnosis === "object"
        ? { has: !!history.diagnosis.has, text: String(history.diagnosis.text || "") }
        : null,
      meds: history.meds && typeof history.meds === "object"
        ? { has: !!history.meds.has, text: String(history.meds.text || "") }
        : null,
    },
    logistics: {
      preferred_date: (logistics.preferred_date && typeof logistics.preferred_date === "string") ? logistics.preferred_date : null,
      flex: !!logistics.flex,
    },
    attachments,
    quality: {
      extraction_confidence: typeof norm.extraction_confidence === "number" ? norm.extraction_confidence : null,
      missing_fields: Array.isArray(norm.missing_fields) ? norm.missing_fields : null,
    },
  };
}

/**
 * Referral Summary Markdown 생성
 */
export function buildReferralSummaryMarkdown(json: ReferralSummaryJson): string {
  const lines: string[] = [];
  lines.push("# Patient Referral Summary");
  lines.push("");

  lines.push("## Patient Information");
  lines.push(`- **Country**: ${json.patient.country || "N/A"}`);
  lines.push(`- **Language**: ${json.patient.language || "N/A"}`);
  lines.push("");

  lines.push("## Chief Complaint");
  if (json.complaint.body_part?.length) {
    lines.push(`- **Body Part(s)**: ${json.complaint.body_part.join(", ")}`);
  }
  if (json.complaint.duration) {
    lines.push(`- **Duration**: ${json.complaint.duration}`);
  }
  if (json.complaint.severity != null) {
    lines.push(`- **Severity**: ${json.complaint.severity}/10`);
  }
  if (json.complaint.objective) {
    lines.push(`- **Objective**: ${json.complaint.objective}`);
  }
  lines.push("");

  lines.push("## Medical History");
  if (json.history.diagnosis) {
    lines.push(`- **Prior Diagnosis**: ${json.history.diagnosis.has ? "Yes" : "No"}`);
    if (json.history.diagnosis.text) {
      lines.push(`  - Details: ${json.history.diagnosis.text}`);
    }
  }
  if (json.history.meds) {
    lines.push(`- **Current Medications**: ${json.history.meds.has ? "Yes" : "No"}`);
    if (json.history.meds.text) {
      lines.push(`  - Details: ${json.history.meds.text}`);
    }
  }
  lines.push("");

  lines.push("## Logistics");
  if (json.logistics.preferred_date) {
    lines.push(`- **Preferred Date**: ${json.logistics.preferred_date}`);
  }
  if (json.logistics.flex) {
    lines.push(`- **Date Flexible**: Yes`);
  }
  lines.push("");

  if (json.attachments.length > 0) {
    lines.push("## Attachments");
    for (const att of json.attachments) {
      lines.push(`- ${att.name || att.path} (signed URL, expires: ${new Date(att.expiresAt).toLocaleString()})`);
      lines.push(`  - ${att.signedUrl}`);
    }
    lines.push("");
  }

  lines.push("## Data Quality");
  if (json.quality.extraction_confidence != null) {
    lines.push(`- **Extraction Confidence**: ${Math.round(json.quality.extraction_confidence * 100)}%`);
  }
  if (json.quality.missing_fields?.length) {
    lines.push(`- **Missing Fields**: ${json.quality.missing_fields.join(", ")}`);
  }
  lines.push("");

  return lines.join("\n");
}
