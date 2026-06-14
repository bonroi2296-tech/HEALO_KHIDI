/**
 * HEALO: 유치 전환 깔때기 대시보드 API
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

/** 이름 마스킹: 첫 글자 + *** (PII 최소 노출) */
function maskName(first?: string | null, last?: string | null): string {
  const n = `${(first || "").trim()} ${(last || "").trim()}`.trim();
  if (!n) return "(이름 없음)";
  const head = [...n][0] || "";
  return `${head}***`;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    assertSupabaseEnv();
    const { searchParams } = new URL(request.url);
    const { from, to } = resolveRange(searchParams);
    const nationality = searchParams.get("nationality") || null;

    const [{ data: funnelRows, error: e1 }, { data: countryRows, error: e2 }] = await Promise.all([
      (supabaseAdmin as any).rpc("conversion_funnel", { p_from: from, p_to: to, p_nationality: nationality }),
      (supabaseAdmin as any).rpc("conversion_funnel_by_country", { p_from: from, p_to: to }),
    ]);
    if (e1 || e2) {
      console.error("[conversion-funnel] rpc error:", e1?.message || e2?.message);
      return NextResponse.json({ ok: false, error: "funnel_query_failed" }, { status: 500 });
    }

    const f = funnelRows?.[0] ?? {
      total_inquiries: 0, pre_consult: 0, visa_or_quote: 0, admitted: 0, followup: 0, lost: 0,
    };
    const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

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

    // ── 유치확정 "대기" 환자: 사전상담 완료했지만 결과 미입력(outcome null) ──
    const { data: preRows } = await supabaseAdmin
      .from("consultation_sessions")
      .select("inquiry_id")
      .eq("session_type", "pre_consultation")
      .eq("status", "completed")
      .not("inquiry_id", "is", null);
    const inquiryIds = Array.from(new Set((preRows || []).map((r: any) => r.inquiry_id))).filter(Boolean);

    let pending: any[] = [];
    if (inquiryIds.length > 0) {
      const { data: pendRows } = await (supabaseAdmin as any)
        .from("inquiries")
        .select("id, created_at, nationality, cancer_type, treatment_type, first_name, last_name, encrypted_name")
        .in("id", inquiryIds)
        .is("outcome", null)
        .gte("created_at", from)
        .lt("created_at", to)
        .order("created_at", { ascending: true });

      pending = await Promise.all(
        (pendRows || []).map(async (r: any) => {
          const dec = await decryptInquiryForAdmin(r).catch(() => r);
          return {
            inquiry_id: r.id,
            name: maskName(dec?.first_name, dec?.last_name),
            nationality: r.nationality || "(미상)",
            cancer_type: r.cancer_type || r.treatment_type || "-",
            created_at: r.created_at,
          };
        })
      );
    }

    return NextResponse.json({ ok: true, range: { from, to }, funnel, byCountry: countryRows || [], pending });
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
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[conversion-funnel] PATCH error:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
