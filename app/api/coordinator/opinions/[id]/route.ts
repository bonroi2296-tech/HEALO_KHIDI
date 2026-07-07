/**
 * healwith: 세컨드 오피니언 — 코디가 소견의 '귀속'을 라벨 (staff 전용)
 *
 * PATCH /api/coordinator/opinions/[id]  → attribution_note 갱신.
 *   '그 외 의료진'이 남긴 소견에 "누구 소견인지"를 코디가 나중에 채운다(대표/코디는 누구한테 보냈는지 아니까).
 *   명단 원장이 남긴 것도 필요하면 여기서 보정 가능.
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
    if (typeof body?.attributionNote !== "string") {
      return Response.json({ ok: false, error: "attribution_required" }, { status: 400 });
    }
    const attribution = body.attributionNote.slice(0, 300).trim() || null;

    const { data, error } = await (supabaseAdmin as any)
      .from("case_opinions")
      .update({ attribution_note: attribution })
      .eq("id", id)
      .select("id, attribution_note")
      .single();

    if (error || !data) {
      return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    return Response.json({ ok: true, id: data.id, attribution_note: data.attribution_note });
  } catch (e: any) {
    console.error("[coordinator/opinions/:id] PATCH error:", e?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
