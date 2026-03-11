/**
 * HEALO: public_token 회전(재발급) API (서버 전용)
 * 유출 대응을 위해 토큰 재발급
 * 보안: INTERNAL_ADMIN_SECRET 환경변수로 보호
 * 
 * ✅ P0 수정: 런타임 명시 (Node.js)
 * 
 * 이유:
 * - DB 관리자 접근 (SERVICE_ROLE_KEY 사용)
 * - Edge 런타임에서 발생할 수 있는 예측 불가 오류 방지
 */
export const runtime = "nodejs";

import { supabaseAdmin, assertSupabaseEnv } from "../../../../src/lib/rag/supabaseAdmin";
import { NextRequest } from "next/server";

function randomUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function POST(request: NextRequest) {
  assertSupabaseEnv();
  try {
    const body = await request.json().catch(() => ({}));
    const inquiryId = body?.inquiryId != null
      ? (typeof body.inquiryId === "number" ? body.inquiryId : Number(body.inquiryId))
      : null;
    const adminSecret = body?.adminSecret ? String(body.adminSecret) : null;

    const expectedSecret = process.env.INTERNAL_ADMIN_SECRET;
    if (!expectedSecret) {
      console.error("[api/inquiries/rotate-token] INTERNAL_ADMIN_SECRET not set");
      return Response.json(
        { ok: false, error: "admin_secret_not_configured" },
        { status: 500 }
      );
    }

    if (!adminSecret || adminSecret !== expectedSecret) {
      console.error("[api/inquiries/rotate-token] invalid or missing adminSecret");
      return Response.json(
        { ok: false, error: "invalid_admin_secret" },
        { status: 403 }
      );
    }

    if (inquiryId == null || isNaN(inquiryId)) {
      return Response.json(
        { ok: false, error: "inquiry_id_required" },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("inquiries")
      .select("id")
      .eq("id", inquiryId)
      .maybeSingle();

    if (fetchError) {
      console.error("[api/inquiries/rotate-token] fetch error:", fetchError);
      return Response.json(
        { ok: false, error: "inquiry_fetch_failed" },
        { status: 500 }
      );
    }

    if (!existing) {
      console.error("[api/inquiries/rotate-token] inquiry not found:", inquiryId);
      return Response.json(
        { ok: false, error: "inquiry_not_found" },
        { status: 404 }
      );
    }

    const newToken = randomUUID();

    const { error: updateError } = await supabaseAdmin
      .from("inquiries")
      .update({
        public_token: newToken,
        public_token_rotated_at: new Date().toISOString(),
      })
      .eq("id", inquiryId);

    if (updateError) {
      console.error("[api/inquiries/rotate-token] update error:", updateError);
      return Response.json(
        { ok: false, error: "token_rotate_failed" },
        { status: 500 }
      );
    }

    console.log("[api/inquiries/rotate-token] success:", { inquiryId });
    return Response.json({
      ok: true,
      publicToken: newToken,
    });
  } catch (error: any) {
    console.error("[api/inquiries/rotate-token] error:", error);
    return Response.json(
      { ok: false, error: error?.message || "rotate_failed" },
      { status: 500 }
    );
  }
}
