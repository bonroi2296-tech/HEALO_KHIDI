/**
 * healwith: 사후관리 «받는 자리» 공용 데이터 — 코디·관리자 보드, 에이전시·의료기관 포털, 병원 리드가 같이 쓴다.
 *
 * 왜 (2026-09-06 PO 「더 보완할 건 없을까, 백오피스라던가」 → 「계층별로 다 해줘」):
 *   환자 쪽 입구(증상 기록·재진 요청·케이던스)는 만들었는데, 백오피스에서 그것을 «받는 자리»가 종 알림 하나뿐이었다.
 *   followup_schedules·symptom_reports 를 읽는 코디·관리자·에이전시 화면이 0개였다(2026-09-06 grep 실측).
 *
 * 원칙: 순수 요약(summarize*)은 단위 시험으로 잠그고, DB 읽기는 한 함수(loadPostcare)로 모아 계층별 API 가
 *       자기 권한 범위(inquiryIds)만 넘겨 부른다. 환자 실명·연락처는 여기서 내리지 않는다.
 */

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { readFollowUps, BY_PATIENT_LINK } from "@/lib/inquiry/followUps";
import { PRE_VISIT_REMINDER_TYPE } from "./preVisitFollowup";
import { REBOOKING_SOURCE_PATIENT } from "./rebookingRequest";

export type Urgency = "low" | "medium" | "high" | "emergency";

export interface RequestItem {
  id: string;
  inquiryId: number | null;
  source: string;           // patient_request | followup | symptom | doctor | cadence
  status: string;           // pending | proposed | confirmed | dismissed | completed
  reason: string | null;
  nextActionAt: string | null;
  createdAt: string | null;
}
export interface SymptomItem {
  id: string;
  inquiryId: number | null;
  severity: number | null;
  urgency: Urgency;
  action: string | null;
  text: string;
  aiRaised: boolean;
  assessment: string | null; // 코디용(에이전시엔 안 내림)
  createdAt: string | null;
}
export interface CadenceItem {
  inquiryId: number | null;
  phase: string;
  status: string;            // sent | skipped
  reason: string | null;
  at: string | null;
}
export interface PatientNote {
  inquiryId: number;
  at: string;
  text: string;
}
export interface PostcareData {
  requests: RequestItem[];
  symptoms: SymptomItem[];
  cadence: CadenceItem[];
  notes: PatientNote[];
}

/** action_taken → 긴급도. 판정 코드가 바뀌어도 화면은 이 4단계만 안다. */
export function urgencyFromAction(action: string | null | undefined, risk: number | null | undefined): Urgency {
  if (action === "emergency_refer") return "emergency";
  if (action === "escalate_doctor" || action === "escalate_agent") return "high";
  if (action === "schedule_followup") return "medium";
  if ((risk ?? 0) >= 0.7) return "high";
  if ((risk ?? 0) >= 0.4) return "medium";
  return "low";
}

export interface PostcareSummary {
  openRequests: number;
  symptoms30d: number;
  highSymptoms30d: number;
  cadenceSent30d: number;
  cadenceSkipped30d: number;
}

/** 순수 — 카드 숫자. 대시보드·요약 API 가 쓴다. */
export function summarizePostcare(d: PostcareData): PostcareSummary {
  return {
    openRequests: d.requests.filter((r) => r.status === "pending" || r.status === "proposed").length,
    symptoms30d: d.symptoms.length,
    highSymptoms30d: d.symptoms.filter((s) => s.urgency === "high" || s.urgency === "emergency").length,
    cadenceSent30d: d.cadence.filter((c) => c.status === "sent").length,
    cadenceSkipped30d: d.cadence.filter((c) => c.status === "skipped").length,
  };
}

const DAY = 86400000;

/**
 * DB 읽기. inquiryIds 를 주면 그 문의만(에이전시·병원), 안 주면 전부(코디·관리자).
 * 시험 문의는 호출자가 걸러 넘긴다(코디 보드는 여기서 is_test 를 한 번 더 건다).
 */
