import { describe, it, expect } from 'vitest';
import {
  evaluateFromFollowup,
  evaluateFromSymptoms,
  createDoctorRebooking,
  evaluateRebooking,
} from './rebookingEngine';
import type { FollowupSchedule } from './scheduler';
import type { SymptomReport } from './symptomAnalyzer';

const makeSchedule = (overrides: Partial<FollowupSchedule> = {}): FollowupSchedule => ({
  id: 'fs_1',
  inquiryId: 'inq_1',
  cancerType: 'stomach',
  treatmentCompletedAt: new Date(Date.now() - 35 * 86400000).toISOString(), // 35 days ago
  schedule: [
    { phase: 'week_1', type: 'survey', daysFromTreatment: 7, title_ko: '1주 설문', title_ru: '', description_ko: '', description_ru: '' },
    { phase: 'month_1', type: 'video_call', daysFromTreatment: 30, title_ko: '1개월 화상상담', title_ru: '', description_ko: '', description_ru: '' },
    { phase: 'month_3', type: 'survey', daysFromTreatment: 90, title_ko: '3개월 설문', title_ru: '', description_ko: '', description_ru: '' },
  ],
  currentPhase: 'month_1',
  nextActionAt: new Date().toISOString(),
  status: 'active',
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('rebookingEngine', () => {
  describe('evaluateFromFollowup', () => {
    it('suggests rebooking when video_call is due', () => {
      const schedule = makeSchedule();
      const result = evaluateFromFollowup([schedule]);
      expect(result).not.toBeNull();
      expect(result!.source).toBe('followup');
      expect(result!.suggestedSessionType).toBe('follow_up');
    });

    it('returns null when no video_call is due', () => {
      const schedule = makeSchedule({ currentPhase: 'week_1' });
      const result = evaluateFromFollowup([schedule]);
      expect(result).toBeNull();
    });

    it('returns null for inactive schedules', () => {
      const schedule = makeSchedule({ status: 'completed' });
      const result = evaluateFromFollowup([schedule]);
      expect(result).toBeNull();
    });
  });

  describe('evaluateFromSymptoms', () => {
    it('triggers emergency rebooking for critical symptoms', () => {
      const report: SymptomReport = {
        followupId: 'fs_1',
        inquiryId: 'inq_1',
        reportType: 'ad_hoc',
        symptoms: [{ symptom: 'severe bleeding', severity: 9, duration: '1 hour', language: 'en' }],
      };
      const result = evaluateFromSymptoms(report);
      expect(result).not.toBeNull();
      expect(result!.urgency).toBe('urgent');
      expect(result!.suggestedSessionType).toBe('emergency');
      expect(result!.suggestedDaysFromNow).toBe(0);
    });

    it('returns null for low-risk symptoms', () => {
      const report: SymptomReport = {
        followupId: 'fs_1',
        inquiryId: 'inq_1',
        reportType: 'ad_hoc',
        symptoms: [{ symptom: 'feeling okay', severity: 1, duration: '1 day', language: 'en' }],
      };
      const result = evaluateFromSymptoms(report);
      expect(result).toBeNull();
    });
  });

  describe('createDoctorRebooking', () => {
    it('creates doctor-recommended rebooking', () => {
      const result = createDoctorRebooking('추가 검사 필요', 'diagnostic', 3);
      expect(result.source).toBe('doctor');
      expect(result.suggestedSessionType).toBe('diagnostic');
      expect(result.suggestedDaysFromNow).toBe(3);
    });
  });

  describe('evaluateRebooking', () => {
    it('returns most urgent result', () => {
      const schedule = makeSchedule();
      const report: SymptomReport = {
        followupId: 'fs_1',
        inquiryId: 'inq_1',
        reportType: 'emergency',
        symptoms: [{ symptom: 'loss of consciousness', severity: 10, duration: '5 min', language: 'en' }],
      };
      const result = evaluateRebooking([schedule], report);
      expect(result).not.toBeNull();
      expect(result!.urgency).toBe('urgent');
    });

    it('returns null when nothing is due and no symptoms', () => {
      const schedule = makeSchedule({ currentPhase: 'week_1' });
      const result = evaluateRebooking([schedule]);
      expect(result).toBeNull();
    });
  });
});
