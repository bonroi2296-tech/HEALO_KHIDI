import { describe, it, expect } from 'vitest';
import { analyzeSymptoms, type SymptomReport } from './symptomAnalyzer';

describe('symptomAnalyzer', () => {
  const baseReport: SymptomReport = {
    followupId: 'fs_1',
    inquiryId: 'inq_1',
    reportType: 'ad_hoc',
    symptoms: [],
  };

  it('returns low risk for mild symptoms', () => {
    const report: SymptomReport = {
      ...baseReport,
      symptoms: [{ symptom: 'slight headache', severity: 2, duration: '1 day', language: 'en' }],
    };
    const result = analyzeSymptoms(report);
    expect(result.urgencyLevel).toBe('low');
    expect(result.riskScore).toBeLessThan(0.4);
    expect(result.requiresHumanReview).toBe(false);
  });

  it('detects emergency keywords in Korean', () => {
    const report: SymptomReport = {
      ...baseReport,
      symptoms: [{ symptom: '피를 토했습니다', severity: 9, duration: '30분', language: 'ko' }],
    };
    const result = analyzeSymptoms(report);
    expect(result.urgencyLevel).toBe('emergency');
    expect(result.riskScore).toBeGreaterThanOrEqual(0.9);
    expect(result.recommendedAction).toBe('emergency_refer');
    expect(result.requiresHumanReview).toBe(true);
  });

  it('detects emergency keywords in Russian', () => {
    const report: SymptomReport = {
      ...baseReport,
      symptoms: [{ symptom: 'сильное кровотечение', severity: 8, duration: '1 час', language: 'ru' }],
    };
    const result = analyzeSymptoms(report);
    expect(result.urgencyLevel).toBe('emergency');
    expect(result.flaggedSymptoms).toContain('сильное кровотечение');
  });

  it('assigns high risk for severity >= 9', () => {
    const report: SymptomReport = {
      ...baseReport,
      symptoms: [{ symptom: 'pain', severity: 9, duration: '2 days', language: 'en' }],
    };
    const result = analyzeSymptoms(report);
    expect(result.riskScore).toBe(0.95);
  });

  it('escalates medium risk with warning keywords', () => {
    const report: SymptomReport = {
      ...baseReport,
      symptoms: [
        { symptom: 'fever and vomiting', severity: 5, duration: '2 days', language: 'en' },
        { symptom: 'diarrhea', severity: 4, duration: '1 day', language: 'en' },
      ],
    };
    const result = analyzeSymptoms(report);
    expect(result.urgencyLevel).toBe('medium');
    expect(result.recommendedAction).toBe('escalate_agent');
  });

  it('suggests schedule_followup for low-moderate symptoms', () => {
    const report: SymptomReport = {
      ...baseReport,
      symptoms: [{ symptom: 'mild swelling', severity: 3, duration: '3 days', language: 'en' }],
    };
    const result = analyzeSymptoms(report);
    expect(['low']).toContain(result.urgencyLevel);
    expect(['auto_response', 'schedule_followup']).toContain(result.recommendedAction);
  });

  it('detects Kazakh emergency keywords', () => {
    const report: SymptomReport = {
      ...baseReport,
      symptoms: [{ symptom: 'қатты қан кету', severity: 8, duration: '1 сағат', language: 'kz' }],
    };
    const result = analyzeSymptoms(report);
    expect(result.urgencyLevel).toBe('emergency');
  });
});
