/**
 * healwith: 환자 만족도 설문 자동 발송 cron
 *
 * 동작 (2026-07-16 재배선 → D+ 케이던스):
 * - 사후관리(follow_up)·완료(completed) 케이스(inquiries.case_status)를 조회.
 *   구: consultation_sessions.status='completed' — 실데이터상 영구 0건이라 설문 0건이었음.
 *   실제 환자 여정은 case_status 에 있어 그리로 옮김.
 * - D+0 앵커 = inquiries.followup_started_at (없으면 이번 실행에 stamp). scheduler.ts 의
 *   D+ 케이던스(암종별 가감 포함)를 재계산해 '설문' 단계만 발송: 기본 D+7(1주 경과)·D+90(3개월)·
 *   D+180(6개월). 기한 도래 + 미발송(surveys.survey_type='fu_<phase>') 단계만, 멱등.
 *   (화상상담·복약확인·검사리뷰 단계는 코디 액션 — 여기서 안 보냄, 후속 배선.)
 * - 테스트 케이스(is_test) 제외. 이메일/이름 AES 암호화 → decryptMaybe 복호화(#13).
 * - generateSurveyToken({inquiryId,surveyType}) → sendSurveyEmail → reminders_scheduled 기록
 *
 * 스케줄:
 * - vercel.json crons 에 `0 9 * * *` (매일 09:00 UTC) 등록됨
 * - Authorization: Bearer {CRON_SECRET} 필수
 *
 * KHIDI KPI K-03 측정 핵심 수단
 *
 * NOTE: surveys / reminders_scheduled 는 마이그레이션으로 추가된 테이블.
 * DB 타입 파일이 갱신되기 전까지 supabaseAdmin 을 `as any` 캐스팅 사용.
 */

export const runtime = "nodejs";
export const maxDuration = 120;

import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import {
  generateSurveyToken,
  sendSurveyEmail,
} from "@/lib/surveys/generateSurveyToken";
import { resolveSurveyRecipient } from "@/lib/surveys/resolveRecipient";
import { alertIfKpiStale } from "@/lib/khidi/kpiHealthcheck";
import { decryptMaybe } from "@/lib/security/encryptionV2";
import { createFollowupSchedule } from "@/lib/followup/scheduler";

