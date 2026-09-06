/**
 * healwith: 환자가 «먼저» 재진 상담을 요청한다 — 한 번 누르면 코디에게 닿는다 (사후관리 ICT ⑥)
 *
 * 왜 (2026-09-06 PO: *"재예약하려면 어케 해야 해? 그냥 코디한테 연락하게 해?"* → 버튼 「A. 한 번 누르면 코디에게 요청」):
 *   재진 화면(/patient/rebooking)은 시스템이 만든 «제안»을 확정·무시하는 것만 있었고, 환자가 먼저 요청할
 *   단추가 없었다. [확정]도 DB 상태만 바꾸고 아무에게도 안 알렸다(코디 화면에 제안 목록 자체가 없다).
 *   병원 가용 일정은 시스템이 모르므로 «자기 예약»은 불가 — 사람이 잡는 것이 맞다. 대신 요청은 한 번에.
 *
 * 흐름: 환자(로그인 화면 또는 진행상황 링크) → followup_schedules 에 요청 행(source=patient_request)
 *       + 케이스 「추가 정보」에 태그 글(코디가 늘 보던 자리) + 코디·관리자 종·메일
 *       → 코디가 「상담 일정」에서 잡아 초대 링크를 보낸다(기존 흐름).
 */

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { appendFollowUp, BY_PATIENT_LINK } from "@/lib/inquiry/followUps";
import { notifyStaffRebookingRequest } from "@/lib/notifications/inApp";

export const REBOOKING_SOURCE_PATIENT = "patient_request";
export const REBOOKING_NOTE_MAX = 500;
/** 같은 문의에 처리 안 된 요청이 이 시간 안에 또 오면 새 행을 안 만든다(연타·중복 클릭). 알림은 한 번만. */
export const DUPLICATE_WINDOW_MS = 6 * 60 * 60 * 1000;

export interface RebookingRequestInput {
  inquiryId: number;
  patientUserId: string | null;
  cancerType: string | null;
  note: string;
  lang: string;
  nowMs?: number;
}

/** 순수 — 요청 행. 코디가 잡을 «희망 시점»은 3일 뒤 10:00 KST 로 둔다(제안 API 와 같은 기본값). */
export function buildRebookingRequestRow(input: RebookingRequestInput) {
  const nowMs = input.nowMs ?? Date.now();
  const kstNow = new Date(nowMs + 9 * 60 * 60 * 1000);
  const wanted = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate() + 3, 1, 0, 0, 0));
  const note = input.note.trim().slice(0, REBOOKING_NOTE_MAX);
  return {
    inquiry_id: input.inquiryId,
    patient_user_id: input.patientUserId,
    cancer_type: input.cancerType || "unspecified",
    status: "pending",
    current_phase: null,
    next_action_at: wanted.toISOString(),
    schedule: {
      source: REBOOKING_SOURCE_PATIENT,
      reason: note || null,
      session_type: "follow_up",
      lang: input.lang,
      requested_at: new Date(nowMs).toISOString(),
    },
  };
}

/** 순수 — 최근 미처리 요청이 있으면 중복. */
export function isDuplicateRequest(
  existing: Array<{ status: string | null; schedule: any; created_at: string | null }>,
  nowMs: number
): boolean {
  return existing.some(
    (r) =>
      r.schedule?.source === REBOOKING_SOURCE_PATIENT &&
      (r.status === "pending" || r.status === "proposed") &&
      r.created_at &&
      nowMs - new Date(r.created_at).getTime() < DUPLICATE_WINDOW_MS
  );
}

export interface SubmitResult {
  ok: true;
  duplicate: boolean;
  id: string | null;
}

/**
 * 요청 저장 + 추가 정보 태그 + 직원 알림. 저장 실패는 throw, 태그·알림 실패는 삼킨다(요청 본체가 우선).
 */
export async function submitRebookingRequest(
  db: SupabaseClient,
  input: RebookingRequestInput & { followUps: unknown; isTest: boolean }
): Promise<SubmitResult> {
  const nowMs = input.nowMs ?? Date.now();

  const { data: existing, error: exErr } = await (db as any)
    .from("followup_schedules")
    .select("status, schedule, created_at")
    .eq("inquiry_id", input.inquiryId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (exErr) throw new Error(`요청 중복 검사 실패: ${exErr.message}`);
  if (isDuplicateRequest(existing || [], nowMs)) return { ok: true, duplicate: true, id: null };

  const row = buildRebookingRequestRow({ ...input, nowMs });
  const { data, error } = await (db as any).from("followup_schedules").insert([row]).select("id").single();
  if (error) throw new Error(`요청 저장 실패: ${error.message}`);

  try {
    const tagged = `[재진 상담 요청]${input.note.trim() ? " " + input.note.trim().slice(0, REBOOKING_NOTE_MAX) : ""}`;
    const next = appendFollowUp(input.followUps, tagged, BY_PATIENT_LINK);
    await (db as any).from("inquiries").update({ follow_ups: next }).eq("id", input.inquiryId);
  } catch (e: any) {
    console.warn("[rebookingRequest] 추가 정보 기록 실패(무시):", e?.message);
  }

  if (!input.isTest) {
    await notifyStaffRebookingRequest({ inquiryId: input.inquiryId, kind: "request", note: input.note.trim().slice(0, 200) });
  }
  return { ok: true, duplicate: false, id: data?.id ?? null };
}
