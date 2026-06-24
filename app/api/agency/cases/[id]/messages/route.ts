/**
 * healwith: 에이전시 ↔ 코디네이터 양방향 메신저 (케이스 단위)
 *
 * GET  /api/agency/cases/[id]/messages
 *   - 본인 에이전시 케이스의 대화 스레드 조회(없으면 생성). 메시지 목록 반환 + 읽음 표시.
 * POST /api/agency/cases/[id]/messages   Body: { text }
 *   - 에이전시가 코디에게 메시지 전송. 스레드 status=waiting_coordinator 로 전환.
 *
 * 재활용: chat_threads / chat_messages (환자 챗과 동일 테이블, channel='agency' 로 구분).
 *   → 코디는 기존 /coordinator/messages 콘솔에서 그대로 보고 답장(actor_type=coordinator).
 * 보안: checkAgencyAuth + 본인 에이전시 케이스(agency_id) 검증. service_role 경유(RLS 우회).
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { checkAgencyAuth } from "@/lib/auth/checkAgencyAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";

// 본인 에이전시 케이스인지 확인하고 inquiry 반환 (IDOR 차단)
async function ownInquiry(inquiryId: number, agencyId: string) {
  const { data } = await (supabaseAdmin as any)
    .from("inquiries")
    .select("id, agency_id")
    .eq("id", inquiryId)
    .maybeSingle();
  return data && data.agency_id === agencyId ? data : null;
}

// 케이스 스레드 find-or-create (케이스당 channel='agency' 스레드 1개)
async function getOrCreateThread(inquiryId: number, agencyId: string, agencyName?: string) {
  const { data: existing } = await (supabaseAdmin as any)
    .from("chat_threads")
    .select("id, metadata, status")
    .eq("inquiry_id", inquiryId)
    .eq("channel", "agency")
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await (supabaseAdmin as any)
    .from("chat_threads")
    .insert({
      inquiry_id: inquiryId,
      channel: "agency",
      status: "open",
      subject: `🏥 에이전시 문의 · #${inquiryId}`,
      metadata: { agency_id: agencyId, agency_name: agencyName || null },
    })
    .select("id, metadata, status")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAgencyAuth(request);
  if (!auth.isAgencyUser || !auth.agencyId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }
  try {
    assertSupabaseEnv();
    const { id } = await params;
    const inquiryId = Number(id);
    if (!inquiryId) return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
    if (!(await ownInquiry(inquiryId, auth.agencyId))) {
      return NextResponse.json({ ok: false, error: "not_your_case" }, { status: 403 });
    }

    const thread = await getOrCreateThread(inquiryId, auth.agencyId, auth.agencyName);

    const { data: messages, error } = await (supabaseAdmin as any)
      .from("chat_messages")
      .select("id, actor_type, message_text, created_at")
      .eq("thread_id", thread.id)
      .eq("is_internal", false)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) {
      console.error("[agency/messages GET]", error.message);
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    // 읽음 표시 — 에이전시가 열었으니 last_read 갱신(미읽음 뱃지 0으로)
    await (supabaseAdmin as any)
      .from("chat_threads")
      .update({ metadata: { ...(thread.metadata || {}), agency_last_read_at: new Date().toISOString() } })
      .eq("id", thread.id);

    return NextResponse.json({ ok: true, threadId: thread.id, messages: messages || [] });
  } catch (err: any) {
    console.error("[agency/messages GET] exception:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAgencyAuth(request);
  if (!auth.isAgencyUser || !auth.agencyId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }
  try {
    assertSupabaseEnv();
    const { id } = await params;
    const inquiryId = Number(id);
    if (!inquiryId) return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
    if (!(await ownInquiry(inquiryId, auth.agencyId))) {
      return NextResponse.json({ ok: false, error: "not_your_case" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const text = String(body?.text || "").trim().slice(0, 4000);
    if (!text) return NextResponse.json({ ok: false, error: "text_required" }, { status: 400 });

    const thread = await getOrCreateThread(inquiryId, auth.agencyId, auth.agencyName);

    const { data: msg, error } = await (supabaseAdmin as any)
      .from("chat_messages")
      .insert({
        thread_id: thread.id,
        actor_type: "agency",
        actor_id: auth.userId || null,
        message_text: text,
        is_internal: false,
      })
      .select("id, actor_type, message_text, created_at")
      .single();
    if (error || !msg) {
      console.error("[agency/messages POST]", error?.message);
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    // 코디 응답 대기로 전환 → 코디 콘솔 "응답 필요" 필터에 노출
    const now = new Date().toISOString();
    await (supabaseAdmin as any)
      .from("chat_threads")
      .update({ status: "waiting_coordinator", updated_at: now, last_active_at: now })
      .eq("id", thread.id);

    return NextResponse.json({ ok: true, message: msg });
  } catch (err: any) {
    console.error("[agency/messages POST] exception:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
