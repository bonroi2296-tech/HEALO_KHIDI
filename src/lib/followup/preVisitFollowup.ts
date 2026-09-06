/**
 * healwith: «방문 전» 사후관리 케이던스 — 소견을 받고 아직 한국에 오지 않은 환자를 놓지 않는다.
 *
 * 왜 (2026-09-06 PO: *"사후관리 3대 보완해야 하지 않겠어?"*):
 *   기존 사후관리(④경과·⑤교육/설문·⑥재이용)는 전부 `case_status in ('follow_up','completed')`
 *   즉 **치료가 끝난 뒤**에만 시작된다. 그런데 실환자 8명 중 소견까지 받은 6명은 한 명도 한국에
 *   오지 않았고, 그 6명에게 플랫폼은 소견 전달 뒤 «아무것도 하지 않았다». 첫 실고객(7/09 소견)이
 *   두 달째 「상담·검토 진행」에 멈춘 것이 그 구멍이다. 여기서는 소견 전달일(D+0)을 앵커로
 *   D+3 → D+14 → D+30 에 환자 언어로 안부·결정 확인·다음 단계를 보내고, 답이 없으면 코디에게 알린다.
 *
 * 설계 원칙
 *   · 판정은 순수함수(planPreVisitAction) — 단위 시험으로 잠근다. 발송·기록은 runPreVisitFollowup.
 *   · 멱등 = reminders_scheduled(reminder_type='pre_visit_followup').payload.{inquiry_id,phase}.
 *   · **한 실행에 케이스당 최대 1통.** 앵커가 오래된 케이스(도입 시점에 5건이 이미 D+30 을 넘겼다)에
 *     세 통이 한꺼번에 가면 안 된다 → 가장 늦은 도래 단계 하나만 보내고 그 아래 단계는 「지나감」으로 기록.
 *   · **너무 지난 단계는 보내지 않는다**(STALE_DAYS). 두 달 전 소견에 「소견 잘 받으셨나요」는 무례하다.
 *   · 환자가 앵커 이후에 말을 걸었으면(진행상황 링크 글·증상 기록) D+14·D+30 «독촉»은 보내지 않는다 —
 *     이미 코디와 대화 중이다. D+3 안부는 그래도 보낸다.
 *   · 결과(outcome)가 정해졌거나 치료 단계에 들어간 케이스는 대상이 아니다.
 *   · 시험 문의는 대상이 아니다. 메일 주소가 없으면(소급 등록분) 보낼 수 없으니 코디 알림만 남긴다.
 */

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptMaybe, encryptStringNullable } from "@/lib/security/encryptionV2";
import { resolveSurveyRecipient } from "@/lib/surveys/resolveRecipient";
import { readFollowUps, BY_PATIENT_LINK } from "@/lib/inquiry/followUps";
import { trackingUrl } from "@/lib/inquiry/trackingLink";
import { siteUrl } from "@/lib/siteUrl";
import { sendEmail } from "@/lib/email/sendEmail";
import { renderPreVisitFollowupEmail, type PreVisitPhase } from "@/lib/email/templates/preVisitFollowup";
import { notifyStaffPreVisitSilent } from "@/lib/notifications/inApp";

export const PRE_VISIT_REMINDER_TYPE = "pre_visit_followup";

/** 단계 — 소견 전달일 기준 며칠 뒤. 순서가 곧 우선순위(뒤가 «더 늦은» 단계). */
export const PRE_VISIT_PHASES: ReadonlyArray<{ key: PreVisitPhase; days: number }> = [
  { key: "d3", days: 3 },
  { key: "d14", days: 14 },
  { key: "d30", days: 30 },
];

/** 도래한 지 이 일수를 넘긴 단계는 보내지 않는다(도입 시점 소급 발송 방지).
 *  21일: 도입일(2026-09-06) 기준 소견 D+30 을 4주 넘게 지난 케이스(7/09 이전)에 「한 달이 지났습니다」를 보내는 것은 틀린 말이라 걸렀다. */
export const STALE_DAYS = 21;

/** 이 상태면 «방문 전»이 아니다 — 대상 제외. */
const NOT_PRE_VISIT_STATUS = new Set(["preparation", "treatment", "follow_up", "completed"]);

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PlanInput {
  anchorMs: number;
  nowMs: number;
  /** 이미 나갔거나 지나간 것으로 기록된 단계 */
  donePhases: ReadonlySet<string>;
  /** 앵커 이후 환자가 말을 걸었는가(진행상황 글·증상 기록) */
  respondedSinceAnchor: boolean;
  outcome: string | null | undefined;
  caseStatus: string | null | undefined;
  staleDays?: number;
}

