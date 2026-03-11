/**
 * HEALO: 리드 품질 스코어링 시스템
 * 
 * 목적:
 * - 운영자가 '먼저 봐야 할 문의'를 바로 알게 하기
 * - 자동으로 우선순위 태그 부여
 * - 전환 가능성 높은 리드 우선 처리
 * 
 * 원칙:
 * - 규칙 기반 (간단하고 예측 가능)
 * - 점수는 참고용 (최종 판단은 운영자)
 * - 설정 변경 쉽게 (코드 수정 최소화)
 */

/**
 * 리드 품질 등급
 */
export type LeadQuality = 'hot' | 'warm' | 'cold' | 'spam';

/**
 * 리드 태그
 */
export interface LeadTags {
  /** 품질 등급 */
  quality: LeadQuality;
  /** 우선순위 점수 (0-100) */
  priorityScore: number;
  /** 자동 부여된 태그들 */
  tags: string[];
  /** 시그널 설명 */
  signals: string[];
}

/**
 * 리드 평가 입력
 */
export interface LeadEvaluation {
  /** 국가 */
  country?: string | null;
  /** 언어 */
  language?: string | null;
  /** 시술 타입 */
  treatmentType?: string | null;
  /** UTM 소스 */
  utmSource?: string | null;
  /** 메시지 길이 */
  messageLength?: number;
  /** 필수 필드 누락 수 */
  missingFieldsCount?: number;
  /** 이메일 도메인 */
  emailDomain?: string | null;
  /** intake 완성도 */
  intakeCompleteness?: number; // 0-1
}

/**
 * ✅ 스코어링 설정 (쉽게 조정 가능)
 */
const SCORING_CONFIG = {
  // 국가별 가중치
  COUNTRY_WEIGHTS: {
    'KR': 10,  // 한국: 높은 우선순위
    'US': 8,   // 미국: 높음
    'JP': 8,   // 일본: 높음
    'CN': 6,   // 중국: 중간
    'TH': 5,   // 태국: 중간
    'default': 3  // 기타
  } as Record<string, number>,

  // 시술별 가중치 (수익성/전환율 기반)
  TREATMENT_WEIGHTS: {
    'rhinoplasty': 10,      // 코 성형: 고가
    'double-eyelid': 8,     // 쌍꺼풀: 인기
    'facelift': 10,         // 안면 거상: 고가
    'breast-augmentation': 9, // 가슴 확대: 고가
    'liposuction': 7,       // 지방 흡입: 중간
    'botox': 4,             // 보톡스: 저가
    'filler': 4,            // 필러: 저가
    'default': 5            // 기타
  } as Record<string, number>,

  // UTM 소스별 품질
  UTM_WEIGHTS: {
    'google': 7,
    'naver': 8,
    'instagram': 6,
    'facebook': 5,
    'organic': 8,
    'direct': 6,
    'referral': 7,
    'default': 5
  } as Record<string, number>,

  // 이메일 도메인 품질 (스팸 필터링)
  EMAIL_DOMAIN_SCORE: {
    // 신뢰도 높은 도메인
    'gmail.com': 0,
    'yahoo.com': 0,
    'outlook.com': 0,
    'naver.com': 0,
    'kakao.com': 0,
    // 스팸 가능성 높은 패턴
    'tempmail': -20,
    'throwaway': -20,
    'guerrilla': -20,
    'mailinator': -20,
  } as Record<string, number>,

  // 기본 임계값
  THRESHOLDS: {
    HOT: 70,   // 70점 이상: hot
    WARM: 50,  // 50-69점: warm
    COLD: 30,  // 30-49점: cold
    SPAM: 30,  // 30점 미만: spam
  },
} as const;

/**
 * ✅ 리드 품질 평가
 * 
 * @param input 리드 정보
 * @returns 품질 평가 결과
 */
