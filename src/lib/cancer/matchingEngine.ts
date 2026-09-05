/**
 * healwith: Cancer Hospital Matching Engine
 *
 * 암종별 병원 매칭 알고리즘
 * - 연간 시술 건수 (40점)
 * - 성공률 (25점)
 * - 예산 적합도 (20점)
 * - 치료 유형 매칭 (15점)
 *
 * 🛑 화면에 «점수·순위»를 내보내기 전에 읽어라 (2026-08-25 실측):
 *    운영 DB 의 hospital_cancer_capabilities 42행은 annual_cases·success_rate·
 *    avg_treatment_cost_usd 가 **전부 null** 이다. 그래서 실제로 돌려보면 어느 병원이든
 *    총점이 똑같이 **35점**으로 나온다(실측 2026-08-25: 건수 5 + 성공률 5 + 예산 기본값 15 +
 *    치료법 기본값 10). 순위가 아니라 «DB 반환 순서»이고, 35 라는 숫자는 근거가 아니라
 *    기본값의 합이다. 그걸 화면에 순위·점수로 내보내면 지어낸 숫자가 된다
 *    (견적 기준가 63건 사건과 같은 종류).
 *    → 지금 화면(코디 케이스 상세)은 실제로 있는 것(암종·치료법·전문의)만 보여준다.
 *      병원에서 실적 자료를 받아 그 세 칸이 차면 그때 순위를 붙인다.
 */

export type CancerType = 'stomach' | 'liver' | 'lung' | 'breast' | 'thyroid' | 'other';
export type CancerStage = 'I' | 'II' | 'III' | 'IV' | 'unknown';
export type TreatmentType = 'surgery' | 'chemo' | 'radiation' | 'immunotherapy' | 'traditional_medicine';

export interface MatchingCriteria {
  cancerType: CancerType;
  cancerStage?: CancerStage;
  preferredTreatments?: TreatmentType[];
  budgetMin?: number;
  budgetMax?: number;
  budgetCurrency?: 'USD' | 'KZT' | 'KRW';
  languagePreference?: string;
}

export interface HospitalCapability {
  id: string;
  hospital_id: string;
  hospital_name?: string;
  hospital_slug?: string;
  cancer_type: CancerType;
  treatment_types: TreatmentType[];
  annual_cases: number;
  success_rate: number;
  avg_treatment_cost_usd: number;
  avg_duration_days: number;
  specialized_doctors: Array<{
    name: string;
    specialty: string;
    experience_years: number;
  }>;
  certifications: string[];
  is_verified: boolean;
}

export interface HospitalMatch {
  hospitalId: string;
  hospitalName: string;
  hospitalSlug: string;
  totalScore: number;
  breakdown: {
    annualCasesScore: number;
    successRateScore: number;
    budgetFitScore: number;
    treatmentMatchScore: number;
  };
  capability: HospitalCapability;
  matchReasons: string[];
}

// 환율 기준 (USD 기준, 주기적 업데이트 필요)
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  KZT: 0.0021,  // 1 KZT ≈ 0.0021 USD
  KRW: 0.00073, // 1 KRW ≈ 0.00073 USD
};

function toUSD(amount: number, currency: string): number {
  const rate = EXCHANGE_RATES[currency] || 1;
  return amount * rate;
}

/**
 * 연간 시술 건수 점수 (0-40)
 * 100건 이상: 40점, 50건: 30점, 20건: 20점, 10건: 10점
 */
function scoreAnnualCases(annualCases: number): number {
  if (annualCases >= 100) return 40;
  if (annualCases >= 50) return 30;
  if (annualCases >= 20) return 20;
  if (annualCases >= 10) return 10;
  return 5;
}

/**
 * 성공률 점수 (0-25)
 * 90%+: 25점, 80%: 20점, 70%: 15점
 */
function scoreSuccessRate(rate: number): number {
  if (rate >= 0.9) return 25;
  if (rate >= 0.8) return 20;
  if (rate >= 0.7) return 15;
  if (rate >= 0.6) return 10;
  return 5;
}

