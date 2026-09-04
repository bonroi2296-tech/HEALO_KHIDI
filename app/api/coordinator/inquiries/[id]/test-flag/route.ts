/**
 * healwith: 문의의 「시험」 표시를 켜고 끈다 (staff 전용)
 *
 * POST /api/coordinator/inquiries/[id]/test-flag  { isTest: false }
 * → inquiries.is_test 갱신.
 *
 * 왜 필요한가: 시험 판정은 «접수 시점»에 연락 이메일 도메인·IP 로 한 번 찍고 끝난다.
 * 그 판정이 틀리는 경우가 실제로 있다 — 2026-09-02 진짜 환자 문의(#291)가 회사 도메인
 * 연락처 때문에 시험으로 찍혀 코디 화면에서 사라졌고, 사람이 DB 를 직접 고쳐야 풀렸다.
 * PO 가 당분간 회사·시험 계정으로 접수할 예정이라 같은 일이 반복된다(2026-09-02 PO).
 *
 * ⚠️ 이 값은 KHIDI 실적 집계의 «포함/제외»를 가른다. 그래서 되돌릴 수 있게 양방향으로 두고,
 *    누가 언제 바꿨는지 서버 로그에 남긴다. 접수 시점 판정 자체는 건드리지 않는다 —
 *    그 판정이 없으면 야간 자동 시험 문의가 그대로 실적에 섞인다.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

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

  let isTest: boolean | null = null;
  try {
    const body = await request.json();
    if (typeof body?.isTest === "boolean") isTest = body.isTest;
  } catch {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  if (isTest === null) {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from("inquiries")
      .update({ is_test: isTest })
      .eq("id", Number(id));

    if (error) {
      console.error("[coordinator/test-flag] update error:", error.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    // 실적 집계가 걸린 값이라 «누가 언제» 를 남긴다(되돌릴 일이 생기면 이 줄이 근거가 된다).
    console.info(
      `[coordinator/test-flag] inquiry=${id} is_test=${isTest} by=${auth.email || auth.userId}`
    );
    return Response.json({ ok: true, id: Number(id), isTest });
  } catch (err: any) {
    console.error("[coordinator/test-flag] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