export async function loadPostcare(
  db: SupabaseClient,
  opts: { inquiryIds?: number[]; days?: number; includeAssessment?: boolean; excludeTest?: boolean } = {}
): Promise<PostcareData> {
  const days = opts.days ?? 30;
  const since = new Date(Date.now() - days * DAY).toISOString();
  const scoped = <T extends { in: any }>(q: T) => (opts.inquiryIds ? q.in("inquiry_id", opts.inquiryIds) : q);
  if (opts.inquiryIds && opts.inquiryIds.length === 0) return { requests: [], symptoms: [], cadence: [], notes: [] };

  let testIds = new Set<number>();
  if (opts.excludeTest) {
    const { data } = await (db as any).from("inquiries").select("id").eq("is_test", true).limit(2000);
    testIds = new Set(((data as any[]) || []).map((r) => Number(r.id)));
  }
  const notTest = (id: number | null) => id == null || !testIds.has(Number(id));

  const [fu, sr, rem] = await Promise.all([
    scoped((db as any).from("followup_schedules").select("id, inquiry_id, status, schedule, next_action_at, created_at"))
      .order("created_at", { ascending: false }).limit(300),
    scoped((db as any).from("symptom_reports").select("id, inquiry_id, symptoms, ai_risk_score, ai_assessment, action_taken, created_at"))
      .gte("created_at", since).order("created_at", { ascending: false }).limit(300),
    (db as any).from("reminders_scheduled").select("payload, status, fire_at").eq("reminder_type", PRE_VISIT_REMINDER_TYPE)
      .gte("fire_at", since).order("fire_at", { ascending: false }).limit(300),
  ]);
  for (const r of [fu, sr, rem]) if (r.error) throw new Error(`postcare 조회 실패: ${r.error.message}`);

  const requests: RequestItem[] = ((fu.data as any[]) || [])
    .filter((r) => notTest(r.inquiry_id))
    .map((r) => ({
      id: String(r.id),
      inquiryId: r.inquiry_id == null ? null : Number(r.inquiry_id),
      source: String(r.schedule?.kind === "cadence" ? "cadence" : r.schedule?.source || "followup"),
      status: String(r.status || "pending"),
      reason: r.schedule?.reason ? String(r.schedule.reason).slice(0, 500) : null,
      nextActionAt: r.next_action_at || null,
      createdAt: r.created_at || null,
    }));

  const symptoms: SymptomItem[] = ((sr.data as any[]) || [])
    .filter((r) => notTest(r.inquiry_id))
    .map((r) => {
      const first = Array.isArray(r.symptoms) ? r.symptoms[0] : null;
      const sev = first?.severity != null ? Number(first.severity) : null;
      return {
        id: String(r.id),
        inquiryId: r.inquiry_id == null ? null : Number(r.inquiry_id),
        severity: Number.isFinite(sev as number) ? sev : null,
        urgency: urgencyFromAction(r.action_taken, r.ai_risk_score),
        action: r.action_taken || null,
        text: String(first?.symptom || "").slice(0, 500),
        aiRaised: typeof r.ai_assessment === "string" && r.ai_assessment.includes("상향"),
        assessment: opts.includeAssessment ? (r.ai_assessment || null) : null,
        createdAt: r.created_at || null,
      };
    });

  const cadence: CadenceItem[] = ((rem.data as any[]) || [])
    .map((r) => ({
      inquiryId: r.payload?.inquiry_id == null ? null : Number(r.payload.inquiry_id),
      phase: String(r.payload?.phase || ""),
      status: String(r.status || ""),
      reason: r.payload?.reason ? String(r.payload.reason) : null,
      at: r.fire_at || null,
    }))
    .filter((c) => (opts.inquiryIds ? c.inquiryId != null && opts.inquiryIds.includes(c.inquiryId) : true) && notTest(c.inquiryId));

  // 환자가 진행상황 링크에서 남긴 글(추가 정보) — 에이전시·의료기관 포털용. 코디는 케이스 상세에서 이미 본다.
  const notes: PatientNote[] = [];
  if (opts.inquiryIds && opts.inquiryIds.length > 0) {
    const { data: inqs } = await (db as any).from("inquiries").select("id, follow_ups").in("id", opts.inquiryIds);
    for (const inq of (inqs as any[]) || []) {
      for (const f of readFollowUps(inq.follow_ups)) {
        if (f.by === BY_PATIENT_LINK && !f.removedAt && f.at && new Date(f.at).getTime() >= Date.now() - days * DAY) {
          notes.push({ inquiryId: Number(inq.id), at: f.at, text: f.text.slice(0, 500) });
        }
      }
    }
    notes.sort((a, b) => (a.at < b.at ? 1 : -1));
  }

  return { requests, symptoms, cadence, notes };
}

export const PATIENT_REQUEST_SOURCE = REBOOKING_SOURCE_PATIENT;
