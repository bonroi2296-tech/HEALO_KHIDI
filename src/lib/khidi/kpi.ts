/**
 * healwith KHIDI KPI 집계 라이브러리
 *
 * K-01 외국인환자 유치 건수 (목표: 10건)
 * K-02 원격 사전상담 건수   (목표: 80건)
 * K-03 환자 만족도 평균     (목표: 80점)
 * K-04 사후관리 건수        (가산점, 목표 없음)
 *
 * 기준 SQL: docs/government-project/KPI_측정방법_명세.md
 * DB 스키마: migrations/20260501_may_features_bundle.sql
 */

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

// ============================================================
// 타입 정의
// ============================================================
export interface KpiResult {
  /** K-02: 사전상담 건수 (session_type='pre_consultation', status='completed', duration>=5) */
  preConsultation: number;
  /** K-04: 사후관리 건수 (session_type='follow_up', status='completed') */
  followUp: number;
  /** K-01: 환자유치 건수 (patient_visited_korea=true 또는 visit_confirmed_at IS NOT NULL) */
  attraction: number;
  /** K-03: 만족도 평균 (100점 환산) — 응답 없으면 null */
  satisfactionAvg: number | null;
  /** K-03: 만족도 응답 수 */
  satisfactionResponseCount: number;
  /** K-03: 만족도 응답률 (%) — surveys 대비 */
  satisfactionResponseRate: number | null;
  /** 고유 환자 수 */
  uniquePatients: number;
  /** 국가별 분포 [{ nationality, count }] */
  countries: Array<{ nationality: string; count: number }>;
}

export interface DailyKpiPoint {
  date: string; // YYYY-MM-DD
  pre: number;
  follow: number;
  attraction: number;
}

// ============================================================
// 내부 유틸: service_role 클라이언트 (RLS 우회)
// 중복정리: 자체 createClient 제거 → 정본 supabaseAdmin 싱글톤 위임(fail-closed).
// ============================================================
function getAdminClient(): SupabaseClient {
  // 옛 getAdminClient 는 제네릭 없는 createClient(=느슨한 타입)였다. kpi 쿼리들이
  // 그 느슨한 타입에 의존하므로(드러난 스키마-타입 불일치는 별도 과제) 동일 타입으로 캐스팅.
  return supabaseAdmin as unknown as SupabaseClient;
}

// ============================================================
// 내부: 날짜 범위 → KPI 집계 (SQL)
// ============================================================
async function _fetchKpiInRange(
  fromISO: string,
  toISO: string
): Promise<KpiResult> {
  const supabase = getAdminClient();

  // --- K-02: 사전상담 건수 ---
  const { count: preCount, error: e1 } = await supabase
    .from("consultation_sessions")
    .select("*", { count: "exact", head: true })
    .eq("session_type", "pre_consultation")
    .eq("status", "completed")
    .gte("scheduled_at", fromISO)
    .lt("scheduled_at", toISO)
    .gte("actual_duration_minutes", 5);

  if (e1) console.error("[kpi] pre_consultation count error:", e1.message);

  // --- K-04: 사후관리 건수 ---
  const { count: followCount, error: e2 } = await supabase
    .from("consultation_sessions")
    .select("*", { count: "exact", head: true })
    .eq("session_type", "follow_up")
    .eq("status", "completed")
    .gte("scheduled_at", fromISO)
    .lt("scheduled_at", toISO);

  if (e2) console.error("[kpi] follow_up count error:", e2.message);

  // --- K-01: 환자유치 건수 (visit_confirmed_at IS NOT NULL 로 판단) ---
  const { count: attractionCount, error: e3 } = await supabase
    .from("consultation_sessions")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed")
    .not("visit_confirmed_at", "is", null)
    .gte("visit_confirmed_at", fromISO)
    .lt("visit_confirmed_at", toISO);

  if (e3) console.error("[kpi] attraction count error:", e3.message);

  // --- K-03: 만족도 평균 + 응답률 ---
  // (survey_type 필터링은 surveys 테이블 JOIN 필요. 현재는 모든 응답 평균.)
  const { data: surveyResponsesFull, error: e4b } = await (supabase as any)
    .from("survey_responses")
    .select("q1_score, q2_score, q3_score, q4_score, q5_score, survey_id")
    .gte("submitted_at", fromISO)
    .lt("submitted_at", toISO);

  if (e4b) console.error("[kpi] survey_responses error:", e4b.message);

  const responses = surveyResponsesFull ?? [];
  let satisfactionAvg: number | null = null;
  if (responses.length > 0) {
    const sum = responses.reduce((acc, r) => {
      const avg5 =
        ((r.q1_score ?? 0) +
          (r.q2_score ?? 0) +
          (r.q3_score ?? 0) +
          (r.q4_score ?? 0) +
          (r.q5_score ?? 0)) /
        5;
      return acc + avg5 * 20; // Likert 5점 → 100점
    }, 0);
    satisfactionAvg = Math.round((sum / responses.length) * 10) / 10;
  }

  // 응답률: 해당 기간 발송된 surveys 대비 responded=true
  const { count: surveysSentCount } = await supabase
    .from("surveys")
    .select("*", { count: "exact", head: true })
    .gte("sent_at", fromISO)
    .lt("sent_at", toISO);

  const satisfactionResponseCount = responses.length;
  const satisfactionResponseRate =
    surveysSentCount && surveysSentCount > 0
      ? Math.round((satisfactionResponseCount / surveysSentCount) * 1000) / 10
      : null;

  // --- 고유 환자 수 ---
  const { data: patientsData, error: e5 } = await supabase
    .from("consultation_sessions")
    .select("patient_id")
    .eq("status", "completed")
    .gte("scheduled_at", fromISO)
    .lt("scheduled_at", toISO);

  if (e5) console.error("[kpi] unique_patients error:", e5.message);

  const uniquePatientIds = new Set((patientsData ?? []).map((r) => r.patient_id));
  const uniquePatients = uniquePatientIds.size;

  // --- 국가별 분포 ---
  const { data: intakesData, error: e6 } = await supabase
    .from("khidi_intakes")
    .select("user_id, nationality")
    .in("user_id", Array.from(uniquePatientIds) as string[]);

  if (e6) console.error("[kpi] countries error:", e6.message);

  const countryMap: Record<string, number> = {};
  (intakesData ?? []).forEach((row) => {
    const nat = row.nationality ?? "기타";
    countryMap[nat] = (countryMap[nat] ?? 0) + 1;
  });
  const countries = Object.entries(countryMap)
    .map(([nationality, count]) => ({ nationality, count }))
    .sort((a, b) => b.count - a.count);

  return {
    preConsultation: preCount ?? 0,
    followUp: followCount ?? 0,
    attraction: attractionCount ?? 0,
    satisfactionAvg,
    satisfactionResponseCount,
    satisfactionResponseRate,
    uniquePatients,
    countries,
  };
}

