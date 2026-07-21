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
 * 2026-07-21 추가 — 케이스(사후관리) 경로:
 * - 위 세션 경로는 consultation_sessions.status='completed' 를 찾는데, 실측상 completed 가
 *   영구 0건이라(35건 전부 scheduled) 설문이 구조적으로 0건이었다. 'completed' 는 사람이
 *   직접 눌러야 바뀌는데 아무도 안 누른다.
 * - 그래서 inquiries.case_status 가 'follow_up'(사후관리)·'completed' 인 케이스에도 보낸다
 *   (PO 결정 2026-07-16). 세션 경로는 그대로 둔다 — 누군가 완료를 누르면 여전히 동작해야 하고,
 *   빼면 회귀다. 중복은 surveys.inquiry_id 존재검사로 막는다(케이스당 1회, 재실행에 멱등).
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
import { computeUnclosedNudge } from "@/lib/surveys/unclosedNudge";
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


/**
 * 이 세션/케이스에 설문이 이미 나갔는지. 멱등 가드의 단일 창구.
 *
 * 왜 함수로 뺐나 — 두 발송 경로가 **서로 다른 키**로 검사하다 엇갈려 중복 발송이 났다
 * (독립 리뷰 2026-07-21). 이제 둘 다 여기를 거치고, 세션 경로도 케이스 키를 함께 본다.
 *
 * 왜 maybeSingle 이 아닌가 — maybeSingle 은 행이 2개 이상이면 **에러**를 낸다. 그 에러를
 * "행 없음"으로 흘리면 매 실행마다 새 설문을 보내는 무한 루프가 된다(하루 1건씩 누적).
 * limit(1) 로 그 실패 모드 자체를 없애고, 조회 실패는 "error" 로 구분해 호출부가 실패-닫힘
 * 하도록 한다 — 못 보내는 건 되돌릴 수 있지만 잘못 보낸 메일은 못 되돌린다.
 */
