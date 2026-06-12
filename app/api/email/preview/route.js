/**
 * GET /api/email/preview?template=<name>
 *
 * 개발/QA용 이메일 렌더링 미리보기. HTML로 반환.
 * Production 에서는 샘플 데이터로만 렌더 (실제 발송 아님).
 *
 * 사용 예:
 *   /api/email/preview?template=inquiryReceived
 *   /api/email/preview?template=coordinatorIntro&name=Aigerim
 *   /api/email/preview?template=hospitalMatch
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const SAMPLES = {
  inquiryReceived: { name: "Aigerim Nurlanova", inquiryId: "HEALO-2026-0420-001" },
  coordinatorIntro: {
    patientName: "Aigerim Nurlanova",
    coordinatorName: "Ji-hyun Park",
    coordinatorLang: "Korean, Russian, English",
    calendarLink: "https://cal.com/healo/intro-30min",
  },
  hospitalMatch: {
    patientName: "Aigerim Nurlanova",
    quotationLink: "https://healo-khidi.vercel.app/api/pdf/quotation",
    proposals: [
      {
        name: "신촌세브란스병원 / Sinchon Severance Hospital",
        specialty: "Comprehensive oncology",
        description:
          "Highly experienced multidisciplinary breast cancer team. Known for conservative surgery approaches.",
        duration: "About 12 weeks",
        estimate: "≈ USD 28,000",
      },
      {
        name: "삼성서울병원 / Samsung Medical Center",
        specialty: "Precision oncology",
        description:
          "Genomic-based precision treatment planning. Strong international patient program.",
        duration: "About 14 weeks",
        estimate: "≈ USD 34,000",
      },
    ],
  },
  visaDocumentRequest: {
    patientName: "Aigerim Nurlanova",
    visaType: "C-3-3",
    uploadLink: "https://healo-khidi.vercel.app/patient/documents",
  },
  treatmentSchedule: {
    patientName: "Aigerim Nurlanova",
    hospitalName: "Sinchon Severance Hospital",
    coordinatorName: "Ji-hyun Park",
    itinerary: [
      { date: "2026-05-10", time: "08:30", event: "Airport pickup", location: "ICN Terminal 2", note: "HEALO driver will meet you at Gate 12." },
      { date: "2026-05-10", time: "14:00", event: "Hotel check-in", location: "Grand Hyatt Seoul (Yongsan)" },
      { date: "2026-05-11", time: "09:30", event: "Initial consultation", location: "Severance Cancer Center 8F", note: "With Dr. Kim Hyun-soo" },
      { date: "2026-05-15", time: "07:00", event: "Surgery admission", location: "Severance main building" },
    ],
  },
  postTreatmentFollowup: {
    patientName: "Aigerim Nurlanova",
    daysSinceDischarge: 30,
    feedbackLink: "https://healo-khidi.vercel.app/patient/symptoms",
  },
};

const TEMPLATE_NAMES = [
  "inquiryReceived",
  "coordinatorIntro",
  "hospitalMatch",
  "visaDocumentRequest",
  "treatmentSchedule",
  "postTreatmentFollowup",
];

export async function GET(request) {
  const url = new URL(request.url);
  const templateName = url.searchParams.get("template");

  if (!templateName) {
    // Index page listing all templates
    const html = `<!DOCTYPE html>
<html><head><title>HEALO Email Preview</title><meta charset="utf-8">
<style>body{font-family:system-ui;padding:40px;max-width:600px;margin:0 auto;background:#f5f0e8;color:#0a0a0a}
h1{font-family:Georgia,serif;font-size:32px;font-weight:400;margin:0 0 8px}
.gold{color:#b89550;font-style:italic}
.eyebrow{text-transform:uppercase;letter-spacing:2.4px;font-size:10px;color:#b89550;margin:0 0 12px}
a{display:block;padding:16px 0;border-bottom:1px solid #e3dbcc;color:#0a0a0a;text-decoration:none;font-size:16px}
a:hover{color:#b89550}
.note{margin-top:32px;padding:16px;background:#fbf8f2;border-left:2px solid #c8a96a;font-size:13px;color:#6b6458}
</style></head><body>
<p class="eyebrow">HEALO · Email Preview</p>
<h1>6 transactional <span class="gold">templates.</span></h1>
<p>Click to preview each template with sample data.</p>
<div style="margin-top:32px">
${TEMPLATE_NAMES.map(
  (n) => `<a href="?template=${n}">${n} <span style="color:#9a9284;font-size:12px">→</span></a>`
).join("")}
</div>
<div class="note">
<strong>Production usage:</strong> Import from <code>src/emails/templates</code> and render with
<code>@react-email/render</code>. Wire a provider like Resend, Postmark, or SendGrid in
<code>/api/email/send</code> (not yet implemented — see docs).
</div>
</body></html>`;
    return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
  }

  if (!TEMPLATE_NAMES.includes(templateName)) {
    return NextResponse.json({ ok: false, error: "unknown_template", available: TEMPLATE_NAMES }, { status: 400 });
  }

  try {
    const { render } = await import("@react-email/render");
    const templatesMod = await import("@/emails/templates");

    const componentMap = {
      inquiryReceived: templatesMod.InquiryReceived,
      coordinatorIntro: templatesMod.CoordinatorIntro,
      hospitalMatch: templatesMod.HospitalMatch,
      visaDocumentRequest: templatesMod.VisaDocumentRequest,
      treatmentSchedule: templatesMod.TreatmentSchedule,
      postTreatmentFollowup: templatesMod.PostTreatmentFollowup,
    };

    const Component = componentMap[templateName];
    const sample = SAMPLES[templateName] || {};

    // Allow URL param override, e.g. ?name=John
    const props = { ...sample };
    url.searchParams.forEach((v, k) => {
      if (k !== "template") props[k] = v;
    });

    const React = (await import("react")).default;
    const html = await render(React.createElement(Component, props));

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("[/api/email/preview] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "render_failed" },
      { status: 500 }
    );
  }
}
