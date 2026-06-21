/**
 * healwith KHIDI KPI 집계 라이브러리
 *
 * 공식 목표(8/27 중간평가, src/lib/khidi/targets.ts):
 *   K-01 외국인환자 유치        목표 12건  (inquiries.outcome='admitted')
 *   K-02+K-04 사전상담+사후관리  목표 120건 (consultation_sessions 완료 건수 합산)
 *   K-03 환자 만족도 평균        목표 90점
 *
 * ⚠️ 2026-06-19 수정: K-01·K-02 가 존재하지 않는 컬럼(visit_confirmed_at,
 *    actual_duration_minutes)을 쿼리해 PostgREST 오류로 항상 0이었음(POSTMORTEMS #7).
 *    유치확정은 전환 깔때기 RPC(conversion_funnel)와 동일하게 inquiries.outcome='admitted'
 *    로 집계. 사전상담은 duration 필터 제거(duration_seconds 미추적 + 컬럼명 오류).
 *
 * 기준 SQL: docs/government-project/KPI_측정방법_명세.md
 * DB 스키마: migrations/20260501_may_features_bundle.sql
 */

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { recentSnapshotDates } from "@/lib/khidi/snapshotDates";
import { normalizeNationality } from "@/lib/khidi/nationality";
import { avgSatisfaction100 } from "@/lib/khidi/satisfaction";
import { aggregatePatients } from "@/lib/khidi/patientAggregation";

export { recentSnapshotDates };

