/**
 * healwith KHIDI 북극성 지표(NSM) + 선행지표 집계
 *
 * 북극성(2026-06-30 사업 사각지대 진단 결론): **주간 '사전상담 완료' 건수**.
 *   - 결과지표(유치12·상담120·만족도90)를 동시에 전진시키는 단일 활동.
 *   - 매주 PO 가 직접 올릴 수 있는 단일 운전대(결과지표는 후행이라 매주 못 다짐).
 *
 * 선행지표 4종(북극성을 미리 예측하는 신호):
 *   1) 주간 신규 문의 — 채널별(inquiries.source: ai_agent/web)
 *   2) 사전상담 예약 → 완료 전환율(consultation_sessions pre_consultation)
 *   3) 에이전시 콜드메일 발송 → 회신율 (데이터 소스 미구축 → 측정예정으로 표기)
 *   4) 만족도 응답률(surveys 대비 survey_responses)
 *
 * 시간대: 주(week) = KST 월요일 00:00 시작(사업이 한국 운영이므로). DST 없음(UTC+9 고정).
 * 테스트/실제 분리: kpi.ts 와 동일하게 inquiries.is_test / 테스트 세션 제외(평가오염 방지).
 */

import "server-only";

import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { fetchTestSessionIds, fetchTestSurveyIds, idsToInFilter } from "@/lib/khidi/testData";
import { kstWeekStartStr, lastNWeekStarts } from "@/lib/khidi/weekBuckets";

// 순수 주(week) 버킷 유틸은 weekBuckets.ts 로 분리(server-only 없이 단위테스트). 재노출.
export { kstWeekStartStr, lastNWeekStarts };

export interface WeekPoint {
  weekStart: string; // YYYY-MM-DD (KST 월요일)
  label: string; // MM/DD
  preCompleted: number; // 북극성: 그 주 완료된 사전상담 수
  preScheduled: number; // 그 주 예약(전체)된 사전상담 수
  conversionPct: number | null; // 완료/예약 (%)
  inquiriesTotal: number;
  bySource: Record<string, number>; // 채널별 신규 문의
}

export interface NorthStarResult {
  weeks: WeekPoint[];
  nsm: {
    thisWeek: number;
    lastWeek: number;
    deltaPct: number | null; // 전주 대비 %
    last4wAvg: number; // 최근 4주 평균(현재 주 제외)
  };
  leading: {
    newInquiriesThisWeek: number;
    newInquiriesLastWeek: number;
    bookingToCompletionPct: number | null; // 최근 4주 누적 완료/예약
    satisfactionResponseRatePct: number | null; // 최근 윈도우 응답률
    agencyColdEmail: { available: false; note: string }; // 데이터 소스 미구축
  };
  sources: string[]; // 등장한 문의 채널 목록(범례용)
  windowStart: string; // 윈도우 시작 ISO
  errors: string[];
}

