/**
 * healwith: 환자 여정(Journey) 종합 데이터 — 로그인 환자 본인 기준 (서버 경유)
 *
 * GET /api/portal/journey
 *   → { ok, journey: { user, inquiry, intake, consultations, coordinatorResponses,
 *                       followup, symptoms, threads, events } }
 *
 * 배경(P1 잔여분): inquiries / consultation_sessions / coordinator_responses /
 * chat_threads / inquiry_events 는 RLS상 service_role 전용 →
 * 브라우저 client 직접조회는 항상 빈 데이터(정책에 authenticated SELECT 없음).
 * 기존 journeyState.fetchPatientJourney() 가 브라우저 client 로 직접조회해
 * 환자 여정 화면이 통째로 비어 있었음 → 여기서 본인 inquiry 를 서버에서 해석해 묶어 돌려준다.
 *
 * 본인 매칭: ① user_id == 로그인 uid  또는  ② 암호화된 email 복호화-매칭(파일럿 규모).
 *           consultation/followup/threads 는 patient_user_id·user_id 로 직접 매칭(복호화 불필요).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { getConfirmedEmail } from "@/lib/auth/verifiedEmail";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptStringNullable } from "@/lib/security/encryptionV2";
import { mapCostEstimateToJourneyResponse } from "@/lib/patient/costEstimateJourney";

function safeDecrypt(enc: any): string {
  try {
    return decryptStringNullable(enc) || "";
  } catch {
    return "";
  }
}

/** 로그인 사용자 본인의 가장 최근 inquiry 1건. user_id 우선, 없으면 email 복호화-매칭. */
async function findOwnInquiry(userId: string, userEmail: string) {
  // 1) user_id 직접 연결분(복호화 불필요)
  const { data: byUid } = await supabaseAdmin
    .from("inquiries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (byUid?.[0]) return byUid[0];

  // 2) 암호화 email 복호화-매칭 (IV 랜덤이라 eq 쿼리 불가 → 최근분 끌어와 서버에서 대조)
  const target = (userEmail || "").trim().toLowerCase();
  if (!target) return null;
  const { data: recent } = await supabaseAdmin
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  return (
    (recent || []).find((i: any) => safeDecrypt(i.email).trim().toLowerCase() === target) || null
  );
}

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  try {
    const userId = auth.userId;
    // 「이메일이 같으면 본인 것」 판정에는 «인증된» 주소만 쓴다 — 남의 주소로 가입만 해서
    // 그 사람 여정을 열람하는 길을 막는다(2026-08-13 점검: 4곳 중 여기만 안 막혀 있었다).
    const userEmail = (await getConfirmedEmail(userId, auth.email)) || "";

    const inquiry = await findOwnInquiry(userId, userEmail);
    const inquiryId = inquiry?.id;

    const [
      intakesRes,
      consultationsRes,
      coordResponsesRes,
      followupRes,
      symptomsRes,
      threadsRes,
      eventsRes,
    ] = await Promise.all([
      inquiryId
        ? supabaseAdmin.from("cancer_patient_intakes").select("*").eq("inquiry_id", inquiryId).order("created_at", { ascending: false }).limit(1)
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin
        .from("consultation_sessions")
        .select("*")
        .eq("patient_user_id", userId)
        .order("scheduled_at", { ascending: true }),
      // 🔴 견적은 `coordinator_responses` 가 아니라 `cost_estimates` 에 쌓인다 (2026-08-29 실측).
      //    옛 표는 2026-07-20 에 「동명의 기존 견적 테이블」로 판명나 쓰임이 끊겼고 지금 0행이다
      //    (POSTMORTEMS #97 · playbook 쪽은 playbook_responses 로 이전 완료).
      //    그런데 여기만 옛 표를 계속 읽고 있어서, 코디가 견적을 7건 만들어도
      //    **환자 여정 화면은 「제안 없음」으로 판정**하고 있었다(journeyState 의 hasAnyProposal).
      //    → 실제 표를 읽고, journeyState 가 보는 모양으로 맞춰 준다.
      supabaseAdmin
        .from("cost_estimates")
        .select("*")
        .eq("patient_user_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("followup_schedules")
        .select("*")
        .eq("patient_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1),
      inquiryId
        ? supabaseAdmin.from("symptom_reports").select("*").eq("inquiry_id", inquiryId).order("created_at", { ascending: false }).limit(60)
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin
        .from("chat_threads")
        .select("*, chat_messages(count)")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
      inquiryId
        ? supabaseAdmin.from("inquiry_events").select("*").eq("inquiry_id", inquiryId).order("created_at", { ascending: false }).limit(30)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const journey = {
      user: { id: userId, email: userEmail },
      inquiry,
      intake: (intakesRes as any).data?.[0] || null,
      consultations: (consultationsRes as any).data || [],
      // journeyState 는 `is_final`·`status` 를 본다 — cost_estimates 의 실제 칸으로
      // 옮겨 준다. 매핑 규칙(거절·만료 포함)·단위시험은 costEstimateJourney.ts 에.
      coordinatorResponses: ((coordResponsesRes as any).data || []).map(
        mapCostEstimateToJourneyResponse
      ),
      followup: (followupRes as any).data?.[0] || null,
      symptoms: (symptomsRes as any).data || [],
      threads: (threadsRes as any).data || [],
      events: (eventsRes as any).data || [],
    };

    return Response.json({ ok: true, journey });
  } catch {
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
