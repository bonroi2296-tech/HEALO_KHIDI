/**
 * healwith: AI Symptom Analyzer
 *
 * 환자 증상 보고를 분석하여 위험도를 평가하고
 * 긴급 에스컬레이션 여부를 결정하는 모듈.
 *
 * 1차: 규칙 기반 응급 키워드 감지 (즉시 에스컬레이션)
 * 2차: AI 분석 (Gemini) → 위험도 점수 산출
 */

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'emergency';
export type RecommendedAction = 'auto_response' | 'schedule_followup' | 'escalate_agent' | 'escalate_doctor' | 'emergency_refer';

export interface SymptomInput {
  symptom: string;
  severity: number;    // 1-10
  duration: string;    // e.g., "3 days", "2 weeks"
  language?: string;   // 'ru' | 'kz' | 'ko' | 'en'
}

export interface SymptomReport {
  followupId: string;
  inquiryId: string;
  reportType: 'scheduled' | 'ad_hoc' | 'emergency';
  symptoms: SymptomInput[];
  additionalNotes?: string;
}

export interface SymptomAnalysis {
  riskScore: number;          // 0.0 ~ 1.0
  urgencyLevel: UrgencyLevel;
  assessment: string;
  recommendedAction: RecommendedAction;
  flaggedSymptoms: string[];
  requiresHumanReview: boolean;
}

// 응급 키워드 (다국어) - 즉시 에스컬레이션
const EMERGENCY_KEYWORDS: Record<string, string[]> = {
  ko: [
    '피를 토', '각혈', '의식 잃', '졸도', '심한 출혈', '호흡 곤란',
    '극심한 통증', '마비', '경련', '고열 40', '수술 부위 벌어',
    '응급', '구급차',
  ],
  ru: [
    'кровотечение', 'потеря сознания', 'обморок', 'сильное кровотечение',
    'затрудненное дыхание', 'одышка', 'сильная боль', 'паралич',
    'судороги', 'высокая температура 40', 'рана разошлась',
    'экстренный', 'скорая помощь', 'не могу дышать',
  ],
  en: [
    'vomiting blood', 'hemoptysis', 'loss of consciousness', 'fainting',
    'severe bleeding', 'difficulty breathing', 'extreme pain', 'paralysis',
    'seizure', 'convulsion', 'high fever 40', 'wound dehiscence',
    'emergency', 'ambulance', 'cannot breathe',
  ],
  kz: [
    'қан құсу', 'есінен тану', 'қатты қан кету', 'тыныс алу қиын',
    'қатты ауырсыну', 'сал болу', 'құрысу', 'жоғары температура',
    'жедел жәрдем',
  ],
};

// 주의 키워드 (높은 위험도이지만 즉시 응급은 아님)
const WARNING_KEYWORDS: Record<string, string[]> = {
  ko: [
    '통증 심해', '부기', '붓기', '열이', '설사', '구토', '식욕 없',
    '체중 감소', '피로', '두통', '어지러', '수면 장애',
  ],
  ru: [
    'боль усилилась', 'отёк', 'опухоль', 'температура', 'понос', 'рвота',
    'нет аппетита', 'потеря веса', 'усталость', 'головная боль',
    'головокружение', 'бессонница',
  ],
  en: [
    'pain worse', 'swelling', 'fever', 'diarrhea', 'vomiting', 'no appetite',
    'weight loss', 'fatigue', 'headache', 'dizzy', 'insomnia',
  ],
  kz: [
    'ауырсыну күшейді', 'ісіну', 'қызба', 'іш өту', 'құсу',
    'тәбет жоқ', 'салмақ жоғалту', 'шаршау',
  ],
};

/**
 * 텍스트에서 키워드 매칭 (대소문자 무시)
 */
function findKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter(kw => lower.includes(kw.toLowerCase()));
}

/**
 * 규칙 기반 1차 분석: 응급 키워드 감지
 */
function ruleBasedAnalysis(
  symptoms: SymptomInput[],
  additionalNotes?: string
): { isEmergency: boolean; isWarning: boolean; flagged: string[] } {
  const allText = [
    ...symptoms.map(s => s.symptom),
    additionalNotes || '',
  ].join(' ');

  const flagged: string[] = [];
  let isEmergency = false;
  let isWarning = false;

  // 모든 언어의 응급 키워드 체크
  for (const [, keywords] of Object.entries(EMERGENCY_KEYWORDS)) {
    const matches = findKeywords(allText, keywords);
    if (matches.length > 0) {
      isEmergency = true;
      flagged.push(...matches);
    }
  }

  // 경고 키워드 체크
  for (const [, keywords] of Object.entries(WARNING_KEYWORDS)) {
    const matches = findKeywords(allText, keywords);
    if (matches.length > 0) {
      isWarning = true;
      flagged.push(...matches);
    }
  }

  // 심각도 기반: 8 이상이면 경고, 9-10이면 응급
  const maxSeverity = Math.max(...symptoms.map(s => s.severity), 0);
  if (maxSeverity >= 9) isEmergency = true;
  else if (maxSeverity >= 8) isWarning = true;

  return { isEmergency, isWarning, flagged: [...new Set(flagged)] };
}

/**
 * 위험도 점수 계산 (0.0 ~ 1.0)
 */