function pctDelta(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? 100 : null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

/**
 * 북극성 + 선행지표 집계. weeks = 표시할 주 수(기본 12).
 */
export async function getNorthStarMetrics(
  now: Date = new Date(),
  weeks = 12
): Promise<NorthStarResult> {
  const db = supabaseAdmin as any;
  const errors: string[] = [];
  const weekStarts = lastNWeekStarts(now, weeks);
  const windowStart = `${weekStarts[0]}T00:00:00+09:00`;

  // 테스트 세션 제외(평가오염 방지)
  let testSessionIds: string[] = [];
  try {
    testSessionIds = await fetchTestSessionIds(db);
  } catch (e) {
    errors.push(`test_session_ids: ${(e as Error).message}`);
  }
  const testSet = new Set(testSessionIds);

  // 빈 버킷 초기화
  const byWeek = new Map<string, WeekPoint>();
  for (const ws of weekStarts) {
    byWeek.set(ws, {
      weekStart: ws,
      label: `${ws.slice(5, 7)}/${ws.slice(8, 10)}`,
      preCompleted: 0,
      preScheduled: 0,
      conversionPct: null,
      inquiriesTotal: 0,
      bySource: {},
    });
  }
  const inWindow = (ws: string) => byWeek.has(ws);

  // --- 사전상담 세션(예약/완료) ---
  {
    const { data, error } = await db
      .from("consultation_sessions")
      .select("id, scheduled_at, status")
      .eq("session_type", "pre_consultation")
      .gte("scheduled_at", windowStart)
      .limit(50000);
    if (error) errors.push(`pre_consultation: ${error.message}`);
    for (const r of (data ?? []) as Array<{ id: string; scheduled_at: string; status: string }>) {
      if (testSet.has(r.id)) continue;
      if (!r.scheduled_at) continue;
      const ws = kstWeekStartStr(new Date(r.scheduled_at));
      if (!inWindow(ws)) continue;
      const wp = byWeek.get(ws)!;
      wp.preScheduled += 1;
      if (r.status === "completed") wp.preCompleted += 1;
    }
  }

  // --- 신규 문의(채널별) ---
  const sourceSet = new Set<string>();
  {
    const { data, error } = await db
      .from("inquiries")
      .select("created_at, source, is_test")
      .gte("created_at", windowStart)
      .limit(50000);
    if (error) errors.push(`inquiries: ${error.message}`);
    for (const r of (data ?? []) as Array<{ created_at: string; source: string | null; is_test: boolean | null }>) {
      if (r.is_test) continue;
      if (!r.created_at) continue;
      const ws = kstWeekStartStr(new Date(r.created_at));
      if (!inWindow(ws)) continue;
      const wp = byWeek.get(ws)!;
      const src = r.source || "기타";
      sourceSet.add(src);
      wp.inquiriesTotal += 1;
      wp.bySource[src] = (wp.bySource[src] ?? 0) + 1;
    }
  }

  // 주별 전환율 채우기
  const weekList = weekStarts.map((ws) => {
    const wp = byWeek.get(ws)!;
    wp.conversionPct =
      wp.preScheduled > 0
        ? Math.round((wp.preCompleted / wp.preScheduled) * 1000) / 10
        : null;
    return wp;
  });

  // --- 만족도 응답률(윈도우 전체) ---
  // 테스트 설문 제외: 세션·문의 집계와 동일 원칙(공식 K-03 kpi.ts:145·162 와 일관 — 2026-07-02 전수 감사)
  let satisfactionResponseRatePct: number | null = null;
  {
    const testSurveyFilter = idsToInFilter(await fetchTestSurveyIds(db));
    let sentQ = db
      .from("surveys")
      .select("*", { count: "exact", head: true })
      .gte("sent_at", windowStart);
    if (testSurveyFilter) sentQ = sentQ.not("id", "in", testSurveyFilter);
    const { count: sentCount, error: e1 } = await sentQ;
    let respQ = db
      .from("survey_responses")
      .select("*", { count: "exact", head: true })
      .gte("submitted_at", windowStart);
    if (testSurveyFilter) respQ = respQ.not("survey_id", "in", testSurveyFilter);
    const { count: respCount, error: e2 } = await respQ;
    if (e1) errors.push(`surveys: ${e1.message}`);
    if (e2) errors.push(`survey_responses: ${e2.message}`);
    if (sentCount && sentCount > 0) {
      satisfactionResponseRatePct = Math.round(((respCount ?? 0) / sentCount) * 1000) / 10;
    }
  }

  // NSM 요약
  const n = weekList.length;
  const thisWeek = weekList[n - 1]?.preCompleted ?? 0;
  const lastWeek = weekList[n - 2]?.preCompleted ?? 0;
  const prev4 = weekList.slice(Math.max(0, n - 5), n - 1); // 현재 주 제외 직전 4주
  const last4wAvg =
    prev4.length > 0
      ? Math.round((prev4.reduce((s, w) => s + w.preCompleted, 0) / prev4.length) * 10) / 10
      : 0;

  // 선행지표: 최근 4주 누적 예약→완료
  const recent4 = weekList.slice(Math.max(0, n - 4));
  const rcCompleted = recent4.reduce((s, w) => s + w.preCompleted, 0);
  const rcScheduled = recent4.reduce((s, w) => s + w.preScheduled, 0);
  const bookingToCompletionPct =
    rcScheduled > 0 ? Math.round((rcCompleted / rcScheduled) * 1000) / 10 : null;

  return {
    weeks: weekList,
    nsm: {
      thisWeek,
      lastWeek,
      deltaPct: pctDelta(thisWeek, lastWeek),
      last4wAvg,
    },
    leading: {
      newInquiriesThisWeek: weekList[n - 1]?.inquiriesTotal ?? 0,
      newInquiriesLastWeek: weekList[n - 2]?.inquiriesTotal ?? 0,
      bookingToCompletionPct,
      satisfactionResponseRatePct,
      agencyColdEmail: {
        available: false,
        note: "콜드메일 발송·회신 로그 미연동 — 에이전시 아웃리치 트래킹 도입 시 자동 집계 예정",
      },
    },
    sources: Array.from(sourceSet).sort(),
    windowStart,
    errors,
  };
}
