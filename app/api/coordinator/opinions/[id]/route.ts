/**
 * healwith: 세컨드 오피니언 — 코디가 소견의 '귀속'을 라벨 + 에이전시 공개 (staff 전용)
 *
 * PATCH /api/coordinator/opinions/[id]
 *   - attributionNote  → '그 외 의료진'이 남긴 소견에 "누구 소견인지" 라벨.
 *   - releasedText      → 코디가 교정/번역한 확정본. 지정 시 released_at·released_by 도 같이 찍혀
 *                          그 순간부터 에이전시 케이스 화면에 노출된다(원본 opinion_text 는 절대 안 보냄).
 *   - release: false    → 공개 철회(released_text/at 초기화, 에이전시 화면에서 다시 숨김).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  const { id } = await context.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const update: Record<string, any> = {};

    if (typeof body?.attributionNote === "string") {
      update.attribution_note = body.attributionNote.slice(0, 300).trim() || null;
    }
    if (typeof body?.releasedText === "string") {
      const text = body.releasedText.slice(0, 5000).trim();
      if (!text) return Response.json({ ok: false, error: "released_text_empty" }, { status: 400 });
      update.released_text = text;
      update.released_at = new Date().toISOString();
      update.released_by = auth.userId;
    }
    if (body?.release === false) {
      update.released_text = null;
      update.released_at = null;
      update.released_by = null;
    }
    if (Object.keys(update).length === 0) {
      return Response.json({ ok: false, error: "no_fields" }, { status: 400 });
    }

    const { data, error } = await (supabaseAdmin as any)
      .from("case_opinions")
      .update(update)
      .eq("id", id)
      .select("id, attribution_note, released_text, released_at")
      .single();

    if (error || !data) {
      return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    return Response.json({ ok: true, ...data });
  } catch (e: any) {
    console.error("[coordinator/opinions/:id] PATCH error:", e?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
