/**
 * HEALO: Guest invite token 발급 — admin/coordinator/doctor 전용
 *
 * POST /api/khidi/consultation/:id/invite
 * Body: { role, inviteeName?, inviteeEmail?, expiresInHours?, maxUses? }
 *
 * 응답: { ok, inviteUrl, tokenPlain, expiresAt } — tokenPlain 은 이 순간에만 볼 수 있음
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireConsultationAccess } from "../../../../../../src/lib/auth/requireConsultationAccess";
import { generateGuestToken, type GuestRole } from "../../../../../../src/lib/auth/guestToken";
import { sendEmail } from "../../../../../../src/lib/email/sendEmail";
import { renderConsultationInviteEmail } from "../../../../../../src/lib/email/templates/consultationInvite";
import { supabaseAdmin } from "../../../../../../src/lib/rag/supabaseAdmin";

const VALID_ROLES: GuestRole[] = ["patient", "doctor", "translator", "coordinator", "observer"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: consultationId } = await params;

  // admin / doctor / coordinator 만 초대 발급 가능 (환자는 본인 세션에도 초대 발급 불가)
  const access = await requireConsultationAccess(request, consultationId, {
    requireRole: ["admin", "doctor", "coordinator"],
  });
  if (!access.success) return access.response;

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
  const maxUses = Number(body.maxUses) || 1;
  if (expiresInHours < 1 || expiresInHours > 24 * 7) {
    return Response.json(
      { ok: false, error: "expiresInHours must be 1-168 (max 1 week)" },
      { status: 400 }
    );
  }
  if (maxUses < 1 || maxUses > 20) {
    return Response.json(
      { ok: false, error: "maxUses must be 1-20" },
      { status: 400 }
    );
  }

  try {
    const result = await generateGuestToken({
      consultationId,
      role,
      inviteeName: typeof body.inviteeName === "string" ? body.inviteeName.slice(0, 100) : undefined,
      inviteeEmail: typeof body.inviteeEmail === "string" ? body.inviteeEmail.slice(0, 320) : undefined,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
      maxUses,
      createdBy: access.userId,
    });

    const origin = request.nextUrl.origin;
    const inviteUrl = result.inviteUrl(origin);

    // 이메일 자동 발송 (inviteeEmail 있을 때만)
    let emailSent = false;
    let emailError: string | undefined;
    if (body.inviteeEmail && typeof body.inviteeEmail === "string") {
      try {
        // 세션 정보 조회 (예정 시각, doctor/hospital 이름)
        const { data: session } = await supabaseAdmin
          .from("consultation_sessions")
          .select("scheduled_at")
          .eq("id", consultationId)
          .maybeSingle();

        const preferredLang =
          typeof body.lang === "string" && ["ko", "en", "ru", "kz"].includes(body.lang)
            ? body.lang
            : role === "patient"
            ? "ru"
            : "ko";

        const { subject, html, text } = renderConsultationInviteEmail({
          recipientName: body.inviteeName,
          inviteUrl,
          scheduledAt: session?.scheduled_at || new Date().toISOString(),
          role,
          lang: preferredLang as any,
        });

        const sendResult = await sendEmail({
          to: body.inviteeEmail,
          subject,
          html,
          text,
          tags: { type: "consultation_invite", consultation_id: consultationId, role },
        });
        emailSent = sendResult.ok;
        if (!sendResult.ok) emailError = sendResult.error;
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
