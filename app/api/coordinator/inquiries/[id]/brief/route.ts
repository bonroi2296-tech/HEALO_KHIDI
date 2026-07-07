/**
 * healwith: 코디 케이스 브리프 생성 API (staff 전용)
 *
 * POST /api/coordinator/inquiries/[id]/brief
 * → 문의 1건의 인테이크+메시지+첨부를 Gemini가 읽고 코디용 브리프(개요·요청·볼포인트·플래그)를 만든다.
 * 저장하지 않음(on-demand). inquiries 는 service_role 전용 → 서버 경유. PII 복호화는 staff 인증 후.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptInquiryForAdmin } from "@/lib/security/decryptForAdmin";
import { generateCaseBrief } from "@/lib/inquiry/caseBrief";

const BRIEF_FIELDS = [
  "id", "nationality", "cancer_type", "message", "preferred_date", "intake", "attachments",
].join(",");

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id || !/^\d+$/.test(id)) {
    return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const { data, error } = await supabaseAdmin
      .from("inquiries")
      .select(BRIEF_FIELDS)
      .eq("id", Number(id))
      .single();

    if (error) {
      if (error.code === "PGRST116") return Response.json({ ok: false, error: "not_found" }, { status: 404 });
      console.error("[coordinator/brief] query error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    // PII 복호화(staff 인증 후 서버에서만) — 브리프는 복호화된 message·intake 로 생성.
    let inquiry: any = data;
    try {
      inquiry = await decryptInquiryForAdmin(data);
    } catch (e: any) {
      console.error("[coordinator/brief] decrypt error:", e?.message);
    }

    const result = await generateCaseBrief({
      inquiry,
      attachments: Array.isArray(inquiry?.attachments) ? inquiry.attachments : [],
    });

    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 502 });
    }
    return Response.json({ ok: true, brief: result.brief, unreadableCount: result.unreadableCount });
  } catch (e: any) {
    console.error("[coordinator/brief] internal error:", e?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
