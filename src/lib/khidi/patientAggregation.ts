/**
 * KPI 집계의 "쿼리 결과 → 고유환자수·국가분포" 변환 (순수 함수).
 *
 * kpi.ts(_fetchKpiInRange) 안에 DB 쿼리와 섞여 있던 환자 중복제거·국가별 카운트
 * 로직을 떼어냈다. 이 숫자(고유환자수·국가분포)는 KHIDI 대시보드·월간보고에 직접
 * 나가므로(평가 항목 ④) 순수 함수 + 단위테스트로 고정한다. kpi.ts 는 server-only 라
 * vitest 직접 임포트가 막혀서, 여기로 분리해야 테스트가 가능하다.
 */

export interface SessionRef {
  patient_id: string | null;
  inquiry_id: number | null;
}

export interface PatientAggregation {
  uniquePatients: number;
  countries: Array<{ nationality: string; count: number }>;
}

/**
 * 환자 식별 키. consultation_sessions.patient_id 가 채워지면 그걸,
 * 아니면 inquiry_id 로 대체(`inq:<id>`). 둘 다 없으면 null(집계 제외).
 */
export function patientKey(r: SessionRef): string | null {
  return r.patient_id ?? (r.inquiry_id != null ? `inq:${r.inquiry_id}` : null);
}

/**
 * 완료 세션 목록 + (inquiry_id→국적) 맵 → 고유환자수 & 국가별 분포(내림차순).
 *
 * - 같은 환자의 세션 여러 건은 1명으로 중복제거.
 * - 국적은 환자(중복제거) 1명당 1회만 카운트. 모르면 "기타".
 * - natByInquiry 값은 이미 정규화(한국어)된 국적 문자열을 기대한다.
 */
export function aggregatePatients(
  sessions: SessionRef[],
  natByInquiry: Map<number, string>
): PatientAggregation {
  const uniqueKeys = new Set(
    sessions.map(patientKey).filter((k): k is string => k != null)
  );
  const uniquePatients = uniqueKeys.size;

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

  return { uniquePatients, countries };
}
