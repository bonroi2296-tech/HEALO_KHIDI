/**
 * 코디 콘텐츠 편집 — 홈 문구 오버라이드 저장/조회
 *
 * GET  /api/coordinator/content   — 현재 오버라이드 + 변경로그(편집기 로드용)
 * POST /api/coordinator/content   — 저장 { updates: [{ key, lang, value }] }
 *
 * 권한: admin 또는 coordinator(app_metadata.role). 레지스트리에 등록된 키만 허용.
 * 저장 시 변경로그 기록 + 홈 캐시 무효화(즉시 반영).
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth/checkAdminAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { REGISTRY_KEYS, EDITABLE_LANGS } from "@/lib/content/registry";
import { invalidateContentCache } from "@/lib/content/overrides";

const db = supabaseAdmin as any;

async function requireStaff(request: NextRequest): Promise<{ ok: boolean; email: string }> {
  const a = await checkAdminAuth(request);
  const ok = Boolean(a.isAdmin || a.appRole === "coordinator");
  return { ok, email: a.email || "unknown" };
}

export async function GET(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff.ok) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  try {
    const [{ data: overrides }, { data: logs }] = await Promise.all([
      db.from("content_overrides").select("content_key, lang, value").like("content_key", "home.%"),
      db.from("content_change_log").select("*").order("changed_at", { ascending: false }).limit(50),
    ]);
    return NextResponse.json({ ok: true, overrides: overrides || [], logs: logs || [] });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff.ok) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const updates = Array.isArray(body?.updates) ? body.updates : [];
  const valid = updates.filter(
    (u: any) =>
      u &&
      REGISTRY_KEYS.has(u.key) &&
      EDITABLE_LANGS.includes(u.lang) &&
      typeof u.value === "string"
  );
  if (valid.length === 0) {
    return NextResponse.json({ ok: false, error: "no_valid_updates" }, { status: 400 });
  }

  try {
    const keys = [...new Set(valid.map((u: any) => u.key))];
    const { data: existing } = await db
      .from("content_overrides")
      .select("content_key, lang, value")
      .in("content_key", keys);
    const oldMap = new Map(
      (existing || []).map((r: any) => [`${r.content_key}|${r.lang}`, r.value])
    );

    const now = new Date().toISOString();
    const rows = valid.map((u: any) => ({
      content_key: u.key,
      lang: u.lang,
      value: u.value,
      updated_at: now,
      updated_by: staff.email,
    }));
    const { error: upErr } = await db
      .from("content_overrides")
      .upsert(rows, { onConflict: "content_key,lang" });
    if (upErr) return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });

    const logRows = valid.map((u: any) => ({
      content_key: u.key,
      lang: u.lang,
      old_value: oldMap.get(`${u.key}|${u.lang}`) ?? null,
      new_value: u.value,
      editor_email: staff.email,
      changed_at: now,
    }));
    await db.from("content_change_log").insert(logRows);

    invalidateContentCache();

    return NextResponse.json({ ok: true, saved: valid.length });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
