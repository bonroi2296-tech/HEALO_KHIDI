/**
 * healwith: 코디가 환자에게 남기는 «소식» (staff 전용)
 *
 * GET    → 목록(최신 먼저)
 * POST   → { body } 한 건 추가 — **적는 순간 환자 화면에 뜬다**
 * DELETE → { updateId } 지우기(환자 화면에서도 사라진다)
 *
 * 왜 (2026-08-05 PO, 문의 #60 이대서울병원 문의건): 지금도 환자 화면에 뜨는 메모가 있지만
 *   (`inquiries.case_status_note`) **한 칸이라 덮어쓴다.** 오늘 「문의했습니다」를 적고 모레
 *   「회신 왔습니다」를 적으면 앞의 것이 사라져, 환자는 «그동안 무슨 일이 있었나»를 못 본다.
 *
 * ⚠️ 「보이기」 스위치가 없다(서류·소견과 다르다) — 칸 이름이 「환자에게 보이는 소식」이라
 *    헷갈릴 여지가 없고, 잘못 적었으면 지우면 된다. 내부용 메모는 기존 「코디 메모」 칸이 맡는다.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

// ponytail: 새 표라 생성된 타입에 아직 없다 → `supabaseAdmin as any` (옆 파일들과 같은 방식).
const MAX_BODY = 500; // 소식 한 건 = 몇 줄. 길어지면 소견·서류 쪽에 적을 일이다.
const MAX_UPDATES = 50;

function parseId(raw: string): number | null {
  return raw && /^\d+$/.test(raw) ? Number(raw) : null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id == null) return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });

  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("case_updates")
      .select("id, body, created_at")
      .eq("inquiry_id", id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json({ ok: true, updates: data ?? [] });
  } catch (err) {
    console.error("[coordinator/updates] GET:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id == null) return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });

  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const raw = await request.json();
    const body = String(raw?.body || "").trim().slice(0, MAX_BODY);
    if (!body) return Response.json({ ok: false, error: "body_required" }, { status: 400 });

    const { count } = await (supabaseAdmin as any)
      .from("case_updates")
      .select("id", { count: "exact", head: true })
      .eq("inquiry_id", id);
    if ((count ?? 0) >= MAX_UPDATES) {
      return Response.json({ ok: false, error: "too_many" }, { status: 400 });
    }

    const { data, error } = await (supabaseAdmin as any)
      .from("case_updates")
      .insert({ inquiry_id: id, body, created_by: auth.userId })
      .select("id, body, created_at")
      .single();
    if (error) throw error;

    return Response.json({ ok: true, update: data });
  } catch (err) {
    console.error("[coordinator/updates] POST:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id == null) return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });

  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const raw = await request.json();
    const updateId = String(raw?.updateId || "");
    if (!updateId) return Response.json({ ok: false, error: "update_required" }, { status: 400 });

    const { data, error } = await (supabaseAdmin as any)
      .from("case_updates")
      .delete()
      .eq("id", updateId)
      .eq("inquiry_id", id) // 다른 문의의 소식을 남의 문의에서 못 지우게
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[coordinator/updates] DELETE:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
