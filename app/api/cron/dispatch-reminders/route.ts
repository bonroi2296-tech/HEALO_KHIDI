/**
 * healwith: 리마인더 디스패처 cron 엔드포인트
 *
 * POST /api/cron/dispatch-reminders
 * Header: Authorization: Bearer <CRON_SECRET>
 *
 * 동작:
 *   1. fire_at <= now() AND status = 'pending' 인 리마인더 최대 100건 조회
 *   2. 채널별 발송 (email / kakao / in_app)
 *   3. 성공 → status='sent', sent_at=now()
 *   4. 실패 → attempts++, last_error 기록, 3회 초과 시 status='failed'
 *
 * 외부 스케줄러: cron-job.org 에서 5분 주기로 이 URL 호출
 * (vercel.json crons 절대 추가 금지 — Hobby 한도)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { sendEmail } from "@/lib/email/sendEmail";
import { renderConsultationReminderEmail } from "@/lib/email/templates/consultationReminder";
import { siteUrl } from "@/lib/siteUrl";
import { sendKakaoAlimtalk, KAKAO_TEMPLATES } from "@/lib/notifications/kakao";

// ── 인증 ─────────────────────────────────────────────────────
function verifyCronSecret(header: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  if (!header?.startsWith("Bearer ")) return false;
  const provided = header.slice(7);
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    // 길이 먼저 체크 (timingSafeEqual 은 길이 다르면 throw) — padEnd 불필요해 제거
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ── 상수 ─────────────────────────────────────────────────────
const MAX_BATCH = 100;
const MAX_ATTEMPTS = 3;

// ── 타입 ─────────────────────────────────────────────────────
interface ReminderRow {
  id: string;
  consultation_session_id: string;
  reminder_type: string;
  fire_at: string;
  channel: string;
  recipient_user_id: string | null;
  recipient_address: string | null;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  last_error: string | null;
}

// ── 핸들러 ───────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // 1. pending + fire_at 도래 리마인더 조회
  const { data: reminders, error: fetchErr } = await supabaseAdmin
    .from("reminders_scheduled")
    .select("*")
    .eq("status", "pending")
    .lte("fire_at", now)
    .lt("attempts", MAX_ATTEMPTS)
    .order("fire_at", { ascending: true })
    .limit(MAX_BATCH);

  if (fetchErr) {
    console.error("[dispatch-reminders] fetch error:", fetchErr.message);
    return Response.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  const rows = (reminders ?? []) as ReminderRow[];

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const result = await dispatchOne(row);

      if (result.ok) {
        await supabaseAdmin
          .from("reminders_scheduled")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            attempts: row.attempts + 1,
            last_error: null,
          })
          .eq("id", row.id);
        sent++;
      } else {
        const newAttempts = row.attempts + 1;
        await supabaseAdmin
          .from("reminders_scheduled")
          .update({
            attempts: newAttempts,
            last_error: result.error ?? "unknown",
            status: newAttempts >= MAX_ATTEMPTS ? "failed" : "pending",
          })
          .eq("id", row.id);
        failed++;
        errors.push(`id=${row.id} ch=${row.channel}: ${result.error}`);
      }
    } catch (err: any) {
      console.error("[dispatch-reminders] dispatchOne exception:", err.message);
      const newAttempts = row.attempts + 1;
      await supabaseAdmin
        .from("reminders_scheduled")
        .update({
          attempts: newAttempts,
          last_error: err.message,
          status: newAttempts >= MAX_ATTEMPTS ? "failed" : "pending",
        })
        .eq("id", row.id);
      failed++;
      errors.push(`id=${row.id}: ${err.message}`);
    }
  }

  return Response.json({
    ok: true,
    checked: rows.length,
    sent,
    failed,
    errors,
    ts: now,
  });
}

// GET 도 허용 (수동 브라우저 테스트 편의)
export const GET = POST;

// ── 채널별 발송 ──────────────────────────────────────────────
async function dispatchOne(
  row: ReminderRow
): Promise<{ ok: boolean; error?: string }> {
  switch (row.channel) {
    case "email":
      return dispatchEmail(row);
    case "kakao":
      return dispatchKakao(row);
    case "in_app":
      return dispatchInApp(row);
    default:
      return { ok: false, error: `unknown channel: ${row.channel}` };
  }
}

// ── 이메일 발송 ──────────────────────────────────────────────
async function dispatchEmail(
  row: ReminderRow
): Promise<{ ok: boolean; error?: string }> {
  const address = row.recipient_address;
  if (!address) return { ok: false, error: "no recipient_address for email channel" };

  // 세션 정보 조회 (예약 시각, 의사/병원 이름)
  const { data: session } = await supabaseAdmin
    .from("consultation_sessions")
    .select("scheduled_at, patient_language, doctor_id")
    .eq("id", row.consultation_session_id)
    .single();

  const scheduledAt = session?.scheduled_at ?? row.fire_at;
  const payload = row.payload as Record<string, string>;
  // 카자흐: 앱·DB 는 활성코드 'kz' 를 쓰지만 리마인더 템플릿 키는 'kk'(설문과 동일 경계 매핑).
  // 매핑 안 하면 'kz' 가 템플릿에서 'ko' 로 폴백돼 카자흐 환자에게 한국어 리마인더가 발송됨(POSTMORTEMS #23).
  const rawLang = (payload.lang ?? session?.patient_language ?? "ko");
  const lang = (rawLang === "kz" ? "kk" : rawLang) as any;

  // 입장 URL
  const baseUrl = siteUrl();
  const joinUrl = `${baseUrl.replace(/\/$/, "")}/consultation/${row.consultation_session_id}`;

  const { subject, html, text } = renderConsultationReminderEmail({
    recipientName: payload.name ?? undefined,
    joinUrl,
    scheduledAt,
    role: payload.role ?? "guest",
    lang: ["ko", "en", "ru", "kk", "zh", "ja"].includes(lang) ? lang : "ko",
  });

  const result = await sendEmail({ to: address, subject, html, text });
  return { ok: result.ok, error: result.error };
}

// ── 카카오 알림톡 발송 ───────────────────────────────────────
async function dispatchKakao(
  row: ReminderRow
): Promise<{ ok: boolean; error?: string }> {
  const phone = row.recipient_address;
  if (!phone) return { ok: false, error: "no recipient_address for kakao channel" };

  const payload = row.payload as Record<string, string>;

  // 세션 정보 조회 (예약 시각)
  const { data: session } = await supabaseAdmin
    .from("consultation_sessions")
    .select("scheduled_at")
    .eq("id", row.consultation_session_id)
    .single();

  const scheduledAt = session?.scheduled_at ?? row.fire_at;
  const scheduledFormatted = new Date(scheduledAt).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const baseUrl = siteUrl();
  const joinUrl = `${baseUrl.replace(/\/$/, "")}/consultation/${row.consultation_session_id}`;

  const result = await sendKakaoAlimtalk({
    to: phone,
    template: KAKAO_TEMPLATES.TPL_REMINDER_30MIN,
    variables: {
      patient_name: payload.name ?? "고객",
      scheduled_at: scheduledFormatted,
      join_url: joinUrl,
    },
    smsFailover: {
      subject: "[healwith] 30분 후 상담",
      content: `[healwith] ${payload.name ?? "고객"}님, 30분 후 상담 시작.\n입장: ${joinUrl}`,
    },
  });

  return { ok: result.ok, error: result.error };
}

// ── In-app 알림 ──────────────────────────────────────────────
async function dispatchInApp(
  row: ReminderRow
): Promise<{ ok: boolean; error?: string }> {
  const userId = row.recipient_user_id;
  if (!userId) return { ok: false, error: "no recipient_user_id for in_app channel" };

  const payload = row.payload as Record<string, string>;
  const baseUrl = siteUrl();
  const link = `${baseUrl.replace(/\/$/, "")}/consultation/${row.consultation_session_id}`;

  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    type: "consultation_reminder",
    title: "⏰ 30분 후 상담 시작",
    body: `곧 원격 상담이 시작됩니다. 지금 입장해 주세요.`,
    link,
    payload: {
      consultation_session_id: row.consultation_session_id,
      reminder_type: row.reminder_type,
      role: payload.role ?? "user",
    },
    priority: "high",
  });

  if (error) {
    console.error("[cron/dispatch-reminders] notify error:", error.message);
    return { ok: false, error: "notify_failed" };
  }
  return { ok: true };
}