// ============================================================
// 타입 정의
// ============================================================
export interface KpiResult {
  /** K-02: 사전상담 건수 (session_type='pre_consultation', status='completed') — scheduled_at 기준 */
  preConsultation: number;
  /** K-04: 사후관리 건수 (session_type='follow_up', status='completed') — scheduled_at 기준 */
  followUp: number;
  /** K-01: 환자유치 건수 (inquiries.outcome='admitted', created_at 코호트). 코디 수동 확정
   *  + 병원 '치료 확정'(hospital_leads converted) 자동 반영 — 전환 깔때기와 동일 정의. */
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
  /** 집계 중 발생한 쿼리 오류(컬럼명 오류 등). 비어있으면 정상. 화면에 경고로 표시. */
  errors: string[];
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

// 국적 코드 → 한국어 표기(normalizeNationality)·만족도 환산(avgSatisfaction100)은
// server-only 가 아닌 순수 모듈(nationality.ts·satisfaction.ts)로 분리해 단위테스트로 고정.

// ============================================================
// 내부: 날짜 범위 → KPI 집계 (SQL)
// ============================================================
async function _fetchKpiInRange(
  fromISO: string,
  toISO: string
): Promise<KpiResult> {
  const supabase = getAdminClient();
  const errors: string[] = [];
  const noteErr = (label: string, msg: string) => {
    console.error(`[kpi] ${label} error:`, msg);
    errors.push(`${label}: ${msg}`);
  };

  // --- K-02: 사전상담 건수 (완료 세션 수) ---
  // duration 필터 제거: duration_seconds 가 미추적(전부 null)이고, 옛 코드의
  // actual_duration_minutes 는 존재하지 않는 컬럼이었음.
  const { count: preCount, error: e1 } = await supabase
    .from("consultation_sessions")
    .select("*", { count: "exact", head: true })
    .eq("session_type", "pre_consultation")
    .eq("status", "completed")
    .gte("scheduled_at", fromISO)
    .lt("scheduled_at", toISO);

  if (e1) noteErr("pre_consultation count", e1.message);

  // --- K-04: 사후관리 건수 (완료 세션 수) ---
  const { count: followCount, error: e2 } = await supabase
    .from("consultation_sessions")
    .select("*", { count: "exact", head: true })
    .eq("session_type", "follow_up")
    .eq("status", "completed")
    .gte("scheduled_at", fromISO)
    .lt("scheduled_at", toISO);

  if (e2) noteErr("follow_up count", e2.message);

  // --- K-01: 환자유치 건수 (inquiries.outcome='admitted') ---
  // 전환 깔때기 RPC(conversion_funnel)와 동일 정의로 통일 → 두 대시보드 수치 일치.
  // 날짜 기준 = inquiries.created_at (코호트, 깔때기와 동일). 옛 코드는 존재하지 않는
  // consultation_sessions.visit_confirmed_at 를 쿼리해 항상 0이었음.
  const { count: attractionCount, error: e3 } = await supabase
    .from("inquiries")
    .select("*", { count: "exact", head: true })
    .eq("outcome", "admitted")
    .gte("created_at", fromISO)
    .lt("created_at", toISO);

  if (e3) noteErr("attraction count", e3.message);

  // --- K-03: 만족도 평균 + 응답률 ---
  // (survey_type 필터링은 surveys 테이블 JOIN 필요. 현재는 모든 응답 평균.)
  const { data: surveyResponsesFull, error: e4b } = await (supabase as any)
    .from("survey_responses")
    .select("q1_score, q2_score, q3_score, q4_score, q5_score, survey_id")
    .gte("submitted_at", fromISO)
    .lt("submitted_at", toISO);

  if (e4b) noteErr("survey_responses", e4b.message);

  const responses = surveyResponsesFull ?? [];
  const satisfactionAvg = avgSatisfaction100(responses);

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

  // --- 고유 환자 수 + 국가별 분포 ---
  // 환자 식별·국적 매핑: consultation_sessions.patient_id 는 현재 전부 null(미사용)이라
  // 실제 연결고리는 inquiry_id → inquiries.nationality 다. 옛 코드는 존재하지 않는
  // 테이블 khidi_intakes 를 쿼리해 국가분포·고유환자수가 항상 비어 있었음
  // (KNOWN_ISSUES 2026-06-19). patient_id 가 채워지는 미래도 대비해
  // "환자키 = patient_id ?? inq:<inquiry_id>" 로 중복제거한다.
  const { data: sessRows, error: e5 } = await supabase
    .from("consultation_sessions")
    .select("patient_id, inquiry_id")
    .eq("status", "completed")
    .gte("scheduled_at", fromISO)
    .lt("scheduled_at", toISO);

  if (e5) noteErr("unique_patients/countries", e5.message);

  const sessions = (sessRows ?? []) as Array<{
    patient_id: string | null;
    inquiry_id: number | null;
  }>;

  // inquiry_id → nationality 조회 (inquiries.nationality = ISO 국가코드 KZ/RU/UZ…)
  const inquiryIds = Array.from(
    new Set(
      sessions
        .map((r) => r.inquiry_id)
        .filter((id): id is number => id != null)
    )
  );

  const natByInquiry = new Map<number, string>();
  if (inquiryIds.length > 0) {
    const { data: inqRows, error: e6 } = await supabase
      .from("inquiries")
      .select("id, nationality")
      .in("id", inquiryIds);

    if (e6) noteErr("countries(nationality)", e6.message);

    (inqRows ?? []).forEach((r: { id: number; nationality: string | null }) => {
      natByInquiry.set(r.id, normalizeNationality(r.nationality));
    });
  }

  // 환자 중복제거(고유환자수) + 국가별 분포 — 순수 변환(patientAggregation.ts)으로 위임.
  const { uniquePatients, countries } = aggregatePatients(sessions, natByInquiry);

  return {
    preConsultation: preCount ?? 0,
    followUp: followCount ?? 0,
    attraction: attractionCount ?? 0,
    satisfactionAvg,
    satisfactionResponseCount,
    satisfactionResponseRate,
    uniquePatients,
    countries,
    errors,
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
 * 특정 하루치 KPI → kpi_snapshots upsert.
 * 반환값 = 그날 집계 중 발생한 쿼리 오류 배열(#102 부류). 정상이면 [].
 *
 * @param opts.suppressCanary true면 이 함수 안에서 canary 알림을 쏘지 않는다.
 *   (백필 루프 `upsertRecentSnapshots` 가 윈도우 전체에서 한 번만 묶어서 쏘기 위함 —
 *    같은 컬럼 오류가 N일 반복돼도 critical 알림이 N통 가지 않게 중복 방지.)
 */
export async function upsertDailySnapshot(
  date: string,
  opts: { suppressCanary?: boolean } = {}
): Promise<string[]> {
  // date: YYYY-MM-DD (KST)
  const [year, month] = date.split("-").map(Number);
  const dayNum = parseInt(date.split("-")[2], 10);

  const fromISO = `${date}T00:00:00+09:00`;
  const nextDay = new Date(Date.UTC(year, month - 1, dayNum + 1));
  const toISO = `${nextDay.getUTCFullYear()}-${String(nextDay.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDay.getUTCDate()).padStart(2, "0")}T00:00:00+09:00`;

  const kpi = await _fetchKpiInRange(fromISO, toISO);

  // 평가 직결: 집계 쿼리 오류(없는 컬럼·연결 등 #102 부류)가 있으면 자동 알림.
  // 매일 도는 cron 이라 = 평가 숫자 깨짐 canary. 알림 실패는 스냅샷에 영향 없게 격리.
  if (!opts.suppressCanary && kpi.errors.length > 0) {
    try {
      const { alertKpiAggregationErrors } = await import(
        "@/lib/alerts/operationalAlerts"
      );
      await alertKpiAggregationErrors(kpi.errors, `snapshot ${date}`);
    } catch (alertErr) {
      console.error("[kpi] KPI 오류 알림 발송 실패:", (alertErr as Error).message);
    }
  }

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

  return kpi.errors;
}

export interface SnapshotBackfillResult {
  date: string;
  ok: boolean;
  error?: string;
}

/**
 * 자가복구 백필: endDate 포함 최근 `days`일치 스냅샷을 매번 idempotent upsert 한다.
 *
 * 왜: Vercel cron 은 최선노력(best-effort)이라 가끔 하루를 거른다(실측: 2026-06-16·
 *     06-19 스냅샷 누락 — POSTMORTEMS). 매 실행마다 최근 며칠을 다시 메우면
 *     (1) 하루 걸러도 다음 날 자동 복구돼 일별 시계열에 빈 칸이 안 남고,
 *     (2) 그 날짜들의 집계 쿼리를 다시 돌려 #102 canary 커버리지도 넓어진다.
 *
 * - upsert 는 onConflict=snapshot_date 라 재실행해도 안전(idempotent).
 * - 하루가 실패해도 나머지 날은 계속 진행(격리).
 * - canary 는 윈도우 전체에서 **한 번만** 발사(같은 오류 N일 반복 시 중복 알림 방지).
 */
export async function upsertRecentSnapshots(
  endDate: string,
  days = 7
): Promise<SnapshotBackfillResult[]> {
  const dates = recentSnapshotDates(endDate, days);
  const results: SnapshotBackfillResult[] = [];
  const uniqueErrors = new Set<string>();
  let daysWithErrors = 0;

  for (const d of dates) {
    try {
      const errs = await upsertDailySnapshot(d, { suppressCanary: true });
      results.push({ date: d, ok: true });
      if (errs.length > 0) {
        daysWithErrors += 1;
        errs.forEach((e) => uniqueErrors.add(e));
      }
    } catch (err) {
      const msg = (err as Error).message;
      console.error(`[kpi] upsertRecentSnapshots ${d} 실패:`, msg);
      results.push({ date: d, ok: false, error: msg });
    }
  }

  // 집계 쿼리 오류(#102 부류)는 윈도우 전체에서 한 번만 canary 발사(중복 압축).
  if (uniqueErrors.size > 0) {
    try {
      const { alertKpiAggregationErrors } = await import(
        "@/lib/alerts/operationalAlerts"
      );
      await alertKpiAggregationErrors(
        Array.from(uniqueErrors),
        `snapshot backfill ${dates[0]}..${dates[dates.length - 1]} (${daysWithErrors}/${dates.length}일 영향)`
      );
    } catch (alertErr) {
      console.error("[kpi] KPI 오류 알림 발송 실패:", (alertErr as Error).message);
    }
  }

  return results;
}
