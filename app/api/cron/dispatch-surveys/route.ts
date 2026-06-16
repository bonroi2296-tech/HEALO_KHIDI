/**
 * healwith: 환자 만족도 설문 자동 발송 cron
 *
 * 동작:
 * - 사전상담 종료 24~30시간 전 세션 중 설문 미발송인 것 조회
 * - 환자 이메일 확인 → generateSurveyToken → sendSurveyEmail
 * - reminders_scheduled 에 발송 기록 (사후 추적)
 *
 * 스케줄:
 * - vercel.json crons 에 `0 * * * *` (매시간) 등록됨
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
import { alertIfKpiStale } from "@/lib/khidi/kpiHealthcheck";

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
  // 24시간 ~ 30시간 전에 종료된 세션 (24h 후 발송 = 현재에서 24~30h 전 completed)
  const windowStart = new Date(now - 30 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  // 종료된 사전상담 세션 조회 (completed 상태)
  const { data: sessions, error: sessErr } = await db
    .from("consultation_sessions")
    .select("id, patient_id, patient_language, updated_at")
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

      // 환자 이메일 확인 (patients 테이블 fallback)
      let toEmail: string | null = null;

      if (session.patient_id) {
        const { data: userRow } = await db
          .from("patients")
          .select("email")
          .eq("user_id", session.patient_id)
          .maybeSingle();
        toEmail = userRow?.email || null;
      }

      if (!toEmail) {
        skipped++;
        continue;
      }

      // 언어 결정
      const rawLang = session.patient_language || "ko";
      const supportedLangs = ["ko", "en", "ru", "kk", "zh", "ja"] as const;
      type SupportedLang = (typeof supportedLangs)[number];
      const lang: SupportedLang = supportedLangs.includes(rawLang as SupportedLang)
        ? (rawLang as SupportedLang)
        : "ko";

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
