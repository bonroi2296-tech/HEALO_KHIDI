/**
 * healwith: 환자 사후관리(재예약) 일정 — 로그인 환자 본인 기준 (서버 경유)
 *
 * GET   /api/portal/followup → { ok, schedules } = 본인 followup_schedules 목록
 * PATCH /api/portal/followup { id, status } → 본인 일정 상태 변경(확정/무시 등)
 *
 * 배경(P1): followup_schedules 는 service_role 전용 RLS → 브라우저 직접조회는 빈 데이터였음.
 * patient_user_id 로 본인 행만 다룸. PATCH 는 행 소유 확인 후 변경(IDOR 차단).
 * 자동연결(#35-C): 게스트로 문의했던 사람이 이메일 인증 계정으로 로그인하면, 같은 이메일의
 * 문의에 달린 제안을 본인 계정으로 백필해 화면에 띄운다(문의 23건 중 user_id 보유 3건 한계 보완).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptStringNullable } from "@/lib/security/encryptionV2";

const ALLOWED_STATUS = ["pending", "proposed", "confirmed", "dismissed", "completed"];

function safeDecrypt(enc: any): string {
  try {
    return decryptStringNullable(enc) || "";
  } catch {
    return "";
  }
}

/**
 * 게스트로 문의했던 사람이 '이메일 인증된 계정'으로 로그인하면, 같은 이메일의 문의에 달린
 * 재예약 제안(patient_user_id 미연결)을 그 계정으로 자동 연결한다(백필). §6 이메일=신원키 결정과 일관.
 * - 인증된 이메일만 신뢰(가입 시 이메일 인증) → 타인 문의 오클레임 방지. 어드민 생성 미인증 계정 제외.
 * - inquiries.email 은 랜덤IV AES라 SQL 동등비교 불가 → 복호화 후 비교(파일럿 규모; 대량화 시 이메일 해시 컬럼 권장).
 * - 본인 이메일과 일치하는 문의만 본인 계정으로 연결 → 항상 자기 것만 가져온다.
 */
async function linkEmailMatchedFollowups(userId: string, email?: string): Promise<void> {
  const target = (email || "").trim().toLowerCase();
  if (!target) return;

  // 인증된 이메일만 신뢰
  const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (!(u as any)?.user?.email_confirmed_at) return;

  // 아직 계정 미연결 + 문의 연결된 제안만 후보
  const { data: unlinked } = await supabaseAdmin
    .from("followup_schedules")
    .select("inquiry_id")
    .is("patient_user_id", null)
    .not("inquiry_id", "is", null);
  const inquiryIds = [...new Set((unlinked || []).map((r: any) => r.inquiry_id))];
  if (inquiryIds.length === 0) return;

  const { data: inquiries } = await supabaseAdmin
    .from("inquiries")
    .select("id, email")
    .in("id", inquiryIds);
  const matchedIds = (inquiries || [])
    .filter((i: any) => safeDecrypt(i.email).trim().toLowerCase() === target)
    .map((i: any) => i.id);
  if (matchedIds.length === 0) return;

  await supabaseAdmin
    .from("followup_schedules")
    .update({ patient_user_id: userId } as any)
    .in("inquiry_id", matchedIds)
    .is("patient_user_id", null);

  console.log(`[portal/followup] 이메일매칭 자동연결: ${matchedIds.length}개 문의 → user ${userId}`);
}

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  try {
    // 게스트 문의로 생성된 제안을 이메일 인증 계정에 자동 연결(best-effort — 실패해도 조회는 진행)
    try {
      await linkEmailMatchedFollowups(auth.userId, auth.email);
    } catch (e: any) {
      console.error("[portal/followup] 자동연결 실패(무시):", e?.message);
    }

    const { data, error } = await supabaseAdmin
      .from("followup_schedules")
      .select("*")
      .eq("patient_user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[portal/followup] GET error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }
    return Response.json({ ok: true, schedules: data || [] });
  } catch (err: any) {
    console.error("[portal/followup] GET exception:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

/**
 * POST { note? } — 환자가 «먼저» 재진 상담을 요청한다 (2026-09-06). 본인 문의를 서버가 해석한다(IDOR 차단).
 */
export async function POST(request: NextRequest) {
  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;
  let body: any = {};
  try { body = await request.json(); } catch { body = {}; }
  try {
    const { findOwnInquiryIdsForUser } = await import("@/lib/portal/ownInquiries");
    const { submitRebookingRequest, REBOOKING_NOTE_MAX } = await import("@/lib/followup/rebookingRequest");
    const ids = await findOwnInquiryIdsForUser(auth.userId, auth.email);
    const inquiryId = ids[0] ?? null;
    if (inquiryId == null) return Response.json({ ok: false, error: "no_inquiry" }, { status: 400 });
    const { data: inq, error: inqErr } = await (supabaseAdmin as any)
      .from("inquiries").select("id, cancer_type, follow_ups, is_test").eq("id", inquiryId).maybeSingle();
    if (inqErr || !inq) return Response.json({ ok: false, error: "no_inquiry" }, { status: 400 });
    const result = await submitRebookingRequest(supabaseAdmin as any, {
      inquiryId: Number(inq.id),
      patientUserId: auth.userId,
      cancerType: inq.cancer_type || null,
      note: String(body?.note || "").slice(0, REBOOKING_NOTE_MAX),
      lang: String(body?.language || "ko"),
      followUps: inq.follow_ups,
      isTest: !!inq.is_test,
    });
    return Response.json({ ok: true, duplicate: result.duplicate });
  } catch (err: any) {
    console.error("[portal/followup] POST exception:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const id = body?.id;
  const status = body?.status;
  if (!id || !status || !ALLOWED_STATUS.includes(status)) {
    return Response.json({ ok: false, error: "invalid_params" }, { status: 400 });
  }

  try {
    // IDOR 차단: 본인 일정인지 확인 후 변경
    const { data: row } = await supabaseAdmin
      .from("followup_schedules")
      .select("id, patient_user_id")
      .eq("id", id)
      .maybeSingle();

    if (!row || (row as any).patient_user_id !== auth.userId) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("followup_schedules")
      .update({ status } as any)
      .eq("id", id);

    if (error) {
      console.error("[portal/followup] PATCH error:", error.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }
    // 환자가 «확정»을 눌렀는데 아무도 모르던 막다른 길 — 코디에게 알린다(2026-09-06). 실패는 삼킨다.
    if (status === "confirmed") {
      try {
        const { data: row } = await (supabaseAdmin as any).from("followup_schedules").select("inquiry_id").eq("id", id).maybeSingle();
        if (row?.inquiry_id) {
          const { notifyStaffRebookingRequest } = await import("@/lib/notifications/inApp");
          await notifyStaffRebookingRequest({ inquiryId: Number(row.inquiry_id), kind: "confirm" });
        }
      } catch (e: any) {
        console.warn("[portal/followup] 확정 알림 실패(무시):", e?.message);
      }
    }
    return Response.json({ ok: true, id, status });
  } catch (err: any) {
    console.error("[portal/followup] PATCH exception:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