function verifyCronSecret(header: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  if (!header?.startsWith("Bearer ")) return false;
  const provided = header.slice(7);
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin as any;

  // 사후관리(follow_up)·완료(completed) 단계 케이스 중 아직 사후관리 설문이 안 나간 것을 조회한다.
  // (구: consultation_sessions.status='completed' — 실데이터상 completed 세션이 영구 0건이라
  //  설문이 구조적으로 0건이었음. 실제 환자 여정은 inquiries.case_status 에 있어 그리로 옮긴다.
  //  PO 결정 2026-07-16: "사후관리 진입 시" 발송. 별도 시간창 없이 surveys.inquiry_id 존재검사로 멱등
  //  = 케이스가 follow_up 에 처음 도달했을 때 1회만 발송, 재실행에도 중복 없음.)
  const { data: cases, error: caseErr } = await db
    .from("inquiries")
    .select("id, email, preferred_language, spoken_language, first_name, last_name, user_id, is_test, case_status, cancer_type, followup_started_at")
    .in("case_status", ["follow_up", "completed"]);

  if (caseErr) {
    console.error("[cron/dispatch-surveys] inquiries query error:", caseErr.message);
    return Response.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  let surveysDispatched = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const c of (cases as any[]) || []) {
    try {
      // 테스트 케이스 제외(KPI·실발송 오염 방지).
      if (c.is_test) {
        skipped++;
        continue;
      }

      // D+0 앵커: 사후관리 진입 시각. 없으면 지금(이번에 처음 본 시점 ≈ 진입)으로 stamp.
      // (case_status_history 는 옛 단계 키만 담아 신뢰 불가 → inquiries.followup_started_at 사용.)
      let anchor: string = c.followup_started_at;
      if (!anchor) {
        anchor = new Date().toISOString();
        await db.from("inquiries").update({ followup_started_at: anchor }).eq("id", c.id);
      }

      // 수신자 결정(케이스당 1회). email/이름은 AES-256-GCM 암호화 → decryptMaybe 복호화
      // (안 하면 암호문에 '@' 없어 항상 null → 설문 0건. POSTMORTEMS #13).
      const recipient = resolveSurveyRecipient(
        { inquiry_id: c.id, patient_language: null },
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
        skipped++;
        continue;
      }

      // D+ 케이던스를 스케줄러로 재계산(순수·결정적, 암종별 가감 포함) → '설문' 단계만 추림.
      // 기한 도래(now ≥ 앵커+D) + 아직 미발송(surveys.survey_type='fu_<phase>')인 단계만 발송.
      // 화상상담·복약확인·검사리뷰 단계는 여기서 안 보냄(코디 액션 — 후속 배선).
      const schedule = createFollowupSchedule(
        String(c.id),
        c.cancer_type || "unspecified",
        anchor,
        c.user_id || undefined
      );
      const anchorMs = new Date(anchor).getTime();
      const now = Date.now();

      for (const step of schedule.schedule) {
        if (step.type !== "survey") continue;
        if (now < anchorMs + step.daysFromTreatment * 86400000) continue; // 아직 기한 전
        const surveyType = `fu_${step.phase}`; // fu_week_1 / fu_month_3 / fu_month_6 …

        // 멱등: 이 단계 설문이 이미 나갔으면 skip.
        const { data: existing } = await db
          .from("surveys")
          .select("id")
          .eq("inquiry_id", c.id)
          .eq("survey_type", surveyType)
          .maybeSingle();
        if (existing) {
          skipped++;
          continue;
        }

        const tokenResult = await generateSurveyToken({
          inquiryId: c.id,
          patientId: c.user_id ?? null,
          surveyType,
        });
        if (!tokenResult.ok || !tokenResult.surveyId || !tokenResult.token) {
          errors.push(`inquiry=${c.id} ${surveyType}: token generation failed`);
          continue;
        }

        const emailResult = await sendSurveyEmail({
          surveyId: tokenResult.surveyId,
          token: tokenResult.token,
          toEmail: recipient.email,
          patientName: recipient.name,
          lang: recipient.lang,
        });

        if (emailResult.ok) {
          surveysDispatched++;
          await db.from("reminders_scheduled").insert({
            consultation_session_id: null,
            reminder_type: "survey_request",
            fire_at: new Date().toISOString(),
            channel: "email",
            recipient_user_id: c.user_id || null,
            recipient_address: recipient.email,
            payload: { inquiry_id: c.id, phase: step.phase, survey_id: tokenResult.surveyId, token: tokenResult.token },
            status: "sent",
            sent_at: new Date().toISOString(),
          });
        } else {
          // 전송 실패 시 pending 설문 행 삭제 → 다음 cron 재시도(멱등 가드에 영구 걸리지 않게).
          await db.from("surveys").delete().eq("id", tokenResult.surveyId);
          errors.push(
            `inquiry=${c.id} ${surveyType}: email send failed — ${emailResult.error} (pending row deleted for retry)`
          );
        }
      }
    } catch (err: any) {
      errors.push(`inquiry=${c.id}: ${err.message}`);
    }
  }

  // KHIDI 데드맨 스위치: KPI 일일 집계 누락 감지(이 cron은 kpi-snapshot과 다른 시간대라
  // kpi-snapshot 트리거가 죽어도 여기서 잡아 Sentry 경보). 본업에 영향 없게 흡수.
  let kpiHealth: { stale: boolean; latest: string | null } = { stale: false, latest: null };
  try { kpiHealth = await alertIfKpiStale(); } catch { /* noop */ }

  return Response.json({
    ok: true,
    casesChecked: (cases as any[])?.length || 0,
    surveysDispatched,
    skipped,
    errors,
    kpiHealth,
  });
}

// POST 도 허용 (수동 트리거 편의)
export const POST = GET;
