/**
 * healwith: 케이스 진단코드 저장 (staff 전용)
 *
 * POST /api/coordinator/inquiries/[id]/icd-code  { code: "C16" | "" }
 * → inquiries.icd_code 에 저장. 빈 문자열이면 지운다.
 *
 * 왜 별도 칸인가: 환자가 의뢰서에 적은 코드는 intake_data(jsonb) 안에 있고, 의뢰서를 안 낸
 * 케이스에는 코드를 넣을 데가 아예 없었다. 「환자가 적은 값」과 「코디가 확정한 값」은
 * 다른 값이라 덮어쓰지 않고 따로 둔다(화면은 코디 값을 먼저 보여준다).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { ICD10_PATTERN } from "@/lib/khidi/medicalLabels";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id || !/^\d+$/.test(id)) {
    return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  let raw = "";
  try {
    const body = await request.json();
    raw = typeof body?.code === "string" ? body.code : "";
  } catch {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  // 소문자·앞뒤 공백은 흔한 오타라 여기서 다듬는다. 그래도 형식이 안 맞으면 되돌려준다.
  const code = raw.trim().toUpperCase();
  if (code && !ICD10_PATTERN.test(code)) {
    return Response.json({ ok: false, error: "invalid_code" }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from("inquiries")
      .update({
        icd_code: code || null,
        icd_code_updated_at: code ? new Date().toISOString() : null,
        icd_code_updated_by: code ? (auth.email || auth.userId) : null,
      } as any)
      .eq("id", Number(id));

    if (error) {
      console.error("[coordinator/icd-code] update error:", error.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }
    return Response.json({ ok: true, code: code || null });
  } catch (e: any) {
    console.error("[coordinator/icd-code] error:", e?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
