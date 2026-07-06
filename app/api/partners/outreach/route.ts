/**
 * healwith: 해외 파트너 아웃리치 추적 API (코디·어드민 공용)
 *
 * 보안: requirePortalAuth(staffOnly) — 코디네이터·관리자만. service_role 로 처리.
 *   (partner_outreach 는 RLS service_role 전용 → 브라우저 직접 쿼리 불가)
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";

// partner_outreach 는 아직 자동생성 Supabase 타입 목록에 없음 → 캐스팅
//   (프로젝트의 (supabaseAdmin as any) 패턴과 동일: conversion-funnel 등)
const db: any = supabaseAdmin;

const STATUSES = ["prospect", "contacted", "replied", "meeting", "partnership", "rejected", "on_hold"];
const TYPES = ["agency", "hospital", "clinic", "doctor", "other"];

const EDITABLE = [
  "org_name", "org_type", "contact_person", "contact_email", "contact_phone",
  "country", "status", "priority", "first_contact_at", "last_contact_at",
  "next_followup_at", "notes", "source",
];

/** GET /api/partners/outreach?status=contacted */
export async function GET(req: NextRequest) {
  const auth = await requirePortalAuth(req, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let query = db
      .from("partner_outreach")
      .select("*")
      .order("priority", { ascending: false })
      .order("updated_at", { ascending: false });

    if (status && status !== "all" && STATUSES.includes(status)) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[partners/outreach] GET error:", err);
    return NextResponse.json({ ok: false, error: "query_failed" }, { status: 500 });
  }
}

/** POST /api/partners/outreach */
export async function POST(req: NextRequest) {
  const auth = await requirePortalAuth(req, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const org_name = (body.org_name || "").trim();
    if (!org_name) {
      return NextResponse.json({ ok: false, error: "org_name_required" }, { status: 400 });
    }
    if (body.status && !STATUSES.includes(body.status)) {
      return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
    }
    if (body.org_type && !TYPES.includes(body.org_type)) {
      return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 });
    }

    const row: Record<string, any> = { created_by: auth.userId };
    for (const key of EDITABLE) {
      if (key in body) row[key] = body[key] === "" ? null : body[key];
    }
    row.org_name = org_name;

    const { data, error } = await db
      .from("partner_outreach")
      .insert(row)
      .select()
      .single();

    if (error) {
      // UNIQUE(org_name, country) 위반 → 사용자 친화 코드
      if (error.code === "23505") {
        return NextResponse.json({ ok: false, error: "duplicate" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (err: any) {
    console.error("[partners/outreach] POST error:", err);
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }
}

/** PUT /api/partners/outreach  (body.id 필수) */
export async function PUT(req: NextRequest) {
  const auth = await requirePortalAuth(req, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
    }
    if (body.status && !STATUSES.includes(body.status)) {
      return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
    }
    if (body.org_type && !TYPES.includes(body.org_type)) {
      return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 });
    }

    const sanitized: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const key of EDITABLE) {
      if (key in body) sanitized[key] = body[key] === "" ? null : body[key];
    }

    const { data, error } = await db
      .from("partner_outreach")
      .update(sanitized)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[partners/outreach] PUT error:", err);
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
}

/** DELETE /api/partners/outreach?id=... */
export async function DELETE(req: NextRequest) {
  const auth = await requirePortalAuth(req, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
    }

    const { error } = await db
      .from("partner_outreach")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true, message: "deleted" });
  } catch (err: any) {
    console.error("[partners/outreach] DELETE error:", err);
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
}
