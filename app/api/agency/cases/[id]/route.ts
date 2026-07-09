/**
 * healwith: 에이전시 케이스 액션 API
 *
 * POST /api/agency/cases/[id]
 *   로그인한 에이전시가 본인이 의뢰한 케이스에 행동(action)을 남긴다 — "보기만" → 액션.
 *   - action="request_consult" : 코디에게 화상상담 요청 (타임라인 이벤트)
 *   - action="message"         : 코디에게 메시지 전달 (타임라인 이벤트)
 *   - action="attach"          : 추가 자료 업로드 (inquiries.attachments 에 병합)
 *
 * 닫힌 고리: 모두 case_status_history 에 이벤트를 남겨 코디 케이스 화면에 바로 보인다.
 * (case_status 자체는 변경 안 함 → KHIDI KPI 집계에 영향 0)
 *
 * 보안: checkAgencyAuth + 본인 에이전시 케이스(agency_id) 검증. 첨부 path 는
 *       /api/attachments/upload 가 돌려준 참조만 받음(파일 본문은 안 받음).
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { checkAgencyAuth } from "@/lib/auth/checkAgencyAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";

const ACTION_NOTE: Record<string, string> = {
  request_consult: "📹 화상상담 요청",
  message: "💬 에이전시 메시지",
};

function cleanAttachments(input: unknown) {
  return (Array.isArray(input) ? input : [])
    .filter((a: any) => a && typeof a.path === "string" && a.path.length < 500)
    .slice(0, 20)
    .map((a: any) => ({
      path: a.path,
      name: typeof a.name === "string" ? a.name.slice(0, 200) : null,
      type: typeof a.type === "string" ? a.type.slice(0, 100) : null,
      category: typeof a.category === "string" ? a.category.slice(0, 32) : "other",
    }));
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

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "");

    // 권한 경계 — 본인 에이전시 케이스만
    const { data: inq, error: inqErr } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("id, agency_id, case_status, attachments")
      .eq("id", inquiryId)
      .maybeSingle();
    if (inqErr) {
      console.error("[agency/cases] lookup:", inqErr.message);
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
    if (!inq || inq.agency_id !== auth.agencyId) {
      return NextResponse.json({ ok: false, error: "not_your_case" }, { status: 403 });
    }

    const insertEvent = (note: string) =>
      (supabaseAdmin as any).from("case_status_history").insert({
        inquiry_id: inquiryId,
        status: inq.case_status || "intake",
        note,
        created_by: auth.userId || null,
      });

    // 1) 화상상담 요청 / 메시지 — 타임라인 이벤트
    if (action === "request_consult" || action === "message") {
      const text = String(body.message || "").slice(0, 1000).trim();
      if (action === "message" && !text) {
        return NextResponse.json({ ok: false, error: "empty_message" }, { status: 400 });
      }
      const note = `${ACTION_NOTE[action]} (${auth.agencyName || ""})${text ? ` — ${text}` : ""}`.trim();
      const { error } = await insertEvent(note);
      if (error) {
        console.error("[agency/cases] event:", error.message);
        return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // 2) 추가 자료 — inquiries.attachments 에 병합 (최대 50개 보관)
    if (action === "attach") {
      const clean = cleanAttachments(body.attachments);
      if (!clean.length) return NextResponse.json({ ok: false, error: "no_attachments" }, { status: 400 });
      const existing = Array.isArray(inq.attachments) ? inq.attachments : [];
      const merged = [...existing, ...clean].slice(0, 50);
      const { error: upErr } = await (supabaseAdmin as any)
        .from("inquiries")
        .update({ attachments: merged })
        .eq("id", inquiryId);
      if (upErr) {
        console.error("[agency/cases] attach:", upErr.message);
        return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
      }
      await insertEvent(`📎 추가 자료 ${clean.length}건 업로드 (${auth.agencyName || ""})`.trim());
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
  } catch (err: any) {
    console.error("[agency/cases] POST exception:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
