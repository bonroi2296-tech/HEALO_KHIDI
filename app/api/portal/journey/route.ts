/**
 * healwith: 환자 여정(Journey) 데이터 — 로그인 환자 본인 기준 (서버 집계)
 *
 * GET /api/portal/journey → { ok, data } = fetchPatientJourney 와 동일 shape
 *
 * 배경(P1·EDGE-1): inquiries / cancer_patient_intakes / consultation_sessions /
 * coordinator_responses / symptom_reports / inquiry_events / followup_schedules /
 * chat_threads 는 RLS상 service_role 전용 → 브라우저 client 직접 쿼리는 항상 빈 데이터였음.
 * 게다가 inquiries.email 은 AES(IV 랜덤) 암호화라 SQL 동등비교 불가 → 브라우저에선 본인 문의
 * 매칭 자체가 불가능. 그래서 여기서 service_role 로 복호화-매칭 후 집계해 돌려준다.
 * (코디/병원이 올린 case_status 도 inquiry 에 담겨 와 computeCurrentStage 가 반영 — EDGE-1.)
 *
 * 보안: requirePortalAuth 로 로그인 확인 + 본인 이메일과 일치하는 문의만(IDOR 차단).
 *       파일럿 규모(문의 소량) 전제로 복호화 루프 매칭(admin/users 와 동일 패턴).
 *       대량화 시 email_hash 블라인드 인덱스 도입 권장.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptStringNullable } from "@/lib/security/encryptionV2";

function safeDecrypt(enc: any): string {
  try {
    return decryptStringNullable(enc) || "";
  } catch {
    return "";
  }
}

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  const userId = auth.userId;
  const userEmail = (auth.email || "").trim().toLowerCase();

  try {
    // 1) 본인 이메일과 일치하는 문의 찾기 — 복호화 후 비교(IV 랜덤이라 SQL 비교 불가)
    let matchedInquiries: any[] = [];
    if (userEmail) {
      const { data: inqRows } = await supabaseAdmin
        .from("inquiries")
        .select("id, email, first_name, case_status, status, nationality, cancer_type, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      matchedInquiries = (inqRows || []).filter(
        (i: any) => safeDecrypt(i.email).trim().toLowerCase() === userEmail
      );
    }

    const matchedIds = matchedInquiries.map((i: any) => i.id);
    const primaryRaw = matchedInquiries[0] || null; // 가장 최근(정렬 desc)
    const inquiry = primaryRaw
      ? {
          id: primaryRaw.id,
          case_status: primaryRaw.case_status ?? null,
          status: primaryRaw.status ?? null,
          nationality: primaryRaw.nationality ?? null,
          cancer_type: primaryRaw.cancer_type ?? null,
          created_at: primaryRaw.created_at ?? null,
          first_name: safeDecrypt(primaryRaw.first_name) || null, // 본인 데이터 → 복호화
        }
      : null;

    const hasIds = matchedIds.length > 0;
    const inFilter = hasIds ? matchedIds : [-1]; // .in 빈배열 방지

    // 2) 여정 데이터 병렬 집계 (service_role)
    const [
      intakesRes,
      consByInquiryRes,
      consByUserRes,
      coordResponsesRes,
      followupRes,
      symptomsRes,
      threadsRes,
      eventsRes,
    ] = await Promise.all([
      hasIds
        ? supabaseAdmin
            .from("cancer_patient_intakes")
            .select("*")
            .in("inquiry_id", inFilter)
            .order("created_at", { ascending: false })
            .limit(1)
        : Promise.resolve({ data: [] as any[] }),
      hasIds
        ? supabaseAdmin
            .from("consultation_sessions")
            .select("*")
            .in("inquiry_id", inFilter)
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin
        .from("consultation_sessions")
        .select("*")
        .eq("patient_user_id", userId),
      hasIds
        ? supabaseAdmin
            .from("coordinator_responses")
            .select("*")
            .in("inquiry_id", inFilter)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin
        .from("followup_schedules")
        .select("*")
        .eq("patient_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1),
      hasIds
        ? supabaseAdmin
            .from("symptom_reports")
            .select("*")
            .in("inquiry_id", inFilter)
            .order("created_at", { ascending: false })
            .limit(60)
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin
        .from("chat_threads")
        .select("*, chat_messages(count)")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
      hasIds
        ? supabaseAdmin
            .from("inquiry_events")
            .select("*")
            .in("inquiry_id", inFilter)
            .order("created_at", { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    // consultation_sessions: inquiry_id 매칭 + patient_user_id 매칭 병합(중복 제거)
    const consMap = new Map<any, any>();
    for (const c of [
      ...((consByInquiryRes as any).data || []),
      ...((consByUserRes as any).data || []),
    ]) {
      consMap.set(c.id, c);
    }
    const consultations = Array.from(consMap.values()).sort((a, b) => {
      const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      return ta - tb;
    });

    return Response.json({
      ok: true,
      data: {
        user: { id: userId, email: auth.email || null },
        inquiry,
        intake: (intakesRes as any).data?.[0] || null,
        consultations,
        coordinatorResponses: (coordResponsesRes as any).data || [],
        followup: (followupRes as any).data?.[0] || null,
        symptoms: (symptomsRes as any).data || [],
        threads: (threadsRes as any).data || [],
        events: (eventsRes as any).data || [],
      },
    });
  } catch (err: any) {
    console.error("[portal/journey] error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
