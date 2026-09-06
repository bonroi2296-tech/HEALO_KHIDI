/**
 * 문의 «결과(outcome)» 한 곳에서 바꾸기 — 유치 확정(admitted) · 이탈/종료(lost) · 되돌리기(null).
 *
 * 왜 (2026-09-06 PO): 소견서까지 다 주고 「안 온다」고 한 케이스가 두 달째 「상담·검토 진행」으로 살아 있었다.
 *   결과를 적는 단추가 어드민 «유치 전환» 화면에만 있고 코디 화면엔 없어서다. 결과가 비어 있으면
 *   ①식은 문의 크론이 매일 알림을 올리고 ②환자 화면은 계속 «검토 중»이고 ③전환 집계엔 «대기»로 남는다.
 *   → 어드민 점수판과 코디 화면이 «같은 함수»로 결과를 바꾼다(두 벌로 갈리면 이력·집계가 어긋난다).
 *
 * 규칙
 * - admitted: 단계를 «입국·치료»로 전진(advanceCaseStatus, 뒤로는 안 감).
 * - lost: 단계는 그대로 두되(어드민 점수판) 또는 «보류»로 내림(코디 「종료」 단추, holdOnLost). 이력에 «🚫 이탈 처리».
 * - null(되돌리기): 결과만 비우고 단계는 안 건드린다(«보류»였다면 코디가 단계를 다시 고른다). 이력에 «↩️».
 * - 어느 경우든 outcome_updated_by 에 사람을 남긴다(병원 자동집계와 구분되는 «코디 결정»).
 */
export type InquiryOutcome = "admitted" | "lost" | null;

export interface SetInquiryOutcomeInput {
  inquiryId: number;
  outcome: InquiryOutcome;
  /** 500자까지. 이탈이면 이력 메모에도 같이 붙는다. */
  note?: string | null;
  userId: string | null;
  /** lost 일 때 진행 단계도 «보류»로 내릴지. 코디 「종료(안 옴)」= true, 어드민 점수판 = false(단계 유지). */
  holdOnLost?: boolean;
}

export interface SetInquiryOutcomeResult {
  ok: boolean;
  error?: "invalid_outcome" | "update_failed";
  /** 처리 뒤 진행 단계(모르면 null). */
  caseStatus: string | null;
}

export function isValidOutcome(v: unknown): v is InquiryOutcome {
  return v === null || v === "admitted" || v === "lost";
}

export async function setInquiryOutcome(db: any, input: SetInquiryOutcomeInput): Promise<SetInquiryOutcomeResult> {
  const { inquiryId, outcome, userId } = input;
  const note = typeof input.note === "string" && input.note.trim() ? input.note.trim().slice(0, 500) : null;
  if (!isValidOutcome(outcome)) return { ok: false, error: "invalid_outcome", caseStatus: null };

  // 바꾸기 «전» 상태 — 되돌리기 이력 문구(«유치 취소» vs «종료 취소»)와 보류 판단에 쓴다.
  const { data: before } = await db.from("inquiries").select("case_status, outcome").eq("id", inquiryId).maybeSingle();
  const prevOutcome: InquiryOutcome = (before?.outcome as InquiryOutcome) ?? null;
  let caseStatus: string | null = before?.case_status ?? null;
  const now = new Date().toISOString();

  const { error } = await db
    .from("inquiries")
    .update({ outcome, outcome_note: note, outcome_updated_at: now, outcome_updated_by: userId })
    .eq("id", inquiryId);
  if (error) {
    console.error("[inquiryOutcome] update error:", error.message);
    return { ok: false, error: "update_failed", caseStatus };
  }

  // 이력·단계는 «부수 효과» — 실패해도 결과 저장 자체는 유효하다(에이전시 타임라인만 한 줄 빠진다).
  try {
    if (outcome === "admitted") {
      const { advanceCaseStatus } = await import("./advanceCaseStatus");
      const r = await advanceCaseStatus(db, inquiryId, "treatment", "🎯 유치 확정", userId);
      if (r?.to) caseStatus = r.to;
      return { ok: true, caseStatus };
    }

    if (outcome === "lost" && input.holdOnLost && caseStatus !== "on_hold") {
      const { error: hErr } = await db
        .from("inquiries")
        .update({ case_status: "on_hold", case_status_note: note ?? "종료(안 옴)", case_status_updated_at: now })
        .eq("id", inquiryId);
      if (hErr) console.error("[inquiryOutcome] on_hold error:", hErr.message);
      else caseStatus = "on_hold";
    }

    const historyNote =
      outcome === "lost"
        ? `🚫 이탈 처리${note ? ` — ${note}` : ""}`
        : prevOutcome === "lost"
          ? "↩️ 종료 취소 (다시 진행)"
          : "↩️ 유치 취소 (집계 제외)";
    await db.from("case_status_history").insert({
      inquiry_id: inquiryId,
      status: caseStatus ?? "intake",
      note: historyNote,
      created_by: userId,
    });
  } catch (e: any) {
    console.error("[inquiryOutcome] history/status side-effect failed:", e?.message);
  }
  return { ok: true, caseStatus };
}
