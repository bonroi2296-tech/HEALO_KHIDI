/**
 * healwith: 유치 전환 깔때기 대시보드 API
 *
 * GET  /api/admin/khidi/conversion-funnel?from&to&nationality
 *   → 깔때기 단계별 수 + 전환율 + 국가별 + "유치확정 대기" 환자 리스트
 * PATCH /api/admin/khidi/conversion-funnel
 *   body: { inquiry_id, outcome: 'admitted'|'lost'|null, note? }
 *   → 코디가 유치 확정/이탈 1클릭 (감사 로그 기록)
 *
 * 인증: requirePortalAuth(staffOnly) = admin + coordinator. inquiries 는 service_role 전용이라 서버 경유.
 *   (2026-07-15 PO 승인: 코디가 KHIDI 유치확정/이탈을 직접 찍게 권한 확대 — 이전엔 admin 전용이라
 *    주석-현실 드리프트였음. 코디는 이미 케이스·환자정보를 다루는 신뢰 스태프.)
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse, after } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { setInquiryOutcome, isValidOutcome } from "@/lib/khidi/inquiryOutcome";
import { decryptInquiryForAdmin } from "@/lib/security/decryptForAdmin";
import { pct, maskName } from "@/lib/khidi/funnelMetrics";
import { logPiiAccess } from "@/lib/audit/logPiiAccess";

const DAY = 86_400_000;

function resolveRange(searchParams: URLSearchParams) {
  const toRaw = searchParams.get("to");
  const fromRaw = searchParams.get("from");
  // ⚠️ new Date("2026-08-01") 은 «UTC 자정» = 한국시간 오전 9시로 읽힌다. kpi.ts 의 유치 집계는
  //    한국시간(+09:00) 경계라, 같은 「8/1~」인데도 두 화면이 하루 경계에서 9시간 어긋났다
  //    (2026-08-14 감사). 날짜만 온 값은 한국시간 자정으로 읽는다.
  const asKst = (v: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00+09:00` : v);
  const toBase = toRaw ? asKst(toRaw) : new Date();
  const from = fromRaw ? asKst(fromRaw) : new Date(toBase.getTime() - 90 * DAY);
  // to 는 그 날 끝까지 포함하도록 +1일
  const toExclusive = new Date(toBase.getTime() + DAY);
  return { from: from.toISOString(), to: toExclusive.toISOString() };
}

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    assertSupabaseEnv();
    const { searchParams } = new URL(request.url);
    const { from, to } = resolveRange(searchParams);
    const nationality = searchParams.get("nationality") || null;
    // 테스트/실제 분리: ?includeTest=1 이면 테스트 데이터도 포함(평소엔 실적만).
    const includeTest = searchParams.get("includeTest") === "1";

    // 유입 축: locale(화면 언어) | referrer(어디서) | landing(첫 페이지). 기본은 언어.
    const axisRaw = searchParams.get("arrivalAxis") || "locale";
    const arrivalAxis = ["locale", "referrer", "landing"].includes(axisRaw) ? axisRaw : "locale";

    const [{ data: funnelRows, error: e1 }, { data: countryRows, error: e2 }, { data: orgRows, error: e3 }, { data: sourceRows, error: e4 }, { data: arrivalRows, error: e5 }] = await Promise.all([
      (supabaseAdmin as any).rpc("conversion_funnel", { p_from: from, p_to: to, p_nationality: nationality, p_include_test: includeTest }),
      (supabaseAdmin as any).rpc("conversion_funnel_by_country", { p_from: from, p_to: to, p_include_test: includeTest }),
      (supabaseAdmin as any).rpc("conversion_funnel_by_org", { p_from: from, p_to: to, p_include_test: includeTest }),
      (supabaseAdmin as any).rpc("conversion_funnel_by_source", { p_from: from, p_to: to, p_include_test: includeTest }),
      (supabaseAdmin as any).rpc("conversion_funnel_by_arrival", { p_from: from, p_to: to, p_include_test: includeTest, p_axis: arrivalAxis }),
    ]);
    if (e1 || e2) {
      console.error("[conversion-funnel] rpc error:", e1?.message || e2?.message);
      return NextResponse.json({ ok: false, error: "funnel_query_failed" }, { status: 500 });
    }
    if (e3) console.error("[conversion-funnel] by_org rpc error:", e3?.message);
    if (e4) console.error("[conversion-funnel] by_source rpc error:", e4?.message);
    // 유입 집계는 없어도 나머지 화면은 떠야 한다(함수 미적용 환경에서도 대시보드가 통째로 죽지 않게).
    if (e5) console.error("[conversion-funnel] by_arrival rpc error:", e5?.message);

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

    // 접속기록(법정 의무): 대기·확정 목록에 환자 이름을 복호화해 담았다 — 누가 어느 문의를 봤는지 남긴다.
    after(() =>
      logPiiAccess(request, auth, {
        action: "LIST_INQUIRIES",
        inquiryIds: [...pending.map((p: any) => p.id), ...admitted.map((a: any) => a.id)],
        metadata: { screen: "conversion_funnel", pending: pending.length, admitted: admitted.length },
      })
    );

    return NextResponse.json({ ok: true, range: { from, to }, funnel, byCountry: countryRows || [], byOrg: orgRows || [], bySource: sourceRows || [], byArrival: arrivalRows || [], arrivalAxis, pending, admitted });
  } catch (err: any) {
    console.error("[conversion-funnel] error:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
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

    if (!isValidOutcome(outcome)) {
      return NextResponse.json({ ok: false, error: "invalid_outcome" }, { status: 400 });
    }

    // 결과 변경은 코디 화면 「종료(안 옴)」과 «같은 함수»(setInquiryOutcome, 2026-09-06) — 이력(EDGE-5, POSTMORTEM #18→#20)·
    // admitted 의 단계 전진(입국·치료)·«누가 언제»까지 그쪽이 맡는다. 점수판의 이탈은 단계를 그대로 둔다(holdOnLost 없음).
    const r = await setInquiryOutcome(supabaseAdmin, { inquiryId: Number(inquiryId), outcome, note, userId: auth.userId ?? null });
    if (!r.ok) {
      const status = r.error === "invalid_outcome" ? 400 : r.error === "not_found" ? 404 : 500;
      return NextResponse.json({ ok: false, error: r.error ?? "update_failed" }, { status });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[conversion-funnel] PATCH error:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
