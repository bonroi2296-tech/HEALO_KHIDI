/**
 * healwith: Patient Visa Checklist API (authenticated)
 *
 * GET /api/patient/visa-checklist  — 로그인 환자 본인의 비자 서류 준비 체크 맵
 *   → { ok, data: { "C-3-3": {docId:true}, "G-1-10": {...} } }
 * PUT /api/patient/visa-checklist  — 특정 비자유형 체크 맵 저장(upsert)
 *   body: { visaType: "C-3-3"|"G-1-10", checked: {docId:boolean} }
 *
 * 비로그인(401)은 클라이언트가 localStorage 폴백으로 처리한다.
 * 비민감 데이터(문서 준비 boolean)만 저장 — PII 없음.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { createSupabaseServerClientFromRequest } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { defaultLimiter } from "@/lib/api/rateLimiter";

const VISA_TYPES = ["C-3-3", "G-1-10"];
const MAX_DOCS = 20; // 서류 항목 상한(현재 최대 ~7개) — 저장 남용 방지

async function getAuthUser(request: NextRequest) {
  const supabase = createSupabaseServerClientFromRequest(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// ─── GET: 본인 체크 맵 ───
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await (supabaseAdmin as any)
    .from("patient_visa_checklist")
    .select("visa_type, checked")
    .eq("user_id", user.id);

  if (error) {
    console.error("[patient/visa-checklist] GET error:", error.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }

  const map: Record<string, Record<string, boolean>> = {};
  for (const row of data || []) {
    map[row.visa_type] = (row.checked as Record<string, boolean>) || {};
  }
  return Response.json({ ok: true, data: map });
}

// ─── PUT: 특정 비자유형 체크 저장 ───
export async function PUT(request: NextRequest) {
  try {
    const limited = defaultLimiter.check(request);
    if (limited) return limited;

    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const visaType = body?.visaType;
    const checked = body?.checked;

    if (
      !VISA_TYPES.includes(visaType) ||
      typeof checked !== "object" ||
      checked === null ||
      Array.isArray(checked)
    ) {
      return Response.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }

    const entries = Object.entries(checked);
    if (entries.length > MAX_DOCS) {
      return Response.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }

    // 정규화: 키는 짧은 문자열, 값은 boolean 만 저장
    const sanitized: Record<string, boolean> = {};
    for (const [k, v] of entries) {
      if (typeof k === "string" && k.length > 0 && k.length <= 40) {
        sanitized[k] = !!v;
      }
    }

    const { error } = await (supabaseAdmin as any)
      .from("patient_visa_checklist")
      .upsert(
        {
          user_id: user.id,
          visa_type: visaType,
          checked: sanitized,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,visa_type" }
      );

    if (error) {
      console.error("[patient/visa-checklist] PUT error:", error.message);
      return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    console.error("[patient/visa-checklist] exception:", error);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
