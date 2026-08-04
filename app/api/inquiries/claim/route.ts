/**
 * healwith: 공개 케이스 링크(inquiries.public_token) — 한 주소가 두 가지를 한다.
 *
 * ① 진행상황 보기(가입·로그인 없이). 왓츠앱·메일·에이전시 경유처럼 **계정 없이 접수된** 문의가
 *    표준 동선이라, 「진행상황을 보려면 먼저 가입하세요」를 입구에 두지 않는다.
 * ② 계정 연결(claim). 그 사람이 가입하면 케이스를 본인 계정에 붙여 /patient 포털을 바로 쓰게 한다.
 *
 * GET  /api/inquiries/claim?token=...  → 진행상황 + 마스킹 미리보기(계정 없이)
 * POST /api/inquiries/claim            → 로그인 사용자 본인 계정에 연결. body: { token }
 *
 * 보안:
 * - inquiries 는 RLS상 service_role 전용 → 항상 서버 경유(supabaseAdmin).
 * - 직원(admin/coordinator)·에이전시·병원 계정은 claim 불가 — 그 계정이 환자 케이스를
 *   "가져가 버리는" 구멍 차단(구현 중 실클릭 검증으로 재현·발견해 막음).
 *   단 **진행상황 조회까지 막지는 않는다** — 에이전시가 자기가 접수한 건을 열면 막힘 화면만
 *   뜨고 아무것도 못 보던 문제(2026-08-03 PO 지적).
 * - 환자용 응답은 항상 명시적 필드 화이트리스트만(inquiries에 정산 등 민감 컬럼이 늘어도
 *   자동으로 새 나가지 않게). 이 주소는 메신저로 전달될 수 있으므로 연락처·생년월일·
 *   서류·견적·소견은 **의도적으로 안 내린다**.
 * - 공개 GET은 rate limit. 에러는 internal_error 형만(원인 문자열 미노출).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { checkAgencyAuth } from "@/lib/auth/checkAgencyAuth";
import { checkHospitalAuth } from "@/lib/auth/checkHospitalAuth";
import { resolveTier } from "@/lib/auth/accountTiers";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { decryptAuto } from "@/lib/security/encryptionV2";
import { CASE_STATUS_STEPS, caseStatusLabelL, caseStatusOrder } from "@/lib/khidi/caseStatus";
import { nextStepGuide } from "@/lib/khidi/nextStepGuide";

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
    .select(
      "id, first_name, cancer_type, user_id, agency_id, created_at, nationality, " +
        "case_status, case_status_note, case_status_updated_at, preferred_language, agencies(name)"
    )
    .eq("public_token", token)
    .maybeSingle();
  return data;
}

/**
 * 진행상황 묶음 — 단계·이력·다음 안내. 이 주소는 전달될 수 있으므로 여기서 내리는 값은
 * 「단계와 날짜」까지다. 이력의 note 는 코디가 환자·에이전시에게 보이라고 쓴 공개용 메모라 포함.
 * 조립 방식은 app/api/agency/inquiries/route.ts 의 historyMap 과 같다(같은 표를 1건만 읽음).
 */
async function buildProgress(inq: any, lang: string) {
  const { data: hist } = await (supabaseAdmin as any)
    .from("case_status_history")
    .select("status, note, created_at")
    .eq("inquiry_id", inq.id)
    .order("created_at", { ascending: true });

  return {
    caseStatus: inq.case_status || null,
    caseStatusLabel: caseStatusLabelL(inq.case_status, lang),
    caseStatusNote: inq.case_status_note || null,
    caseStatusUpdatedAt: inq.case_status_updated_at || null,
    nextStep: nextStepGuide(inq.case_status, lang),
    // 진행바를 그리려면 화면이 단계 목록·순서를 알아야 한다. on_hold(order 99)는 막대에서 제외 —
    // 보류는 앞뒤로 움직이는 단계가 아니라 옆에 붙는 상태다(caseStatus.ts 주석과 같은 취급).
    steps: CASE_STATUS_STEPS.filter((s) => s.key !== "on_hold").map((s) => ({
      key: s.key,
      label: caseStatusLabelL(s.key, lang),
      order: s.order,
    })),
    // 보류(on_hold)는 order 99 라 그대로 쓰면 막대가 전부 채워진 것처럼 보인다. 보류는 단계를
    // 전진/후퇴시키는 값이 아니므로 **보류 직전에 있던 단계**에 막대를 세운다(이력에서 역순으로 찾음).
    currentOrder:
      inq.case_status === "on_hold"
        ? caseStatusOrder(
            [...(hist || [])].reverse().find((h: any) => h.status !== "on_hold")?.status
          )
        : caseStatusOrder(inq.case_status),
    timeline: (hist || []).map((h: any) => ({
      status: h.status,
      label: caseStatusLabelL(h.status, lang),
      note: h.note || null,
      at: h.created_at,
    })),
  };
}

/**
 * 직원·에이전시·병원 계정은 환자 케이스를 claim 할 수 없다(순수 환자 계정만 허용).
 * "누가 어떤 계층인가" 판정은 src/lib/auth/accountTiers.ts 의 resolveTier() 가 단일 SoR —
 * 여기서 역할 목록을 따로 하드코딩하지 않는다(그 파일 헤더 주석의 명시적 요구사항).
 */
async function isNonPatientAccount(
  request: NextRequest,
  auth: { isAdmin: boolean; appRole?: string }
): Promise<boolean> {
  const [agency, hospital] = await Promise.all([checkAgencyAuth(request), checkHospitalAuth(request)]);
  const tier = resolveTier({
    isAdmin: auth.isAdmin,
    appRole: auth.appRole,
    isHospitalUser: hospital.isHospitalUser,
    isAgencyUser: agency.isAgencyUser,
    partnerType: agency.partnerType,
  });
  return tier !== "patient";
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, VIEW_RATE);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") || "";
    if (!UUID_RE.test(token)) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }
    const inq = await resolveInquiry(token);
    if (!inq) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }

    // 화면이 보고 있는 언어 우선, 없으면 접수 때 고른 환자 언어, 그래도 없으면 영어.
    const lang = url.searchParams.get("lang") || inq.preferred_language || "en";

    let firstName = "";
    try {
      firstName = inq.first_name ? (await decryptAuto(inq.first_name)) || "" : "";
    } catch {
      /* fail-safe — 마스킹만 실패, 링크 자체는 유효 */
    }

    // alreadyClaimed 여도 진행상황은 같이 내린다. 예전엔 그 한 줄만 내리고 끝나서
    // 이미 계정에 붙은 케이스는 이 화면이 백지였다(2026-08-03).
    return Response.json({
      ok: true,
      alreadyClaimed: Boolean(inq.user_id),
      preview: {
        firstNameMasked: maskFirstName(firstName),
        cancerType: inq.cancer_type || null,
        nationality: inq.nationality || null,
        agencyName: (inq as any).agencies?.name || null,
        createdAt: inq.created_at || null,
      },
      progress: await buildProgress(inq, lang),
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
    if (auth.isStaff || (await isNonPatientAccount(request, { isAdmin: auth.isAdmin, appRole: auth.appRole }))) {
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
