/**
 * healwith: 사후관리 보드 API — 코디·관리자(staff) 전용
 *
 * GET  /api/coordinator/postcare            → { ok, data:{requests,symptoms,cadence}, summary, inquiries:{id:{...}} }
 * GET  /api/coordinator/postcare?summary=1  → { ok, summary }  (대시보드 카드용, 가볍게)
 * PATCH /api/coordinator/postcare { id, status:"confirmed"|"dismissed"|"completed" } → 재진 요청·제안 처리 표시
 *
 * 왜 (2026-09-06 PO 「백오피스 보완, 계층별로 다」): 환자가 낸 재진 요청·증상 기록을 받는 코디 화면이 종 알림뿐이었다.
 *   종을 넘기면 열린 요청을 다시 찾을 곳이 없고 「처리했다」를 표시할 단추도 없었다.
 * 시험 문의는 제외(실적·업무 목록 오염 방지). 환자 이름은 코디 표준대로 이름만(연락처 없음).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptMaybe } from "@/lib/security/encryptionV2";
import { loadPostcare, summarizePostcare } from "@/lib/followup/postcareBoard";

const ALLOWED = new Set(["confirmed", "dismissed", "completed"]);

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;
  try {
    const summaryOnly = request.nextUrl.searchParams.get("summary") === "1";
    const data = await loadPostcare(supabaseAdmin as any, { includeAssessment: !summaryOnly, excludeTest: true, days: 30 });
    const summary = summarizePostcare(data);
    if (summaryOnly) return Response.json({ ok: true, summary });

    const ids = [...new Set([...data.requests, ...data.symptoms, ...data.cadence].map((x) => x.inquiryId).filter((v): v is number => v != null))];
    const inquiries: Record<number, { name: string; cancerType: string | null; caseStatus: string | null; nationality: string | null; agency: boolean }> = {};
    if (ids.length > 0) {
      const { data: rows } = await (supabaseAdmin as any)
        .from("inquiries").select("id, first_name, cancer_type, case_status, nationality, agency_id").in("id", ids);
      for (const r of (rows as any[]) || []) {
        inquiries[Number(r.id)] = {
          name: (decryptMaybe(r.first_name) || "").toString().trim() || "이름 미상",
          cancerType: r.cancer_type || null,
          caseStatus: r.case_status || null,
          nationality: r.nationality || null,
          agency: !!r.agency_id,
        };
      }
    }
    return Response.json({ ok: true, data, summary, inquiries });
  } catch (err: any) {
    console.error("[coordinator/postcare] GET:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "invalid_json" }, { status: 400 }); }
  const id = String(body?.id || "");
  const status = String(body?.status || "");
  if (!id || !ALLOWED.has(status)) return Response.json({ ok: false, error: "invalid_params" }, { status: 400 });
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("followup_schedules").update({ status }).eq("id", id).select("id, inquiry_id").maybeSingle();
    if (error || !data) return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    // 케이스 이력에 한 줄 — 환자 진행상황 화면에도 «코디 소식»으로 비친다(에이전시도 본다).
    if (data.inquiry_id) {
      const note = status === "confirmed" ? "📅 재진 상담을 잡는 중입니다" : status === "completed" ? "✅ 재진 요청 처리 완료" : "재진 요청 보류";
      const { data: inq } = await (supabaseAdmin as any).from("inquiries").select("case_status").eq("id", data.inquiry_id).maybeSingle();
      await (supabaseAdmin as any).from("case_status_history").insert({
        inquiry_id: data.inquiry_id, status: inq?.case_status || "consultation", note, created_by: auth.userId || null,
      }).then(() => {}, () => {});
    }
    return Response.json({ ok: true, id, status });
  } catch (err: any) {
    console.error("[coordinator/postcare] PATCH:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
