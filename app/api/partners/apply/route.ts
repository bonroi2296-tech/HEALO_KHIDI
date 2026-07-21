/**
 * healwith: /partners 공개 제휴 신청 접수 (벤치마크 §5-⑤, 2026-07-07)
 *
 * 공개 POST — 인바운드 파트너 리드를 partner_outreach(코디·어드민 추적기)에 적재.
 * 보안: checkRateLimit(공개 POST 규칙) + 입력 검증 + service_role 경유(RLS service_role 전용 테이블).
 * 응답은 코드형만(error.message 노출 금지).
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimit } from "@/lib/rateLimit";

const db: any = supabaseAdmin; // partner_outreach 는 자동생성 타입 목록에 없음(기존 outreach 라우트와 동일 패턴)

// 폼 유형 → partner_outreach.org_type 매핑 (테이블 enum엔 insurance 가 없어 other 로 수용, 원문은 notes 에 보존)
const FORM_TYPES: Record<string, string> = {
  agency: "agency",
  insurance: "other",
  clinic: "clinic",
  other: "other",
};
const VOLUMES = new Set(["lt5", "5to20", "gt20"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;
  const rl = checkRateLimit(ip, { windowMs: 10 * 60 * 1000, maxRequests: 5, apiName: "partners_apply" });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: "rate_limit_exceeded" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const orgName = String(body.orgName || "").trim().slice(0, 200);
    const country = String(body.country || "").trim().slice(0, 100);
    const email = String(body.email || "").trim().slice(0, 200);
    const rawType = String(body.orgType || "other");
    const volume = String(body.volume || "");
    const contactPerson = String(body.contactPerson || "").trim().slice(0, 100);
    const phone = String(body.phone || "").trim().slice(0, 100);
    const specialty = String(body.specialty || "").trim().slice(0, 200);
    const message = String(body.message || "").trim().slice(0, 2000);

    if (!orgName || !country || !EMAIL_RE.test(email) || !(rawType in FORM_TYPES)) {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }

    const noteLines = [
      "[공개 /partners 랜딩 접수]",
      `유형(원문): ${rawType}`,
      volume && VOLUMES.has(volume) ? `월 상담·송출 규모: ${volume}` : null,
      specialty ? `주력 진료과: ${specialty}` : null,
      message ? `메시지: ${message}` : null,
    ].filter(Boolean);

    const { error } = await db.from("partner_outreach").insert({
      org_name: orgName,
      org_type: FORM_TYPES[rawType],
      contact_person: contactPerson || null,
      contact_email: email,
      contact_phone: phone || null,
      country,
      status: "replied", // 인바운드 = 상대가 먼저 응답해 온 상태 (추적기 워크플로 기준)
      first_contact_at: new Date().toISOString(),
      last_contact_at: new Date().toISOString(),
      notes: noteLines.join("\n"),
      source: "partners_landing",
    });

    if (error) {
      // UNIQUE(org_name, country) — 이미 추적 중인 기관의 재신청은 성공으로 응답(중복 여부 노출 최소화 + 사용자 혼란 방지)
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      throw error;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[partners/apply] POST error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
