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
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rateLimit";
import { safeEqual } from "@/lib/security/safeEqual";
import { contentDisposition } from "@/lib/documents/sharedDocMeta";

export async function POST(request) {
  try {
    // 과거엔 공개라 누구나 healwith 브랜드 의료 견적서 PDF 를 임의 내용으로 발급 가능
    // (위조·브랜드 남용) + 비용 큰 렌더링. 어드민/내부 시크릿 + rate limit 으로 제한.
    const ip = getClientIp(request);
    const rl = checkRateLimit(ip, RATE_LIMITS.INQUIRY);
    if (!rl.allowed) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }
    // `===` 단순비교는 타이밍 사이드채널(CISO-5) → 공용 safeEqual 로 상수시간 비교
    // (env 미설정·헤더 누락이면 safeEqual 이 false — Boolean() 선검사 불필요).
    const internalOk = safeEqual(
      request.headers.get("x-internal-secret"),
      process.env.INTERNAL_API_SECRET
    );
    if (!internalOk) {
      const auth = await requireAdminAuth(request);
      if (!auth.success) return auth.response;
    }

    const body = await request.json();
    const lang = body.lang === "en" ? "en" : "ko";

    const { renderToBuffer } = await import("@react-pdf/renderer");
    const MedicalQuotationMod = await import("@/lib/pdf/MedicalQuotation");
    const MedicalQuotation = MedicalQuotationMod.default;

    const React = (await import("react")).default;
    const element = React.createElement(MedicalQuotation, { data: body, lang });
    const buffer = await renderToBuffer(element);

    const filename = `healwith-Quotation-${body?.quotationNo || new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(filename),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/pdf/quotation] error:", err);
    return NextResponse.json(
      { ok: false, error: "pdf_generation_failed" },
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
    quotationNo: "healwith-SAMPLE-001",
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
      { label: "healwith facilitator fee", note: "Disclosed per Art. 8(2)", krw: 3000000, usd: 2170, payer: "hospital" },
      { label: "Medical interpreter (KO ↔ RU)", note: "All sessions", krw: 1500000, usd: 1080 },
    ],
  };

  const { renderToBuffer } = await import("@react-pdf/renderer");
  const MedicalQuotationMod = await import("@/lib/pdf/MedicalQuotation");
  const React = (await import("react")).default;
  const buffer = await renderToBuffer(
    React.createElement(MedicalQuotationMod.default, { data: sampleData, lang })
  );
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition("healwith-Quotation-sample.pdf", "inline"),
    },
  });
}