export interface PlanResult {
  /** 이번에 메일을 보낼 단계(없으면 null) */
  send: PreVisitPhase | null;
  /** 보내지 않고 «지나감»으로 기록할 단계들(아래 단계·너무 지난 단계·환자가 이미 응답한 독촉) */
  skip: PreVisitPhase[];
  /** 코디에게 「소견 뒤 N일째 무응답」 알림을 울릴지 */
  nudgeStaff: boolean;
}

/**
 * 순수 판정. 케이스당 최대 한 단계만 보낸다.
 */
export function planPreVisitAction(input: PlanInput): PlanResult {
  const staleDays = input.staleDays ?? STALE_DAYS;
  const none: PlanResult = { send: null, skip: [], nudgeStaff: false };
  if (input.outcome) return none;
  if (input.caseStatus && NOT_PRE_VISIT_STATUS.has(input.caseStatus)) return none;

  const elapsedDays = (input.nowMs - input.anchorMs) / DAY_MS;
  const due = PRE_VISIT_PHASES.filter((p) => elapsedDays >= p.days && !input.donePhases.has(p.key));
  if (due.length === 0) return none;

  const latest = due[due.length - 1];
  const lower = due.slice(0, -1).map((p) => p.key);
  const overdueBy = elapsedDays - latest.days;

  if (overdueBy > staleDays) {
    // 전부 너무 지났다 — 조용히 닫는다. 도입 시점의 옛 케이스가 여기로 온다.
    return { send: null, skip: [...lower, latest.key], nudgeStaff: false };
  }

  const isNudge = latest.key !== "d3";
  if (isNudge && input.respondedSinceAnchor) {
    // 환자가 이미 말을 걸었다 — 독촉 대신 코디가 이어가는 게 맞다.
    return { send: null, skip: [...lower, latest.key], nudgeStaff: false };
  }

  return { send: latest.key, skip: lower, nudgeStaff: isNudge };
}

export interface RunResult {
  casesChecked: number;
  sent: number;
  skipped: number;
  nudged: number;
  noEmail: number;
  errors: string[];
}

/**
 * 크론 본체 — dispatch-surveys 가 매일 부른다(새 크론을 만들지 않는다).
 */
