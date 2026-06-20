/**
 * healwith: 원격상담 리마인더 cron
 *
 * 동작:
 * - 향후 25~35분 사이 예정된 consultation_sessions 조회
 * - 각 세션에 연결된 guest_tokens 중 invitee_email 있고 리마인더 미발송인 것에 한해
 *   초대 이메일 재발송 (reminder=true 태그)
 * - 발송 기록은 guest_tokens.metadata.reminder_sent_at 으로 기록 (중복 방지)
 *
 * 스케줄:
 * - vercel.json 에서 `0,15,30,45 * * * *` 로 15분마다 실행 권장
 * - Authorization: Bearer {CRON_SECRET} 필수
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { sendEmail } from "@/lib/email/sendEmail";
import { renderConsultationInviteEmail } from "@/lib/email/templates/consultationInvite";
import { timingSafeEqual } from "node:crypto";

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

  const now = Date.now();
  const windowStart = new Date(now + 25 * 60 * 1000).toISOString();
  const windowEnd = new Date(now + 35 * 60 * 1000).toISOString();

  // 25~35분 후 예정인 세션 조회
  const { data: sessions, error: sessionsErr } = await supabaseAdmin
    .from("consultation_sessions")
    .select("id, scheduled_at, status, patient_language")
    .gte("scheduled_at", windowStart)
    .lte("scheduled_at", windowEnd)
    .eq("status", "scheduled");

  if (sessionsErr) {
    console.error("[cron/reminders] sessions query error:", sessionsErr.message);
    return Response.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  let remindersSent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const session of sessions || []) {
    // 이 세션의 guest tokens 조회 (이메일 있고 리마인더 미발송)
    const { data: tokens } = await supabaseAdmin
      .from("consultation_guest_tokens")
      .select("id, role, invitee_name, invitee_email, expires_at, metadata")
      .eq("consultation_id", session.id)
      .is("revoked_at", null)
      .not("invitee_email", "is", null);

    for (const token of tokens || []) {
      const alreadySent = (token.metadata as any)?.reminder_sent_at;
      if (alreadySent) {
        skipped++;
        continue;
      }

      // 원본 토큰은 hash 만 저장돼 복원 불가 —
      // 대신 consultation URL 만 보내고 '예전에 받은 초대 링크로 접속' 안내
      // (또는 새 토큰 발급 시 링크 재전송 고려. 지금은 기존 링크 재안내)
      // 연산자 우선순위 주의: (A || B) ? ... 로 묶이면 SITE_URL 만 있고 VERCEL_URL 이
      // 비었을 때 https://undefined 가 됨 → ?? 로 올바르게 분리(dispatch-reminders 와 동일).
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "https://healo-khidi.vercel.app");

      // 리마인더는 token 이 아닌 '이전 메일 확인' 안내 + 직접 문의 링크
      // TODO: 보다 나은 UX 는 새 토큰 발급해 새 링크 발송
      const inviteUrl = `${baseUrl.replace(/\/$/, "")}/consultation/${session.id}`;

      try {
        const lang: any =
          token.role === "patient" ? session.patient_language || "ru" : "ko";
        const { subject, html, text } = renderConsultationInviteEmail({
          recipientName: token.invitee_name || undefined,
          inviteUrl,
          scheduledAt: session.scheduled_at,
          role: token.role,
          lang: ["ko", "en", "ru", "kz"].includes(lang) ? lang : "ko",
        });

        const result = await sendEmail({
          to: token.invitee_email!,
          subject: `⏰ [30분 후] ${subject}`,
          html,
          text,
          tags: {
            type: "consultation_reminder",
            consultation_id: session.id,
            role: token.role,
          },
        });

        if (result.ok) {
          // metadata 업데이트
          await supabaseAdmin
            .from("consultation_guest_tokens")
            .update({
              metadata: {
                ...((token.metadata as any) || {}),
                reminder_sent_at: new Date().toISOString(),
              },
            } as any)
            .eq("id", token.id);
          remindersSent++;
        } else {
          errors.push(`token=${token.id}: ${result.error}`);
        }
      } catch (err: any) {
        errors.push(`token=${token.id}: ${err.message}`);
      }
    }
  }

  return Response.json({
    ok: true,
    sessionsChecked: sessions?.length || 0,
    remindersSent,
    skipped,
    errors,
  });
}

// POST 도 허용 (Vercel Cron 은 GET 이지만 수동 트리거 편의)
export const POST = GET;
