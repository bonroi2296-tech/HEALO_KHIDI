/**
 * healwith: 환자 만족도 설문 자동 발송 cron
 *
 * 동작:
 * - 완료(completed) 된 지 24시간 이상 ~ 14일 이내인 상담 세션 중 설문 미발송인 것 조회
 *   (하루 1회 cron 이 놓친 세션을 소급 발송 — surveyDispatchWindow, 재발송은 surveys 존재검사로 멱등)
 * - 수신자 결정(resolveSurveyRecipient): patients.email → inquiries.email 폴백
 *   (patient_id 가 전부 null 이라 inquiries 폴백이 없으면 영구 0건 — POSTMORTEMS #12)
 *   inquiries 의 email/이름은 AES 암호화 저장 → decryptMaybe 로 복호화 후 사용
 *   (복호화 안 하면 암호문에 '@' 없어 또 영구 0건 — POSTMORTEMS #13)
 * - generateSurveyToken → sendSurveyEmail → reminders_scheduled 기록
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
import { surveyDispatchWindow } from "@/lib/surveys/dispatchWindow";
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
  const now = Date.now();
  // 완료 24h 후 발송하되, 하한을 14일로 넓게 잡아 하루 1회 cron 이 놓친 세션도
  // 다음 실행에서 소급(backfill) 발송한다. (이전엔 24~30h 6시간 슬라이스만 봐서
  // 그 외 시간대 완료분이 영구 누락 → K-03 표본 급감. surveys 존재검사로 멱등.)
  // 윈도우 계산은 순수함수 surveyDispatchWindow (단위테스트로 고정). POSTMORTEMS #19.
  const { windowStart, windowEnd } = surveyDispatchWindow(now);

  // 종료된 사전상담 세션 조회 (completed 상태)
  // inquiry_id 도 함께 조회: patient_id 가 전부 null 이라 이메일은 inquiries 로 폴백한다.
  const { data: sessions, error: sessErr } = await db
    .from("consultation_sessions")
    .select("id, patient_id, inquiry_id, patient_language, updated_at")
    .eq("status", "completed")
    .gte("updated_at", windowStart)
    .lte("updated_at", windowEnd);

  if (sessErr) {
    console.error("[cron/dispatch-surveys] sessions query error:", sessErr.message);
    return Response.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  let surveysDispatched = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const session of (sessions as any[]) || []) {
    try {
      // 이 세션에 설문이 이미 생성됐는지 확인 (중복 방지)
      const { data: existing } = await db
        .from("surveys")
        .select("id")
        .eq("consultation_session_id", session.id)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // 환자 이메일·언어·이름 결정.
      // consultation_sessions.patient_id 는 전 행 null(미사용)이고 별도 patients
      // 테이블도 없다 → 실제 환자 연결고리인 inquiry_id → inquiries 로만 결정한다
      // (POSTMORTEMS #12). 결정 로직은 순수함수 resolveSurveyRecipient(단위 테스트로 고정).
      let inquiryRow:
        | {
            email?: string | null;
            preferred_language?: string | null;
            spoken_language?: string | null;
            first_name?: string | null;
            last_name?: string | null;
          }
        | null = null;
      if (session.inquiry_id) {
        const { data } = await db
          .from("inquiries")
          .select("email, preferred_language, spoken_language, first_name, last_name")
          .eq("id", session.inquiry_id)
          .maybeSingle();
        // ⚠️ inquiries 의 email/first_name/last_name 은 AES-256-GCM 으로 암호화돼
        // 저장된다(inquiries/create 가 encryptString). 복호화 없이 그대로 쓰면
        // 암호문(JSON blob)에 '@' 가 없어 resolveSurveyRecipient 가 항상 null →
        // 설문 영구 0건(= #157 수정 후에도 K-03 측정 불능). decryptMaybe 로 복호화한다
        // (옛 평문 행은 그대로 통과 — 마이그레이션 호환). POSTMORTEMS #13.
        if (data) {
          inquiryRow = {
            ...data,
            email: decryptMaybe(data.email),
            first_name: decryptMaybe(data.first_name),
            last_name: decryptMaybe(data.last_name),
          };
        } else {
          inquiryRow = null;
        }
      }

      const recipient = resolveSurveyRecipient(session, null, inquiryRow);
      if (!recipient) {
        skipped++;
        continue;
      }

      const toEmail = recipient.email;
      const lang = recipient.lang;

      // 토큰 생성
      const tokenResult = await generateSurveyToken(session.id, session.patient_id);

      if (!tokenResult.ok || !tokenResult.surveyId || !tokenResult.token) {
        errors.push(`session=${session.id}: token generation failed`);
        continue;
      }

      // 이메일 발송
      const emailResult = await sendSurveyEmail({
        surveyId: tokenResult.surveyId,
        token: tokenResult.token,
        toEmail,
        patientName: recipient.name,
        lang,
      });

      if (emailResult.ok) {
        surveysDispatched++;

        // reminders_scheduled 에 발송 기록 (사후 추적)
        await db.from("reminders_scheduled").insert({
          consultation_session_id: session.id,
          reminder_type: "survey_request",
          fire_at: new Date().toISOString(),
          channel: "email",
          recipient_user_id: session.patient_id || null,
          recipient_address: toEmail,
          payload: { survey_id: tokenResult.surveyId, token: tokenResult.token },
          status: "sent",
          sent_at: new Date().toISOString(),
        });
      } else {
        errors.push(
          `session=${session.id}: email send failed — ${emailResult.error}`
        );
      }
    } catch (err: any) {
      errors.push(`session=${session.id}: ${err.message}`);
    }
  }

  // KHIDI 데드맨 스위치: KPI 일일 집계 누락 감지(이 cron은 kpi-snapshot과 다른 시간대라
  // kpi-snapshot 트리거가 죽어도 여기서 잡아 Sentry 경보). 본업에 영향 없게 흡수.
  let kpiHealth: { stale: boolean; latest: string | null } = { stale: false, latest: null };
  try { kpiHealth = await alertIfKpiStale(); } catch { /* noop */ }

  return Response.json({
    ok: true,
    sessionsChecked: (sessions as any[])?.length || 0,
    surveysDispatched,
    skipped,
    errors,
    kpiHealth,
  });
}

// POST 도 허용 (수동 트리거 편의)
export const POST = GET;
