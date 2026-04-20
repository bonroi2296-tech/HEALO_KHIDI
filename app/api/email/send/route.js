/**
 * POST /api/email/send
 *
 * Body: { to, template, data, lang? }
 *
 * 지원 template:
 *   - inquiryReceived, coordinatorIntro, hospitalMatch,
 *     visaDocumentRequest, treatmentSchedule, postTreatmentFollowup
 *
 * 환경변수:
 *   RESEND_API_KEY=re_xxx           ← Resend 가입 후 발급 (https://resend.com)
 *   HEALO_EMAIL_FROM=HEALO <roiimmunelab@immunelab.co.kr>  ← 발신자
 *
 * Resend 미설정 시 렌더링만 하고 저장. (dry run)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const TEMPLATE_MAP = {
  inquiryReceived: "InquiryReceived",
  coordinatorIntro: "CoordinatorIntro",
  hospitalMatch: "HospitalMatch",
  visaDocumentRequest: "VisaDocumentRequest",
  treatmentSchedule: "TreatmentSchedule",
  postTreatmentFollowup: "PostTreatmentFollowup",
};

export async function POST(request) {
  try {
    const body = await request.json();
    // `lang` 필드는 미래 확장 (번역된 메일 발송) 용으로 body 에서 받지만 현재 사용 X
    const { to, template, data = {}, lang: _lang = "en", subject: customSubject } = body;

    if (!to || !template) {
      return NextResponse.json({ ok: false, error: "missing_to_or_template" }, { status: 400 });
    }

    const componentName = TEMPLATE_MAP[template];
    if (!componentName) {
      return NextResponse.json(
        { ok: false, error: "unknown_template", available: Object.keys(TEMPLATE_MAP) },
        { status: 400 }
      );
    }

    // Render HTML
    const { render } = await import("@react-email/render");
    const templatesMod = await import("../../../../src/emails/templates");
    const Component = templatesMod[componentName];
    const React = (await import("react")).default;
    const html = await render(React.createElement(Component, data));

    // Default subjects per template
    const DEFAULT_SUBJECTS = {
      inquiryReceived: "[HEALO] Your inquiry has been received",
      coordinatorIntro: "[HEALO] Hello from your HEALO coordinator",
      hospitalMatch: "[HEALO] Hospital matches for your care",
      visaDocumentRequest: "[HEALO] Documents needed for your medical visa",
      treatmentSchedule: "[HEALO] Your treatment schedule is confirmed",
      postTreatmentFollowup: "[HEALO] Checking in on your recovery",
    };
    const subject = customSubject || DEFAULT_SUBJECTS[template];

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.HEALO_EMAIL_FROM || "HEALO <onboarding@resend.dev>";

    // Dry run mode (no API key)
    if (!apiKey) {
      console.log("[email/send] dry-run (no RESEND_API_KEY):", { to, template, subject });
      return NextResponse.json({
        ok: true,
        dryRun: true,
        message: "Email rendered but not sent — set RESEND_API_KEY to enable delivery.",
        preview: { to, from, subject, htmlLength: html.length },
      });
    }

    // Send via Resend
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      reply_to: "roiimmunelab@immunelab.co.kr",
    });

    if (result.error) {
      console.error("[email/send] Resend error:", result.error);
      return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: result.data?.id, to, template, subject });
  } catch (err) {
    console.error("[/api/email/send] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "send_failed" }, { status: 500 });
  }
}

// Allow GET for health check
export async function GET() {
  const hasKey = Boolean(process.env.RESEND_API_KEY);
  return NextResponse.json({
    ok: true,
    configured: hasKey,
    from: process.env.HEALO_EMAIL_FROM || "(not set)",
    message: hasKey
      ? "Email sending is configured."
      : "Set RESEND_API_KEY in Vercel environment variables to enable email sending. Get a key at https://resend.com",
    templates: Object.keys(TEMPLATE_MAP),
  });
}