async function surveyExists(
  db: any,
  keys: { consultationSessionId?: string | null; inquiryId?: number | null }
): Promise<boolean | "error"> {
  const clauses: string[] = [];
  if (keys.consultationSessionId) clauses.push(`consultation_session_id.eq.${keys.consultationSessionId}`);
  if (keys.inquiryId) clauses.push(`inquiry_id.eq.${keys.inquiryId}`);
  if (clauses.length === 0) return false;

  const { data, error } = await db
    .from("surveys")
    .select("id")
    .or(clauses.join(","))
    .limit(1);

  if (error) {
    console.error("[cron/dispatch-surveys] 설문 존재검사 실패:", error.message);
    return "error";
  }
  return (data?.length || 0) > 0;
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
      // 이 세션(또는 그 케이스)에 설문이 이미 생성됐는지 확인 (중복 방지).
      //
      // ⚠️ 세션 키만 보면 안 된다 — 케이스 경로가 먼저 보낸 설문은 consultation_session_id 가
      // null 이라 여기 안 걸리고, 나중에 누가 그 케이스의 상담을 'completed' 로 바꾸는 순간
      // **같은 환자에게 두 번** 나간다(독립 리뷰 2026-07-21 지적). 세션에 inquiry 가 연결돼
      // 있으면 케이스 키로도 함께 검사한다.
      const alreadySent = await surveyExists(db, {
        consultationSessionId: session.id,
        inquiryId: session.inquiry_id ?? null,
      });
      if (alreadySent === "error") {
        // 조회 자체가 실패한 경우 보내지 않는다(실패-닫힘). 보내고 중복을 만드는 것보다
        // 한 번 거르는 쪽이 안전하다 — 다음 실행에서 재시도된다.
        errors.push(`session=${session.id}: 존재검사 실패 — 이번 실행 건너뜀`);
        skipped++;
        continue;
      }
      if (alreadySent) {
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
      const tokenResult = await generateSurveyToken({
        consultationSessionId: session.id,
        inquiryId: session.inquiry_id ?? null,
        patientId: session.patient_id,
      });

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
        // 이메일 실패 시 방금 만든 pending 설문 행을 삭제한다. 안 지우면 존재-가드(위 86-95)에
        // 걸려 다음 실행부터 영구 skip → 만족도(K-03) 설문이 조용히 유실된다(전송 실패=영구 실패).
        // 삭제하면 다음 cron 이 재시도한다. (성공 시엔 sent_at 이 채워져 정상 skip)
        await db.from("surveys").delete().eq("id", tokenResult.surveyId);
        // ⚠️ emailResult.error 는 Resend 원문이라 수신자 이메일이 섞여 나올 수 있다 →
        // 응답 본문(cron 결과 JSON)에 넣지 않고 서버 로그로만 남긴다.
        console.error(`[cron/dispatch-surveys] session=${session.id} email failed:`, emailResult.error);
        errors.push(`session=${session.id}: email send failed (pending survey row deleted for retry)`);
      }
    } catch (err: any) {
      errors.push(`session=${session.id}: ${err.message}`);
    }
  }

  // ── 케이스(사후관리) 기반 발송 ─────────────────────────────────────────
  // 위 세션 루프는 consultation_sessions.status='completed' 를 찾는데 실측상 completed 가
  // 영구 0건이라(2026-07-21: 세션 35건 전부 scheduled) 설문이 구조적으로 0건이었다.
  // 실제 환자 여정은 inquiries.case_status 에 기록되므로 거기서도 발송한다(PO 결정 2026-07-16).
  // 시간창(window) 없이 "이 케이스에 설문이 나갔나"만 보는 이유: 케이스가 사후관리에 처음
  // 도달한 시점을 정확히 알 필요가 없고, surveys.inquiry_id 존재검사만으로 케이스당 1회가
  // 보장되기 때문(재실행에도 멱등).
  let caseSurveysDispatched = 0;
  let casesChecked = 0;
  try {
    const { data: cases, error: caseErr } = await db
      .from("inquiries")
      .select("id, email, preferred_language, spoken_language, first_name, last_name, user_id, case_status")
      .in("case_status", ["follow_up", "completed"])
      // 테스트 케이스는 실적이 아니므로 실제 메일을 보내지 않는다(KPI·수신자 오염 방지).
      .not("is_test", "is", true)
      .limit(500);

    // supabase-js 는 PostgREST 오류에 reject 하지 않고 {data:null,error} 로 resolve 한다 →
    // error 를 안 보면 "대상 0건"과 "쿼리가 죽음"이 구별되지 않는다(조용한 실패).
    if (caseErr) throw new Error(`cases query failed: ${caseErr.message}`);

    casesChecked = (cases as any[])?.length || 0;

    for (const c of (cases as any[]) || []) {
      try {
        // 이 케이스에 이미 설문이 나갔는지(멱등 가드).
        const alreadySent = await surveyExists(db, { inquiryId: c.id });
        if (alreadySent === "error") {
          errors.push(`case=${c.id}: 존재검사 실패 — 이번 실행 건너뜀`);
          skipped++;
          continue;
        }
        if (alreadySent) {
          skipped++;
          continue;
        }

        // inquiries 의 email/이름은 AES-256-GCM 암호화 저장 → 복호화 없이 쓰면 암호문에 '@' 가
        // 없어 수신자 결정이 항상 null → 또 영구 0건이 된다(POSTMORTEMS #13).
        const inquiryRow = {
          email: decryptMaybe(c.email),
          preferred_language: c.preferred_language,
          spoken_language: c.spoken_language,
          first_name: decryptMaybe(c.first_name),
          last_name: decryptMaybe(c.last_name),
        };

        const recipient = resolveSurveyRecipient(
          { patient_id: c.user_id || null, inquiry_id: c.id, patient_language: null },
          null,
          inquiryRow
        );
        if (!recipient) {
          skipped++;
          continue;
        }

        const tokenResult = await generateSurveyToken({
          inquiryId: c.id,
          patientId: c.user_id || null,
          surveyType: "post_followup",
        });
        if (!tokenResult.ok || !tokenResult.surveyId || !tokenResult.token) {
          errors.push(`case=${c.id}: token generation failed`);
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
          caseSurveysDispatched++;
          // 세션 경로와 동일하게 발송 이력을 남긴다 — 안 남기면 /admin/reminders 에서
          // 케이스 설문만 흔적 없이 사라진 것처럼 보인다.
          await db.from("reminders_scheduled").insert({
            reminder_type: "survey_request",
            fire_at: new Date().toISOString(),
            channel: "email",
            recipient_user_id: c.user_id || null,
            recipient_address: recipient.email,
            payload: { survey_id: tokenResult.surveyId, inquiry_id: c.id },
            status: "sent",
            sent_at: new Date().toISOString(),
          }).then(() => {}, () => { /* 이력 실패는 발송을 되돌리지 않는다 */ });
        } else {
          // 발송 실패 시 pending 행을 지운다. 안 지우면 위 존재검사에 걸려 다음 실행부터
          // 영구 skip → 설문이 조용히 유실된다(세션 경로와 동일 정책).
          await db.from("surveys").delete().eq("id", tokenResult.surveyId);
          console.error(`[cron/dispatch-surveys] case=${c.id} email failed:`, emailResult.error);
          errors.push(`case=${c.id}: email send failed (pending survey row deleted for retry)`);
        }
      } catch (err: any) {
        errors.push(`case=${c.id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    // 케이스 경로 실패가 세션 경로 결과를 죽이지 않게 흡수하되, 응답에 남긴다.
    errors.push(`cases: ${err?.message}`);
  }

  // ── 미완료 상담 넛지 ────────────────────────────────────────────────────
  // 이 cron 이 설문을 못 보내는 가장 흔한 이유는 "완료(completed) 로 바뀐 세션이 없어서"다.
  // `completed` 는 사람이 직접 눌러야 바뀐다(LiveKit webhook 이 의도적으로 status 를 안 건드림
  // — 방이 닫혔다고 상담이 성사된 게 아니라서. 실적 정직성 설계). 그래서 아무도 안 누르면
  // K-02(사전상담·사후관리)·K-03(만족도)이 조용히 0 에 고정된다.
  // 실제로 2026-07-20 실측 시 실상담 5건이 전부 'scheduled' 로 남아 설문 0건이었다.
  // → 여기서 같이 감지해 직원 종을 울린다(같은 테이블을 이미 읽는 자리라 추가 cron 불필요).
  let unclosed = 0;
  let unclosedCheckFailed = false;
  try {
    const { data: pending, error: pendingErr } = await db
      .from("consultation_sessions")
      .select("id, scheduled_at")
      // 'active'(상담이 실제로 시작됨) 인데 완료로 안 넘어간 것이야말로 가장 확실한
      // 미완료다. 'scheduled' 만 보면 그 케이스를 통째로 놓친다. (독립 리뷰 지적)
      .in("status", ["scheduled", "active"])
      .not("is_test", "is", true) // 테스트 세션은 실적이 아니므로 넛지 대상도 아님
      // 상한을 두는 건 Math.max 스프레드·메모리 폭주를 막기 위한 것이지 "잘림 방지"가
      // 아니다(오히려 이 limit 자체가 PostgREST 기본 1000 보다 낮은 지점에서 자른다).
      // 넛지는 "몇 건인지 대충 알고 화면으로 가라"는 신호라 500 에서 잘려도 목적을 해치지
      // 않는다. 정확한 수는 /admin/consultations 가 보여준다. 목표 규모가 상담 120건이라
      // 실무상 도달하지도 않는다.
      .limit(500);

    // ⚠️ supabase-js 는 PostgREST 오류에 reject 하지 않고 {data:null, error} 로 resolve 한다.
    //    error 를 안 보면 컬럼 변경·RLS 변경 때 pending=null → 대상 0건 → "울릴 게 없음"과
    //    구별이 안 되는 조용한 실패가 된다 — 조용한 실패를 막으려고 만든 기능이 조용히
    //    죽는 셈. 명시적으로 throw 해서 아래 catch 가 로그를 남기게 한다. (독립 리뷰 지적)
    if (pendingErr) throw new Error(`unclosed query failed: ${pendingErr.message}`);

    // 임계값·경과일 판정은 순수함수(단위 테스트로 고정). 알림이 "안 울리는" 버그는
    // 화면에 안 보여서 아무도 모르므로 계산부는 테스트로 묶어둔다.
    const nudge = computeUnclosedNudge((pending as any[]) || [], now);
    if (nudge) {
      unclosed = nudge.count;
      const { notifyStaffUnclosedConsultations } = await import("@/lib/notifications/inApp");
      await notifyStaffUnclosedConsultations(nudge);
    }
  } catch (err: any) {
    // 넛지 실패가 본업(설문 발송)을 죽이지 않게 흡수. 단 응답에 실패 사실을 남긴다 —
    // 안 그러면 {unclosed: 0} 이 "울릴 게 없음"과 "감지가 죽음" 둘 다를 뜻해
    // 응답만 읽는 쪽(수동 트리거·모니터링)이 구별할 수 없다.
    unclosedCheckFailed = true;
    console.warn("[cron/dispatch-surveys] unclosed nudge 실패(무시):", err?.message);
  }

  // KHIDI 데드맨 스위치: KPI 일일 집계 누락 감지(이 cron은 kpi-snapshot과 다른 시간대라
  // kpi-snapshot 트리거가 죽어도 여기서 잡아 Sentry 경보). 본업에 영향 없게 흡수.
  let kpiHealth: { stale: boolean; latest: string | null } = { stale: false, latest: null };
  try { kpiHealth = await alertIfKpiStale(); } catch { /* noop */ }

  return Response.json({
    ok: true,
    sessionsChecked: (sessions as any[])?.length || 0,
    casesChecked,
    surveysDispatched,
    caseSurveysDispatched,
    skipped,
    unclosed,
    unclosedCheckFailed,
    errors,
    kpiHealth,
  });
}

// POST 도 허용 (수동 트리거 편의)
export const POST = GET;
