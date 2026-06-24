/**
 * healwith: Rebooking Create API
 *
 * POST /api/khidi/rebooking/create — 재예약 "제안" 생성
 * Body: { inquiryId, patientId, source, reason, sessionType?, daysFromNow?, cancerType? }
 *
 * 정식 테이블 = followup_schedules (환자 재진화면 /api/portal/followup 이 읽는 곳).
 * 과거엔 엔진이 consultation_sessions(실제 화상세션 테이블)에 써서 환자 재진화면이
 * 항상 비어 있었음. 재예약은 환자가 확정/무시하는 "제안"이라 followup_schedules 가 맞다.
 * 환자에게 보이려면 patient_user_id 필요 → inquiry.user_id(#297) 로 연결.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { defaultLimiter } from "@/lib/api/rateLimiter";
import { sanitizeString } from "@/lib/api/sanitize";
import { checkAdminAuth } from "@/lib/auth/checkAdminAuth";

export async function POST(request: NextRequest) {
  const limited = defaultLimiter.check(request);
  if (limited) return limited;

  // ── 인증 확인 ──────────────────────────────────────────────
  const auth = await checkAdminAuth(request);
  if (!auth.userId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const raw = await request.json();
    const payload = {
      ...raw,
      reason: sanitizeString(raw.reason, 1000),
    };

    // 재예약 대상: 문의(inquiry, bigint) 또는 환자계정(patient, uuid).
    // 과거엔 호출부가 inquiry_id 를 patientId 로 보내 uuid 컬럼에 bigint 를 넣어
    // insert 가 항상 실패했음 → 둘을 분리해 받는다.
    const inquiryIdRaw = payload.inquiryId ?? payload.inquiry_id;
    const inquiryId =
      inquiryIdRaw === undefined || inquiryIdRaw === null || inquiryIdRaw === ""
        ? null
        : Number(inquiryIdRaw);
    const patientIdRaw = payload.patientId ?? payload.patient_user_id ?? null;
    const isUuid =
      typeof patientIdRaw === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientIdRaw);
    const patientId = isUuid ? patientIdRaw : null;

    if ((inquiryId === null && !patientId) || !payload.source || !payload.reason) {
      return Response.json(
        { ok: false, error: "inquiry_or_patient_source_reason_required" },
        { status: 400 }
      );
    }
    if (inquiryId !== null && !Number.isFinite(inquiryId)) {
      return Response.json({ ok: false, error: "invalid_inquiryId" }, { status: 400 });
    }

    // ── IDOR 방지: 본인(환자계정) 또는 어드민/코디네이터만 재예약 생성 가능 ──
    if (!auth.isAdmin && patientId !== auth.userId) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const validSources = ['followup', 'symptom', 'doctor'];
    if (!validSources.includes(payload.source)) {
      return Response.json(
        { ok: false, error: "source must be 'followup', 'symptom', or 'doctor'" },
        { status: 400 }
      );
    }

    const sessionType = payload.sessionType || 'follow_up';
    const daysFromNow = payload.daysFromNow ?? 3;

    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + daysFromNow);
    scheduledAt.setHours(10, 0, 0, 0); // Default to 10:00 AM

    const { getSupabaseServerClient } = await import(
      "@/lib/data/supabaseServerClient"
    );
    const supabase = getSupabaseServerClient();

    // followup_schedules 는 cancer_type NOT NULL + patient_user_id 로 환자화면에 노출된다.
    // 증상 알림 등은 inquiryId 만 보내므로 inquiry 에서 cancer_type·user_id 를 끌어온다.
    let cancerType: string | null = payload.cancerType ?? null;
    let resolvedPatientId: string | null = patientId;
    if (inquiryId !== null) {
      const { data: inq } = await supabase
        .from("inquiries")
        .select("cancer_type, user_id")
        .eq("id", inquiryId)
        .maybeSingle();
      if (inq) {
        cancerType = cancerType ?? ((inq as any).cancer_type ?? null);
        resolvedPatientId = resolvedPatientId ?? ((inq as any).user_id ?? null);
      }
    }

    const insertData: Record<string, any> = {
      inquiry_id: inquiryId,
      patient_user_id: resolvedPatientId, // 본인 화면(/api/portal/followup)에 노출되는 키
      cancer_type: cancerType || "unspecified", // NOT NULL 보장
      status: "proposed", // 환자 대기목록(pending/proposed) → 확정/무시
      current_phase: null, // DB 기본값 'week_1' 회피 — 화면은 schedule.source 로 뱃지 표시
      next_action_at: scheduledAt.toISOString(),
      // source·reason·세션유형은 schedule(Json, NOT NULL)에 보존.
      schedule: {
        source: payload.source,
        reason: payload.reason,
        session_type: sessionType,
        days_from_now: daysFromNow,
      },
    };

    const { data, error } = await supabase
      .from("followup_schedules")
      .insert([insertData] as any)
      .select("id, inquiry_id, patient_user_id, cancer_type, status, next_action_at, created_at")
      .single();

    if (error) {
      console.error("[api/khidi/rebooking/create] Insert error:", error);
      return Response.json(
        { ok: false, error: "insert_failed" },
        { status: 500 }
      );
    }

    console.log(
      `[api/khidi/rebooking/create] Rebooking ${(data as any).id}: source=${payload.source}, ` +
      `type=${sessionType}, scheduled=${scheduledAt.toISOString()}, patient=${resolvedPatientId ?? "none"}`
    );

    return Response.json({
      ok: true,
      data,
    });
  } catch (error: any) {
    console.error("[api/khidi/rebooking/create] Exception:", error);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
