/**
 * healwith: 환자 계정 연결(claim) — 에이전시 경유로 접수돼 계정이 없던 환자가
 * 회원가입/로그인만 하면 그 케이스(inquiries)를 본인 계정에 연결해 /patient 포털을
 * 바로 쓰게 한다. 코디·에이전시가 공유하는 공개 토큰 링크(inquiries.public_token)로 식별.
 *
 * GET  /api/inquiries/claim?token=...  → 미리보기(계정 없이). 이름 마스킹만, PII 노출 최소화.
 * POST /api/inquiries/claim            → 로그인 사용자 본인 계정에 연결. body: { token }
 *
 * 보안:
 * - inquiries 는 RLS상 service_role 전용 → 항상 서버 경유(supabaseAdmin).
 * - 직원(admin/coordinator)·에이전시·병원 계정은 claim 불가 — 그 계정이 환자 케이스를
 *   "가져가 버리는" 구멍 차단(구현 중 실클릭 검증으로 재현·발견해 막음).
 * - 환자용 응답은 항상 명시적 필드 화이트리스트만(inquiries에 정산 등 민감 컬럼이 늘어도
 *   자동으로 새 나가지 않게).
 * - 공개 GET은 rate limit. 에러는 internal_error 형만(원인 문자열 미노출).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { checkAgencyAuth } from "@/lib/auth/checkAgencyAuth";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { decryptAuto } from "@/lib/security/encryptionV2";

const VIEW_RATE = { windowMs: 60 * 1000, maxRequests: 30, apiName: "inquiry_claim_view" };
const CLAIM_RATE = { windowMs: 60 * 1000, maxRequests: 10, apiName: "inquiry_claim" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function maskFirstName(name: string | null | undefined): string {
  const s = (name || "").trim();
  if (!s) return "";
  if (s.length <= 1) return s;
  return s[0] + "*".repeat(Math.min(s.length - 1, 6));
}

async function resolveInquiry(token: string) {
  const { data } = await (supabaseAdmin as any)
    .from("inquiries")
    .select("id, first_name, cancer_type, user_id, agency_id, agencies(name)")
    .eq("public_token", token)
    .maybeSingle();
  return data;
}

/** 직원·에이전시·병원 계정은 환자 케이스를 claim 할 수 없다(순수 환자 계정만 허용). */
async function isNonPatientAccount(request: NextRequest, userId: string): Promise<boolean> {
  const agency = await checkAgencyAuth(request);
  if (agency.isAgencyUser) return true;
  const { data: hospitalUser } = await (supabaseAdmin as any)
    .from("hospital_users")
    .select("hospital_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return !!hospitalUser;
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, VIEW_RATE);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    const token = new URL(request.url).searchParams.get("token") || "";
    if (!UUID_RE.test(token)) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }
    const inq = await resolveInquiry(token);
    if (!inq) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }
    if (inq.user_id) {
      return Response.json({ ok: true, alreadyClaimed: true });
    }

    let firstName = "";
    try {
      firstName = inq.first_name ? (await decryptAuto(inq.first_name)) || "" : "";
    } catch {
      /* fail-safe — 마스킹만 실패, 링크 자체는 유효 */
    }

    return Response.json({
      ok: true,
      alreadyClaimed: false,
      preview: {
        firstNameMasked: maskFirstName(firstName),
        cancerType: inq.cancer_type || null,
        agencyName: (inq as any).agencies?.name || null,
      },
    });
  } catch (err: any) {
    console.error("[inquiries/claim] GET error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, CLAIM_RATE);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  try {
    if (auth.isStaff || (await isNonPatientAccount(request, auth.userId))) {
      return Response.json({ ok: false, error: "staff_cannot_claim" }, { status: 403 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      /* empty body */
    }
    const token = typeof body?.token === "string" ? body.token : "";
    if (!UUID_RE.test(token)) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 400 });
    }

    const inq = await resolveInquiry(token);
    if (!inq) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }
    if (inq.user_id) {
      if (inq.user_id === auth.userId) {
        return Response.json({ ok: true, claimed: true, alreadyOwned: true });
      }
      return Response.json({ ok: false, error: "already_claimed" }, { status: 409 });
    }

    // .is("user_id", null) 로 동시요청 경쟁 방지 — 그 사이 다른 계정이 먼저 연결했으면 미갱신.
    const { data: updated, error } = await (supabaseAdmin as any)
      .from("inquiries")
      .update({ user_id: auth.userId })
      .eq("id", inq.id)
      .is("user_id", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[inquiries/claim] update error:", error.message);
      return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
    if (!updated) {
      return Response.json({ ok: false, error: "already_claimed" }, { status: 409 });
    }

    return Response.json({ ok: true, claimed: true });
  } catch (err: any) {
    console.error("[inquiries/claim] POST error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
