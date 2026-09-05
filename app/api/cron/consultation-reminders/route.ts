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
import { siteUrl } from "@/lib/siteUrl";
import { withLang } from "@/lib/i18n/guestLinkLang";

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
  // ⚠️ 창이 «10분»이다 → **실행 주기가 10분보다 길면 그 사이에 낀 상담은 영영 리마인드를 못 받는다.**
  //    예) 15분 주기면: T 에 [T+25,T+35] 를 처리하고 다음은 T+15 에 [T+40,T+50] →
  //        [T+35,T+40] 구간이 통째로 빈다(문서에 적혀 있던 「15분」이 바로 이 함정).
  //    → vercel.json 에 **10분 주기**로 등록했다. 창을 늘리거나 주기를 바꿀 땐 «주기 ≤ 창» 을 지켜라.
  //    (중복 발송은 guest_tokens.metadata.reminder_sent_at 이 막으므로 더 촘촘해도 안전하다.)
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
  let staffPushed = 0;
  const errors: string[] = [];

  for (const session of sessions || []) {
    // 우리 팀 폰 알림 (PO 2026-07-31) — 30분 전에 스태프(admin·coordinator) 전원에게.
    // 새 발송기를 만들지 않는다: sendInAppNotification(priority 'high') 이 이미 폰 알림까지
    // 내보내는 다리와 연결돼 있다(src/lib/notifications/pushBridge.ts).
    // 중복 방지는 이메일과 같은 표식(reminder_sent_at)이 아니라 세션 자체에 남긴다 —
    // 이메일은 토큰별, 폰 알림은 세션별이라 세는 단위가 다르다.
    try {
      staffPushed += await pushStaffReminder(session.id, session.scheduled_at);
    } catch (err: any) {
      errors.push(`push session=${session.id}: ${err.message}`);
    }

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
      // 기준 주소는 siteUrl() 하나로 (VERCEL_URL 폴백 금지 — 이 링크가 곧 환자의 진료
      // 입장 경로라 배포 임시주소로 나가면 안 누른다. 사고 2026-07-22)
      const baseUrl = siteUrl();

      // 리마인더는 token 이 아닌 '이전 메일 확인' 안내 + 직접 문의 링크
      // TODO: 보다 나은 UX 는 새 토큰 발급해 새 링크 발송
      try {
        // guest = 환자 대표수신자(통합 링크) → 환자언어. patient 도 동일. 그 외(의료진)는 ko.
        const lang: any =
          token.role === "patient" || token.role === "guest"
            ? session.patient_language || "ru"
            : "ko";
        // ?lang= : 받는 사람 언어를 주소에 싣는다(메신저 미리보기 봇용, 2026-09-05)
        const inviteUrl = withLang(`${baseUrl.replace(/\/$/, "")}/consultation/${session.id}`, lang);
        const { subject, html, text } = renderConsultationInviteEmail({
          recipientName: token.invitee_name || undefined,
          inviteUrl,
          scheduledAt: session.scheduled_at,
          role: token.role,
          lang: ["ko", "en", "ru", "kz", "zh", "ja"].includes(lang) ? lang : "ko",
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

  // ── 좀비 방 청소 ──
  // 새 예약(cron)을 만들지 않고 여기 얹는다. 10분마다 도는 유일한 상담 관련 예약이고
  // 하는 일(상담 시간 관리)이 같은 갈래라 여기가 제 자리다. 실패해도 리마인더는 안 막는다.
  // 왜 필요한지·왜 기존 장치로 안 잡혔는지 → src/lib/consultation/closeStaleRooms.ts
  let staleRooms: unknown = null;
  try {
    const { closeStaleRooms } = await import("@/lib/consultation/closeStaleRooms");
    staleRooms = await closeStaleRooms();
  } catch (e: any) {
    console.warn("[cron/reminders] 좀비 방 청소 실패:", e?.message);
  }

  return Response.json({
    ok: true,
    sessionsChecked: sessions?.length || 0,
    remindersSent,
    staffPushed,
    skipped,
    errors,
    staleRooms,
  });
}

/**
 * 30분 전 «우리 팀» 폰 알림 — 스태프(admin·coordinator) 전원.
 * 이미 보낸 상담이면 아무것도 하지 않는다(같은 상담이 창에 두 번 걸려도 한 번만).
 * @returns 실제로 보낸 사람 수
 */
async function pushStaffReminder(sessionId: string, scheduledAt: string): Promise<number> {
  const TYPE = "consultation_reminder_staff";

  // 중복 방지: 이 상담으로 이미 만든 알림이 있으면 끝. (전용 표식 컬럼을 새로 만들지 않는다)
  const { data: already } = await (supabaseAdmin as any)
    .from("notifications")
    .select("id")
    .eq("type", TYPE)
    .eq("payload->>consultation_id", sessionId)
    .limit(1);
  if (already && already.length > 0) return 0;

  const { data: list } = await (supabaseAdmin as any).auth.admin.listUsers({ perPage: 200 });
  const staff = (list?.users ?? []).filter(
    (u: any) =>
      ["admin", "coordinator"].includes(u?.app_metadata?.role) &&
      // 시험용 계정(@test.com)은 뺀다 — 실적·알림 양쪽을 더럽힌다(K-02 테스트 분리 규칙)
      !String(u?.email ?? "").endsWith("@test.com")
  );
  if (staff.length === 0) return 0;

  // 한국 시간으로 «HH:MM» 만 — 스태프는 전원 한국 기준으로 일한다.
  const hhmm = new Date(scheduledAt).toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  });

  const { sendInAppNotification } = await import("@/lib/notifications/inApp");
  let sent = 0;
  for (const u of staff) {
    const id = await sendInAppNotification({
      userId: u.id,
      type: TYPE,
      title: "30분 뒤 화상상담",
      body: `${hhmm} 시작 예정입니다. 눌러서 방으로 들어가세요.`,
      link: `/consultation/${sessionId}`,
      // 'urgent' 여야 «자는 시간»(현지 22~8시)에도 나간다 — 30분 뒤 시작하는 상담은
      // 밤이라고 미루면 의미가 없다. 'high' 는 조용 시간에 눌린다(pushPolicy.ignoresQuietHours).
      priority: "urgent",
      payload: { consultation_id: sessionId },
    });
    if (id) sent++;
  }
  return sent;
}

// POST 도 허용 (Vercel Cron 은 GET 이지만 수동 트리거 편의)
export const POST = GET;