/**
 * 예산 적합도 점수 (0-20)
 * 예산 내: 20점, 10% 초과: 15점, 30% 초과: 10점
 */
function scoreBudgetFit(
  avgCostUsd: number,
  budgetMin?: number,
  budgetMax?: number,
  budgetCurrency?: string
): number {
  if (!budgetMax) return 15; // 예산 미지정 시 중간값

  const maxUsd = toUSD(budgetMax, budgetCurrency || 'USD');
  const minUsd = budgetMin ? toUSD(budgetMin, budgetCurrency || 'USD') : 0;

  if (avgCostUsd <= maxUsd && avgCostUsd >= minUsd) return 20;
  if (avgCostUsd <= maxUsd * 1.1) return 15;
  if (avgCostUsd <= maxUsd * 1.3) return 10;
  return 5;
}

/**
 * 치료 유형 매칭 점수 (0-15)
 */
function scoreTreatmentMatch(
  available: TreatmentType[],
  preferred?: TreatmentType[]
): number {
  if (!preferred || preferred.length === 0) return 10;

  const matchCount = preferred.filter(t => available.includes(t)).length;
  const matchRatio = matchCount / preferred.length;

  if (matchRatio >= 1.0) return 15;
  if (matchRatio >= 0.5) return 10;
  if (matchRatio > 0) return 5;
  return 0;
}

/**
 * 매칭 사유 생성
 */
function buildMatchReasons(
  capability: HospitalCapability,
  criteria: MatchingCriteria,
  breakdown: HospitalMatch['breakdown']
): string[] {
  const reasons: string[] = [];

  if (capability.annual_cases >= 50) {
    reasons.push(`연간 ${capability.cancer_type} 치료 ${capability.annual_cases}건 수행`);
  }
  if (capability.success_rate >= 0.85) {
    reasons.push(`치료 성공률 ${(capability.success_rate * 100).toFixed(0)}%`);
  }
  if (breakdown.budgetFitScore >= 15) {
    reasons.push('예산 범위 내 치료 가능');
  }
  if (breakdown.treatmentMatchScore >= 10) {
    reasons.push('희망 치료 방법 제공 가능');
  }
  if (capability.is_verified) {
    reasons.push('KHIDI 인증 의료기관');
  }
  if (capability.specialized_doctors.length > 0) {
    const topDoc = capability.specialized_doctors[0];
    reasons.push(`${topDoc.specialty} 전문의 ${capability.specialized_doctors.length}명 (${topDoc.experience_years}년+ 경력)`);
  }

  return reasons;
}

/**
 * 메인 매칭 함수: 기준에 맞는 병원을 점수순으로 반환
 */
export function matchHospitals(
  capabilities: HospitalCapability[],
  criteria: MatchingCriteria,
  limit: number = 5
): HospitalMatch[] {
  // 1. 암종 필터
  const filtered = capabilities.filter(c => c.cancer_type === criteria.cancerType);

  // 2. 점수 계산
  const scored: HospitalMatch[] = filtered.map(cap => {
    const annualCasesScore = scoreAnnualCases(cap.annual_cases);
    const successRateScore = scoreSuccessRate(cap.success_rate);
    const budgetFitScore = scoreBudgetFit(
      cap.avg_treatment_cost_usd,
      criteria.budgetMin,
      criteria.budgetMax,
      criteria.budgetCurrency
    );
    const treatmentMatchScore = scoreTreatmentMatch(
      cap.treatment_types,
      criteria.preferredTreatments
    );

    const breakdown = {
      annualCasesScore,
      successRateScore,
      budgetFitScore,
      treatmentMatchScore,
    };

    const totalScore = annualCasesScore + successRateScore + budgetFitScore + treatmentMatchScore;

    return {
      hospitalId: cap.hospital_id,
      hospitalName: cap.hospital_name || '',
      hospitalSlug: cap.hospital_slug || '',
      totalScore,
      breakdown,
      capability: cap,
      matchReasons: buildMatchReasons(cap, criteria, breakdown),
    };
  });

  // 3. 점수 내림차순 정렬 + 상위 N개 반환
  return scored
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit);
}
