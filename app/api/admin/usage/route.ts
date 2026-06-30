/**
 * healwith 외부 서비스 사용량 API
 *
 * GET /api/admin/usage
 *
 * 권한: admin only (requireAdminAuth)
 * 반환: 서비스 레지스트리 + 실측치(제미나이 토큰·비용, DB 활동량)
 *
 * - 제미나이: ai_usage_events 에서 오늘/이번 달 호출·토큰·추정비용 + 월말 예상비용.
 * - DB 활동량: 주요 테이블 누적 행수(용량·MAU 는 벤더 콘솔에서 — 여기선 성장 신호만).
 * - 나머지(Vercel·LiveKit·Sentry): 레지스트리 값 + 콘솔 링크(measure='console').
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { EXTERNAL_SERVICES } from "@/lib/admin/externalServices";
import { getAiUsageSummary, MODEL_PRICING } from "@/lib/ai/usageLog";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

// KST 기준 '오늘 0시' / '이번 달 1일 0시' ISO
function kstDayStartISO(now: Date): string {
  const k = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, "0")}-${String(k.getUTCDate()).padStart(2, "0")}T00:00:00+09:00`;
}
function kstMonthStartISO(now: Date): { iso: string; dayOfMonth: number; daysInMonth: number } {
  const k = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = k.getUTCFullYear();
  const m = k.getUTCMonth(); // 0-based
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return {
    iso: `${y}-${String(m + 1).padStart(2, "0")}-01T00:00:00+09:00`,
    dayOfMonth: k.getUTCDate(),
    daysInMonth,
  };
}

async function countTable(table: string, sinceISO?: string): Promise<number | null> {
  try {
    let q = (supabaseAdmin as any).from(table).select("*", { count: "exact", head: true });
    if (sinceISO) q = q.gte("created_at", sinceISO);
    const { count, error } = await q;
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const now = new Date();
    const dayStart = kstDayStartISO(now);
    const month = kstMonthStartISO(now);
    const nowISO = now.toISOString();

    // --- 제미나이 실측 ---
    const [today, monthSummary] = await Promise.all([
      getAiUsageSummary(dayStart, nowISO),
      getAiUsageSummary(month.iso, nowISO),
    ]);

    // 월말 예상비용: 이번 달 누적 / 경과일 * 그 달 총일수
    const projectedMonthCost =
      month.dayOfMonth > 0
        ? Math.round((monthSummary.totals.costUsd / month.dayOfMonth) * month.daysInMonth * 1e6) / 1e6
        : monthSummary.totals.costUsd;

    const gemini = {
      today: today.totals,
      month: monthSummary.totals,
      projectedMonthCost,
      bySurface: monthSummary.rows,
      pricing: MODEL_PRICING,
    };

    // --- DB 활동량(성장 신호) ---
    const [inquiries, sessions, aiCallsMonth, chatMessages] = await Promise.all([
      countTable("inquiries"),
      countTable("consultation_sessions"),
      countTable("ai_usage_events", month.iso),
      countTable("chat_messages"),
    ]);
    const db_activity = {
      inquiriesTotal: inquiries,
      consultationSessionsTotal: sessions,
      aiCallsThisMonth: aiCallsMonth,
      chatMessagesTotal: chatMessages,
    };

    return Response.json({
      ok: true,
      generatedAt: nowISO,
      services: EXTERNAL_SERVICES,
      live: { gemini, db_activity },
    });
  } catch (err) {
    console.error("[api/admin/usage] error:", (err as Error).message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