// ============================================================
// 공개 API
// ============================================================

/**
 * 특정 연월의 KPI 집계
 * kpi_snapshots 에 없으면 직접 계산 후 upsert (캐시)
 */
export async function getKpiForMonth(
  year: number,
  month: number
): Promise<KpiResult> {
  const fromISO = `${year}-${String(month).padStart(2, "0")}-01T00:00:00+09:00`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const toISO = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+09:00`;

  return _fetchKpiInRange(fromISO, toISO);
}

/**
 * 누적 KPI 집계 (기간 지정)
 */
export async function getKpiCumulative(
  fromDate: string, // YYYY-MM-DD
  toDate: string    // YYYY-MM-DD (exclusive)
): Promise<KpiResult> {
  const fromISO = `${fromDate}T00:00:00+09:00`;
  const toISO = `${toDate}T00:00:00+09:00`;
  return _fetchKpiInRange(fromISO, toISO);
}

/**
 * 일별 시계열 (최근 N일 또는 특정 월)
 * kpi_snapshots 에서 읽고, 없으면 빈 배열 반환
 */
export async function getDailyKpiSeries(
  year: number,
  month: number
): Promise<DailyKpiPoint[]> {
  const supabase = getAdminClient();

  const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const toDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const { data, error } = await supabase
    .from("kpi_snapshots")
    .select(
      "snapshot_date, pre_consultation_count, follow_up_count, patient_attraction_count"
    )
    .gte("snapshot_date", fromDate)
    .lt("snapshot_date", toDate)
    .order("snapshot_date", { ascending: true });

  if (error) {
    console.error("[kpi] getDailyKpiSeries error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    date: row.snapshot_date,
    pre: row.pre_consultation_count ?? 0,
    follow: row.follow_up_count ?? 0,
    attraction: row.patient_attraction_count ?? 0,
  }));
}

/**
 * 어제 날짜 KPI → kpi_snapshots upsert
 * /api/cron/kpi-snapshot 에서 호출
 */
export async function upsertDailySnapshot(date: string): Promise<void> {
  // date: YYYY-MM-DD (KST)
  const [year, month] = date.split("-").map(Number);
  const dayNum = parseInt(date.split("-")[2], 10);

  const fromISO = `${date}T00:00:00+09:00`;
  const nextDay = new Date(Date.UTC(year, month - 1, dayNum + 1));
  const toISO = `${nextDay.getUTCFullYear()}-${String(nextDay.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDay.getUTCDate()).padStart(2, "0")}T00:00:00+09:00`;

  const kpi = await _fetchKpiInRange(fromISO, toISO);

  const supabase = getAdminClient();
  const { error } = await supabase.from("kpi_snapshots").upsert(
    {
      snapshot_date: date,
      pre_consultation_count: kpi.preConsultation,
      follow_up_count: kpi.followUp,
      patient_attraction_count: kpi.attraction,
      satisfaction_avg: kpi.satisfactionAvg,
      satisfaction_response_count: kpi.satisfactionResponseCount,
      unique_patients_count: kpi.uniquePatients,
      countries: kpi.countries,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "snapshot_date" }
  );

  if (error) {
    console.error("[kpi] upsertDailySnapshot error:", error.message);
    throw error;
  }
}
