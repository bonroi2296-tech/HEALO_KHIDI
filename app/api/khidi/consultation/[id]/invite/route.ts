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
import { sendEmail } from "@/lib/email/sendEmail";
import { renderConsultationInviteEmail } from "@/lib/email/templates/consultationInvite";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

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
  {
    const { data: sessionExists } = await supabaseAdmin
      .from("consultation_sessions")
      .select("id")
      .eq("id", consultationId)
      .maybeSingle();
    if (!sessionExists) {
      return Response.json(
        { ok: false, error: "consultation_not_found" },
        { status: 404 }
      );
    }
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

  try {
    // 수신 이메일 해소: 명시 inviteeEmail 우선. 없고 role 이 patient/guest(대표 수신자=환자)면
    // 상담의 patient_user_id 로 auth 이메일 폴백 → 계정 환자도 초대+리마인더가 자동 도달.
    // ⚠ 모달은 환자계정 미선택 시 patient_user_id 를 요청자(코디) 본인으로 placeholder 채움
    //   → 그 경우 코디 본인에게 메일 가는 걸 막으려 patient_user_id === 요청자면 폴백 안 함.
    let resolvedEmail =
      typeof body.inviteeEmail === "string" && body.inviteeEmail.includes("@")
        ? body.inviteeEmail.slice(0, 320)
        : undefined;
    if (!resolvedEmail && (role === "patient" || role === "guest")) {
      const { data: s } = await supabaseAdmin
        .from("consultation_sessions")
        .select("patient_user_id")
        .eq("id", consultationId)
        .maybeSingle();
      const pid = (s as any)?.patient_user_id;
      if (pid && pid !== access.userId) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(pid);
        if (u?.user?.email) resolvedEmail = u.user.email;
      }
    }

    const result = await generateGuestToken({
      consultationId,
      role,
      inviteeName: typeof body.inviteeName === "string" ? body.inviteeName.slice(0, 100) : undefined,
      inviteeEmail: resolvedEmail,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
      maxUses,
      createdBy: access.userId,
    });

    const origin = request.nextUrl.origin;
    const inviteUrl = result.inviteUrl(origin);

    // 이메일 자동 발송 (해소된 수신 이메일 있을 때만 — 명시 입력 또는 환자계정 폴백)
    let emailSent = false;
    let emailError: string | undefined;
    if (resolvedEmail) {
      try {
        // 세션 + 병원 + 의사 정보 조회 (이메일 본문에 표시)
        const { data: session } = await supabaseAdmin
          .from("consultation_sessions")
          .select(
            "scheduled_at, hospital_id, partner_doctor_id, patient_language"
          )
          .eq("id", consultationId)
          .maybeSingle();

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
          scheduledAt: sessionAny?.scheduled_at || new Date().toISOString(),
          role,
          hospitalName,
          hospitalAddress,
          doctorName,
          doctorSpecialty,
          lang: ["ko", "en", "ru", "kz", "zh", "ja"].includes(preferredLang)
            ? (preferredLang as any)
            : "ko",
        });

        const sendResult = await sendEmail({
          to: resolvedEmail,
          subject,
          html,
          text,
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
