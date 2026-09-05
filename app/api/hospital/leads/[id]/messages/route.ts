/**
 * healwith: 국내병원 ↔ 코디네이터 양방향 메신저 (리드 단위) — 2026-07-15
 *
 * GET  /api/hospital/leads/[id]/messages   ([id] = hospital_leads.id)
 *   - 본인 병원 리드의 대화 스레드 조회(없으면 생성). 메시지 목록 + 읽음 표시.
 * POST /api/hospital/leads/[id]/messages   Body: { text }
 *   - 병원이 코디에게 메시지 전송. 스레드 status=waiting_coordinator → 코디 콘솔 "응답 필요" 노출
 *     + 코디/어드민 종(bell) 알림.
 *
 * 재활용: chat_threads / chat_messages (에이전시 메신저와 동일 테이블, channel='hospital' 로 구분).
 *   → 코디는 기존 /coordinator/messages 콘솔에서 그대로 봄(actor_type='hospital' 버블).
 * 스키마 마찰 해소: chat_threads.inquiry_id 는 inquiries(정수) FK 라, 병원 리드(→ normalized_inquiries)
 *   를 source_inquiry_id 로 되짚어 에이전시 스레드와 같은 키 공간(원본 inquiry)을 쓴다 → 한 환자의
 *   병원·에이전시 대화가 코디 콘솔에서 일원화됨.
 * 보안: checkHospitalAuth + 리드의 hospital_id 소유검증(IDOR 차단). service_role 경유(RLS 우회).
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { checkHospitalAuth } from "@/lib/auth/checkHospitalAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";

// 병원 리드([id]=hospital_leads.id) 소유검증 후 원본 inquiry id 로 해석.
async function resolveLead(leadId: string, hospitalId: string): Promise<number | null> {
  const { data: lead } = await (supabaseAdmin as any)
    .from("hospital_leads")
    .select("id, hospital_id, normalized_inquiry_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead || lead.hospital_id !== hospitalId) return null; // 남의 병원 리드 차단(IDOR)
  if (!lead.normalized_inquiry_id) return null;
  const { data: norm } = await (supabaseAdmin as any)
    .from("normalized_inquiries")
    .select("source_inquiry_id")
    .eq("id", lead.normalized_inquiry_id)
    .maybeSingle();
  const inquiryId = norm?.source_inquiry_id ? Number(norm.source_inquiry_id) : null;
  return inquiryId && !Number.isNaN(inquiryId) ? inquiryId : null;
}

// 리드 스레드 find-or-create (원본 inquiry당 channel='hospital' 스레드 1개)
async function getOrCreateThread(inquiryId: number, hospitalId: string, hospitalName?: string) {
  // (inquiry_id, channel) 유니크 제약 부재 — agency 쪽과 같은 이유로 limit(1) + 실패-닫힘.
  const { data: existingRows, error: existingErr } = await (supabaseAdmin as any)
    .from("chat_threads")
    .select("id, metadata, status")
    .eq("inquiry_id", inquiryId)
    .eq("channel", "hospital")
    .limit(1);
  if (existingErr) throw new Error(existingErr.message);
  if (existingRows?.[0]) return existingRows[0];

  const { data: created, error } = await (supabaseAdmin as any)
    .from("chat_threads")
    .insert({
      inquiry_id: inquiryId,
      channel: "hospital",
      status: "open",
      subject: `🏥 병원 문의 · #${inquiryId}`,
      metadata: { hospital_id: hospitalId, hospital_name: hospitalName || null },
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
  const auth = await checkHospitalAuth(request);
  if (!auth.isHospitalUser || !auth.hospitalId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }
  try {
    assertSupabaseEnv();
    const { id } = await params;
    const inquiryId = await resolveLead(id, auth.hospitalId);
    if (!inquiryId) {
      return NextResponse.json({ ok: false, error: "not_your_lead" }, { status: 403 });
    }

    const thread = await getOrCreateThread(inquiryId, auth.hospitalId, auth.hospitalName);

    const { data: messages, error } = await (supabaseAdmin as any)
      .from("chat_messages")
      .select("id, actor_type, message_text, created_at")
      .eq("thread_id", thread.id)
      .eq("is_internal", false)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) {
      console.error("[hospital/messages GET]", error.message);
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    // 읽음 표시 — 병원이 열었으니 last_read 갱신
    await (supabaseAdmin as any)
      .from("chat_threads")
      .update({ metadata: { ...(thread.metadata || {}), hospital_last_read_at: new Date().toISOString() } })
      .eq("id", thread.id);

    return NextResponse.json({ ok: true, threadId: thread.id, messages: messages || [] });
  } catch (err: any) {
    console.error("[hospital/messages GET] exception:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkHospitalAuth(request);
  if (!auth.isHospitalUser || !auth.hospitalId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }
  // viewer 는 읽기 전용(리드 PATCH와 동일 정책) — 쓰기 차단
  if (auth.role === "viewer") {
    return NextResponse.json({ ok: false, error: "read_only" }, { status: 403 });
  }
  try {
    assertSupabaseEnv();
    const { id } = await params;
    const inquiryId = await resolveLead(id, auth.hospitalId);
    if (!inquiryId) {
      return NextResponse.json({ ok: false, error: "not_your_lead" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const text = String(body?.text || "").trim().slice(0, 4000);
    if (!text) return NextResponse.json({ ok: false, error: "text_required" }, { status: 400 });

    const thread = await getOrCreateThread(inquiryId, auth.hospitalId, auth.hospitalName);

    const { data: msg, error } = await (supabaseAdmin as any)
      .from("chat_messages")
      .insert({
        thread_id: thread.id,
        actor_type: "hospital",
        actor_id: auth.userId || null,
        message_text: text,
        is_internal: false,
      })
      .select("id, actor_type, message_text, created_at")
      .single();
    if (error || !msg) {
      console.error("[hospital/messages POST]", error?.message);
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    // 코디 응답 대기로 전환 → 코디 콘솔 "응답 필요" 필터에 노출
    const now = new Date().toISOString();
    await (supabaseAdmin as any)
      .from("chat_threads")
      .update({ status: "waiting_coordinator", updated_at: now, last_active_at: now })
      .eq("id", thread.id);

    // 코디/어드민 종 알림 (병원→코디 방향). Fail-safe.
    try {
      const { getStaffIdsByRole, broadcastInAppNotification } = await import("@/lib/notifications/inApp");
      const { admins, coordinators } = await getStaffIdsByRole();
      await broadcastInAppNotification([...coordinators, ...admins], {
        type: "hospital_message",
        title: "💬 병원 메시지",
        body: `제휴병원이 케이스 #${inquiryId}에 메시지를 보냈어요.`,
        priority: "high",
        // 목록이 아니라 «그 대화»로 — 화면이 ?thread= 를 읽는다(2026-08-28에 배선).
        link: `/coordinator/messages?thread=${thread.id}`,
        payload: { inquiryId, threadId: thread.id },
      });
    } catch {
      /* fail-safe */
    }

    return NextResponse.json({ ok: true, message: msg });
  } catch (err: any) {
    console.error("[hospital/messages POST] exception:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
