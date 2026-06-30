/**
 * healwith: 유치 전환 깔때기 대시보드 API
 *
 * GET  /api/admin/khidi/conversion-funnel?from&to&nationality
 *   → 깔때기 단계별 수 + 전환율 + 국가별 + "유치확정 대기" 환자 리스트
 * PATCH /api/admin/khidi/conversion-funnel
 *   body: { inquiry_id, outcome: 'admitted'|'lost'|null, note? }
 *   → 코디가 유치 확정/이탈 1클릭 (감사 로그 기록)
 *
 * 인증: requireAdminAuth (admin/coordinator). inquiries 는 service_role 전용이라 서버 경유.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { decryptInquiryForAdmin } from "@/lib/security/decryptForAdmin";
import { pct, maskName } from "@/lib/khidi/funnelMetrics";

const DAY = 86_400_000;

function resolveRange(searchParams: URLSearchParams) {
  const toRaw = searchParams.get("to");
  const fromRaw = searchParams.get("from");
  const toBase = toRaw ? new Date(toRaw) : new Date();
  const from = fromRaw ? new Date(fromRaw) : new Date(toBase.getTime() - 90 * DAY);
  // to 는 그 날 끝까지 포함하도록 +1일
  const toExclusive = new Date(toBase.getTime() + DAY);
  return { from: from.toISOString(), to: toExclusive.toISOString() };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    assertSupabaseEnv();
    const { searchParams } = new URL(request.url);
    const { from, to } = resolveRange(searchParams);
    const nationality = searchParams.get("nationality") || null;
    // 테스트/실제 분리: ?includeTest=1 이면 테스트 데이터도 포함(평소엔 실적만).
    const includeTest = searchParams.get("includeTest") === "1";

    const [{ data: funnelRows, error: e1 }, { data: countryRows, error: e2 }, { data: orgRows, error: e3 }] = await Promise.all([
      (supabaseAdmin as any).rpc("conversion_funnel", { p_from: from, p_to: to, p_nationality: nationality, p_include_test: includeTest }),
      (supabaseAdmin as any).rpc("conversion_funnel_by_country", { p_from: from, p_to: to, p_include_test: includeTest }),
      (supabaseAdmin as any).rpc("conversion_funnel_by_org", { p_from: from, p_to: to, p_include_test: includeTest }),
    ]);
    if (e1 || e2) {
      console.error("[conversion-funnel] rpc error:", e1?.message || e2?.message);
      return NextResponse.json({ ok: false, error: "funnel_query_failed" }, { status: 500 });
    }
    if (e3) console.error("[conversion-funnel] by_org rpc error:", e3?.message);

    const f = funnelRows?.[0] ?? {
      total_inquiries: 0, pre_consult: 0, visa_or_quote: 0, admitted: 0, followup: 0, lost: 0,
    };
    const funnel = {
      stages: [
        { key: "inquiry", label: "문의 접수", count: Number(f.total_inquiries) },
        { key: "pre_consult", label: "사전상담 완료", count: Number(f.pre_consult) },
        { key: "visa_or_quote", label: "견적·비자 진행", count: Number(f.visa_or_quote) },
        { key: "admitted", label: "유치 확정", count: Number(f.admitted) },
        { key: "followup", label: "사후관리 완료", count: Number(f.followup) },
      ],
      conversion: {
        inquiry_to_preconsult: pct(Number(f.pre_consult), Number(f.total_inquiries)),
        preconsult_to_admitted: pct(Number(f.admitted), Number(f.pre_consult)),
        admitted_to_followup: pct(Number(f.followup), Number(f.admitted)),
        overall_admit_rate: pct(Number(f.admitted), Number(f.total_inquiries)),
      },
      lost: Number(f.lost),
    };

    // 표시용 행(이름 복호화+마스킹) 변환 — pending/admitted 공용.
    const toDisplayRow = async (r: any) => {
      const dec = await decryptInquiryForAdmin(r).catch(() => r);
      return {
        inquiry_id: r.id,
        name: maskName(dec?.first_name, dec?.last_name),
        nationality: r.nationality || "(미상)",
        cancer_type: r.cancer_type || r.treatment_type || "-",
        created_at: r.created_at,
        is_test: r.is_test ?? false,
      };
    };

    // ── 유치확정 "대기" 환자: 결과 미입력(outcome null) 이면서
    //    (a) 사전상담 완료했거나 (b) 병원이 응답/확정한 케이스(에이전시→병원 의뢰 경로).
    //    (b) 를 포함해야 상담세션 없이 의뢰만 진행된 케이스도 코디가 보고 확정/이탈 가능. ──
    const { data: preRows } = await supabaseAdmin
      .from("consultation_sessions")
      .select("inquiry_id")
      .eq("session_type", "pre_consultation")
      .eq("status", "completed")
      .not("inquiry_id", "is", null);
    const candidateIds = new Set<number>(
      (preRows || []).map((r: any) => r.inquiry_id).filter(Boolean)
    );

    // 병원 응답(replied/converted) 리드 → normalized_inquiry → 원본 의뢰 id 합류
    const { data: hlRows } = await supabaseAdmin
      .from("hospital_leads")
      .select("normalized_inquiry_id")
      .in("status", ["replied", "converted"])
      .not("normalized_inquiry_id", "is", null);
    const normIds = Array.from(
      new Set((hlRows || []).map((r: any) => r.normalized_inquiry_id).filter(Boolean))
    );
    if (normIds.length > 0) {
      const { data: normRows } = await supabaseAdmin
        .from("normalized_inquiries")
        .select("source_inquiry_id")
        .in("id", normIds)
        .not("source_inquiry_id", "is", null);
      (normRows || []).forEach((r: any) => {
        if (r.source_inquiry_id != null) candidateIds.add(r.source_inquiry_id);
      });
    }
    const inquiryIds = Array.from(candidateIds);

    let pending: any[] = [];
    if (inquiryIds.length > 0) {
      let pendQ = (supabaseAdmin as any)
        .from("inquiries")
        .select("id, created_at, nationality, cancer_type, treatment_type, first_name, last_name, encrypted_name, is_test")
        .in("id", inquiryIds)
        .is("outcome", null)
        .gte("created_at", from)
        .lt("created_at", to)
        .order("created_at", { ascending: true });
      if (!includeTest) pendQ = pendQ.eq("is_test", false);
      const { data: pendRows } = await pendQ;
      pending = await Promise.all((pendRows || []).map(toDisplayRow));
    }

    // ── 유치확정된 목록(되돌리기용): outcome='admitted'. 코디가 잘못된 건 취소(→null)/이탈
    //    가능. auto=true(outcome_updated_by IS NULL) = 병원 확정 자동집계분(코디 미확인). ──
    let admQ = (supabaseAdmin as any)
      .from("inquiries")
      .select("id, created_at, nationality, cancer_type, treatment_type, first_name, last_name, encrypted_name, outcome_updated_by, outcome_note, is_test")
      .eq("outcome", "admitted")
      .gte("created_at", from)
      .lt("created_at", to)
      .order("outcome_updated_at", { ascending: false, nullsFirst: false });
    if (!includeTest) admQ = admQ.eq("is_test", false);
    const { data: admRows } = await admQ;
    const admitted = await Promise.all(
      (admRows || []).map(async (r: any) => ({
        ...(await toDisplayRow(r)),
        auto: r.outcome_updated_by == null,
        note: r.outcome_note || null,
      }))
    );

    return NextResponse.json({ ok: true, range: { from, to }, funnel, byCountry: countryRows || [], byOrg: orgRows || [], pending, admitted });
  } catch (err: any) {
    console.error("[conversion-funnel] error:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    assertSupabaseEnv();
    const body = await request.json().catch(() => ({}));
    const inquiryId = body?.inquiry_id;
    const outcome = body?.outcome ?? null;
    const note = typeof body?.note === "string" ? body.note.slice(0, 500) : null;

    if (!inquiryId) {
      return NextResponse.json({ ok: false, error: "inquiry_id_required" }, { status: 400 });
    }

    // 수동 테스트 토글: { inquiry_id, is_test } → 표식만 변경(전화로 들어온 진짜환자 오태깅 해제 등).
    if (typeof body?.is_test === "boolean") {
      const { error: tErr } = await (supabaseAdmin as any)
        .from("inquiries")
        .update({ is_test: body.is_test })
        .eq("id", inquiryId);
      if (tErr) {
        console.error("[conversion-funnel] is_test toggle error:", tErr.message);
        return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, is_test: body.is_test });
    }

    if (outcome !== null && outcome !== "admitted" && outcome !== "lost") {
      return NextResponse.json({ ok: false, error: "invalid_outcome" }, { status: 400 });
    }

    const { error } = await (supabaseAdmin as any)
      .from("inquiries")
      .update({
        outcome,
        outcome_note: note,
        outcome_updated_at: new Date().toISOString(),
        outcome_updated_by: auth.authResult.userId,
      })
      .eq("id", inquiryId);

    if (error) {
      console.error("[conversion-funnel] outcome update error:", error.message);
      return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    // EDGE-5 (POSTMORTEM #18→#20): 유치 확정/이탈/취소를 case_status_history 에 남겨
    //   에이전시 포털 타임라인에 반영(이전엔 outcome 만 바뀌고 에이전시는 확정/이탈을 못 봤음).
    //   admitted = 입국·치료 단계로 전진(뒤로 안 감), lost/취소 = 단계 유지하고 이력만.
    try {
      const uid = auth.authResult.userId ?? null;
      if (outcome === "admitted") {
        const { advanceCaseStatus } = await import("@/lib/khidi/advanceCaseStatus");
        await advanceCaseStatus(supabaseAdmin, inquiryId, "treatment", "🎯 유치 확정", uid);
      } else {
        const { data: inq } = await (supabaseAdmin as any)
          .from("inquiries")
          .select("case_status")
          .eq("id", inquiryId)
          .maybeSingle();
        await (supabaseAdmin as any).from("case_status_history").insert({
          inquiry_id: inquiryId,
          status: inq?.case_status ?? "received",
          note: outcome === "lost" ? "🚫 이탈 처리" : "↩️ 유치 취소 (집계 제외)",
          created_by: uid,
        });
      }
    } catch (histErr: any) {
      console.error("[conversion-funnel] case_status_history 기록 실패:", histErr?.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[conversion-funnel] PATCH error:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
