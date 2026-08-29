/**
 * healwith: 환자 교육자료 관리 API (어드민)
 *
 * GET    → education_contents 전체(비공개 포함) 목록
 * POST   { cancer_type, title_ko, ... }        → 새 자료 추가
 * PATCH  { id, ...바뀐 칸만 }                   → 자료 수정
 *
 * 왜 생겼나(2026-08-25): 이 표(18건)는 환자 화면 /patient/education 에 그대로 나가는데
 *   고칠 화면이 어드민·코디 어디에도 없었다(마지막 수정 2026-04-17 = 피벗 전).
 *   읽기 전용 공개 API 는 app/api/khidi/education/route.ts — 그쪽은 is_published=true 만 준다.
 *
 * 삭제(DELETE)는 일부러 안 만든다 — 되돌리기 어려운 동작이라 PO 확인 없이 열지 않는다.
 *   화면에서 내리는 건 is_published=false 로 충분하다.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  logAdminAction,
  getIpFromRequest,
  getUserAgentFromRequest,
} from "@/lib/audit/adminAuditLog";

// 활성 6개 언어. 여기 순서가 화면 탭 순서다(src/lib/i18n/config.js 와 같게 유지).
const LANGS = ["ko", "en", "ru", "kz", "zh", "ja"] as const;

// 수정·생성에서 받아들이는 칸만 나열한다(모르는 칸이 그대로 DB 로 새는 걸 막는다).
const TEXT_FIELDS = [
  "cancer_type",
  "content_type",
  "send_at_phase",
  "media_url",
  ...LANGS.map((l) => `title_${l}`),
  ...LANGS.map((l) => `body_${l}`),
];

/** 들어온 몸통에서 «허용된 칸»만 뽑아 DB 에 넣을 모양으로 만든다. */
function pickFields(body: Record<string, any>) {
  const row: Record<string, any> = {};
  for (const key of TEXT_FIELDS) {
    if (!(key in body)) continue;
    const v = body[key];
    row[key] = typeof v === "string" ? (v.trim() || null) : null;
  }
  if (typeof body.is_published === "boolean") row.is_published = body.is_published;
  return row;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;
  try {
    const supabase = createServiceRoleClient() as any;
    const { data, error } = await supabase
      .from("education_contents")
      .select("*")
      // 암종 → 보내는 시점 순. 둘 다 없으면 만든 순.
      .order("cancer_type", { ascending: true })
      .order("send_at_phase", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[admin/education] GET query error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }
    return Response.json({ ok: true, items: data || [], langs: LANGS });
  } catch (err: any) {
    console.error("[admin/education] GET error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;
  try {
    const body = await request.json();
    const row = pickFields(body);

    // DB 에서 NOT NULL 인 두 칸. 여기서 안 막으면 500 이 나가고 화면엔 이유가 안 뜬다.
    if (!row.cancer_type) return Response.json({ ok: false, error: "cancer_type_required" }, { status: 400 });
    if (!row.title_ko) return Response.json({ ok: false, error: "title_ko_required" }, { status: 400 });

    const supabase = createServiceRoleClient() as any;
    const { data, error } = await supabase
      .from("education_contents")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      console.error("[admin/education] POST insert error:", error.message);
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    await logAdminAction({
      adminEmail: auth.authResult.email || "unknown",
      adminUserId: auth.authResult.userId || null,
      action: "CREATE_EDUCATION_CONTENT",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: { education_id: data.id, cancer_type: data.cancer_type },
    });

    return Response.json({ ok: true, item: data });
  } catch (err: any) {
    console.error("[admin/education] POST error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return Response.json({ ok: false, error: "id_required" }, { status: 400 });

    const row = pickFields(body);
    delete row.id;
    // NOT NULL 칸을 «빈칸으로» 지우려는 요청은 막는다(보내지 않으면 그대로 유지된다).
    if ("cancer_type" in row && !row.cancer_type) {
      return Response.json({ ok: false, error: "cancer_type_required" }, { status: 400 });
    }
    if ("title_ko" in row && !row.title_ko) {
      return Response.json({ ok: false, error: "title_ko_required" }, { status: 400 });
    }
    if (Object.keys(row).length === 0) {
      return Response.json({ ok: false, error: "nothing_to_update" }, { status: 400 });
    }

    const supabase = createServiceRoleClient() as any;
    const { data, error } = await supabase
      .from("education_contents")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[admin/education] PATCH update error:", error.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }
    if (!data) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

    await logAdminAction({
      adminEmail: auth.authResult.email || "unknown",
      adminUserId: auth.authResult.userId || null,
      action: "UPDATE_EDUCATION_CONTENT",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: { education_id: data.id, cancer_type: data.cancer_type },
    });

    return Response.json({ ok: true, item: data });
  } catch (err: any) {
    console.error("[admin/education] PATCH error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
