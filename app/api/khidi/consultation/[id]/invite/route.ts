/**
 * healwith: Guest invite token 발급 — admin/coordinator/doctor 전용
 *
 * POST /api/khidi/consultation/:id/invite
 * Body: { role, inviteeName?, inviteeEmail?, expiresInHours?, maxUses? }
 *
 * 응답: { ok, inviteUrl, tokenPlain, expiresAt } — tokenPlain 은 이 순간에만 볼 수 있음
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { generateGuestToken, type GuestRole } from "@/lib/auth/guestToken";
import { resolveInviteExpiry } from "@/lib/auth/inviteExpiry";
import { sendEmail } from "@/lib/email/sendEmail";
import { renderConsultationInviteEmail } from "@/lib/email/templates/consultationInvite";
import { buildConsultationIcs } from "@/lib/email/icsInvite";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { siteUrl } from "@/lib/siteUrl";
import { normalizeLocaleParam } from "@/lib/i18n/guestLinkLang";
import { logAdminAction, getIpFromRequest, getUserAgentFromRequest } from "@/lib/audit/adminAuditLog";

const VALID_ROLES: GuestRole[] = ["patient", "doctor", "translator", "coordinator", "observer", "guest"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: consultationId } = await params;

  // 스태프(코디·어드민) 계정이면 어느 상담이든 초대 링크 발급 가능.
  //   ⚠️ 이전엔 requireConsultationAccess(requireRole)로 '이 상담의 담당 코디/의사로 지정됐는지'까지
  //   요구했는데, 상담 생성 시 담당 코디가 안 채워지는 경우가 많아(placeholder) 코디가 자기가 만든
  //   상담에도 'insufficient_role'로 링크를 못 뽑는 버그가 반복됐다(PO 제보). 코디는 대시보드에서
  //   모든 상담을 관리하므로, 세션별 지정이 아니라 '스태프 계정'이면 발급 허용한다.
  const access = await requirePortalAuth(request, { staffOnly: true });
  if (!access.success) return access.response;

  // 대상 상담이 실제로 존재하는지 확인(없는 id로 토큰 생성 방지)
  // + 예약시각을 같이 읽는다 — 만료가 미팅보다 먼저 오지 않게 하는 데 쓰임(아래 resolveInviteExpiry)
  let sessionScheduledAt: string | null = null;
  {
    const { data: sessionRows, error: sessionErr } = await supabaseAdmin
      .from("consultation_sessions")
      .select("id, scheduled_at")
      .eq("id", consultationId)
      .limit(1);
    // 조회 자체가 실패한 걸 "상담 없음(404)"으로 보고하면 안 된다 — 스태프는 멀쩡한 상담을
    // 사라진 걸로 오해하고, 진짜 원인(DB 장애)이 묻힌다. 실패-닫힘: 토큰은 안 만든다.
    if (sessionErr) {
      console.error("[khidi/invite] session lookup error:", sessionErr.message);
      return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
    if (!sessionRows?.length) {
      return Response.json(
        { ok: false, error: "consultation_not_found" },
        { status: 404 }
      );
    }
    sessionScheduledAt = (sessionRows[0] as any)?.scheduled_at ?? null;
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const role = body.role as GuestRole;
  if (!role || !VALID_ROLES.includes(role)) {
    return Response.json(
      { ok: false, error: `invalid role — must be one of ${VALID_ROLES.join(",")}` },
      { status: 400 }
    );
  }

  const expiresInHours = Number(body.expiresInHours) || 24;
  // maxUses 0 = 만료 전까지 무제한(회수 제한 제거, PO 2026-07-15). 미지정도 0(무제한).
  const maxUses = body.maxUses === undefined || body.maxUses === null ? 0 : Number(body.maxUses);
  if (expiresInHours < 1 || expiresInHours > 24 * 7) {
    return Response.json(
      { ok: false, error: "expiresInHours must be 1-168 (max 1 week)" },
      { status: 400 }
    );
  }
  // 0(무제한) 허용. 상한은 폭주 방지용 넉넉한 값만 유지(만료가 진짜 안전선).
  if (!Number.isInteger(maxUses) || maxUses < 0 || maxUses > 1000) {
    return Response.json(
      { ok: false, error: "maxUses must be 0 (unlimited) or 1-1000" },
      { status: 400 }
    );
  }

  // 만료시각: 요청분(기본 72h)과 «예약시각 + 유예 12h» 중 늦은 쪽 (POSTMORTEM #130).
  //   발급 시점 기준 고정 시간만 쓰면, 미팅이 연기되거나 링크를 미리 뽑아둔 경우
  //   상담 당일 링크가 이미 죽어 있다(실제 사고: 7/24 발급 링크가 7/27 미팅 5시간 전 만료).
  const { expiresAt, extendedForSchedule } = resolveInviteExpiry({
    expiresInHours,
    scheduledAt: sessionScheduledAt,
  });

  try {
    // 수신 이메일 = 요청에 명시된 주소 **하나뿐**. 비어 있으면 메일을 보내지 않는다.
    // ⛔ 예전엔 patient_user_id 의 auth 이메일로 폴백했다가 사고가 났다(2026-07-31):
    //    모달이 환자계정 미선택 시 patient_user_id 에 «만든 사람»을 placeholder 로 박는데,
    //    나중에 다른 스태프가 목록에서 「시작」·「링크 복사」를 누르면 요청자≠환자 가드가 뚫려
    //    상담을 만든 코디 본인에게 초대 메일이 날아갔다(누를 때마다 1통).
    //    → 주소를 «추측»하지 않는다. 빈칸 = 보내지 마라.
    const resolvedEmail =
      typeof body.inviteeEmail === "string" && body.inviteeEmail.includes("@")
        ? body.inviteeEmail.slice(0, 320)
        : undefined;

    const result = await generateGuestToken({
      consultationId,
      role,
      inviteeName: typeof body.inviteeName === "string" ? body.inviteeName.slice(0, 100) : undefined,
      inviteeEmail: resolvedEmail,
      expiresAt,
      maxUses,
      createdBy: access.userId,
    });

    // 환자에게 나가는 진료 입장 링크는 정본 도메인 고정 — request origin 을 쓰면 스태프가
    // admin 을 배포 임시주소(.vercel.app)로 열었을 때 그 주소가 환자 첫 링크로 샌다(피싱처럼
    // 보여 안 누름). 토큰은 공용 프로덕션 DB 라 어느 배포에서 만들어도 healwith.co.kr 에서 유효.
    // 받는 사람 언어를 주소에 싣는다(?lang=) — 코디가 이 주소를 왓츠앱·텔레그램에 붙여넣을 때 미리보기 봇이
    // 제 언어 카드를 만들게(2026-09-05). 본문에 lang 이 오면 그것, 환자·게스트면 세션의 환자 언어, 의료진이면 ko.
    const bodyLang = normalizeLocaleParam((body as any).lang);
    let linkLang: string | null = bodyLang ?? (role === "patient" || role === "guest" ? null : "ko");
    if (!linkLang) {
      const { data: s0 } = await supabaseAdmin
        .from("consultation_sessions")
        .select("patient_language")
        .eq("id", consultationId)
        .maybeSingle();
      linkLang = (s0 as any)?.patient_language || "ru";
    }
    const inviteUrl = result.inviteUrl(siteUrl(), linkLang);

    // 이메일 자동 발송 (해소된 수신 이메일 있을 때만 — 명시 입력 또는 환자계정 폴백)
    let emailSent = false;
    let emailError: string | undefined;
    if (resolvedEmail) {
      try {
        // 세션 + 병원 + 의사 정보 조회 (이메일 본문에 표시)
        const { data: session, error: sessionReadErr } = await supabaseAdmin
          .from("consultation_sessions")
          .select(
            "scheduled_at, hospital_id, partner_doctor_id, patient_language"
          )
          .eq("id", consultationId)
          .maybeSingle();

        // 예약시각을 못 읽었는데 메일을 보내면 안 된다 — 아래 기본값(now)이 환자에게
        // "지금 바로 상담" 이라고 통지해 빈 방으로 부른다. 링크는 응답에 그대로 실리니
        // 스태프가 수동 전달/재시도할 수 있다(실패-닫힘).
        if (sessionReadErr) throw new Error(`session_read_failed: ${sessionReadErr.message}`);
        if (!(session as any)?.scheduled_at) throw new Error("scheduled_at_missing");

        let hospitalName: string | undefined;
        let hospitalAddress: string | undefined;
        let doctorName: string | undefined;
        let doctorSpecialty: string | undefined;

        const sessionAny = session as any;
        if (sessionAny?.hospital_id) {
          const { data: hospital } = await supabaseAdmin
            .from("hospitals")
            .select("name, address")
            .eq("id", sessionAny.hospital_id)
            .maybeSingle();
          if (hospital) {
            hospitalName = (hospital as any).name || undefined;
            hospitalAddress = (hospital as any).address || undefined;
          }
        }
        if (sessionAny?.partner_doctor_id) {
          const { data: doctor } = await supabaseAdmin
            .from("partner_doctors")
            .select("name_ko, name_en, position_ko, subspecialty")
            .eq("id", sessionAny.partner_doctor_id)
            .maybeSingle();
          if (doctor) {
            const d = doctor as any;
            doctorName = d.name_ko || d.name_en || undefined;
            doctorSpecialty = d.subspecialty || d.position_ko || undefined;
          }
        }

        const preferredLang =
          typeof body.lang === "string" && ["ko", "en", "ru", "kz", "zh", "ja"].includes(body.lang)
            ? body.lang
            : role === "patient" || role === "guest"
            ? sessionAny?.patient_language || "ru"
            : "ko";

        const { subject, html, text } = renderConsultationInviteEmail({
          recipientName: body.inviteeName,
          inviteUrl,
          scheduledAt: sessionAny.scheduled_at,
          role,
          hospitalName,
          hospitalAddress,
          doctorName,
          doctorSpecialty,
          lang: ["ko", "en", "ru", "kz", "zh", "ja"].includes(preferredLang)
            ? (preferredLang as any)
            : "ko",
        });

        // 일정 파일 첨부 — 받는 사람 달력이 «자기 시간대»로 그려준다(국가를 물어볼 필요 없음).
        const sendResult = await sendEmail({
          to: resolvedEmail,
          subject,
          html,
          text,
          attachments: [
            {
              filename: "healwith-consultation.ics",
              content: buildConsultationIcs({
                uid: consultationId,
                scheduledAt: sessionAny.scheduled_at,
                joinUrl: inviteUrl,
                lang: preferredLang,
              }),
              contentType: "text/calendar; charset=utf-8; method=PUBLISH",
            },
          ],
          tags: { type: "consultation_invite", consultation_id: consultationId, role },
        });
        // provider === "console" 은 메일러 미설정(개발 폴백) → 실제 발송 안 됨. 정직하게 미발송 처리.
        emailSent = sendResult.ok && sendResult.provider !== "console";
        if (!sendResult.ok) emailError = sendResult.error;
        else if (sendResult.provider === "console") emailError = "email_not_configured";
      } catch (mailErr: any) {
        console.warn("[invite] email send failed:", mailErr.message);
        emailError = mailErr.message;
      }
    }

    // 권한 감사 C 보완(2026-07-24): 발급은 전 스태프 허용 유지(담당 미지정 실무 — 위 주석의 실버그
    // 재발 방지) 대신, "누가 어느 상담의 초대 토큰을 만들었는지"를 감사로그로 남겨 추적성 확보.
    // best-effort — 로그 실패가 발급을 막지 않는다(logAdminAction 내부 catch).
    logAdminAction({
      adminEmail: access.email || "unknown",
      adminUserId: access.userId,
      action: "CREATE_CONSULTATION_INVITE",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: {
        consultation_id: consultationId,
        invite_role: role,
        max_uses: maxUses,
        email_sent: emailSent,
        expires_at: result.expiresAt.toISOString(),
        // 예약시각 때문에 만료가 요청분보다 늘어났는지 — 사고(#130) 이후 동작 추적용
        expiry_extended_for_schedule: extendedForSchedule,
      },
    });

    return Response.json({
      ok: true,
      tokenPlain: result.tokenPlain,
      tokenId: result.tokenId,
      inviteUrl,
      expiresAt: result.expiresAt.toISOString(),
      role,
      maxUses,
      emailSent,
      emailError,
    });
  } catch (err: any) {
    console.error("[invite] error:", err.message);
    return Response.json({ ok: false, error: "invite_failed" }, { status: 500 });
  }
}
