/**
 * healwith: 코디 화면의 「종료(안 옴)」·「되돌리기」 (staff 전용)
 *
 * POST /api/coordinator/inquiries/[id]/outcome  { outcome: "lost" | null, note?: string }
 *  - "lost": 결과=이탈 + 진행 단계=보류 + 이력 «🚫 이탈 처리». 식은 문의 알림에서 빠지고 목록 «종료» 탭으로 간다.
 *  - null : 결과만 비운다(단계는 코디가 다시 고른다).
 *  - 유치 확정(admitted)은 여기서 못 한다 — 단계를 «입국·치료»로 올리면 자동 집계된다(cases 라우트).
 *
 * 왜 (2026-09-06 PO): 소견서까지 준 뒤 「안 온다」고 한 첫 실고객 케이스가 두 달째 «검토 진행»이었다.
 *   결과를 적는 단추가 어드민 점수판에만 있어서다. 어드민과 같은 함수(setInquiryOutcome)로 바꾼다.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { setInquiryOutcome } from "@/lib/khidi/inquiryOutcome";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id || !/^\d+$/.test(id)) {
    return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  let outcome: "lost" | null | undefined;
  let note: string | null = null;
  try {
    const body = await request.json();
    if (body?.outcome === "lost" || body?.outcome === null) outcome = body.outcome;
    if (typeof body?.note === "string") note = body.note;
  } catch {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  if (outcome === undefined) {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  try {
    const r = await setInquiryOutcome(supabaseAdmin, {
      inquiryId: Number(id),
      outcome,
      note,
      userId: auth.userId ?? null,
      holdOnLost: true,
    });
    if (!r.ok) {
      return Response.json({ ok: false, error: r.error ?? "update_failed" }, { status: r.error === "invalid_outcome" ? 400 : 500 });
    }
    // 전환 집계(이탈 N건)가 걸린 값이라 «누가 언제»를 남긴다.
    console.info(`[coordinator/outcome] inquiry=${id} outcome=${outcome} by=${auth.email || auth.userId}`);
    return Response.json({ ok: true, id: Number(id), outcome, case_status: r.caseStatus });
  } catch (err: any) {
    console.error("[coordinator/outcome] error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