export function evaluateLeadQuality(input: LeadEvaluation): LeadTags {
  let score = 40; // 기본 점수 (중립)
  const tags: string[] = [];
  const signals: string[] = [];

  try {
    // 1. 국가 평가
    if (input.country) {
      const countryWeight = SCORING_CONFIG.COUNTRY_WEIGHTS[input.country.toUpperCase()] 
        || SCORING_CONFIG.COUNTRY_WEIGHTS.default;
      score += countryWeight;
      
      if (countryWeight >= 8) {
        tags.push('high-value-country');
        signals.push(`Target country: ${input.country}`);
      }
    }

    // 2. 시술 타입 평가
    if (input.treatmentType) {
      const treatmentWeight = SCORING_CONFIG.TREATMENT_WEIGHTS[input.treatmentType] 
        || SCORING_CONFIG.TREATMENT_WEIGHTS.default;
      score += treatmentWeight;
      
      if (treatmentWeight >= 9) {
        tags.push('high-value-treatment');
        signals.push(`Premium treatment: ${input.treatmentType}`);
      }
    }

    // 3. UTM 소스 평가
    if (input.utmSource) {
      const utmWeight = SCORING_CONFIG.UTM_WEIGHTS[input.utmSource.toLowerCase()] 
        || SCORING_CONFIG.UTM_WEIGHTS.default;
      score += utmWeight;
      
      if (utmWeight >= 7) {
        tags.push('quality-source');
        signals.push(`Quality source: ${input.utmSource}`);
      }
    }

    // 4. 메시지 품질 평가
    if (input.messageLength !== undefined) {
      if (input.messageLength > 200) {
        score += 10;
        tags.push('detailed-inquiry');
        signals.push('Detailed message provided');
      } else if (input.messageLength < 20) {
        score -= 10;
        tags.push('brief-message');
        signals.push('Very short message');
      }
    }

    // 5. 필수 필드 완성도 평가
    if (input.missingFieldsCount !== undefined) {
      if (input.missingFieldsCount === 0) {
        score += 15;
        tags.push('complete-profile');
        signals.push('All required fields filled');
      } else if (input.missingFieldsCount >= 3) {
        score -= 10;
        tags.push('incomplete-profile');
        signals.push(`${input.missingFieldsCount} fields missing`);
      }
    }

    // 6. Intake 완성도 평가
    if (input.intakeCompleteness !== undefined) {
      if (input.intakeCompleteness >= 0.8) {
        score += 10;
        tags.push('high-intent');
        signals.push('Detailed medical intake provided');
      } else if (input.intakeCompleteness < 0.3) {
        score -= 5;
      }
    }

    // 7. 이메일 도메인 평가 (스팸 필터)
    if (input.emailDomain) {
      const domainLower = input.emailDomain.toLowerCase();
      
      // 스팸 도메인 체크
      for (const [pattern, penalty] of Object.entries(SCORING_CONFIG.EMAIL_DOMAIN_SCORE)) {
        if (domainLower.includes(pattern) && penalty < 0) {
          score += penalty;
          tags.push('suspicious-email');
          signals.push(`Suspicious email domain: ${pattern}`);
          break;
        }
      }
    }

    // 8. 품질 등급 결정
    let quality: LeadQuality;
    if (score >= SCORING_CONFIG.THRESHOLDS.HOT) {
      quality = 'hot';
      tags.push('priority-high');
    } else if (score >= SCORING_CONFIG.THRESHOLDS.WARM) {
      quality = 'warm';
      tags.push('priority-medium');
    } else if (score >= SCORING_CONFIG.THRESHOLDS.COLD) {
      quality = 'cold';
      tags.push('priority-low');
    } else {
      quality = 'spam';
      tags.push('review-required');
    }

    // 점수 범위 제한 (0-100)
    const normalizedScore = Math.max(0, Math.min(100, score));

    return {
      quality,
      priorityScore: normalizedScore,
      tags: [...new Set(tags)], // 중복 제거
      signals: [...new Set(signals)],
    };

  } catch (error) {
    console.error('[leadQuality] Evaluation error:', error);
    
    // 에러 시 중립 점수 반환 (fail-safe)
    return {
      quality: 'warm',
      priorityScore: 50,
      tags: ['evaluation-error'],
      signals: ['Failed to evaluate lead quality'],
    };
  }
}

/**
 * ✅ 리드 태그 적용 권장 사항
 * 
 * DB 스키마 (inquiries 테이블에 추가 권장):
 * - lead_quality TEXT (hot | warm | cold | spam)
 * - priority_score INTEGER (0-100)
 * - lead_tags JSONB (태그 배열)
 * - quality_signals JSONB (시그널 배열)
 * 
 * 인덱스 (운영 조회 성능):
 * - CREATE INDEX idx_inquiries_lead_quality ON inquiries(lead_quality);
 * - CREATE INDEX idx_inquiries_priority_score ON inquiries(priority_score DESC);
 */

/**
 * ✅ 운영 대시보드 쿼리 예시
 */
export const LEAD_QUALITY_QUERIES = {
  // 우선순위 높은 문의 (먼저 봐야 할 것)
  HIGH_PRIORITY: `
    SELECT *
    FROM inquiries
    WHERE lead_quality IN ('hot', 'warm')
      AND status = 'received'
    ORDER BY priority_score DESC, created_at DESC
    LIMIT 20;
  `,

  // 품질별 통계
  QUALITY_STATS: `
    SELECT 
      lead_quality,
      COUNT(*) as count,
      AVG(priority_score) as avg_score
    FROM inquiries
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY lead_quality
    ORDER BY avg_score DESC;
  `,

  // 스팸 의심 문의
  SPAM_REVIEW: `
    SELECT *
    FROM inquiries
    WHERE lead_quality = 'spam'
      AND status = 'received'
    ORDER BY created_at DESC
    LIMIT 50;
  `,

  // 시술별 품질 분포
  TREATMENT_QUALITY: `
    SELECT 
      treatment_type,
      lead_quality,
      COUNT(*) as count
    FROM inquiries
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY treatment_type, lead_quality
    ORDER BY treatment_type, count DESC;
  `,
} as const;
