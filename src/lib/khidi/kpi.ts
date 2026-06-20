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

// ============================================================
// 내부 유틸: 국적 코드 → 한국어 표기 (KHIDI 리포트 가독성)
// inquiries.nationality 는 ISO 2자리 코드(KZ/RU/UZ…)로 저장됨.
// 대시보드 진행바 색상은 "카자흐"/"러시아" 또는 "KZ"/"RU" 둘 다 매칭하므로
// 한국어로 바꿔도 색상 로직 유지됨. 모르는 코드는 원문 그대로 둔다.
// ============================================================
const NATIONALITY_NAMES: Record<string, string> = {
  KZ: "카자흐스탄",
  RU: "러시아",
  UZ: "우즈베키스탄",
  KG: "키르기스스탄",
  TJ: "타지키스탄",
  TM: "투르크메니스탄",
  AZ: "아제르바이잔",
  GE: "조지아",
  AM: "아르메니아",
  BY: "벨라루스",
  UA: "우크라이나",
  MN: "몽골",
  KR: "한국",
  CN: "중국",
  JP: "일본",
  US: "미국",
};

function normalizeNationality(raw: string | null | undefined): string {
  if (!raw) return "기타";
  const v = raw.trim();
  if (!v) return "기타";
  return NATIONALITY_NAMES[v.toUpperCase()] ?? v;
}

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

  const patientKey = (r: {
    patient_id: string | null;
    inquiry_id: number | null;
  }): string | null =>
    r.patient_id ?? (r.inquiry_id != null ? `inq:${r.inquiry_id}` : null);

  const uniqueKeys = new Set(
    sessions.map(patientKey).filter((k): k is string => k != null)
  );
  const uniquePatients = uniqueKeys.size;

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

  // 환자(중복제거) 1명당 국적 1회 카운트
  const countryMap: Record<string, number> = {};
  const counted = new Set<string>();
  for (const r of sessions) {
    const key = patientKey(r);
    if (!key || counted.has(key)) continue;
    counted.add(key);
    const nat =
      (r.inquiry_id != null ? natByInquiry.get(r.inquiry_id) : undefined) ??
      "기타";
    countryMap[nat] = (countryMap[nat] ?? 0) + 1;
  }
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

  // 평가 직결: 집계 쿼리 오류(없는 컬럼·연결 등 #102 부류)가 있으면 자동 알림.
  // 매일 도는 cron 이라 = 평가 숫자 깨짐 canary. 알림 실패는 스냅샷에 영향 없게 격리.
  if (kpi.errors.length > 0) {
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
}