export async function runPreVisitFollowup(db: SupabaseClient, nowMs: number): Promise<RunResult> {
  const out: RunResult = { casesChecked: 0, sent: 0, skipped: 0, nudged: 0, noEmail: 0, errors: [] };

  // 1) 소견이 «환자에게 전달된» 문의와 그 최신 전달일
  const { data: opRows, error: opErr } = await (db as any)
    .from("case_opinions")
    .select("inquiry_id, released_at")
    .not("released_at", "is", null)
    .limit(2000);
  if (opErr) throw new Error(`case_opinions 조회 실패: ${opErr.message}`);
  const anchorByInquiry = new Map<number, number>();
  for (const r of (opRows as any[]) || []) {
    const id = Number(r.inquiry_id);
    const ms = new Date(r.released_at).getTime();
    if (!id || !Number.isFinite(ms)) continue;
    anchorByInquiry.set(id, Math.max(anchorByInquiry.get(id) ?? 0, ms));
  }
  if (anchorByInquiry.size === 0) return out;

  const ids = [...anchorByInquiry.keys()];
  const { data: inqRows, error: inqErr } = await (db as any)
    .from("inquiries")
    .select("id, email, first_name, last_name, preferred_language, spoken_language, public_token, outcome, case_status, is_test, follow_ups")
    .in("id", ids)
    .not("is_test", "is", true);
  if (inqErr) throw new Error(`inquiries 조회 실패: ${inqErr.message}`);

  // 2) 이미 나간·지나간 단계(멱등 키)
  const { data: logRows, error: logErr } = await (db as any)
    .from("reminders_scheduled")
    .select("payload")
    .eq("reminder_type", PRE_VISIT_REMINDER_TYPE);
  if (logErr) throw new Error(`발송이력 조회 실패: ${logErr.message}`);
  const doneByInquiry = new Map<number, Set<string>>();
  for (const r of (logRows as any[]) || []) {
    const id = Number(r.payload?.inquiry_id);
    const phase = String(r.payload?.phase || "");
    if (!id || !phase) continue;
    if (!doneByInquiry.has(id)) doneByInquiry.set(id, new Set());
    doneByInquiry.get(id)!.add(phase);
  }

  const base = siteUrl();

  for (const c of (inqRows as any[]) || []) {
    out.casesChecked++;
    try {
      const anchorMs = anchorByInquiry.get(Number(c.id))!;
      const donePhases = doneByInquiry.get(Number(c.id)) ?? new Set<string>();

      // 앵커 이후 환자가 말을 걸었나 — 진행상황 링크 글 또는 증상 기록
      let responded = readFollowUps(c.follow_ups).some(
        (f) => f.by === BY_PATIENT_LINK && !f.removedAt && new Date(f.at).getTime() > anchorMs
      );
      if (!responded) {
        const { count } = await (db as any)
          .from("symptom_reports")
          .select("id", { count: "exact", head: true })
          .eq("inquiry_id", c.id)
          .gt("created_at", new Date(anchorMs).toISOString());
        responded = (count ?? 0) > 0;
      }

      const plan = planPreVisitAction({
        anchorMs,
        nowMs,
        donePhases,
        respondedSinceAnchor: responded,
        outcome: c.outcome,
        caseStatus: c.case_status,
      });

      const daysSince = Math.floor((nowMs - anchorMs) / DAY_MS);
      const logRow = (phase: string, status: "sent" | "skipped", extra: Record<string, unknown> = {}) => ({
        reminder_type: PRE_VISIT_REMINDER_TYPE,
        fire_at: new Date(nowMs).toISOString(),
        channel: "email",
        recipient_user_id: null,
        recipient_address: null,
        payload: { inquiry_id: c.id, phase, days_since_opinion: daysSince, ...extra },
        status,
        sent_at: status === "sent" ? new Date(nowMs).toISOString() : null,
      });

      // 지나감 기록 — 다음 실행이 같은 단계를 다시 보지 않게
      if (plan.skip.length > 0) {
        const rows = plan.skip.map((p) => logRow(p, "skipped", { reason: "stale_or_lower_or_responded" }));
        const { error } = await (db as any).from("reminders_scheduled").insert(rows);
        if (error) throw new Error(`지나감 기록 실패: ${error.message}`);
        out.skipped += rows.length;
      }

      if (!plan.send) continue;

      const recipient = resolveSurveyRecipient(
        { patient_id: null, inquiry_id: c.id, patient_language: null },
        null,
        {
          email: decryptMaybe(c.email),
          preferred_language: c.preferred_language,
          spoken_language: c.spoken_language,
          first_name: decryptMaybe(c.first_name),
          last_name: decryptMaybe(c.last_name),
        }
      );

      if (!recipient) {
        // 소급 등록분처럼 메일이 없는 케이스 — 보낼 수 없으니 기록만 남기고 코디에게만 알린다.
        const { error } = await (db as any)
          .from("reminders_scheduled")
          .insert([logRow(plan.send, "skipped", { reason: "no_email" })]);
        if (error) throw new Error(`무주소 기록 실패: ${error.message}`);
        out.noEmail++;
        if (plan.nudgeStaff) {
          await notifyStaffPreVisitSilent({ inquiryId: Number(c.id), phase: plan.send, daysSinceOpinion: daysSince, noEmail: true });
          out.nudged++;
        }
        continue;
      }

      const mail = renderPreVisitFollowupEmail({
        phase: plan.send,
        recipientName: recipient.name,
        trackUrl: c.public_token ? trackingUrl(base, c.public_token, recipient.lang === "kk" ? "kz" : recipient.lang) : `${base}/inquiry`,
        lang: recipient.lang,
      });
      const sent = await sendEmail({ to: recipient.email, subject: mail.subject, html: mail.html, text: mail.text });
      if (!sent.ok) {
        // 기록을 남기지 않는다 → 다음 실행이 재시도한다.
        out.errors.push(`case=${c.id} pre-visit ${plan.send}: email send failed`);
        continue;
      }
      const { error: insErr } = await (db as any).from("reminders_scheduled").insert([
        { ...logRow(plan.send, "sent"), recipient_address: encryptStringNullable(recipient.email), payload: { inquiry_id: c.id, phase: plan.send, days_since_opinion: daysSince, lang: recipient.lang } },
      ]);
      if (insErr) out.errors.push(`case=${c.id} pre-visit ${plan.send}: 발송은 됐는데 기록 실패 — ${insErr.message}`);
      out.sent++;

      if (plan.nudgeStaff) {
        await notifyStaffPreVisitSilent({ inquiryId: Number(c.id), phase: plan.send, daysSinceOpinion: daysSince, noEmail: false });
        out.nudged++;
      }
    } catch (err: any) {
      out.errors.push(`case=${c.id} pre-visit: ${err?.message}`);
    }
  }
  return out;
}
