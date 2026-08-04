/**
 * healwith: 접수 후 들어온 «추가 정보(글)»를 문의에 붙인다 (staff 전용)
 *
 * POST   /api/coordinator/inquiries/[id]/follow-ups  { text }      → 추가
 * GET    /api/coordinator/inquiries/[id]/follow-ups                → 목록(복호화)
 * PATCH  /api/coordinator/inquiries/[id]/follow-ups  { at, text }  → 고치기
 * DELETE /api/coordinator/inquiries/[id]/follow-ups  { at }        → 지우기
 *   ⚠️ 고치기·지우기가 꼭 필요한 이유: 여기 적은 글은 **의료진 화면에 그대로 간다.**
 *      오타·잘못 들은 내용을 되돌릴 길이 없으면 그게 그대로 판단 근거가 된다.
 *
 * 왜 (2026-08-03, 문의 #60): 접수 뒤에도 환자 상태가 계속 들어온다
 *   (*"온몸이 부어 있고 허리 양쪽이 물주머니 같다"*). 서류로는 못 받는 내용인데
 *   코디 개인 메모에 적으면 **소견 주는 의료진에게 안 간다.**
 *   여기 붙여두면 코디 화면·소견 화면·케이스 브리프가 같은 것을 본다.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { readFollowUps, appendFollowUp, editFollowUp, removeFollowUp, FOLLOWUP_MAX_LEN } from "@/lib/inquiry/followUps";

async function load(id: number) {
  const { data } = await supabaseAdmin.from("inquiries").select("id, follow_ups").eq("id", id).maybeSingle();
  return data;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id || !/^\d+$/.test(id)) return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });

  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  const row = await load(Number(id));
  if (!row) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  return Response.json({ ok: true, followUps: readFollowUps((row as any).follow_ups) });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id || !/^\d+$/.test(id)) return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });

  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const text = String(body?.text || "").trim();
    if (text.length < 2) return Response.json({ ok: false, error: "text_required" }, { status: 400 });
    if (text.length > FOLLOWUP_MAX_LEN) return Response.json({ ok: false, error: "text_too_long" }, { status: 400 });

    const row = await load(Number(id));
    if (!row) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

    const by = auth.email || "코디네이터";
    const next = appendFollowUp((row as any).follow_ups, text, by);

    const { error } = await supabaseAdmin
      .from("inquiries")
      .update({ follow_ups: next } as any)
      .eq("id", Number(id));
    if (error) {
      console.error("[follow-ups] update:", error.message);
      return Response.json({ ok: false, error: "save_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, followUps: readFollowUps(next) });
  } catch (err) {
    console.error("[follow-ups] exception:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

/** 고치기·지우기 — 여기 적은 글은 의료진에게 그대로 가므로 되돌릴 길이 있어야 한다. */
async function mutate(request: NextRequest, id: number, mode: "edit" | "remove") {
  const body = await request.json().catch(() => ({}));
  const at = String(body?.at || "");
  if (!at) return Response.json({ ok: false, error: "at_required" }, { status: 400 });

  const row = await load(id);
  if (!row) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

  let next;
  if (mode === "edit") {
    const text = String(body?.text || "").trim();
    if (text.length < 2) return Response.json({ ok: false, error: "text_required" }, { status: 400 });
    if (text.length > FOLLOWUP_MAX_LEN) return Response.json({ ok: false, error: "text_too_long" }, { status: 400 });
    next = editFollowUp((row as any).follow_ups, at, text);
  } else {
    next = removeFollowUp((row as any).follow_ups, at);
  }
  if (!next) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

  const { error } = await supabaseAdmin.from("inquiries").update({ follow_ups: next } as any).eq("id", id);
  if (error) {
    console.error("[follow-ups] mutate:", error.message);
    return Response.json({ ok: false, error: "save_failed" }, { status: 500 });
  }
  return Response.json({ ok: true, followUps: readFollowUps(next) });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id || !/^\d+$/.test(id)) return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;
  try { return await mutate(request, Number(id), "edit"); }
  catch (err) { console.error("[follow-ups] PATCH:", err); return Response.json({ ok: false, error: "internal_error" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id || !/^\d+$/.test(id)) return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;
  try { return await mutate(request, Number(id), "remove"); }
  catch (err) { console.error("[follow-ups] DELETE:", err); return Response.json({ ok: false, error: "internal_error" }, { status: 500 }); }
}
