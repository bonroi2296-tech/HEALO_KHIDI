/**
 * healwith: 세컨드 오피니언 — 계정 없는 의사용 공개 토큰 API
 *
 * GET  /api/opinions/[token]  → 토큰이 유효하면 케이스 임상요약(검사지 포함) 반환. 의사가 소견 작성 전 열람.
 * POST /api/opinions/[token]  → 소견 제출. 명단에서 고른 본인(또는 '그 외 의료진') + 소견 텍스트.
 *
 * 보안:
 * - 계정 불필요, 오직 추측 불가 토큰으로만 접근(화상상담 게스트링크와 동형). 만료·폐기 검사.
 * - 환자 PII 중 연락처는 미노출(코디 중개). 이름·임상은 국내병원 파트너 열람과 동일 수준(3자제공 동의 근거).
 * - 공개 엔드포인트 → rate limit. 실패 코드는 internal_error 형만(원인 문자열 미노출).
 * - ⚠️ case_status_history 에 쓰지 않는다 — 그 타임라인은 에이전시도 보므로(소견은 코디·어드민만).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptInquiryForAdmin } from "@/lib/security/decryptForAdmin";
import { decryptStringNullable } from "@/lib/security/encryptionV2";
import {
  checkRateLimit,
  checkRateLimitPersistent,
  getClientIp,
  getRateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rateLimit";
import { rosterName, isValidOpinionDoctorKey } from "@/lib/opinions/roster";
import { notifyStaffOpinionArrived } from "@/lib/notifications/inApp";
import { logAdminAction, getIpFromRequest, getUserAgentFromRequest } from "@/lib/audit/adminAuditLog";

// 코디가 문의상세에서 이미 만들어둔 AI 케이스 브리프(한국어 요약)를 그대로 재사용.
// 원문(러시아어 등)·미기재 필드보다 훨씬 낫다 — 새로 만들지 않고 캐시만 복호화해서 보여준다.
function decodeCachedBrief(encBrief: unknown): { overview: string; request: string; points: string[]; red_flags: string[] } | null {
  if (typeof encBrief !== "string" || !encBrief) return null;
  try {
    const dec = decryptStringNullable(encBrief);
    if (!dec) return null;
    const parsed = JSON.parse(dec);
    if (!parsed?.overview) return null;
    return {
      overview: String(parsed.overview || ""),
      request: String(parsed.request || ""),
      points: Array.isArray(parsed.points) ? parsed.points.map((s: any) => String(s)) : [],
      red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags.map((s: any) => String(s)) : [],
    };
  } catch {
    return null;
  }
}

const VIEW_RATE = { windowMs: 60 * 1000, maxRequests: 30, apiName: "opinion_view" };

// 의사가 임상 판단에 쓸 안전 필드만(신·구 키). PII 키 제외. (파트너 리드 열람과 동일 화이트리스트.)
const DETAIL_LABELS: Record<string, string> = {
  sex: "성별", age: "나이", birthYear: "출생연도", birth_year: "출생연도",
  stage: "병기", diagnosis_date: "진단일", diagnosisDate: "진단일",
  diagnosed_hospital: "진단 병원", diagnosedHospital: "진단 병원",
  treatment_state: "현재 치료상태", treatmentState: "현재 치료상태",
  prior_treatment: "기존 치료", priorTreatment: "기존 치료",
};
function pickDetail(intake: any): { label: string; value: string }[] {
  const o = intake && typeof intake === "object" && !Array.isArray(intake) ? intake : {};
  const out: { label: string; value: string }[] = [];
  const seen = new Set<string>();
  for (const [k, label] of Object.entries(DETAIL_LABELS)) {
    const v = o[k];
    if (v == null || String(v).trim() === "") continue;
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({ label, value: String(v) });
  }
  return out;
}
function patientName(first?: string | null, last?: string | null): string {
  const n = `${(first || "").trim()} ${(last || "").trim()}`.trim();
  return n || "익명 환자";
}
async function signAttachments(atts: any): Promise<{ name: string; url: string | null }[]> {
  if (!Array.isArray(atts) || atts.length === 0) return [];
  return Promise.all(
    atts.slice(0, 20).map(async (a: any) => {
      let url: string | null = null;
      if (a?.path) {
        const { data } = await supabaseAdmin.storage.from("attachments").createSignedUrl(a.path, 3600);
        url = data?.signedUrl || null;
      }
      return { name: a?.name || "첨부파일", url };
    })
  );
}

/** 토큰 → 유효한 요청 행(미폐기·미만료). 없으면 null. */
async function resolveRequest(token: string) {
  const { data } = await (supabaseAdmin as any)
    .from("opinion_requests")
    .select("id, inquiry_id, note, revoked, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data || data.revoked) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return data;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, VIEW_RATE);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    const { token } = await context.params;
    if (!token || !/^[0-9a-f]{32,64}$/i.test(token)) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }
    const req = await resolveRequest(token);
    if (!req) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }

    const { data: inqRaw } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("id, first_name, last_name, nationality, spoken_language, preferred_date, preferred_date_flex, cancer_type, treatment_type, message, intake, attachments, coordinator_brief")
      .eq("id", req.inquiry_id)
      .maybeSingle();
    if (!inqRaw) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }
    const inq = await decryptInquiryForAdmin(inqRaw).catch(() => inqRaw);

    // 감사로그: 소견 링크로 케이스 PII(이름·임상·첨부)를 열람. 계정 없어 링크 지문으로 식별. 실패해도 진행.
    void logAdminAction({
      adminEmail: `opinion_link:${token.slice(0, 8)}`,
      adminUserId: null,
      // 외부 전문의가 소견 링크로 케이스를 열람 — 파트너 열람과 동종(감사 액션 재사용).
      action: "PARTNER_VIEW_CASES",
      inquiryIds: [Number(req.inquiry_id)],
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: { via: "opinion_link", request_id: req.id },
    });

    return Response.json({
      ok: true,
      requestNote: req.note || null,
      case: {
        id: inq.id,
        patient: patientName(inq.first_name, inq.last_name),
        nationality: inq.nationality || null,
        language: inq.spoken_language || null,
        cancer_type: inq.cancer_type || null,
        treatment_type: inq.treatment_type && inq.treatment_type !== inq.cancer_type ? inq.treatment_type : null,
        preferred_date: inq.preferred_date || null,
        preferred_date_flex: !!inq.preferred_date_flex,
        message: typeof inq.message === "string" ? inq.message : null,
        clinical: pickDetail(inq.intake),
        attachments: await signAttachments(inqRaw.attachments),
        // 코디가 만들어둔 AI 케이스 브리프(한국어 요약) — 없으면 null(코디가 아직 안 만든 케이스).
        brief: decodeCachedBrief(inqRaw.coordinator_brief),
      },
    });
  } catch (e: any) {
    console.error("[opinions/:token] GET error:", e?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(request);
  const rl = await checkRateLimitPersistent(ip, RATE_LIMITS.INQUIRY);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    const { token } = await context.params;
    if (!token || !/^[0-9a-f]{32,64}$/i.test(token)) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }
    const req = await resolveRequest(token);
    if (!req) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const doctorKey = body?.doctorKey;
    const opinionText = typeof body?.opinionText === "string" ? body.opinionText.trim() : "";

    if (!isValidOpinionDoctorKey(doctorKey)) {
      return Response.json({ ok: false, error: "invalid_doctor" }, { status: 400 });
    }
    if (opinionText.length < 5) {
      return Response.json({ ok: false, error: "opinion_too_short" }, { status: 400 });
    }

    const doctorName = rosterName(doctorKey) || "그 외 의료진";

    const { error: insErr } = await (supabaseAdmin as any)
      .from("case_opinions")
      .insert({
        request_id: req.id,
        inquiry_id: req.inquiry_id,
        doctor_key: doctorKey,
        doctor_name: doctorName,
        opinion_text: opinionText.slice(0, 8000),
        submitted_ip: ip,
      });
    if (insErr) {
      console.error("[opinions/:token] insert error:", insErr.message);
      return Response.json({ ok: false, error: "submit_failed" }, { status: 500 });
    }

    // 코디·어드민에게만 종(bell) 알림 — 소견은 내부 전용(에이전시·환자 미노출).
    await notifyStaffOpinionArrived({ inquiryId: Number(req.inquiry_id), doctorName }).catch(() => {});

    return Response.json({ ok: true });
  } catch (e: any) {
    console.error("[opinions/:token] POST error:", e?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
