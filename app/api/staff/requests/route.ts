/**
 * healwith: 스태프 개선 요청함 (코디·어드민 전용)
 *
 * 왜 있나 (2026-08-04 PO 제안): 코디네이터가 화면을 쓰다 «이건 좀 고쳤으면» 싶을 때
 * 그 자리에서 한 줄 적어두는 칸. PO 와 어시스턴트가 같은 목록을 본다.
 *
 * GET    — 목록 (스태프면 전부 본다. 2인 팀이라 사람별로 가릴 이유가 없다)
 * POST   — 새 요청 { body, screenPath? }
 * PATCH  — 상태·답 바꾸기 { id, status?, reply? }  (어드민만 — 「완료」 판정은 고치는 쪽이 한다)
 *
 * 🔒 staff_requests 는 RLS 상 service_role 전용 → 반드시 이 창구로만 읽고 쓴다.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

const STATUSES = ["open", "doing", "done", "parked"] as const;

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  const { data, error } = await (supabaseAdmin as any)
    .from("staff_requests")
    .select("id, author_email, screen_path, body, status, reply, created_at, resolved_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[staff/requests] 조회 실패:", error.code || "internal_error");
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
  return Response.json({ ok: true, items: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (!body) return Response.json({ ok: false, error: "empty_body" }, { status: 400 });
  if (body.length > 2000) return Response.json({ ok: false, error: "too_long" }, { status: 400 });

  const screenPath =
    typeof payload?.screenPath === "string" && payload.screenPath.startsWith("/")
      ? payload.screenPath.slice(0, 200)
      : null;

  const { data, error } = await (supabaseAdmin as any)
    .from("staff_requests")
    .insert({
      author_id: auth.userId,
      author_email: auth.email || null,
      screen_path: screenPath,
      body,
    })
    .select("id, author_email, screen_path, body, status, reply, created_at, resolved_at")
    .single();

  if (error) {
    console.error("[staff/requests] 저장 실패:", error.code || "internal_error");
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
  return Response.json({ ok: true, item: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;
  // 「완료」 도장은 고치는 쪽(어드민)만 — 요청한 사람이 스스로 닫으면 목록이 사실과 어긋난다.
  if (!auth.isAdmin) return Response.json({ ok: false, error: "admin_only" }, { status: 403 });

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const id = typeof payload?.id === "string" ? payload.id : "";
  if (!id) return Response.json({ ok: false, error: "missing_id" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof payload?.status === "string") {
    if (!STATUSES.includes(payload.status)) {
      return Response.json({ ok: false, error: "invalid_status" }, { status: 400 });
    }
    patch.status = payload.status;
    patch.resolved_at = payload.status === "done" ? new Date().toISOString() : null;
  }
  if (typeof payload?.reply === "string") patch.reply = payload.reply.slice(0, 2000);

  const { data, error } = await (supabaseAdmin as any)
    .from("staff_requests")
    .update(patch)
    .eq("id", id)
    .select("id, author_email, screen_path, body, status, reply, created_at, resolved_at")
    .single();

  if (error) {
    console.error("[staff/requests] 수정 실패:", error.code || "internal_error");
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
  return Response.json({ ok: true, item: data });
}
