/**
 * GET/POST /api/pdf/consent/[form]
 *   form = "personal" | "sensitive" | "cross-border"
 *
 * POST body: { lang, patient: { name, passport, ... } }
 * GET: dev sample
 *
 * Returns: application/pdf
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rateLimit";

const FORM_MAP = {
  personal: "PersonalInfoConsent",
  sensitive: "SensitiveHealthConsent",
  "cross-border": "CrossBorderConsent",
};

async function generate(form, { patient = {}, lang = "ko" }) {
  const componentName = FORM_MAP[form];
  if (!componentName) throw new Error(`unknown_form: ${form}`);

  const { renderToBuffer } = await import("@react-pdf/renderer");
  const mod = await import("@/lib/pdf/ConsentForms");
  const Component = mod[componentName];
  if (!Component) throw new Error(`component_not_found: ${componentName}`);

  const React = (await import("react")).default;
  return await renderToBuffer(React.createElement(Component, { patient, lang }));
}

export async function POST(request, context) {
  try {
    // 과거엔 공개라 누구나 HEALO 브랜드 법적 동의서 PDF 를 임의 내용으로 발급 가능
    // (위조·사회공학). 어드민/내부 시크릿 + rate limit 으로 제한.
    const ip = getClientIp(request);
    const rl = checkRateLimit(ip, RATE_LIMITS.INQUIRY);
    if (!rl.allowed) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }
    const internalSecret = process.env.INTERNAL_API_SECRET;
    const internalOk =
      Boolean(internalSecret) && request.headers.get("x-internal-secret") === internalSecret;
    if (!internalOk) {
      const auth = await requireAdminAuth(request);
      if (!auth.success) return auth.response;
    }

    const { form } = await context.params;
    const body = await request.json();
    const lang = body.lang === "en" ? "en" : "ko";
    const buffer = await generate(form, { patient: body.patient || {}, lang });
    const filename = `HEALO-Consent-${form}-${body.patient?.name || "unsigned"}.pdf`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/pdf/consent] error:", err);
    return NextResponse.json(
      { ok: false, error: "pdf_generation_failed" },
      { status: 500 }
    );
  }
}

export async function GET(request, context) {
  const { form } = await context.params;
  const url = new URL(request.url);
  const lang = url.searchParams.get("lang") === "en" ? "en" : "ko";
  const sample = {
    name: "Aigerim Nurlanova",
    nationality: "Kazakhstan",
    passport: "N12345678",
    dob: "1982-05-14",
  };
  try {
    const buffer = await generate(form, { patient: sample, lang });
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="HEALO-Consent-${form}-sample.pdf"`,
      },
    });
  } catch (err) {
    console.error("[/api/pdf/consent GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "pdf_generation_failed" },
      { status: 500 }
    );
  }
}
