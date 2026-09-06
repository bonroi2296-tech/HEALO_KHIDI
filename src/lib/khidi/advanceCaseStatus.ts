import "server-only";
import { caseStatusOrder } from "./caseStatus";

/**
 * 케이스 진행상황(case_status) 전진 + 이력 기록 — 역할 포털 간 '엣지' 공용 헬퍼.
 *
 * 배경(POSTMORTEM #18/#20): 상담 완료·병원 배정·유치 확정 같은 사건이 한 테이블만
 * 바꾸고 case_status / case_status_history 에는 안 남아, 에이전시·코디·환자 타임라인이
 * 정체되던 '반쪽' 패턴이 여러 곳에 있었다. 이 헬퍼로 통일한다.
 *
 * 규칙:
 *  - 단계는 **뒤로 가지 않는다**(caseStatusOrder 가드) — 이미 더 진행된 케이스는 단계 유지.
 *  - 단, 사건 가시성을 위해 **이력(case_status_history)은 항상 한 줄 남긴다**(note 로 의미 전달).
 *    (recordHistory=false 로 끄면 단계만 전진.)
 *  - 베스트에포트: 실패해도 본 작업(상담 저장 등)을 막지 않게 호출부에서 try/catch 권장.
 *
 * @param supabase service_role 클라이언트
 * @param inquiryId inquiries.id
 * @param targetStatus 전진 목표 case_status 키
 * @param note 타임라인 메모(에이전시/코디가 봄)
 * @param userId 행위자(없으면 null=시스템)
 */
export async function advanceCaseStatus(
  supabase: any,
  inquiryId: number | string,
  targetStatus: string,
  note: string,
  userId: string | null = null,
  opts: { recordHistory?: boolean } = {}
): Promise<{
  advanced: boolean;
  from: string | null;
  to: string | null;
  /** 저장이 실제로 됐나. false 면 단계·이력이 DB 에 안 남았다. */
  ok: boolean;
  /** 실패 사유(비PII) — 호출부 로그·알림용. */
  errors: string[];
}> {
  const recordHistory = opts.recordHistory ?? true;

  const { data: inq } = await supabase
    .from("inquiries")
    .select("case_status")
    .eq("id", inquiryId)
    .maybeSingle();
  const cur: string | null = inq?.case_status ?? null;

  // «보류»(on_hold)는 순서 99 가 «비교용 편의값»일 뿐 실제 단계가 아니다(cases 라우트의 되돌리기 가드와 같은 해석).
  // 그대로 비교하면 보류 케이스는 «이미 치료를 지난 것»으로 읽혀 유치 확정에서 영영 안 올라간다(독립 리뷰 2026-09-06).
  const curOrder = cur === "on_hold" ? 0 : caseStatusOrder(cur);
  const willAdvance = curOrder < caseStatusOrder(targetStatus);
  const now = new Date().toISOString();
  const finalStatus = willAdvance ? targetStatus : cur;

  // ⚠️ Supabase 는 실패를 throw 하지 않고 { error } 로 «돌려준다». 예전엔 그 error 를
  //    한 번도 안 읽어서, 저장이 실패해도 이 함수가 advanced:true 를 돌려주고 흔적조차
  //    안 남았다 — 상담·유치는 저장됐는데 단계만 조용히 정체(2026-08-14 감사).
  //    이제 실패를 잡아 로그로 남기고, 호출부가 알 수 있게 결과에 실어 보낸다.
  const errors: string[] = [];

  if (willAdvance) {
    const { error } = await supabase
      .from("inquiries")
      .update({
        case_status: targetStatus,
        case_status_note: note,
        case_status_updated_at: now,
      })
      .eq("id", inquiryId);
    if (error) {
      errors.push(`update:${error.message}`);
      console.error(
        `[advanceCaseStatus] 단계 전진 실패 (inquiry=${inquiryId} → ${targetStatus}): ${String(error.message).slice(0, 200)}`
      );
    }
  }

  if (recordHistory) {
    const { error } = await supabase.from("case_status_history").insert({
      inquiry_id: inquiryId,
      status: finalStatus ?? targetStatus,
      note,
      created_by: userId,
    });
    if (error) {
      errors.push(`history:${error.message}`);
      console.error(
        `[advanceCaseStatus] 이력 기록 실패 (inquiry=${inquiryId}): ${String(error.message).slice(0, 200)}`
      );
    }
  }

  // 저장이 실패했으면 advanced 를 거짓으로 — 「성공했다」고 속이지 않는다.
  const ok = errors.length === 0;
  return {
    advanced: willAdvance && ok,
    from: cur,
    to: ok ? finalStatus : cur,
    ok,
    errors,
  };
}
