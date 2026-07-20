/**
 * healwith: Consultation Messages API
 *
 * POST /api/khidi/consultation/[id]/messages — 메시지 송신 (참가자 only)
 * GET  /api/khidi/consultation/[id]/messages — 메시지 조회 (참가자 only)
 *
 * 변경 이력:
 * - 2026-04-17 (보안): 미인증 → requireConsultationAccess.
 *   sender_id/sender_role 은 인증된 사용자 + 참가자 role 강제 (스푸핑 방지).
 */

export const runtime = "nodejs";

import { encryptStringNullable } from "@/lib/security/encryptionV2";
import { readTranscriptField } from "@/lib/consultation/transcriptCrypto";
import { NextRequest } from "next/server";
import { resolveConsultationActor } from "@/lib/auth/requireConsultationAccess";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;

    const access = await resolveConsultationActor(request, consultationId);
    if (!access.success) return access.response;

    const payload = await request.json();
    if (!payload.messageText || typeof payload.messageText !== "string") {
      return Response.json(
        { ok: false, error: "messageText is required" },
        { status: 400 }
      );
    }

    const messageText = payload.messageText.trim();
    if (messageText.length === 0 || messageText.length > 5000) {
      return Response.json(
        { ok: false, error: "messageText length 1-5000" },
        { status: 400 }
      );
    }

    const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");

    // sender_id 와 sender_role 은 클라이언트가 보내도 무시하고 인증 정보로 강제
    const { data, error } = await supabaseAdmin
      .from("consultation_messages")
      .insert([
        {
          session_id: consultationId,
          sender_id: access.userId,
          sender_role: access.role,
          // 채팅 본문도 암호문으로만 저장(평문 컬럼 null) — 상담 채팅에도 증상·진단이 오간다.
          message: null,
          message_encrypted: encryptStringNullable(messageText),
          translated_text: null,
          translated_text_encrypted: encryptStringNullable(payload.translatedText || null),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[api/khidi/consultation/messages] Insert error:", error.message);
      return Response.json(
        { ok: false, error: "insert_failed" },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, data });
  } catch (error: any) {
    console.error("[api/khidi/consultation/messages] Exception:", error?.message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;

    const access = await resolveConsultationActor(request, consultationId);
    if (!access.success) return access.response;

    const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data, count, error } = await supabaseAdmin
      .from("consultation_messages")
      .select("*", { count: "exact" })
      .eq("session_id", consultationId)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[api/khidi/consultation/messages] GET error:", error.message);
      return Response.json(
        { ok: false, error: "fetch_failed" },
        { status: 500 }
      );
    }

    // 암호문을 평문화하고, 암호문 컬럼은 응답에서 제거(select("*") 라 그냥 두면 그대로 나간다).
    const messages = (data || []).map((r: any) => {
      const { message_encrypted, translated_text_encrypted, ...rest } = r;
      return {
        ...rest,
        message: readTranscriptField(message_encrypted, r.message),
        translated_text: readTranscriptField(translated_text_encrypted, r.translated_text),
      };
    });

    return Response.json({
      ok: true,
      data: messages,
      total: count,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("[api/khidi/consultation/messages] GET exception:", error?.message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
