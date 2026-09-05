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
 * 실행 주기: **vercel.json 의 정기 작업(cron) 5분** — 2026-07-28 이관.
 *   예전엔 외부 스케줄러(cron-job.org)에 등록해 돌린다고 문서에 적혀 있었으나,
 *   거기 적힌 주소가 폐기된 옛 도메인이었고 실제로 도는지 확인할 방법이 없었다.
 *   ("Hobby 한도라 vercel crons 금지"는 Pro 전환으로 낡은 경고 — 2026-07-24)
 *   외부 스케줄러가 아직 살아 있어도 안전하다: pending 행만 집어 sent 로 바꾸므로
 *   먼저 도는 쪽이 처리하고 나머지는 0건을 본다.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptMaybe } from "@/lib/security/encryptionV2";
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
  const address = decryptMaybe(row.recipient_address); // 저장은 암호문(옛 평문 행도 그대로 통과)
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
  const phone = decryptMaybe(row.recipient_address); // 저장은 암호문(옛 평문 행도 그대로 통과)
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

  // ⚠️ 2026-07-28: 이 문구가 **한국어로 박혀 있었다.** 환자는 러시아·카자흐어권인데
  //    「30분 후 상담 시작」이 한글로 갔다(전수 조사에서 발각). 활성 6개 언어로 분기한다.
  //    언어는 예약 시 담아둔 payload.lang → 없으면 러시아어(주 타겟)로 폴백.
  const RL: Record<string, { t: string; b: string }> = {
    ko: { t: "⏰ 30분 후 상담 시작", b: "곧 원격 상담이 시작됩니다. 지금 입장해 주세요." },
    ru: { t: "⏰ Консультация через 30 минут", b: "Видеоконсультация скоро начнётся. Пожалуйста, войдите в комнату." },
    kz: { t: "⏰ 30 минуттан кейін кеңес", b: "Бейнекеңес жақында басталады. Бөлмеге кіріңіз." },
    en: { t: "⏰ Consultation starts in 30 minutes", b: "Your video consultation is about to begin. Please join the room." },
    zh: { t: "⏰ 30 分钟后开始会诊", b: "视频会诊即将开始，请进入会诊室。" },
    ja: { t: "⏰ 30分後に診察開始", b: "オンライン診察がまもなく始まります。ルームに入室してください。" },
  };
  const rm = RL[(payload.lang || "").slice(0, 2) === "kk" ? "kz" : payload.lang] || RL.ru;

  // ⚠️ 2026-07-28: 예전엔 여기서 notifications 테이블에 **직접 insert** 했다.
  //    그 바람에 «상담 30분 전» — 폰 알림이 가장 필요한 바로 그 알림 — 이
  //    폰 알림 다리(sendInAppNotification → pushBridge)를 안 거쳐 **폰이 울리지 않았다.**
  //    → 공통 진입점으로 보낸다. 저장은 그대로고 폰 알림만 따라붙는다.
  const { sendInAppNotification } = await import("@/lib/notifications/inApp");
  const id = await sendInAppNotification({
    userId,
    type: "consultation_reminder",
    title: rm.t,
    body: rm.b,
    link,
    priority: "high",
    payload: {
      consultation_session_id: row.consultation_session_id,
      reminder_type: row.reminder_type,
      role: payload.role ?? "user",
    },
  });

  if (!id) {
    console.error("[cron/dispatch-reminders] notify 실패");
    return { ok: false, error: "notify_failed" };
  }
  return { ok: true };
}