function calculateRiskScore(
  symptoms: SymptomInput[],
  ruleResult: { isEmergency: boolean; isWarning: boolean; flagged: string[] }
): number {
  if (ruleResult.isEmergency) return 0.95;

  let score = 0;

  // 증상 심각도 평균 (0.0 ~ 0.4)
  const avgSeverity = symptoms.reduce((sum, s) => sum + s.severity, 0) / symptoms.length;
  score += (avgSeverity / 10) * 0.4;

  // 증상 개수 (0.0 ~ 0.2)
  score += Math.min(symptoms.length / 5, 1) * 0.2;

  // 경고 키워드 (0.0 ~ 0.3)
  if (ruleResult.isWarning) {
    score += Math.min(ruleResult.flagged.length / 3, 1) * 0.3;
  }

  // 복수 증상 보너스 (0.0 ~ 0.1)
  if (symptoms.length >= 3) score += 0.1;

  return Math.min(1.0, parseFloat(score.toFixed(2)));
}

/**
 * 권장 조치 결정
 */
function determineAction(riskScore: number, isEmergency: boolean): {
  urgencyLevel: UrgencyLevel;
  recommendedAction: RecommendedAction;
  requiresHumanReview: boolean;
} {
  if (isEmergency || riskScore >= 0.9) {
    return {
      urgencyLevel: 'emergency',
      recommendedAction: 'emergency_refer',
      requiresHumanReview: true,
    };
  }
  if (riskScore >= 0.7) {
    return {
      urgencyLevel: 'high',
      recommendedAction: 'escalate_doctor',
      requiresHumanReview: true,
    };
  }
  if (riskScore >= 0.4) {
    return {
      urgencyLevel: 'medium',
      recommendedAction: 'escalate_agent',
      requiresHumanReview: true,
    };
  }
  if (riskScore >= 0.2) {
    return {
      urgencyLevel: 'low',
      recommendedAction: 'schedule_followup',
      requiresHumanReview: false,
    };
  }
  return {
    urgencyLevel: 'low',
    recommendedAction: 'auto_response',
    requiresHumanReview: false,
  };
}

/**
 * 평가 텍스트 생성
 */
function generateAssessment(
  symptoms: SymptomInput[],
  riskScore: number,
  urgencyLevel: UrgencyLevel,
  flaggedSymptoms: string[],
  language: string
): string {
  const isRu = language === 'ru' || language === 'kz';

  if (urgencyLevel === 'emergency') {
    return isRu
      ? `⚠️ ЭКСТРЕННАЯ СИТУАЦИЯ: Обнаружены критические симптомы (${flaggedSymptoms.join(', ')}). Немедленно обратитесь в ближайшее отделение скорой помощи.`
      : `⚠️ 응급 상황: 위험 증상이 감지되었습니다 (${flaggedSymptoms.join(', ')}). 즉시 가장 가까운 응급실로 이동하세요.`;
  }
  if (urgencyLevel === 'high') {
    return isRu
      ? `⚠ Высокий риск (${(riskScore * 100).toFixed(0)}%): Рекомендуется срочная консультация с врачом. Обнаружены следующие симптомы: ${symptoms.map(s => s.symptom).join(', ')}.`
      : `⚠ 높은 위험도 (${(riskScore * 100).toFixed(0)}%): 담당 의료진과 긴급 상담이 필요합니다. 확인된 증상: ${symptoms.map(s => s.symptom).join(', ')}.`;
  }
  if (urgencyLevel === 'medium') {
    return isRu
      ? `Средний риск (${(riskScore * 100).toFixed(0)}%): Ваши симптомы требуют внимания. Наш координатор свяжется с вами в ближайшее время.`
      : `중간 위험도 (${(riskScore * 100).toFixed(0)}%): 증상에 대한 추가 확인이 필요합니다. 코디네이터가 곧 연락드리겠습니다.`;
  }
  return isRu
    ? `Низкий риск (${(riskScore * 100).toFixed(0)}%): Ваши симптомы в пределах нормы для данного этапа восстановления. Продолжайте следовать рекомендациям врача.`
    : `낮은 위험도 (${(riskScore * 100).toFixed(0)}%): 현재 증상은 회복 과정에서 정상 범위입니다. 처방된 지침을 계속 따라주세요.`;
}

/**
 * 메인 분석 함수: 증상 보고서를 분석하여 평가 결과 반환
 */
export function analyzeSymptoms(report: SymptomReport): SymptomAnalysis {
  const language = report.symptoms[0]?.language || 'en';

  // 1. 규칙 기반 1차 분석
  const ruleResult = ruleBasedAnalysis(report.symptoms, report.additionalNotes);

  // 2. 위험도 점수 계산
  const riskScore = calculateRiskScore(report.symptoms, ruleResult);

  // 3. 권장 조치 결정
  const { urgencyLevel, recommendedAction, requiresHumanReview } =
    determineAction(riskScore, ruleResult.isEmergency);

  // 4. 평가 텍스트 생성
  const assessment = generateAssessment(
    report.symptoms, riskScore, urgencyLevel, ruleResult.flagged, language
  );

  console.log(
    `[symptomAnalyzer] Inquiry ${report.inquiryId}: risk=${riskScore}, ` +
    `urgency=${urgencyLevel}, action=${recommendedAction}`
  );

  return {
    riskScore,
    urgencyLevel,
    assessment,
    recommendedAction,
    flaggedSymptoms: ruleResult.flagged,
    requiresHumanReview,
  };
}
