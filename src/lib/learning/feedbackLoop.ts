/**
 * HEALO-KHIDI: AI ↔ Human Agent Mutual Learning Feedback Loop
 *
 * Human Agent가 AI 응답을 수정할 때 피드백을 기록하고,
 * 반복되는 수정 패턴을 자동으로 Playbook에 반영하는 시스템.
 */

export type CorrectionType = 'factual' | 'tone' | 'medical' | 'translation' | 'escalation';

export interface FeedbackEntry {
  inquiryId: string;
  aiResponseId: string;
  humanAgentId: string;
  correctionType: CorrectionType;
  originalResponse: string;
  correctedResponse: string;
  reason?: string;
  cancerType?: string;
  language?: string;
  confidenceScore?: number;
  timestamp?: string;
}

export interface PlaybookPattern {
  id: string;
  pattern: string;
  correctionType: CorrectionType;
  correctedTemplate: string;
  occurrences: number;
  cancerType?: string;
  language?: string;
  createdAt: string;
  lastUpdatedAt: string;
}

export interface AccuracyMetrics {
  period: string;
  totalResponses: number;
  autoResolved: number;
  escalated: number;
  corrected: number;
  accuracyRate: number;
  escalationRate: number;
  correctionsByType: Record<CorrectionType, number>;
  trend: 'improving' | 'stable' | 'declining';
}

// In-memory store for current session (production에서는 Supabase로 교체)
let feedbackStore: FeedbackEntry[] = [];
let playbookStore: PlaybookPattern[] = [];

/**
 * Human Agent의 수정 피드백 기록
 */
export function recordFeedback(entry: FeedbackEntry): FeedbackEntry {
  const recorded: FeedbackEntry = {
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString(),
  };
  feedbackStore.push(recorded);

  console.log(
    `[feedbackLoop] Recorded ${entry.correctionType} correction by ${entry.humanAgentId} ` +
    `for inquiry ${entry.inquiryId}`
  );

  return recorded;
}

/**
 * 정확도 지표 계산
 */
export function getAccuracyMetrics(periodDays: number = 30): AccuracyMetrics {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - periodDays);

  const relevant = feedbackStore.filter(f => {
    const ts = f.timestamp ? new Date(f.timestamp) : new Date();
    return ts >= cutoff;
  });

  const correctionsByType: Record<CorrectionType, number> = {
    factual: 0,
    tone: 0,
    medical: 0,
    translation: 0,
    escalation: 0,
  };

  relevant.forEach(f => {
    if (correctionsByType[f.correctionType] !== undefined) {
      correctionsByType[f.correctionType]++;
    }
  });

  const totalResponses = relevant.length > 0 ? relevant.length * 3 : 100; // 추정치
  const corrected = relevant.length;
  const escalated = relevant.filter(f => f.correctionType === 'escalation').length;
  const autoResolved = totalResponses - corrected - escalated;
  const accuracyRate = totalResponses > 0 ? (autoResolved / totalResponses) : 0;
  const escalationRate = totalResponses > 0 ? (escalated / totalResponses) : 0;

  // 트렌드 판단 (최근 7일 vs 이전 기간)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentCorrections = relevant.filter(f => new Date(f.timestamp!) >= weekAgo).length;
  const olderCorrections = relevant.length - recentCorrections;
  const recentRate = recentCorrections / 7;
  const olderRate = periodDays > 7 ? olderCorrections / (periodDays - 7) : recentRate;

  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (recentRate < olderRate * 0.8) trend = 'improving';
  else if (recentRate > olderRate * 1.2) trend = 'declining';

  return {
    period: `${periodDays}d`,
    totalResponses,
    autoResolved,
    escalated,
    corrected,
    accuracyRate: parseFloat(accuracyRate.toFixed(3)),
    escalationRate: parseFloat(escalationRate.toFixed(3)),
    correctionsByType,
    trend,
  };
}

/**
 * 반복 수정 패턴 감지 → Playbook 자동 업데이트 체크
 * 동일한 correctionType + 유사 패턴이 3회 이상 반복되면 Playbook 후보로 등록
 */
export function checkAndUpdatePlaybook(): PlaybookPattern[] {
  const THRESHOLD = 3;
  const patternMap = new Map<string, FeedbackEntry[]>();

  feedbackStore.forEach(entry => {
    const key = `${entry.correctionType}:${entry.cancerType || 'all'}:${entry.language || 'all'}`;
    if (!patternMap.has(key)) patternMap.set(key, []);
    patternMap.get(key)!.push(entry);
  });

  const newPatterns: PlaybookPattern[] = [];

  patternMap.forEach((entries, key) => {
    if (entries.length >= THRESHOLD) {
      const existing = playbookStore.find(p => p.pattern === key);
      if (existing) {
        existing.occurrences = entries.length;
        existing.lastUpdatedAt = new Date().toISOString();
      } else {
        const latestEntry = entries[entries.length - 1];
        const newPattern: PlaybookPattern = {
          id: `pb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          pattern: key,
          correctionType: latestEntry.correctionType,
          correctedTemplate: latestEntry.correctedResponse,
          occurrences: entries.length,
          cancerType: latestEntry.cancerType,
          language: latestEntry.language,
          createdAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
        };
        playbookStore.push(newPattern);
        newPatterns.push(newPattern);
        console.log(
          `[feedbackLoop] New playbook pattern detected: ${key} (${entries.length} occurrences)`
        );
      }
    }
  });

  return newPatterns;
}

/**
 * AI 응답의 신뢰도 점수를 계산
 * Playbook 매칭 여부, 과거 수정 빈도 등을 기반으로 산출
 */
export function calculateConfidenceScore(
  cancerType: string,
  language: string,
  responseText: string
): number {
  let score = 0.7; // 기본 신뢰도

  // Playbook 패턴 매칭 시 +0.15
  const matchingPlaybook = playbookStore.find(p =>
    p.cancerType === cancerType || p.language === language
  );
  if (matchingPlaybook) {
    score += 0.15;
  }

  // 해당 암종/언어 조합의 과거 수정 비율로 조정
  const relevantFeedback = feedbackStore.filter(f =>
    f.cancerType === cancerType && f.language === language
  );
  if (relevantFeedback.length > 5) {
    // 수정이 많으면 신뢰도 하향
    score -= Math.min(0.2, relevantFeedback.length * 0.02);
  }

  // 의료 관련 수정이 있었으면 추가 감점
  const medicalCorrections = relevantFeedback.filter(f => f.correctionType === 'medical');
  if (medicalCorrections.length > 0) {
    score -= 0.1;
  }

  return Math.max(0.1, Math.min(1.0, parseFloat(score.toFixed(2))));
}

/**
 * 현재 Playbook 패턴 목록 조회
 */
export function getPlaybookPatterns(): PlaybookPattern[] {
  return [...playbookStore];
}

/**
 * 스토어 초기화 (테스트용)
 */
export function resetStores(): void {
  feedbackStore = [];
  playbookStore = [];
}
