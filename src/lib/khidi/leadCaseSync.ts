/**
 * 병원 리드 응답(hospital_leads.status) → 케이스 단계 + 유치(KHIDI K-01) 자동집계.
 *
 * route.ts 에서 분리한 이유:
 *  - Next 라우트 파일은 핸들러(GET/POST/PATCH…) 외 임의 export 를 막아 테스트가 어려웠다.
 *  - 이 로직(병원 'converted' → inquiries.outcome='admitted' 자동집계)이 KHIDI 평가의
 *    K-01 유치 숫자를 좌우하는데 DB 트리거가 아니라 앱 코드라, 코드 변경 시 조용히
 *    미집계될 잔여위험(C레벨 진단 KHIDI-8)이 있었다 → 별도 모듈로 빼서 회귀테스트로 잠근다.
 *  - supabase 는 인자로 주입받으므로(서버 의존 없음) 가짜 클라이언트로 단위테스트 가능.
 */
import { caseStatusOrder, outcomeForHospitalLeadStatus } from "@/lib/khidi/caseStatus";

/** 코디가 읽을 KST 문자열 ("2026-06-25 14:00 KST") */
export function fmtKst(iso: string): string {
  try {
    const s = new Date(iso).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
    return `${s} KST`;
  } catch { return iso; }
}

/**
 * 병원의 리드 응답을 의뢰(case_status)로 되돌려 반영 — 코디·에이전시가 보게.
 * 병원 상태 → 케이스 단계/메모/이력. 코디가 이미 더 진행시킨 단계는 후퇴시키지 않는다.
 * 'converted'(치료 확정)면 inquiries.outcome='admitted' 를 자동 기록(단 outcome IS NULL 일 때만 —
 * 코디 수동 결정은 보존). 자동분은 outcome_updated_by=null 로 표시(점수판 '자동' 배지/되돌리기).
 */
export async function syncLeadStatusToCase(
  supabase: any,
  leadId: string,
  newStatus: string,
  hospitalId: string,
  userId: string | undefined,
  quote: { min?: number | null; max?: number | null },
  slots: { at: string; note: string | null }[]
) {
  try {
    // 리드 → normalized_inquiry → 원본 의뢰 id
    const { data: lead } = await supabase
      .from("hospital_leads")
      .select("normalized_inquiry_id")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead?.normalized_inquiry_id) return;
    const { data: norm } = await supabase
      .from("normalized_inquiries")
      .select("source_inquiry_id")
      .eq("id", lead.normalized_inquiry_id)
      .maybeSingle();
    const inquiryId = norm?.source_inquiry_id;
    if (inquiryId == null) return;

    const { data: hosp } = await supabase.from("hospitals").select("name").eq("id", hospitalId).maybeSingle();
    const hName = hosp?.name || "병원";
    const { data: inq } = await supabase.from("inquiries").select("case_status").eq("id", inquiryId).maybeSingle();
    const curStatus: string | null = inq?.case_status ?? null;

    const slotText = slots.length
      ? ` · 📹 원격협진 가능시간: ${slots.map((s) => fmtKst(s.at) + (s.note ? `(${s.note})` : "")).join(", ")}`
      : "";

    let note = "";
    let targetStatus: string | null = curStatus;

    if (newStatus === "replied" || newStatus === "converted") {
      const q = quote.min != null || quote.max != null ? ` (견적 ${quote.min ?? "?"}~${quote.max ?? "?"})` : "";
      note = `🏥 ${hName} ${newStatus === "converted" ? "치료 확정" : "회신"}${q}${slotText}`;
      // 병원이 회신/확정하면 '일정·비자 준비'로 전진(이미 더 간 단계면 유지).
      if (caseStatusOrder(curStatus) < caseStatusOrder("preparation")) targetStatus = "preparation";
    } else if (newStatus === "rejected") {
      note = `🏥 ${hName} 거절`;
      // 다른 병원이 수락할 수 있으니 단계는 후퇴/변경하지 않음(메모·이력만).
      targetStatus = curStatus;
    } else {
      return; // viewed 등은 케이스 반영 안 함
    }

    const now = new Date().toISOString();
    const patch: any = { case_status_note: note, case_status_updated_at: now };
    if (targetStatus && targetStatus !== curStatus) patch.case_status = targetStatus;
    await supabase.from("inquiries").update(patch).eq("id", inquiryId);
    await supabase.from("case_status_history").insert({
      inquiry_id: inquiryId,
      status: targetStatus || curStatus || "consultation",
      note,
      created_by: userId ?? null,
    });

    // 병원이 '치료 확정'하면 실제 유치 → 유치 전환 점수판(KHIDI 평가 지표)에 자동 집계.
    //   (PO 결정 2026-06-21) 에이전시→병원 의뢰 경로 확정분이 유치 카운트에서 누락되던 구멍.
    //   단 '자동은 하되 되돌리기 가능': 코디가 이미 내린 결정(admitted/lost)은 절대 덮어쓰지
    //   않는다(outcome IS NULL 일 때만 자동 기록). 코디가 점수판에서 '유치 취소'(→null)/'이탈'
    //   하면 그게 유지된다(병원 상태가 다시 바뀌지 않는 한 재집계 안 함). 시스템 자동분은
    //   outcome_updated_by=null 로 표시해 점수판이 '자동' 배지로 구분·되돌리기 가능.
    const autoOutcome = outcomeForHospitalLeadStatus(newStatus);
    if (autoOutcome) {
      await supabase
        .from("inquiries")
        .update({
          outcome: autoOutcome,
          outcome_note: `🏥 ${hName} 치료 확정 (자동 유치 집계)`,
          outcome_updated_at: now,
          outcome_updated_by: null, // 시스템 자동 — 코디 수동분과 구분(되돌리기 UI에서 '자동' 배지)
        })
        .eq("id", inquiryId)
        .is("outcome", null); // 코디가 이미 정한 결정은 보존(되돌리기 우선)
    }
  } catch (e: any) {
    console.error("[partner/leads/id] case sync error:", e?.message?.slice(0, 200));
    // 케이스 반영 실패해도 리드 업데이트 자체는 성공 처리(베스트에포트).
  }
}
