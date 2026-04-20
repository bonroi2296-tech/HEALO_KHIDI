/**
 * POST /api/pdf/quotation
 *
 * Body:
 *   {
 *     lang: "ko" | "en",
 *     quotationNo?: string,
 *     patient: { name, nationality, passport, dob, diagnosis },
 *     hospital: { name, doctor, regNo },
 *     treatment: { procedure, duration, dates },
 *     costs: [{ label, note, krw, usd }]
 *   }
 *
 * Returns: application/pdf
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const lang = body.lang === "en" ? "en" : "ko";

    const { renderToBuffer } = await import("@react-pdf/renderer");
    const MedicalQuotationMod = await import("../../../../src/lib/pdf/MedicalQuotation");
    const MedicalQuotation = MedicalQuotationMod.default;

    const React = (await import("react")).default;
    const element = React.createElement(MedicalQuotation, { data: body, lang });
    const buffer = await renderToBuffer(element);

    const filename = `HEALO-Quotation-${body?.quotationNo || new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/pdf/quotation] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "pdf_generation_failed" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  // Dev-only preview: GET returns a sample PDF
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ ok: false, error: "POST only" }, { status: 405 });
  }
  const url = new URL(request.url);
  const lang = url.searchParams.get("lang") === "en" ? "en" : "ko";
  const sampleData = {
    quotationNo: "HEALO-SAMPLE-001",
    patient: {
      name: "Aigerim Nurlanova",
      nationality: "Kazakhstan",
      passport: "N12345678",
      dob: "1982-05-14",
      diagnosis: "Breast cancer, Stage II",
    },
    hospital: {
      name: "신촌세브란스병원 / Sinchon Severance Hospital",
      doctor: "Dr. Kim Hyun-soo",
      regNo: "MOHW-2010-001",
    },
    treatment: {
      procedure: "Breast-conserving surgery + adjuvant chemotherapy (4 cycles)",
      duration: "About 12 weeks",
      dates: "2026-05-10 ~ 2026-08-05",
    },
    costs: [
      { label: "Pre-treatment evaluation", note: "CT, MRI, PET", krw: 2500000, usd: 1800 },
      { label: "Surgery (BCS)", note: "Hospital fee", krw: 12000000, usd: 8700 },
      { label: "Chemotherapy (4 cycles)", note: "Drugs + infusion", krw: 18000000, usd: 13000 },
      { label: "Hospital accommodation (7 days)", note: "", krw: 1400000, usd: 1000 },
      { label: "HEALO facilitator fee", note: "Disclosed per §15", krw: 3000000, usd: 2170 },
      { label: "Medical interpreter (KO ↔ RU)", note: "All sessions", krw: 1500000, usd: 1080 },
    ],
  };

  const { renderToBuffer } = await import("@react-pdf/renderer");
  const MedicalQuotationMod = await import("../../../../src/lib/pdf/MedicalQuotation");
  const React = (await import("react")).default;
  const buffer = await renderToBuffer(
    React.createElement(MedicalQuotationMod.default, { data: sampleData, lang })
  );
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="HEALO-Quotation-sample.pdf"`,
    },
  });
}
