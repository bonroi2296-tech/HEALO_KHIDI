/**
 * 식은 리드 감지 cron — 매일 09:30 KST (00:30 UTC), vercel.json.
 *
 * 무엇: 유치 «전» 단계(접수·상담·병원검토…)에서 COLD_LEAD_DAYS(기본 7)일 넘게 아무 움직임이
 *   없는 비시험 문의를 찾아 코디·어드민 종(bell) 알림 하나로 묶어 보낸다(주 1회 디듀프는 알림 쪽).
 * 왜 (2026-09-05 실측): 유치 후보 4건 중 3건이 24·32일째 무동작. 코디 목록의 「⏰ N일째 정체」 배지는
 *   떠 있었지만 «보러 가야 보이는» 표시라 몇 주가 갔다 — «보러 가지 않아도 울리는» 길이 이 크론이다.
 *   기존 detect-silent-patients 는 치료 «후» 환자의 증상 보고만 본다 — 유치 «전»은 이 크론이 본다.
 * 판정은 순수 함수(src/lib/inquiry/coldLeads.ts)에 있고 여기는 DB 에서 재료를 모아 넘길 뿐이다.
 * 개인정보: 알림에는 문의 번호·일수만 실린다.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { verifyCronSecret } from "@/lib/security/cronAuth";
import { notifyStaffColdLeads } from "@/lib/notifications/inApp";
import {
  COLD_LEAD_DAYS_DEFAULT,
  selectColdLeads,
  type ColdLeadInput,
} from "@/lib/inquiry/coldLeads";

function thresholdDays(): number {
  const n = Number(process.env.COLD_LEAD_DAYS || COLD_LEAD_DAYS_DEFAULT);
  return Number.isFinite(n) && n > 0 ? n : COLD_LEAD_DAYS_DEFAULT;
}

/** 표에서 «문의별 최신 시각»을 뽑는다(정렬 없이 JS 에서 max). */
function latestByInquiry(rows: any[] | null | undefined, idKey: string, atKey: string): Map<number, string> {
  const m = new Map<number, string>();
  for (const r of rows || []) {
    const id = Number(r?.[idKey]);
    const at = r?.[atKey];
    if (!Number.isFinite(id) || typeof at !== "string") continue;
    const prev = m.get(id);
    if (!prev || Date.parse(at) > Date.parse(prev)) m.set(id, at);
  }
  return m;
}

async function handle(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const t0 = Date.now();
  try {
    const { data: inquiries, error: inqErr } = await (supabaseAdmin as any)
      .from("inquiries")
      .select(
        "id, created_at, status, case_status, status_updated_at, case_status_updated_at, info_requested_at, followup_started_at, outcome, outcome_updated_at, follow_ups, is_test"
      )
      .or("is_test.is.null,is_test.eq.false")
      .is("outcome", null);
    if (inqErr) {
      console.error("[cron/detect-cold-leads] inquiries 조회 실패:", inqErr.message);
      return NextResponse.json({ ok: false, error: "query_failed" }, { status: 500 });
    }
    const rows: any[] = inquiries || [];
    const ids = rows.map((r) => Number(r.id)).filter((n) => Number.isFinite(n));
    if (ids.length === 0) {
      return NextResponse.json({ ok: true, checked: 0, cold: [], elapsed_ms: Date.now() - t0 });
    }

    const [{ data: history, error: histErr }, { data: sessions, error: sessErr }] = await Promise.all([
      (supabaseAdmin as any).from("case_status_history").select("inquiry_id, created_at").in("inquiry_id", ids),
      (supabaseAdmin as any).from("consultation_sessions").select("inquiry_id, updated_at").in("inquiry_id", ids),
    ]);
    if (histErr) console.warn("[cron/detect-cold-leads] 이력 조회 실패(이력 없이 판정):", histErr.message);
    if (sessErr) console.warn("[cron/detect-cold-leads] 상담 조회 실패(상담 없이 판정):", sessErr.message);
    const lastHistory = latestByInquiry(history, "inquiry_id", "created_at");
    const lastSession = latestByInquiry(sessions, "inquiry_id", "updated_at");

    const inputs: ColdLeadInput[] = rows.map((r) => ({
      ...r,
      id: Number(r.id),
      last_history_at: lastHistory.get(Number(r.id)) ?? null,
      last_session_at: lastSession.get(Number(r.id)) ?? null,
    }));
    const days = thresholdDays();
    const cold = selectColdLeads(inputs, Date.now(), days);

    let notified = false;
    if (cold.length > 0) {
      await notifyStaffColdLeads({ leads: cold.map((c) => ({ id: c.id, days: c.days })), thresholdDays: days });
      notified = true;
    }
    console.log(`[cron/detect-cold-leads] checked=${rows.length} cold=${cold.length} threshold=${days}d`);
    return NextResponse.json({
      ok: true,
      checked: rows.length,
      threshold_days: days,
      cold: cold.map((c) => ({ id: c.id, days: c.days, case_status: c.caseStatus })),
      notified,
      elapsed_ms: Date.now() - t0,
    });
  } catch (err: any) {
    console.error("[cron/detect-cold-leads] 오류:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
