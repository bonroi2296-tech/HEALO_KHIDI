/**
 * healwith: 어드민 통합 대시보드 API (백오피스 리뉴얼 3단계 — docs/ADMIN_RENEWAL_PLAN.md §3-3)
 *
 * GET /api/admin/dashboard/overview
 *   → 역할별 현황 카드 숫자(환자/코디네이터/에이전시·클리닉/병원/시스템) + 최근 활동 피드.
 *
 * 원칙:
 *  - 새 테이블 없음 — 기존 기록(문의·채팅·상담·의뢰·리드·문구 편집 로그·AI 회귀)만 집계.
 *  - PII 반환 금지 — 이름·이메일·메시지 본문은 싣지 않는다(건수·상태·키만).
 *  - 인증: requireAdminAuth (admin 전용 화면. 코디 확대는 4단계 권한 정비에서 판단).
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";

type FeedItem = {
  at: string; // ISO
  role: "patient" | "coordinator" | "agency" | "hospital" | "system";
  label: string;
  href: string;
};

async function count(table: string, build?: (q: any) => any): Promise<number> {
  let q: any = (supabaseAdmin as any).from(table).select("id", { count: "exact", head: true });
  if (build) q = build(q);
  const { count: c, error } = await q;
  if (error) {
    console.error(`[dashboard/overview] count(${table}):`, error.message);
    return 0;
  }
  return c || 0;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;
  try {
    assertSupabaseEnv();
    const sb: any = supabaseAdmin;

    // ── 카드 숫자 (전부 병렬) ──────────────────────────────
    const [
      inquiriesTotal,
      chatThreadsTotal,
      chatTelegram,
      chatWhatsapp,
      consultationsTotal,
      consultationsUpcoming,
      estimatesTotal,
      contentEdits,
      agenciesActive,
      agencyUsers,
      referralsTotal,
      referralsPending,
      hospitalsTotal,
      hospitalUsers,
      leadsTotal,
      leadsUnanswered,
    ] = await Promise.all([
      count("inquiries", (q) => q.or("is_test.is.null,is_test.eq.false")),
      count("chat_threads"),
      count("chat_threads", (q) => q.eq("channel", "telegram")),
      count("chat_threads", (q) => q.eq("channel", "whatsapp")),
      count("consultation_sessions"),
      count("consultation_sessions", (q) => q.gte("scheduled_at", new Date().toISOString())),
      count("cost_estimates"),
      count("content_change_log"),
      count("agencies", (q) => q.eq("is_active", true)),
      count("agency_users"),
      count("cotreatment_referrals"),
      count("cotreatment_referrals", (q) => q.eq("status", "requested")),
      count("hospitals"),
      count("hospital_users"),
      count("hospital_leads"),
      count("hospital_leads", (q) => q.is("responded_at", null)),
    ]);

    // ── AI 회귀 최신 실행일 요약 (환각 0% 근거 — KHIDI 안전성 지표) ──
    let ai: { runDate: string | null; passRate: number | null; hallucinations: number | null } = {
      runDate: null,
      passRate: null,
      hallucinations: null,
    };
    const { data: latestRun } = await sb
      .from("ai_regression_runs")
      .select("run_date")
      .order("run_date", { ascending: false })
      .limit(1);
    const latestDate = latestRun?.[0]?.run_date || null;
    if (latestDate) {
      const { data: runs } = await sb
        .from("ai_regression_runs")
        .select("passed, flags")
        .eq("run_date", latestDate);
      if (runs?.length) {
        const passed = runs.filter((r: any) => r.passed).length;
        const halluc = runs.filter((r: any) => (r.flags || []).includes("hallucination")).length;
        ai = {
          runDate: latestDate,
          passRate: Math.round((passed / runs.length) * 100),
          hallucinations: halluc,
        };
      }
    }

    // ── 최근 활동 피드 (PII 없음 — 건수·상태·키만) ──────────
    const FEED_EACH = 6;
    const [edits, inqs, sessions, refs, leads] = await Promise.all([
      sb.from("content_change_log").select("content_key, lang, changed_at")
        .order("changed_at", { ascending: false }).limit(FEED_EACH),
      sb.from("inquiries").select("id, source, created_at, is_test")
        .order("created_at", { ascending: false }).limit(FEED_EACH),
      sb.from("consultation_sessions").select("status, created_at")
        .order("created_at", { ascending: false }).limit(FEED_EACH),
      sb.from("cotreatment_referrals").select("status, created_at")
        .order("created_at", { ascending: false }).limit(FEED_EACH),
      sb.from("hospital_leads").select("status, created_at, last_status_at")
        .order("created_at", { ascending: false }).limit(FEED_EACH),
    ]);

    const feed: FeedItem[] = [
      ...((edits.data || []).map((r: any): FeedItem => ({
        at: r.changed_at,
        role: "coordinator",
        label: `문구 수정 — ${r.content_key} (${r.lang})`,
        href: "/coordinator/content",
      }))),
      ...((inqs.data || []).map((r: any): FeedItem => ({
        at: r.created_at,
        role: "patient",
        label: `새 문의 #${r.id}${r.source ? ` · ${r.source}` : ""}${r.is_test ? " · 테스트" : ""}`,
        href: "/admin/inquiries",
      }))),
      ...((sessions.data || []).map((r: any): FeedItem => ({
        at: r.created_at,
        role: "coordinator",
        label: `화상 상담 세션 생성${r.status ? ` · ${r.status}` : ""}`,
        href: "/admin/consultations",
      }))),
      ...((refs.data || []).map((r: any): FeedItem => ({
        at: r.created_at,
        role: "agency",
        label: `협진 의뢰${r.status ? ` · ${r.status}` : ""}`,
        href: "/admin/khidi/referrals",
      }))),
      ...((leads.data || []).map((r: any): FeedItem => ({
        at: r.last_status_at || r.created_at,
        role: "hospital",
        label: `병원 리드${r.status ? ` · ${r.status}` : ""}`,
        href: "/admin/leads",
      }))),
    ]
      .filter((f) => f.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 12);

    return NextResponse.json({
      ok: true,
      cards: {
        patient: { inquiries: inquiriesTotal, chatThreads: chatThreadsTotal, telegram: chatTelegram, whatsapp: chatWhatsapp },
        coordinator: { consultations: consultationsTotal, upcoming: consultationsUpcoming, estimates: estimatesTotal, contentEdits },
        agency: { active: agenciesActive, users: agencyUsers, referrals: referralsTotal, referralsPending },
        hospital: { hospitals: hospitalsTotal, users: hospitalUsers, leads: leadsTotal, unanswered: leadsUnanswered },
        system: { aiRunDate: ai.runDate, aiPassRate: ai.passRate, aiHallucinations: ai.hallucinations },
      },
      feed,
      asOf: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[dashboard/overview] error:", e);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
