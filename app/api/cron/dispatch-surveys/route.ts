/**
 * healwith: 환자 만족도 설문 자동 발송 cron
 *
 * 동작 (2026-07-16 재배선):
 * - 사후관리(follow_up)·완료(completed) 단계 케이스(inquiries.case_status) 중 사후관리 설문
 *   미발송인 것 조회. 케이스당 1건, surveys.inquiry_id 존재검사로 멱등(재실행 중복 없음).
 *   (구: consultation_sessions.status='completed' — 실데이터상 영구 0건이라 설문 0건이었음.
 *    실제 환자 여정은 case_status 에 있어 그리로 옮김. PO 결정 "사후관리 진입 시".)
 * - 테스트 케이스(is_test) 제외. 수신자 결정(resolveSurveyRecipient): inquiries.email 기준
 *   inquiries 의 email/이름은 AES 암호화 저장 → decryptMaybe 로 복호화 후 사용
 *   (복호화 안 하면 암호문에 '@' 없어 영구 0건 — POSTMORTEMS #13)
 * - generateSurveyToken({inquiryId,…}) → sendSurveyEmail → reminders_scheduled 기록
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
    .select("id, email, preferred_language, spoken_language, first_name, last_name, user_id, is_test, case_status")
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

      // 이 케이스에 사후관리 설문이 이미 나갔는지 확인(멱등 — 케이스당 1건).
      const { data: existing } = await db
        .from("surveys")
        .select("id")
        .eq("inquiry_id", c.id)
        .eq("survey_type", "post_followup")
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // inquiries 의 email/first_name/last_name 은 AES-256-GCM 암호화 저장 → decryptMaybe 로
      // 복호화(옛 평문 행은 그대로 통과 — 마이그레이션 호환). 복호화 없이 쓰면 암호문에 '@' 가
      // 없어 resolveSurveyRecipient 가 항상 null → 설문 영구 0건. POSTMORTEMS #13.
      const inquiryRow = {
        email: decryptMaybe(c.email),
        preferred_language: c.preferred_language,
        spoken_language: c.spoken_language,
        first_name: decryptMaybe(c.first_name),
        last_name: decryptMaybe(c.last_name),
      };

      // 수신자 결정(순수함수 재사용). 세션이 없으므로 언어는 inquiry 기준으로만 판단.
      const recipient = resolveSurveyRecipient(
        { inquiry_id: c.id, patient_language: null },
        null,
        inquiryRow
      );
      if (!recipient) {
        skipped++;
        continue;
      }

      const tokenResult = await generateSurveyToken({
        inquiryId: c.id,
        patientId: c.user_id ?? null,
        surveyType: "post_followup",
      });

      if (!tokenResult.ok || !tokenResult.surveyId || !tokenResult.token) {
        errors.push(`inquiry=${c.id}: token generation failed`);
        continue;
      }

      // 이메일 발송
      const emailResult = await sendSurveyEmail({
        surveyId: tokenResult.surveyId,
        token: tokenResult.token,
        toEmail: recipient.email,
        patientName: recipient.name,
        lang: recipient.lang,
      });

      if (emailResult.ok) {
        surveysDispatched++;

        // reminders_scheduled 에 발송 기록. 세션 미연결이라 consultation_session_id=null,
        // inquiry 연결은 payload 로 보존.
        await db.from("reminders_scheduled").insert({
          consultation_session_id: null,
          reminder_type: "survey_request",
          fire_at: new Date().toISOString(),
          channel: "email",
          recipient_user_id: c.user_id || null,
          recipient_address: recipient.email,
          payload: { inquiry_id: c.id, survey_id: tokenResult.surveyId, token: tokenResult.token },
          status: "sent",
          sent_at: new Date().toISOString(),
        });
      } else {
        // 전송 실패 시 방금 만든 pending 설문 행 삭제 → 다음 cron 재시도(멱등 가드에 영구 걸리지 않게).
        // 삭제 안 하면 존재-가드에 걸려 영구 skip → 만족도(K-03) 조용히 유실.
        await db.from("surveys").delete().eq("id", tokenResult.surveyId);
        errors.push(
          `inquiry=${c.id}: email send failed — ${emailResult.error} (pending survey row deleted for retry)`
        );
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
